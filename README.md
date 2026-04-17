# 🛠 预设编辑增强 / Preset Editor Enhancer v2.1

SillyTavern 第三方扩展 — 优化 Chat Completion 预设编辑体验。

## 安装

**方法 A（推荐，在线安装）：** Extensions → Install Extension → 粘贴本仓库地址：
```
https://github.com/<your-username>/st-preset-enhancer
```
> 把 `<your-username>` 替换成你的 GitHub 用户名。

**方法 B（手动）：** 把 `st-preset-enhancer` 文件夹复制到：
- `data/<用户>/extensions/st-preset-enhancer/`（当前用户）
- `public/scripts/extensions/third-party/st-preset-enhancer/`（所有用户）

## 发布到 GitHub（给他人一键安装）

1. 新建公开仓库：`st-preset-enhancer`
2. 把本扩展文件放在仓库根目录（确保根目录有 `manifest.json`）
3. 修改 `manifest.json` 的 `homePage` 为你的仓库地址
4. 推送后，在酒馆里用仓库 URL 测试 `Install Extension`

> 注意：这个扩展必须以“独立仓库”发布，不要把整个 `SillyTavern` 主仓库一起推上去。

## 功能一览

### 编辑增强
| 功能 | 说明 | 开关 |
|------|------|------|
| 宏快捷栏 | `{{char}}` `{{getvar::}}` 等一键插入，含 `[]` `()` `****` `{{//}}` | ✅ 可选 |
| 自动联想 | 输入 `{{` 弹出模糊搜索，↑↓ 选择，Tab/Enter 确认 | ✅ 可选 |
| 字符计数 | 编辑框下方实时显示字符数 | ✅ 可选 |

### 预设管理
| 功能 | 说明 |
|------|------|
| 搜索替换 | 跨所有条目搜索 + 批量替换，支持正则、大小写 |
| 条目状态 | 一览所有条目 enabled/role/inject/字符数，支持一键批量开关 |
| 顺序预览 | 按实际发送顺序展示，区分相对位置和深度注入，标注 role 颜色 |
| 条目克隆 | 跨预设复制条目，可选插入位置（开头/末尾/某条目之后） |
| 预设快照 | 一键保存当前预设完整状态，随时回滚。快捷入口在「编辑」标题旁📷 |

### 变量工具
| 功能 | 说明 |
|------|------|
| 变量管理器 | 扫描 setvar/getvar，表格展示，一键复制宏 |
| 变量依赖 | 分析读写关系，检出「只读未写」「只写未读」问题 |

### 预设对比
| 功能 | 说明 |
|------|------|
| 全局搜索 | 跨所有预设搜索条目名，点击填入对比栏 |
| 栏内搜索 | 每栏独立筛选已加载预设的条目 |
| LCS diff | 红绿高亮逐行对比 |
| 保存/撤回 | 在对比面板直接编辑并写入预设 |

### 片段收藏（可选开关）
| 功能 | 说明 |
|------|------|
| 收藏片段 | 手动添加或从编辑框选中文本收藏 |
| 一键插入 | 在编辑框光标位置插入收藏的片段 |
| 导入/导出 | JSON 格式，可分享 |

## 文件结构
```
st-preset-enhancer/
├── manifest.json
├── index.js          ← 完整功能（ST 加载入口）
├── style.css
├── settings.html
├── src/              ← 按功能拆分的模块源码（供阅读，不被 ST 加载）
│   ├── core.js            常量、工具、Preset API
│   ├── autocomplete.js    自动联想
│   ├── toolbar.js         快捷栏 + 计数器
│   ├── enhance.js         enhance/scan
│   ├── varmanager.js      变量管理器 + 依赖
│   ├── searchreplace.js   搜索替换
│   ├── status.js          条目状态
│   ├── order.js           顺序预览
│   └── compare.js         预设对比
└── README.md
```

> **注意：** ST 第三方扩展不支持 ES module import，所以实际运行的是根目录 `index.js` 单文件。`src/` 仅供开发阅读。

## 兼容性
- SillyTavern 1.12+（Chat Completion Prompt Manager）
- 使用 `SillyTavern.getContext()` API
- 不修改任何核心文件

## License
MIT
