# 文件搜索 (File Search)

基于 Electron + React 的本地文件快速搜索工具，支持目录索引与全局快捷键唤出，轻量、可离线使用。

---

## 功能

- **快速搜索**：对已索引目录内的文件/文件夹按名称或路径模糊搜索
- **目录索引**：在设置中添加需要索引的目录，支持「浏览」选择文件夹；索引结果持久化到本地
- **全局快捷键**：`Ctrl + Space` 或 `Ctrl + Shift + Space` 唤出**独立搜索弹窗**（置顶小窗口，任意界面下可用）
- **后台运行**：关闭主窗口后应用缩到系统托盘，快捷键照常唤出搜索；右键托盘可「显示主窗口」或「退出」
- **打开与定位**：回车打开选中项，支持在资源管理器中显示文件位置
- **纯本地**：索引与搜索均在本地完成，无网络依赖

---

## 技术栈

- **前端**：React 18、TypeScript、Vite、Lucide React
- **桌面**：Electron（主进程索引与搜索，preload 桥接）
- **存储**：electron-store（配置）、本地 JSON 文件（索引数据）

---

## 环境要求

- Node.js 18+
- npm 或 pnpm

---

## 安装与运行

```bash
# 安装依赖
npm install

# 以 Electron 桌面应用方式启动（推荐，功能完整）
npm run electron:dev
```

启动后会出现主窗口，可关闭窗口后保留在托盘；**不要**用浏览器单独打开 `http://localhost:5173`，否则搜索与索引功能不可用（界面会提示使用 `npm run electron:dev`）。

---

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 仅启动 Vite 开发服务器（浏览器访问，无搜索/索引） |
| `npm run electron:dev` | 编译 Electron 并启动桌面应用（开发模式，功能完整） |
| `npm run build` | 构建前端静态资源 |
| `npm run build:electron` | 仅编译 Electron 主进程与 preload |
| `npm run electron:build` | 构建前端 + 编译 Electron + 打包成可安装程序 |
| `npm run electron:pack` | 同上，但只输出未打包的目录（便于测试） |

---

## 使用说明

1. **首次使用**：在主窗口点击「打开设置」→ 添加要索引的目录（可点「浏览」选择）→「开始索引」。
2. **唤出搜索**：任意时刻按 `Ctrl + Space` 或 `Ctrl + Shift + Space`，会弹出独立搜索窗口（可关闭主窗口，仅用托盘 + 快捷键）。
3. **操作**：在搜索框输入关键词 → 方向键选择 → 回车打开文件/文件夹；Esc 或点击外侧关闭搜索弹窗。可在主窗口设置中清空索引或增删索引目录。

---

## 项目结构概览

```
├── electron/           # Electron 主进程与 preload
│   ├── main.ts         # 主进程：窗口、托盘、搜索弹窗、IPC、索引与搜索
│   ├── preload.ts      # 预加载脚本，暴露 electronAPI
│   └── icon.png        # 托盘/应用图标（16x16）
├── scripts/
│   └── ensure-tray-icon.js   # 缺失时生成 electron/icon.png
├── src/                # React 前端
│   ├── components/     # 搜索框、结果列表、设置面板等
│   ├── hooks/          # 搜索、索引状态与逻辑
│   └── App.tsx
├── dist/electron/      # 编译后的 Electron 入口（main.js、preload.js）
├── release/            # electron-builder 打包输出（已 gitignore）
└── package.json
```

---

## 图标

- 托盘与安装包使用 `electron/icon.png`（建议 16×16 或 32×32）。若删除该文件，可执行 `node scripts/ensure-tray-icon.js` 重新生成占位图标；也可自行替换为自定义 PNG。

---

## 许可证

MIT
