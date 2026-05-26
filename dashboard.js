const STORAGE_KEY = "bookmarkDashboardSnapshot";
const THEME_STORAGE_KEY = "bookmarkDashboardTheme";
const COLLAPSED_FOLDERS_STORAGE_KEY = "bookmarkDashboardCollapsedFolders";
const LAYOUT_MODE_STORAGE_KEY = "bookmarkDashboardLayoutMode";
const DEFAULT_THEME = {
  backgroundColor: "#171717",
  textColor: "#e1e1e1"
};
const DRAG_HOLD_MS = 300;

const elements = {
  searchInput: document.querySelector("#searchInput"),
  lastImportedLabel: document.querySelector("#lastImportedLabel"),
  bookmarkCount: document.querySelector("#bookmarkCount"),
  statusMessage: document.querySelector("#statusMessage"),
  layoutSingleButton: document.querySelector("#layoutSingleButton"),
  layoutDoubleButton: document.querySelector("#layoutDoubleButton"),
  dashboard: document.querySelector("#dashboard"),
  emptyStateTemplate: document.querySelector("#emptyStateTemplate")
};

const state = {
  snapshot: null,
  searchQuery: "",
  editingFolderId: null,
  selectedIds: new Set(),
  collapsedFolderIds: new Set(),
  dragging: null,
  dragPressTimer: null,
  dragArmedFolderId: null,
  layoutMode: "single"
};

function storageGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result[key]);
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve();
    });
  });
}

function bookmarksApi(method, ...args) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks[method](...args, (result) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(result);
    });
  });
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? "#a13030" : "";
}

function applyLayoutMode() {
  elements.dashboard.classList.toggle("layout-double", state.layoutMode === "double");
  elements.layoutSingleButton.classList.toggle("is-active", state.layoutMode === "single");
  elements.layoutDoubleButton.classList.toggle("is-active", state.layoutMode === "double");
}

async function setLayoutMode(mode) {
  if (!["single", "double"].includes(mode) || state.layoutMode === mode) {
    return;
  }

  state.layoutMode = mode;
  applyLayoutMode();
  await storageSet(LAYOUT_MODE_STORAGE_KEY, mode);
}

function cloneTree(tree) {
  return JSON.parse(JSON.stringify(tree));
}

function isFolder(node) {
  return !node.url;
}

function isMovableTargetFolder(node) {
  return isFolder(node) && Boolean(node.parentId);
}

function getRootNode(tree) {
  return tree[0] ?? null;
}

