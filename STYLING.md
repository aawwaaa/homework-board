你需要实现现代的扁平化风格，其中需要注意：

1. 色彩风格统一，参见color.css
2. 少用圆角、边距和阴影，以实用性为主，需要足够的可读性
3. 所有通用控件保持直角硬边，与 `UserPage.css` 中的整体布局一致。

## 通用组件规范（base.css）

### 标题（`h1`-`h6`）
- 使用 600 字重，行距紧凑（0.5rem 底部外边距）以强调信息密度。
- `h1` 维持 2rem、`h2` 1.6rem 并采用 `--color-subtitle`，其余标题使用 `--color-menu`，确保信息层级清晰。

### 按钮（`button`）
- 参照 `UserPage.css` 中的按钮比例，维持 0.3rem × 0.85rem 的紧凑内边距，并保持硬边（无圆角）。
- 所有按钮默认为透明背景、`--gray-tinted-4` 边线，由类名决定色彩：
  - `primary`：填充 `--color-primary`，hover 切换至 `--color-secondary`，active 使用 `--color-tertiary`，文字为白色。
  - `secondary`：填充 `--color-secondary`，hover 走向 `--color-menu`，active 过渡到更浅的 `--color-list`。
  - `outline`：透明背景、`--color-secondary` 边线，hover/active 仅改变背景为灰度强调。
  - `flat`：无边线，仅使用 `--color-menu` 文字，hover/active 改变文字颜色与轻微灰度底色。
- 禁用状态统一降低不透明度并禁止指针事件，以保证不同颜色变体表现一致。

### 输入框（`input`/`textarea`）
- 采用 0.35rem × 0.75rem 内边距与 `--gray-tinted-4` 实线边框，去除圆角以匹配整体扁平特性。
- placeholder 与 disable 状态改用更浅的灰度变量，focus 时切换到 `--color-secondary` 并轻微着色背景。

### 单选与复选（`input[type="radio"|"checkbox"]`）
- 控件尺寸固定 1rem，使用 `accent-color: --color-primary` 获得原生扁平填色，左右并排时通过 label 的 inline-flex 垂直居中。

### 下拉框（`select`）
- 与输入框共用基础硬边与边线，右侧添加扁平箭头背景，保留 2.5rem 的内边距获得统一的操作区域。

### 交互反馈
- 所有可聚焦元素采用 `outline: 2px solid --color-secondary` 的 `:focus-visible` 状态，确保键盘可访问性。
- 表单控件默认继承全局字体与颜色，在 base.css 中统一声明，避免逐页重复设置。

## 界面设计

1. 保持高信息密度，包括：
  - 若输入框有placeholder，不要额外添加标签
  - 若界面布局已说明语义，不要添加标签
  - 不要加入不必要的box