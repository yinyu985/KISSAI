# KISSAI

KISSAI (Keep It Simple, Stupid AI) 是一个极简的 AI 交互界面，提供网页版本和用户脚本（油猴脚本）两个版本，让你能够在任何网页上快速与 AI 进行交互。

## 项目说明

### 名称由来

项目名为 KISSAI，取自设计原则 "Keep It Simple, Stupid" 的缩写。我们希望保持界面简单易用，专注于核心功能，不添加过多复杂特性，让 AI 交互变得简单直接。

### 项目结构

本项目包含两个主要版本：

1. **网页版** (`index.html`, `js/`, `css/style.css`)
   - 完整的网页应用
   - 模块化架构：`app.js`、`api.js`、`config.js`、`utils.js`、`storage.js`、`markdown.js`、`i18n.js`
   - 支持多提供商配置
   - 提供完整的对话历史记录
   - 支持模型管理和角色预设
   - 智能滚动条导航系统

2. **用户脚本版** (`kissai.js`)
   - 浏览器扩展脚本（油猴脚本）
   - 可在任何网页上使用
   - 双击选择文本即可快速操作
   - 提供总结、解释、翻译、对话等功能

### 主要特性

- **OpenAI 兼容接口**：支持所有使用 OpenAI API 格式的 AI 提供商
- **多提供商管理**：可配置多个 API 服务，灵活切换使用
- **流式输出**：支持 Server-Sent Events，实时显示 AI 回复
- **对话历史**：本地保存聊天记录，支持历史对话回顾
- **角色预设**：内置多种角色设定，快速切换对话风格
- **双形态部署**：提供网页版和油猴脚本版，适应不同使用场景
- **智能滚动导航**：可视化消息定位，快速跳转到任意对话
- **主题切换**：支持暗色/亮色模式，毛玻璃效果
- **国际化支持**：中文/英文界面切换

### 最近更新 (2025-02-05)

#### 代码重构与优化
- **模块化拆分**：将 `app.js` 拆分为 7 个独立模块，提升代码可维护性
  - `config.js`：配置常量和默认数据
  - `utils.js`：DOM 缓存、工具函数、防抖节流
  - `storage.js`：LocalStorage 操作、数据迁移
  - `markdown.js`：Markdown 渲染、流式处理
  - `api.js`：API 请求、SSE 流式响应
  - `i18n.js`：国际化翻译系统
  - `app.js`：主应用逻辑

#### 性能优化
- DOM 元素缓存，避免重复查询
- 事件监听使用防抖/节流
- 历史记录渲染使用 DocumentFragment
- 流式输出使用 requestAnimationFrame 节流

#### 安全增强
- XSS 防护：HTML 转义处理
- 使用 DOM API 设置 dataset，避免 innerHTML 注入
- ID 使用 parseFloat 处理浮点数精度

#### UI/UX 改进
- **智能滚动条导航**
  - 毛玻璃背景效果
  - 线条刻度设计（活跃状态更粗更亮）
  - 单条消息居中显示
  - 消息少时刻度不分散（最大间距 40px）
  - 点击刻度将消息滚动到屏幕中央
  - 支持暗色/亮色模式

- **光标优化**
  - 统一使用细竖线光标（2px 宽）
  - 淡入淡出动画替代闪烁
  - 移除等待时的 "..." 文本
  - 流式渲染时实时显示代码复制按钮

- **设置界面优化**
  - 设置容器高度从 60vh 提升到 70vh
  - 系统提示词输入框使用 flex 布局填满空间
  - Provider 列表支持滚动（隐藏滚动条）
  - 修复 context-limit 下拉菜单自适应宽度

#### Bug 修复
- 修复删除 Provider/Role 功能失败（parseFloat 处理 ID）
- 修复 API 错误重复显示问题
- 修复请求失败时空消息气泡残留
- 修复滚动条刻度超出边界
- 修复 Provider 编辑图标重复显示

### 安装使用

#### 用户脚本版
1. 安装 Tampermonkey 或其他用户脚本管理器
2. 将 `kissai.js` 安装到浏览器
3. 在任意网页双击选择文本即可使用 AI 工具

### 配置

- 在网页版中点击设置按钮配置模型提供商和 API 密钥
- 在用户脚本中直接编辑 `kissai.js` 文件中的 `CONFIG` 部分

### 支持的提供商

兼容所有 OpenAI API 格式的服务：

- **Groq**：高速推理的 Llama、Mixtral 等开源模型
- **Cerebras**：高性能 Llama 3.3 70B 等模型
- **本地服务**：Ollama、LocalAI 等自部署方案
- **代理服务**：OneAPI、OpenRouter 等聚合平台
- **其他兼容服务**：任何支持 OpenAI API 格式的提供商

### 技术栈

- 纯原生 JavaScript (ES6+)，无框架依赖
- CSS3 + CSS 变量实现主题切换
- markdown-it 渲染 Markdown
- highlight.js 代码高亮
- Lucide Icons 图标库
- LocalStorage 数据持久化

### 许可证

MIT License
