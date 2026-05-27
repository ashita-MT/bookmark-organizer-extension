const THEME_STORAGE_KEY = "bookmarkDashboardTheme";
const VIEW_STYLE_STORAGE_KEY = "bookmarkDashboardViewStyle";
const LANGUAGE_STORAGE_KEY = "bookmarkDashboardLanguage";
const DEFAULT_VIEW_STYLE = "flow";
const DEFAULT_LANGUAGE = "zh";
const DEFAULT_THEME = {
  textColor: "#dce7f5",
  backgroundImageData: "",
  backgroundImageName: "",
  backgroundImageSourceType: ""
};

const TRANSLATIONS = {
  zh: {
    title: "收藏夹整理页",
    htmlLang: "zh-CN",
    eyebrow: "收藏工作台",
    appearance: "外观",
    languageButton: "中 / EN",
    panelTitle: "外观",
    panelDescription: "调整字体颜色，并把背景图缓存到本地后用于工作台。",
    textColor: "字体颜色",
    backgroundFile: "本地背景图",
    backgroundUrl: "背景图网址",
    backgroundUrlPlaceholder: "https://example.com/background.jpg",
    applyBackground: "缓存并应用",
    resetTheme: "恢复默认",
    openDashboard: "打开工作台",
    styleSelector: "风格选择",
    styleFlow: "分段流式",
    styleBand: "标题带网格",
    styleTimeline: "类时间轴分组",
    previewDefault: "当前使用默认渐变背景",
    previewCached: "已缓存背景图：{name}",
    previewCustom: "已缓存自定义背景图",
    statusThemeSaved: "外观已保存。",
    statusTextColorUpdated: "字体颜色已更新。",
    statusBackgroundCached: "背景图已缓存到本地。",
    statusBackgroundDownloaded: "背景图已下载并缓存到本地。",
    statusReset: "已恢复默认外观。",
    statusDownloading: "正在下载并缓存背景图...",
    errorReadLocal: "读取本地图片失败，请重试。",
    errorInvalidUrl: "请输入有效的图片网址。",
    errorProtocol: "只支持 http 或 https 图片网址。",
    errorDownload: "图片下载失败：{status}",
    errorNotImage: "该链接返回的不是图片内容。",
    errorCache: "图片缓存失败，请换一个链接试试。",
    errorEmptyUrl: "先输入图片网址，再进行缓存。"
  },
  en: {
    title: "Bookmark Organizer",
    htmlLang: "en",
    eyebrow: "Bookmark Workspace",
    appearance: "Appearance",
    languageButton: "EN / 中",
    panelTitle: "Appearance",
    panelDescription: "Adjust text color and cache a background image locally for the dashboard.",
    textColor: "Text color",
    backgroundFile: "Local background image",
    backgroundUrl: "Background image URL",
    backgroundUrlPlaceholder: "https://example.com/background.jpg",
    applyBackground: "Cache and apply",
    resetTheme: "Reset to default",
    openDashboard: "Open workspace",
    styleSelector: "View style",
    styleFlow: "Flow Layout",
    styleBand: "Band Grid",
    styleTimeline: "Timeline-like Grouping",
    previewDefault: "Using the default gradient background",
    previewCached: "Cached background: {name}",
    previewCustom: "Custom background cached locally",
    statusThemeSaved: "Appearance saved.",
    statusTextColorUpdated: "Text color updated.",
    statusBackgroundCached: "Background image cached locally.",
    statusBackgroundDownloaded: "Background image downloaded and cached locally.",
    statusReset: "Default appearance restored.",
    statusDownloading: "Downloading and caching background image...",
    errorReadLocal: "Failed to read the local image. Please try again.",
    errorInvalidUrl: "Please enter a valid image URL.",
    errorProtocol: "Only http and https image URLs are supported.",
    errorDownload: "Image download failed: {status}",
    errorNotImage: "The URL did not return an image.",
    errorCache: "Failed to cache the image. Please try another link.",
    errorEmptyUrl: "Enter an image URL before caching it."
  }
};

