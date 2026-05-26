const THEME_STORAGE_KEY = "bookmarkDashboardTheme";
const DEFAULT_THEME = {
  backgroundColor: "#171717",
  textColor: "#e1e1e1"
};

const elements = {
  openDashboardButton: document.querySelector("#openDashboardButton"),
  statusMessage: document.querySelector("#statusMessage"),
  themeToggleButton: document.querySelector("#themeToggleButton"),
  themePanel: document.querySelector("#themePanel"),
  backgroundColorInput: document.querySelector("#backgroundColorInput"),
  textColorInput: document.querySelector("#textColorInput"),
  resetThemeButton: document.querySelector("#resetThemeButton")
};

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

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? "#f87171" : "";
}

function applyTheme(theme) {
  elements.backgroundColorInput.value = theme.backgroundColor;
  elements.textColorInput.value = theme.textColor;
}

async function saveTheme(theme) {
  await storageSet(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
  setStatus("配色已保存。");
}

async function loadTheme() {
  const savedTheme = await storageGet(THEME_STORAGE_KEY);
  applyTheme(savedTheme ?? DEFAULT_THEME);
}

elements.openDashboardButton.addEventListener("click", async () => {
  await chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  window.close();
});

elements.themeToggleButton.addEventListener("click", (event) => {
  event.stopPropagation();
  elements.themePanel.hidden = !elements.themePanel.hidden;
});

elements.themePanel.addEventListener("click", (event) => {
  event.stopPropagation();
});

elements.backgroundColorInput.addEventListener("input", async (event) => {
  try {
    await saveTheme({
      backgroundColor: event.target.value,
      textColor: elements.textColorInput.value
    });
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.textColorInput.addEventListener("input", async (event) => {
  try {
    await saveTheme({
      backgroundColor: elements.backgroundColorInput.value,
      textColor: event.target.value
    });
  } catch (error) {
    setStatus(error.message, true);
  }
});

elements.resetThemeButton.addEventListener("click", async () => {
  try {
    await saveTheme(DEFAULT_THEME);
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.addEventListener("click", () => {
  if (!elements.themePanel.hidden) {
    elements.themePanel.hidden = true;
  }
});

loadTheme().catch(() => {
  applyTheme(DEFAULT_THEME);
});
