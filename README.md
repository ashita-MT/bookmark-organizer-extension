# 书签整理扩展 / Bookmark Organizer Extension

一个把 Chrome 书签整理成独立可视化工作台的浏览器扩展，适合浏览、搜索和批量整理书签。

An open source Chrome extension that turns your bookmarks into a clean standalone workspace for browsing, searching, and organizing at scale.

## 概览 / Overview

它不会替代 Chrome 书签，而是在保留原生书签数据的前提下，提供一个更适合整理的大屏操作界面。

Instead of managing bookmarks inside the default browser tree, this extension opens them in a dedicated dashboard with folder sections, bookmark cards, search, layout controls, and batch actions.

## 功能特性 / Features

- 独立页面查看书签，不受弹窗尺寸限制
- 自动同步当前 Chrome 书签树
- 按文件夹结构展示，书签以卡片形式呈现
- 支持标题和 URL 搜索
- 支持文件夹折叠和展开
- 支持单列和双列布局切换
- 支持批量选择文件夹内项目
- 支持批量移动书签或文件夹
- 支持批量删除书签或文件夹
- 支持文件夹重命名和新建子文件夹
- 支持拖拽调整文件夹顺序
- 支持自定义工作台主题配色

- Open bookmarks in a standalone dashboard instead of a small popup
- Sync the current Chrome bookmarks tree when the dashboard loads
- Browse bookmarks by folder structure with card-based presentation
- Search by bookmark title or URL
- Collapse and expand folders for cleaner navigation
- Switch between single-column and double-column layout
- Batch select items inside a folder
- Move selected bookmarks or folders to another folder
- Delete selected bookmarks or folders
- Rename folders and create new subfolders
- Reorder folders with drag and drop
- Customize dashboard theme colors

## 工作方式 / How It Works


1. 打开扩展弹窗。
2. 进入独立工作台页面。
3. 页面自动读取当前 Chrome 书签。
4. 在更大的界面里完成浏览、搜索和整理。

1. Open the extension popup.
2. Launch the dashboard page.
3. The dashboard reads the current Chrome bookmarks tree.
4. Browse, search, and organize bookmarks in a larger workspace.

## 项目结构 / Project Structure


- `popup.html` / `popup.js`：扩展弹窗入口
- `dashboard.html` / `dashboard.js`：主工作台与整理逻辑
- `popup.css` / `dashboard.css`：界面样式
- `manifest.json`：扩展权限与入口定义

- `popup.html` / `popup.js`: extension popup entry
- `dashboard.html` / `dashboard.js`: main bookmark dashboard
- `popup.css` / `dashboard.css`: UI styles
- `manifest.json`: Chrome extension manifest

## 安装方式 / Installation


1. 下载或克隆这个仓库。
2. 打开 `chrome://extensions`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择项目目录，例如 `..\bookmark-organizer-extension`。

1. Download or clone this repository.
2. Open `chrome://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select the project folder, for example `..\bookmark-organizer-extension`.

## 权限说明 / Permissions


- `bookmarks`：读取和整理书签
- `storage`：保存主题、布局和界面状态
- `tabs`：打开独立工作台页面

- `bookmarks`: read and update bookmark data
- `storage`: save theme, layout, and UI state
- `tabs`: open the standalone dashboard page

## 当前状态 / Current Status

当前版本已经可以作为可用的书签整理工具使用，也适合作为后续扩展更高级整理能力的基础。

This project is already usable as a visual bookmark organizer and is a good base for future features like duplicate detection, broken link checks, custom sorting, and smarter categorization.