function countBookmarks(nodes) {
  let count = 0;

  const visit = (node) => {
    if (node.url) {
      count += 1;
      return;
    }

    for (const child of node.children ?? []) {
      visit(child);
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return count;
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString("zh-CN");
}

function normalizeQuery(value) {
  return value.trim().toLowerCase();
}

function filterTree(nodes, query) {
  if (!query) {
    return cloneTree(nodes);
  }

  const matches = (value) => String(value ?? "").toLowerCase().includes(query);

  const visit = (node) => {
    if (node.url) {
      return matches(node.title) || matches(node.url) ? { ...node } : null;
    }

    const filteredChildren = (node.children ?? []).map(visit).filter(Boolean);
    if (matches(node.title) || filteredChildren.length) {
      return { ...node, children: filteredChildren };
    }

    return null;
  };

  return nodes.map(visit).filter(Boolean);
}

function collectFolderOptions(nodes, excludedIds = new Set()) {
  const options = [];

  const visit = (node, depth = 0) => {
    if (!isFolder(node) || excludedIds.has(node.id)) {
      return;
    }

    if (isMovableTargetFolder(node)) {
      options.push({
        id: node.id,
        title: node.title || "未命名文件夹",
        depth
      });
    }

    for (const child of node.children ?? []) {
      visit(child, depth + 1);
    }
  };

  for (const node of nodes) {
    visit(node, 0);
  }

  return options;
}

function collectDescendantFolderIds(node) {
  const ids = new Set([node.id]);

  const visit = (current) => {
    for (const child of current.children ?? []) {
      if (isFolder(child)) {
        ids.add(child.id);
        visit(child);
      }
    }
  };

  visit(node);
  return ids;
}

function findNodeById(nodes, targetId) {
  const visit = (node) => {
    if (node.id === targetId) {
      return node;
    }

    for (const child of node.children ?? []) {
      const result = visit(child);
      if (result) {
        return result;
      }
    }

    return null;
  };

  for (const node of nodes) {
    const result = visit(node);
    if (result) {
      return result;
    }
  }

  return null;
}

function collectMoveTargetExcludedIds(allNodes) {
  const excludedIds = new Set();

  for (const id of state.selectedIds) {
    const selectedNode = findNodeById(allNodes, id);
    if (selectedNode && isFolder(selectedNode)) {
      for (const blockedId of collectDescendantFolderIds(selectedNode)) {
        excludedIds.add(blockedId);
      }
    }
  }

  return excludedIds;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const intValue = Number.parseInt(full, 16);

  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
}

function rgbToHex({ r, g, b }) {
  const toHex = (value) => value.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixColors(colorA, colorB, ratio) {
  const left = hexToRgb(colorA);
  const right = hexToRgb(colorB);
  const mix = (a, b) => Math.round(a * (1 - ratio) + b * ratio);

  return rgbToHex({
    r: mix(left.r, right.r),
    g: mix(left.g, right.g),
    b: mix(left.b, right.b)
  });
}

function getLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function applyTheme(theme) {
  const isDarkBackground = getLuminance(theme.backgroundColor) < 0.45;
  const panelColor = mixColors(theme.backgroundColor, "#ffffff", isDarkBackground ? 0.08 : 0.72);
  const panelStrongColor = mixColors(theme.backgroundColor, "#ffffff", isDarkBackground ? 0.14 : 0.88);
  const borderColor = mixColors(theme.backgroundColor, theme.textColor, isDarkBackground ? 0.34 : 0.16);
  const mutedColor = mixColors(theme.textColor, theme.backgroundColor, isDarkBackground ? 0.45 : 0.52);
  const softColor = mixColors(theme.backgroundColor, theme.textColor, isDarkBackground ? 0.16 : 0.08);
  const shadow = isDarkBackground
    ? "0 12px 34px rgba(0, 0, 0, 0.35)"
    : "0 10px 30px rgba(15, 23, 42, 0.08)";

  document.documentElement.style.setProperty("--bg", theme.backgroundColor);
  document.documentElement.style.setProperty("--text", theme.textColor);
  document.documentElement.style.setProperty("--panel", panelColor);
  document.documentElement.style.setProperty("--panel-strong", panelStrongColor);
  document.documentElement.style.setProperty("--border", borderColor);
  document.documentElement.style.setProperty("--muted", mutedColor);
  document.documentElement.style.setProperty("--soft", softColor);
  document.documentElement.style.setProperty("--shadow", shadow);
}

async function saveTheme(theme) {
  await storageSet(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

async function saveCollapsedFolders() {
  await storageSet(COLLAPSED_FOLDERS_STORAGE_KEY, Array.from(state.collapsedFolderIds));
}

function clearDragPressTimer() {
  if (state.dragPressTimer) {
    window.clearTimeout(state.dragPressTimer);
    state.dragPressTimer = null;
  }
}

function clearDragVisualState() {
  document.body.classList.remove("is-dragging");
  document.querySelectorAll(".drag-over, .drag-source").forEach((element) => {
    element.classList.remove("drag-over", "drag-source");
  });
}

function endDrag() {
  clearDragPressTimer();
  clearDragVisualState();
  state.dragging = null;
  state.dragArmedFolderId = null;
}

function beginDrag(payload, sourceElement) {
  state.dragging = payload;
  document.body.classList.add("is-dragging");
  sourceElement.classList.add("drag-source");
}

function armFolderDrag(folderId, headerElement) {
  clearDragPressTimer();
  state.dragPressTimer = window.setTimeout(() => {
    state.dragArmedFolderId = folderId;
    headerElement.draggable = true;
    state.dragPressTimer = null;
  }, DRAG_HOLD_MS);
}

function disarmFolderDrag(headerElement) {
  clearDragPressTimer();
  headerElement.draggable = false;
  if (!state.dragging) {
    state.dragArmedFolderId = null;
  }
}

async function refreshSnapshot() {
  const tree = await bookmarksApi("getTree");
  state.snapshot = {
    importedAt: Date.now(),
    tree
  };
  await storageSet(STORAGE_KEY, state.snapshot);
}

async function renameFolder(node) {
  const nextTitle = window.prompt("输入新的栏目名称", node.title || "未命名文件夹");
  if (!nextTitle || !nextTitle.trim()) {
    setStatus("已取消重命名。");
    return;
  }

  await bookmarksApi("update", node.id, {
    title: nextTitle.trim()
  });
  await refreshSnapshot();
  renderDashboard();
  setStatus("栏目已重命名。");
}

async function createColumn(folderNode) {
  const title = window.prompt("新栏目名称", "新书签栏");
  if (!title || !title.trim()) {
    setStatus("已取消创建。");
    return;
  }

  await bookmarksApi("create", {
    parentId: folderNode.id,
    title: title.trim()
  });
  state.collapsedFolderIds.delete(folderNode.id);
  await refreshSnapshot();
  renderDashboard();
  setStatus("新栏目已创建。");
}

function confirmDangerAction(firstMessage, secondMessage, cancelStatus) {
  if (!window.confirm(firstMessage)) {
    setStatus(cancelStatus);
    return false;
  }

  if (!window.confirm(secondMessage)) {
    setStatus(cancelStatus);
    return false;
  }

  return true;
}

async function deleteColumn(folderNode) {
  const folderTitle = folderNode.title || "未命名文件夹";
  const confirmed = confirmDangerAction(
    `确认删除栏目“${folderTitle}”吗？其中内容也会一起删除。`,
    `请再次确认：栏目“${folderTitle}”删除后将无法恢复。`,
    "已取消删除栏目。"
  );
  if (!confirmed) {
    return;
  }

  const parentId = folderNode.parentId;
  let needsFallbackFolder = false;

  if (parentId) {
    const siblings = await bookmarksApi("getChildren", parentId);
    const siblingFolders = siblings.filter((node) => isFolder(node) && node.id !== folderNode.id);
    needsFallbackFolder = siblingFolders.length === 0;
  }

  await bookmarksApi("removeTree", folderNode.id);

  if (needsFallbackFolder && parentId) {
    await bookmarksApi("create", {
      parentId,
      title: "新书签栏"
    });
  }

  if (state.editingFolderId === folderNode.id) {
    state.editingFolderId = null;
    state.selectedIds.clear();
  }

  state.collapsedFolderIds.delete(folderNode.id);
  await refreshSnapshot();
  renderDashboard();
  setStatus("栏目已删除。");
}

async function moveFolderBefore(draggedId, targetFolderId) {
  if (draggedId === targetFolderId) {
    return false;
  }

  const draggedNode = findNodeById(state.snapshot.tree, draggedId);
  const targetNode = findNodeById(state.snapshot.tree, targetFolderId);
  if (!draggedNode || !targetNode) {
    return false;
  }

  if (collectDescendantFolderIds(draggedNode).has(targetFolderId)) {
    return false;
  }

  const [liveTarget] = await bookmarksApi("get", targetFolderId);
  if (!liveTarget?.parentId) {
    return false;
  }

  await bookmarksApi("move", draggedId, {
    parentId: liveTarget.parentId,
    index: liveTarget.index
  });
  return true;
}

async function finalizeDrop(action, successMessage) {
  try {
    const changed = await action();
    if (changed) {
      await refreshSnapshot();
      renderDashboard();
      setStatus(successMessage);
    }
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    endDrag();
  }
}

function createEmptyState(message, description) {
  const element = elements.emptyStateTemplate.content.firstElementChild.cloneNode(true);
  element.querySelector("h2").textContent = message;
  element.querySelector("p").textContent = description;
  return element;
}

function getFaviconUrl(url) {
  return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`;
}

function createSelectionToggle(node, folderId) {
  const wrap = document.createElement("label");
  wrap.className = "item-check";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = state.selectedIds.has(node.id);
  input.addEventListener("change", () => {
    if (input.checked) {
      state.selectedIds.add(node.id);
    } else {
      state.selectedIds.delete(node.id);
    }

    state.editingFolderId = folderId;
    renderDashboard();
  });

  const text = document.createElement("span");
  text.textContent = "选择";
  wrap.append(input, text);
  return wrap;
}

function createBookmarkCard(node, folderId) {
  const card = document.createElement("article");
  card.className = `bookmark-card${state.selectedIds.has(node.id) ? " is-selected" : ""}`;
  const isEditing = state.editingFolderId === folderId;

  if (isEditing) {
    card.appendChild(createSelectionToggle(node, folderId));
  }

  const link = document.createElement("a");
  link.className = "bookmark-card__title";
  link.draggable = false;

  const iconWrap = document.createElement("div");
  iconWrap.className = "bookmark-card__icon-wrap";

  const icon = document.createElement("img");
  icon.className = "bookmark-card__icon";
  icon.src = getFaviconUrl(node.url);
  icon.alt = "";
  icon.loading = "lazy";
  icon.draggable = false;
  icon.addEventListener("error", () => {
    iconWrap.classList.add("is-fallback");
    icon.replaceWith(document.createTextNode((node.title || node.url || "?").trim().slice(0, 1).toUpperCase()));
  });

  const label = document.createElement("span");
  label.className = "bookmark-card__label";
  label.textContent = node.title || node.url;

  if (isEditing) {
    link.href = "#";
    link.setAttribute("role", "button");
    link.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.selectedIds.has(node.id)) {
        state.selectedIds.delete(node.id);
      } else {
        state.selectedIds.add(node.id);
      }
      renderDashboard();
    });
  } else {
    link.href = node.url;
    link.target = "_blank";
    link.rel = "noreferrer";
  }

  iconWrap.appendChild(icon);
  link.append(iconWrap, label);
  card.append(link);
  return card;
}

function createHeaderActions(allNodes) {
  const panel = document.createElement("div");
  panel.className = "folder-header-actions";

  const summary = document.createElement("p");
  summary.className = "selection-summary";
  summary.textContent = `已选择 ${state.selectedIds.size} 项`;

  const actionRow = document.createElement("div");
  actionRow.className = "action-row";

  const toggleRow = document.createElement("div");
  toggleRow.className = "action-row";

  const selectAllButton = document.createElement("button");
  selectAllButton.type = "button";
  selectAllButton.className = "action-button";
  selectAllButton.textContent = "全选";
  selectAllButton.addEventListener("click", () => {
    const folderNode = findNodeById(state.snapshot.tree, state.editingFolderId);
    if (!folderNode) {
      return;
    }

    for (const child of folderNode.children ?? []) {
      state.selectedIds.add(child.id);
    }

    renderDashboard();
  });

  const invertSelectButton = document.createElement("button");
  invertSelectButton.type = "button";
  invertSelectButton.className = "action-button";
  invertSelectButton.textContent = "反选";
  invertSelectButton.addEventListener("click", () => {
    const folderNode = findNodeById(state.snapshot.tree, state.editingFolderId);
    if (!folderNode) {
      return;
    }

    for (const child of folderNode.children ?? []) {
      if (state.selectedIds.has(child.id)) {
        state.selectedIds.delete(child.id);
      } else {
        state.selectedIds.add(child.id);
      }
    }

    renderDashboard();
  });

  toggleRow.append(selectAllButton, invertSelectButton);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "action-button danger";
  deleteButton.textContent = "删除所选";
  deleteButton.disabled = state.selectedIds.size === 0;
  deleteButton.addEventListener("click", async () => {
    try {
      await deleteSelectedItems();
      setStatus("所选内容已删除。");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  const moveGroup = document.createElement("div");
  moveGroup.className = "move-group";

  const moveLabel = document.createElement("span");
  moveLabel.className = "move-label";
  moveLabel.textContent = "移动到";

  const moveSelect = document.createElement("select");
  moveSelect.className = "move-select";
  const excludedIds = collectMoveTargetExcludedIds(allNodes);
  const options = collectFolderOptions(allNodes, excludedIds);
  moveSelect.innerHTML = options
    .map((option) => {
      const prefix = "　".repeat(option.depth);
      return `<option value="${option.id}">${prefix}${option.title}</option>`;
    })
    .join("");

  const moveButton = document.createElement("button");
  moveButton.type = "button";
  moveButton.className = "action-button";
  moveButton.textContent = "移动所选";
  moveButton.disabled = state.selectedIds.size === 0 || !options.length;
  moveButton.addEventListener("click", async () => {
    try {
      await moveSelectedItems(moveSelect.value);
      setStatus("所选内容已移动。");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  actionRow.append(deleteButton, moveGroup);
  moveGroup.append(moveLabel, moveSelect, moveButton);
  panel.append(summary, toggleRow, actionRow);
  return panel;
}

function attachFolderDragHandlers(header, section, node) {
  header.draggable = false;

  header.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }
    armFolderDrag(node.id, header);
  });

  header.addEventListener("pointerup", () => {
    disarmFolderDrag(header);
  });

  header.addEventListener("pointerleave", () => {
    if (!state.dragging) {
      disarmFolderDrag(header);
    }
  });

  header.addEventListener("pointercancel", () => {
    disarmFolderDrag(header);
  });

  header.addEventListener("dragstart", (event) => {
    if (!event.dataTransfer || state.dragArmedFolderId !== node.id) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", node.id);
    beginDrag({
      type: "folder",
      id: node.id,
      parentId: node.parentId
    }, section);
  });

  header.addEventListener("dragend", () => {
    disarmFolderDrag(header);
    endDrag();
  });

  section.addEventListener("dragover", (event) => {
    if (!state.dragging || state.dragging.type !== "folder" || state.dragging.id === node.id) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    section.classList.add("drag-over");
  });

  section.addEventListener("dragleave", (event) => {
    if (event.relatedTarget && section.contains(event.relatedTarget)) {
      return;
    }
    section.classList.remove("drag-over");
  });

  section.addEventListener("drop", (event) => {
    if (!state.dragging || state.dragging.type !== "folder" || state.dragging.id === node.id) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    finalizeDrop(
      () => moveFolderBefore(state.dragging.id, node.id),
      "栏目顺序已更新。"
    );
  });
}

function createFolderSection(node, allNodes, pathParts = []) {
  const section = document.createElement("section");
  section.className = `folder-card${state.selectedIds.has(node.id) ? " is-selected" : ""}`;
  const isCollapsed = state.collapsedFolderIds.has(node.id);
  const isEditing = state.editingFolderId === node.id;
  const canDrag = state.editingFolderId === null;

  const header = document.createElement("div");
  header.className = "folder-header";

  const headerMain = document.createElement("div");
  headerMain.className = "folder-header-main";

  const indicator = document.createElement("span");
  indicator.className = "folder-toggle-indicator";
  indicator.textContent = isCollapsed ? "▸" : "▾";

  const titleGroup = document.createElement("div");
  titleGroup.className = "folder-title-group";

  const heading = document.createElement(pathParts.length ? "h3" : "h2");
  heading.textContent = node.title || "未命名文件夹";
  titleGroup.appendChild(heading);

  if (isEditing) {
    const titleActions = document.createElement("div");
    titleActions.className = "folder-title-actions";

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "title-action-button";
    renameButton.textContent = "重命名";
    renameButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      try {
        await renameFolder(node);
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    titleActions.appendChild(renameButton);
    titleGroup.appendChild(titleActions);
  }

  headerMain.append(indicator, titleGroup);

  if (canDrag) {
    attachFolderDragHandlers(header, section, node);
  }

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = `folder-edit-button${isEditing ? " is-editing" : ""}`;
  editButton.textContent = isEditing ? "保存" : "编辑";
  editButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (isEditing) {
      state.editingFolderId = null;
      state.selectedIds.clear();
      setStatus("已退出编辑。");
    } else {
      state.editingFolderId = node.id;
      state.selectedIds.clear();
      setStatus("已进入编辑模式。");
    }
    renderDashboard();
  });

  header.addEventListener("click", () => {
    if (state.collapsedFolderIds.has(node.id)) {
      state.collapsedFolderIds.delete(node.id);
    } else {
      state.collapsedFolderIds.add(node.id);
    }

    saveCollapsedFolders().then(() => {
      renderDashboard();
    }).catch((error) => {
      setStatus(error.message, true);
    });
  });

  const headerActions = document.createElement("div");
  headerActions.className = "folder-header-actions";
  headerActions.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  if (isEditing) {
    const createButton = document.createElement("button");
    createButton.type = "button";
    createButton.className = "action-button";
    createButton.textContent = "新建栏目";
    createButton.addEventListener("click", async () => {
      try {
        await createColumn(node);
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    const deleteColumnButton = document.createElement("button");
    deleteColumnButton.type = "button";
    deleteColumnButton.className = "action-button danger";
    deleteColumnButton.textContent = "删除栏目";
    deleteColumnButton.addEventListener("click", async () => {
      try {
        await deleteColumn(node);
      } catch (error) {
        setStatus(error.message, true);
      }
    });

    headerActions.append(createButton, deleteColumnButton);
    headerActions.appendChild(createHeaderActions(allNodes));
  }

  headerActions.appendChild(editButton);
  header.append(headerMain, headerActions);
  section.appendChild(header);

  const content = document.createElement("div");
  content.className = "folder-content";
  content.hidden = isCollapsed;

  const subfolders = (node.children ?? []).filter((child) => isFolder(child));
  const bookmarks = (node.children ?? []).filter((child) => !isFolder(child));

  if (bookmarks.length) {
    const bookmarkGrid = document.createElement("div");
    bookmarkGrid.className = "bookmark-grid";
    for (const bookmark of bookmarks) {
      bookmarkGrid.appendChild(createBookmarkCard(bookmark, node.id));
    }
    content.appendChild(bookmarkGrid);
  }

  if (subfolders.length) {
    const subfolderGrid = document.createElement("div");
    subfolderGrid.className = "subfolder-grid";
    for (const childFolder of subfolders) {
      subfolderGrid.appendChild(createFolderSection(childFolder, allNodes, [...pathParts, node.title].filter(Boolean)));
    }
    content.appendChild(subfolderGrid);
  }

  section.appendChild(content);
  return section;
}

function getRenderableRootChildren(tree) {
  const rootNode = getRootNode(tree);
  return (rootNode?.children ?? []).filter((node) => isFolder(node));
}

function renderDashboard() {
  elements.dashboard.innerHTML = "";

  if (!state.snapshot?.tree?.length) {
    elements.bookmarkCount.textContent = "0";
    elements.lastImportedLabel.textContent = "还没有导入数据";
    elements.dashboard.appendChild(
      createEmptyState(
        "还没有导入收藏夹",
        "点击插件里的“导入当前收藏夹”，把浏览器现有收藏内容读取到这个页面里。"
      )
    );
    return;
  }

  const filteredTree = filterTree(state.snapshot.tree, normalizeQuery(state.searchQuery));
  const rootChildren = getRenderableRootChildren(filteredTree);
  const allFolderNodes = state.snapshot.tree;
  const bookmarkTotal = countBookmarks(rootChildren);

  elements.bookmarkCount.textContent = String(bookmarkTotal);
  elements.lastImportedLabel.textContent = `上次导入：${formatDate(state.snapshot.importedAt)}`;

  if (!rootChildren.length) {
    elements.dashboard.appendChild(
      createEmptyState(
        "没有找到匹配结果",
        "换个关键词试试，或者清空搜索框查看所有内容。"
      )
    );
    return;
  }

  for (const folder of rootChildren) {
    elements.dashboard.appendChild(createFolderSection(folder, allFolderNodes));
  }
}

async function deleteSelectedItems() {
  if (!state.selectedIds.size) {
    return;
  }

  const selectedCount = state.selectedIds.size;
  const confirmed = confirmDangerAction(
    `确认删除所选的 ${selectedCount} 项内容吗？`,
    `请再次确认：所选的 ${selectedCount} 项内容删除后将无法恢复。`,
    "已取消删除所选内容。"
  );
  if (!confirmed) {
    return;
  }

  for (const id of Array.from(state.selectedIds)) {
    const liveNode = await bookmarksApi("get", id);
    const target = liveNode[0];
    if (!target) {
      continue;
    }

    if (isFolder(target)) {
      await bookmarksApi("removeTree", id);
    } else {
      await bookmarksApi("remove", id);
    }
  }

  state.selectedIds.clear();
  await refreshSnapshot();
  renderDashboard();
}

async function moveSelectedItems(parentId) {
  if (!state.selectedIds.size || !parentId) {
    return;
  }

  for (const id of Array.from(state.selectedIds)) {
    await bookmarksApi("move", id, { parentId });
  }

  state.selectedIds.clear();
  await refreshSnapshot();
  renderDashboard();
}

async function loadSnapshot() {
  await refreshSnapshot();
  renderDashboard();
}

async function loadTheme() {
  const savedTheme = await storageGet(THEME_STORAGE_KEY);
  applyTheme(savedTheme ?? DEFAULT_THEME);
}

async function loadCollapsedFolders() {
  const savedIds = await storageGet(COLLAPSED_FOLDERS_STORAGE_KEY);
  state.collapsedFolderIds = new Set(Array.isArray(savedIds) ? savedIds : []);
}

async function loadLayoutMode() {
  const savedLayoutMode = await storageGet(LAYOUT_MODE_STORAGE_KEY);
  state.layoutMode = savedLayoutMode === "double" ? "double" : "single";
  applyLayoutMode();
}

function attachEventListeners() {
  elements.searchInput.addEventListener("input", (event) => {
    state.searchQuery = event.target.value;
    renderDashboard();
  });

  elements.layoutSingleButton.addEventListener("click", async () => {
    try {
      await setLayoutMode("single");
    } catch (error) {
      setStatus(error.message, true);
    }
  });

  elements.layoutDoubleButton.addEventListener("click", async () => {
    try {
      await setLayoutMode("double");
    } catch (error) {
      setStatus(error.message, true);
    }
  });
}

async function init() {
  attachEventListeners();

  try {
    await loadTheme();
    await loadCollapsedFolders();
    await loadLayoutMode();
    setStatus("正在同步当前收藏夹...");
    await loadSnapshot();
    setStatus(state.snapshot ? "已同步当前收藏夹。" : "当前没有可展示的收藏夹。");
  } catch (error) {
    setStatus(error.message, true);
  }
}

init();
