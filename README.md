# 书签整理扩展 / Bookmark Organizer Extension

把 Chrome 书签展开成一个更适合浏览、搜索和整理的大页面工作台。  
Turn Chrome bookmarks into a larger workspace built for browsing, searching, and organizing.

## 概览 / Overview

这个扩展不会替代 Chrome 原生书签，而是在保留原始数据结构的前提下，提供一个更清晰的独立工作台。  
This extension does not replace Chrome bookmarks. It adds a clearer standalone workspace while keeping the original bookmark structure.

在工作台里，你可以按文件夹浏览、搜索标题或网址、批量整理内容，并用不同的页面风格查看同一套书签数据。  
Inside the workspace, you can browse by folder, search titles or URLs, organize items in batches, and switch between different visual styles for the same bookmark data.

## 功能特性 / Features

- 自动读取当前 Chrome 书签树
- 独立工作台展示全部书签内容
- 按文件夹结构浏览书签和子文件夹
- 支持标题和 URL 搜索
- 支持折叠与展开文件夹
- 支持批量选择、移动、删除
- 支持文件夹重命名和新建栏目
- 支持拖拽调整文件夹顺序
- 支持自定义字体颜色
- 支持本地上传或远程缓存背景图
- 支持中英文界面切换
- 支持三种页面风格切换：分段流式、标题带网格、类时间轴分组

- Reads the current Chrome bookmarks tree automatically
- Opens a standalone workspace for the full bookmark collection
- Browses bookmarks and subfolders by folder structure
- Supports title and URL search
- Supports collapsing and expanding folders
- Supports batch selection, moving, and deleting
- Supports folder renaming and new column creation
- Supports drag-and-drop folder reordering
- Supports custom text colors
- Supports local background uploads and remote background caching
- Supports Chinese and English UI switching
- Supports three visual styles: Flow Layout, Band Grid, and Timeline-like Grouping

## 页面风格 / View Styles

`分段流式 / Flow Layout`  
弱化分组容器感，更像连续内容流，适合轻量浏览。

`标题带网格 / Band Grid`  
用更明确的标题带和卡片网格组织内容，适合在清晰层级下整理书签。

`类时间轴分组 / Timeline-like Grouping`  
通过节点和纵向线条强化章节感，适合希望页面更有节奏的浏览方式。

## 工作方式 / How It Works

1. 打开扩展弹窗。
2. 选择页面风格，或调整外观。
3. 打开工作台页面。
4. 页面会自动读取当前浏览器书签。
5. 在更大的页面中完成浏览、搜索和整理。

1. Open the extension popup.
2. Choose a view style, or adjust the appearance.
3. Open the workspace page.
4. The workspace automatically reads the current browser bookmarks.
5. Browse, search, and organize bookmarks in a larger view.

## 项目结构 / Project Structure

- `popup.html` / `popup.js`：扩展弹窗入口、语言切换、风格切换、外观设置
- `dashboard.html` / `dashboard.js`：工作台页面和书签整理逻辑
- `popup.css` / `dashboard.css`：弹窗与工作台样式
- `manifest.json`：扩展入口与权限定义

- `popup.html` / `popup.js`: extension popup, language switcher, style switcher, and appearance controls
- `dashboard.html` / `dashboard.js`: workspace page and bookmark organization logic
- `popup.css` / `dashboard.css`: popup and workspace styles
- `manifest.json`: extension entry and permission definitions

## 安装方式 / Installation

1. 下载或克隆这个仓库。
2. 打开 `chrome://extensions`。
3. 开启 `Developer mode`。
4. 点击 `Load unpacked`。
5. 选择项目目录，例如 `..\bookmark-organizer-extension`。

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the project folder, for example `..\bookmark-organizer-extension`.

## 权限说明 / Permissions

- `bookmarks`：读取和整理书签数据
- `storage`：保存风格、语言、外观和界面状态
- `tabs`：打开独立工作台页面
- `http://*/*` 和 `https://*/*`：抓取远程背景图并缓存到本地

- `bookmarks`: read and organize bookmark data
- `storage`: save style, language, appearance, and UI state
- `tabs`: open the standalone workspace page
- `http://*/*` and `https://*/*`: fetch remote background images and cache them locally

## 当前状态 / Current Status

当前版本已经是一个可直接使用的可视化书签整理工具，重点放在更舒适的整理体验和更清晰的展示方式上。  
The current version is already usable as a visual bookmark organizer, with a focus on clearer presentation and a more comfortable organization workflow.
