# homework-board

一个用于“作业/提交/学生/统计”的桌面端看板工具：Electron 主进程 + React 渲染进程，数据落地到本机 SQLite（`better-sqlite3`），并提供托盘入口与可独立悬浮的组件窗口（时间线/列表/通知）。

## 功能概览

- 托盘入口：签到、个人数据、登录、工具、组件管理、退出
- 作业：按科目查看时间线、创建/修改/删除作业、查看详情
- 签到/提交：按作业为学生创建提交记录（可填 `spent`/`feedback`）
- 学生个人：查看“未完成作业”并快速提交
- 数据页（管理员）：总览、估计/实际分配、提交时间轴（按 6 小时分箱，跳过 0~6 点）
- 管理页（管理员）：科目/标签/学生/身份/配置/操作日志/数据库
- 桌面组件（可选）：时间线、列表、通知（Markdown），支持“编辑模式”拖拽/缩放/删除并持久化

## 技术栈

- Electron 39 + `electron-vite`
- React 19 + TypeScript
- 本地数据：SQLite（`better-sqlite3`）
- 打包：`electron-builder`
- 代码质量：ESLint（flat config）+ Prettier

## 目录结构

- `src/main/`：Electron 主进程（窗口/托盘/数据/配置/组件）
- `src/preload/`：Preload（`ipcRenderer.invoke` 方式暴露 `window.data`/`window.api`）
- `src/renderer/`：渲染进程（React UI 与样式）
- `resources/`：打包额外资源（图标等）
- `electron.vite.config.ts`：electron-vite 配置（`@renderer` alias 等）
- `electron-builder.yml`：打包配置（产物、extraResources 等）
- `DATABASE.md`：数据库结构的简要说明（如与实际不一致，以 `src/main/data.ts` 为准）
- `STYLING.md`：界面与 CSS 规范（扁平化、高信息密度）

## 快速开始

### 环境要求

- Node.js 20+（CI 使用 20）
- npm（仓库包含 `package-lock.json`）

### 安装依赖

```bash
npm ci
```

`better-sqlite3` 属于原生依赖，安装阶段会执行 `electron-builder install-app-deps`（见 `postinstall`），如遇到构建失败请先确认本机编译环境就绪。

### 开发运行

```bash
npm run dev
```

### 预览运行（基于构建产物）

```bash
npm run build
npm run start
```

### 代码质量

```bash
npm run typecheck
npm run lint
npm run format
```

## 构建与打包

```bash
# 仅构建（electron-vite build，产物在 out/）
npm run build

# 打包（electron-builder，产物在 dist/）
npm run build:win
npm run build:mac
npm run build:linux

# 打包但不生成安装包（目录形式）
npm run build:unpack
```

打包配置见 `electron-builder.yml`（例如：`asar: false`、`extraResources` 将 `resources/icon.png` 复制到运行时资源目录等）。

GitHub Actions：`.github/workflows/build-windows-zip.yml` 会在打 `v*` tag 或手动触发时构建 Windows zip 并上传 artifact。

## 使用说明（从托盘开始）

- `签到`：弹出作业列表，点作业进入签到窗口（选择学生并提交）
- `个人数据`：选择学生后进入个人页（未完成作业 + 快速提交）
- `登录为...`：选择身份进入用户页（作业/数据/管理，后两者仅管理员可见）
- `工具`：规划计时（`#/schedule`）、统计器（`#/tool/statistics`）
- `组件`：
  - 非编辑模式下组件为透明/可穿透窗口
  - 进入编辑模式后可拖拽/缩放；关闭窗口会删除该组件记录
  - 组件配置通过“配置”按钮打开独立配置窗口

## 身份与权限模型

身份（`Identity`）包含 `role` 字段：

- `admin`：管理员（默认会自动创建 `0admin`）
- 其它：用英文逗号分隔的科目 id 列表（如 `math,english`），用于限制可见科目（见 `src/renderer/src/util.ts` 的 `isSubjectAccessible`）

## 数据存储（重要）

所有数据均存放在 `app.getPath('userData')` 目录下：

- `data.db`：SQLite 数据库（见 `src/main/data.ts` 初始化建表）
- `config.json`：应用配置（见 `src/main/config.ts`，可在“管理 → 配置”中修改；也可通过“打开数据目录”定位）

### 配置项

- `autoStartup`：开机自启（当前实现为 Windows 下的 `app.setLoginItemSettings`）
- `hideAll`：隐藏所有组件窗口（托盘菜单可切换）

## 数据库表（以实际代码为准）

主进程会在启动时创建这些表（`src/main/data.ts`）：

- `subjects`：科目（含 `config` JSON）
- `assignments`：作业（含 `config` JSON，关联 `subjects`）
- `students`：学生
- `submissions`：提交记录（关联 `assignments`、`students`）
- `operation_logs`：操作日志（支持 undo/redo；同时用于“进度”统计）
- `identities`：身份/权限
- `components`：桌面组件窗口（位置/尺寸/类型/配置）
- `day_record`：作业按天的估计分摊记录
- `assignment_tags`：作业标签

注意：仓库的 `DATABASE.md` 为手工摘要，字段与表名可能已演进。
提示：管理员页提供“数据库”面板，可查看表结构并执行 SQL（有写入能力，谨慎操作）。

## 开发约定

- 样式与交互：请先阅读 `STYLING.md`，基础变量在 `src/renderer/src/color.css` 与 `src/renderer/src/base.css`
- Renderer 通过 preload 暴露的 `window.data`/`window.api` 与主进程通信（`src/preload/index.ts` + `src/main/util.ts` 的 `registerApi`）
- 主要路由在 `src/renderer/src/main.tsx`（hash 路由：`#/login`、`#/user/:id`、`#/assignment/:id`、`#/comp/:id/...` 等）

## License

使用 `MIT` 许可证。见 [LICENSE](LICENSE)。

第三方依赖许可证清单见 `THIRD_PARTY_NOTICES.md`（可运行 `npm run licenses:generate` 重新生成）。
