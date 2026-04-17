# KISSAI

KISSAI (Keep It Simple, Stupid AI) 是一个轻量的 AI 交互项目，当前仓库同时包含：

1. 网页版聊天界面
2. Tampermonkey 用户脚本版

两个版本都围绕 OpenAI 兼容接口工作，但面向的使用场景不同：网页版适合日常对话和配置管理，用户脚本版适合在任意网页上做选中文本总结、解释、翻译和临时提问。

## 当前仓库结构

### 网页版

- `index.html`：页面入口
- `css/style.css`：网页端样式
- `js/app.js`：网页端主逻辑
- `js/api.js`：API 请求与流式响应处理
- `js/config.js`：常量、默认配置、默认角色
- `js/storage.js`：本地存储与数据迁移
- `js/markdown.js`：Markdown 渲染与流式修复
- `js/utils.js`：通用工具函数
- `js/i18n.js`：中英文界面文案

### 用户脚本版

- `kissai.js`：单文件 userscript，可直接安装到 Tampermonkey

### 其他

- `.github/workflows/deploy.yml`：GitHub Pages 部署配置
- `favicon.svg`：站点图标

## 当前功能

### 网页版

- 支持多个 OpenAI 兼容 Provider
- 支持模型列表管理、收藏和切换
- 支持流式输出
- 支持本地对话历史
- 支持角色预设
- 支持系统提示词配置
- 支持上下文消息数控制
- 支持中英文界面切换
- 支持亮色/暗色主题切换
- 支持配置导入导出
- 支持粘贴图片并发送多模态请求

### 用户脚本版

- 在任意网页上使用
- 选中文本后触发快捷工具栏
- 内置“总结 / 解释 / 翻译 / 对话”操作
- 支持多 Provider / 多模型配置
- 支持流式返回
- 支持本地历史记录

## 运行方式

### 网页版

这是一个纯静态项目，没有构建步骤。

可直接用任意静态文件服务器打开，例如：

```bash
python3 -m http.server 8000
```

然后访问 `http://localhost:8000`。

如果直接双击打开 `index.html`，部分浏览器环境下也能运行，但更建议走本地静态服务器。

### 用户脚本版

1. 安装 Tampermonkey
2. 新建脚本或导入 [`kissai.js`](/Users/yy/Documents/KISSAI/kissai.js)
3. 按脚本内 `CONFIG` 配置 Provider、模型和 API Key
4. 在网页中选择文本后使用工具栏

## 配置说明

### 网页版配置

配置保存在浏览器 `localStorage` 中，主要包括：

- Provider 配置
- API Key
- 模型列表
- 系统提示词
- 角色预设
- 历史记录
- 界面偏好

### 用户脚本版配置

用户脚本版当前通过直接修改 [`kissai.js`](/Users/yy/Documents/KISSAI/kissai.js) 内的 `CONFIG` 常量完成配置。

## 兼容接口

项目面向 OpenAI 兼容接口，适用于：

- Groq
- Cerebras
- Ollama / LocalAI 等本地服务
- OneAPI / OpenRouter 等聚合网关
- 其他兼容 `/chat/completions` 接口的服务

实际可用性仍取决于对应服务对流式响应、图片输入和模型枚举接口的支持情况。

## 部署

仓库已包含 GitHub Pages workflow，当前会直接部署仓库静态文件内容。

## 技术栈

- 原生 JavaScript
- 原生 CSS
- `markdown-it`
- `highlight.js`
- `Lucide Icons`
- `localStorage`
- Tampermonkey GM API

## 说明

- 网页版与用户脚本版目前是两套独立实现，不共享同一套运行时代码
- 仓库当前没有引入打包器、测试框架和 lint 流程

## 许可证

MIT