const elements = {
  eyebrowLabel: document.querySelector("#eyebrowLabel"),
  openDashboardButton: document.querySelector("#openDashboardButton"),
  statusMessage: document.querySelector("#statusMessage"),
  languageToggleButton: document.querySelector("#languageToggleButton"),
  themeToggleButton: document.querySelector("#themeToggleButton"),
  themePanel: document.querySelector("#themePanel"),
  themePanelTitle: document.querySelector("#themePanelTitle"),
  themePanelDescription: document.querySelector("#themePanelDescription"),
  textColorLabel: document.querySelector("#textColorLabel"),
  textColorInput: document.querySelector("#textColorInput"),
  backgroundFileLabel: document.querySelector("#backgroundFileLabel"),
  backgroundFileInput: document.querySelector("#backgroundFileInput"),
  backgroundUrlLabel: document.querySelector("#backgroundUrlLabel"),
  backgroundUrlInput: document.querySelector("#backgroundUrlInput"),
  applyBackgroundUrlButton: document.querySelector("#applyBackgroundUrlButton"),
  backgroundPreviewLabel: document.querySelector("#backgroundPreviewLabel"),
  resetThemeButton: document.querySelector("#resetThemeButton"),
  styleSelector: document.querySelector(".style-selector"),
  styleOptions: Array.from(document.querySelectorAll(".style-option"))
};

const state = {
  language: DEFAULT_LANGUAGE,
  theme: { ...DEFAULT_THEME }
};

function t(key, vars = {}) {
  const template = TRANSLATIONS[state.language][key] ?? TRANSLATIONS[DEFAULT_LANGUAGE][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, token) => String(vars[token] ?? ""));
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

function normalizeTheme(theme) {
  return {
    textColor: theme?.textColor || DEFAULT_THEME.textColor,
    backgroundImageData: theme?.backgroundImageData || "",
    backgroundImageName: theme?.backgroundImageName || "",
    backgroundImageSourceType: theme?.backgroundImageSourceType || ""
  };
}

function normalizeLanguage(language) {
  return language === "en" ? "en" : DEFAULT_LANGUAGE;
}

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? "#f7a9a9" : "";
}

function getBackgroundPreviewText(theme) {
  if (!theme.backgroundImageData) {
    return t("previewDefault");
  }

  if (theme.backgroundImageName) {
    return t("previewCached", { name: theme.backgroundImageName });
  }

  return t("previewCustom");
}

function applyTheme(theme) {
  state.theme = normalizeTheme(theme);
  elements.textColorInput.value = state.theme.textColor;
  elements.backgroundPreviewLabel.textContent = getBackgroundPreviewText(state.theme);
  document.documentElement.style.setProperty("--text", state.theme.textColor);
}

function applyViewStyle(style) {
  for (const option of elements.styleOptions) {
    option.classList.toggle("is-active", option.dataset.style === style);
  }
}

function applyLanguage() {
  const htmlLang = TRANSLATIONS[state.language].htmlLang;
  document.documentElement.lang = htmlLang;
  document.title = t("title");
  elements.eyebrowLabel.textContent = t("eyebrow");
  elements.languageToggleButton.textContent = t("languageButton");
  elements.themeToggleButton.textContent = t("appearance");
  elements.themePanelTitle.textContent = t("panelTitle");
  elements.themePanelDescription.textContent = t("panelDescription");
  elements.textColorLabel.textContent = t("textColor");
  elements.backgroundFileLabel.textContent = t("backgroundFile");
  elements.backgroundUrlLabel.textContent = t("backgroundUrl");
  elements.backgroundUrlInput.placeholder = t("backgroundUrlPlaceholder");
  elements.applyBackgroundUrlButton.textContent = t("applyBackground");
  elements.resetThemeButton.textContent = t("resetTheme");
  elements.openDashboardButton.textContent = t("openDashboard");
  elements.styleSelector.setAttribute("aria-label", t("styleSelector"));

  const styleLabels = {
    flow: t("styleFlow"),
    band: t("styleBand"),
    timeline: t("styleTimeline")
  };

  for (const option of elements.styleOptions) {
    const title = option.querySelector(".style-option__title");
    if (title) {
      title.textContent = styleLabels[option.dataset.style] || option.dataset.style;
    }
  }

  applyTheme(state.theme);
}

async function saveTheme(theme, successMessageKey) {
  const normalizedTheme = normalizeTheme(theme);
  await storageSet(THEME_STORAGE_KEY, normalizedTheme);
  applyTheme(normalizedTheme);

  if (successMessageKey) {
    setStatus(t(successMessageKey));
  }
}

async function saveViewStyle(style) {
  await storageSet(VIEW_STYLE_STORAGE_KEY, style);
  applyViewStyle(style);
}

async function saveLanguage(language) {
  state.language = normalizeLanguage(language);
  await storageSet(LANGUAGE_STORAGE_KEY, state.language);
  applyLanguage();
}

async function loadPreferences() {
  const [savedTheme, savedStyle, savedLanguage] = await Promise.all([
    storageGet(THEME_STORAGE_KEY),
    storageGet(VIEW_STYLE_STORAGE_KEY),
    storageGet(LANGUAGE_STORAGE_KEY)
  ]);

  state.language = normalizeLanguage(savedLanguage);
  applyLanguage();
  applyTheme(savedTheme ?? DEFAULT_THEME);
  applyViewStyle(savedStyle ?? DEFAULT_VIEW_STYLE);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(t("errorReadLocal")));
    reader.readAsDataURL(file);
  });
}

async function fetchImageAsDataUrl(url) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(t("errorInvalidUrl"));
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error(t("errorProtocol"));
  }

  const response = await fetch(parsedUrl.href);
  if (!response.ok) {
    throw new Error(t("errorDownload", { status: response.status }));
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(t("errorNotImage"));
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      dataUrl: String(reader.result),
      fileName: parsedUrl.pathname.split("/").filter(Boolean).pop() || parsedUrl.hostname
    });
    reader.onerror = () => reject(new Error(t("errorCache")));
    reader.readAsDataURL(blob);
  });
}

async function updateTextColor(value) {
  await saveTheme(
    {
      ...state.theme,
      textColor: value
    },
    "statusTextColorUpdated"
  );
}

async function applyLocalBackground(file) {
  if (!file) {
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  await saveTheme(
    {
      ...state.theme,
      backgroundImageData: dataUrl,
      backgroundImageName: file.name,
      backgroundImageSourceType: "file"
    },
    "statusBackgroundCached"
  );
}

async function applyRemoteBackground(url) {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error(t("errorEmptyUrl"));
  }

  setStatus(t("statusDownloading"));
  const { dataUrl, fileName } = await fetchImageAsDataUrl(trimmedUrl);

  await saveTheme(
    {
      ...state.theme,
      backgroundImageData: dataUrl,
      backgroundImageName: fileName,
      backgroundImageSourceType: "url"
    },
    "statusBackgroundDownloaded"
  );
}

elements.openDashboardButton.addEventListener("click", async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  window.close();
});

elements.languageToggleButton.addEventListener("click", async (event) => {
  event.stopPropagation();

  try {
    await saveLanguage(state.language === "zh" ? "en" : "zh");
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.themeToggleButton.addEventListener("click", (event) => {
  event.stopPropagation();
  elements.themePanel.hidden = !elements.themePanel.hidden;
});

elements.themePanel.addEventListener("click", (event) => {
  event.stopPropagation();
});

elements.textColorInput.addEventListener("input", async (event) => {
  try {
    await updateTextColor(event.target.value);
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.backgroundFileInput.addEventListener("change", async (event) => {
  try {
    const [file] = event.target.files ?? [];
    await applyLocalBackground(file);
    event.target.value = "";
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.applyBackgroundUrlButton.addEventListener("click", async () => {
  try {
    await applyRemoteBackground(elements.backgroundUrlInput.value);
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.resetThemeButton.addEventListener("click", async () => {
  try {
    elements.backgroundUrlInput.value = "";
    await saveTheme(DEFAULT_THEME, "statusReset");
  } catch (error) {
    setStatus(error.message, true);
  }
});

for (const option of elements.styleOptions) {
  option.addEventListener("click", async () => {
    try {
      await saveViewStyle(option.dataset.style);
    } catch (error) {
      setStatus(error.message, true);
    }
  });
}

document.addEventListener("click", () => {
  if (!elements.themePanel.hidden) {
    elements.themePanel.hidden = true;
  }
});

Promise.resolve()
  .then(loadPreferences)
  .catch(() => {
    state.language = DEFAULT_LANGUAGE;
    applyLanguage();
    applyTheme(DEFAULT_THEME);
    applyViewStyle(DEFAULT_VIEW_STYLE);
  });
