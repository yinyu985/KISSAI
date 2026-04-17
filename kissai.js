// ==UserScript==
// @name         Kiss AI
// @namespace    http://tampermonkey.net/
// @version      3.3.2
// @description  A minimalist AI assistant with multi-provider support, ported from KissAI extension.
// @author       yinyu985
// @license      MIT
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @require      https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js
// ==/UserScript==
(function () {
    'use strict';
    const CONFIG = {
        // ========== 工具栏按钮配置 ==========
        // 用户可自由增删，每个按钮包含：
        // - name: 按钮显示名称
        // - prompt: 提示词模板，{text} 会被替换为选中文本，{LANG} 会被替换为目标语言
        // - model: (可选) 指定使用的模型，格式为 "profileId:modelId"
        // - type: (可选) 设为 'dialog' 表示直接打开对话窗口
        TOOLBAR_ACTIONS: [
            {// 总结
                name: '总结',
                prompt: `You are a concise content summarizer.
                Instructions:
                1. Summarize the following passage in {LANG}.
                2. Highlight the core idea and key points; discard unnecessary details.
                3. Use natural, easy-to-read language appropriate for the target audience.
                4. Keep the style neutral and applicable to any domain (tech, business, education, etc.).
                5. Output **only** the summary – no pre-ambles or headings.
                Input: {text}
                Expected Output: A short, clear summary in {LANG}.`
            },
            {// 解释
                name: '解释',
                prompt: `You are a patient and precise technical explainer.
                Instructions:
                1. Explain the following content in {LANG}, assuming the reader has basic IT knowledge but may not be familiar with the specific topic.
                2. Break down jargon, acronyms, and complex concepts into plain language.
                3. If the content contains code, commands, or configurations, explain what each part does and why.
                4. Use short paragraphs or bullet points for clarity; avoid wall-of-text.
                5. Output **only** the explanation – no greetings, summaries, or extra commentary.
                Input: {text}
                Expected Output: A clear, structured explanation in {LANG}.`
            },
            {// 翻译
                name: '翻译',
                prompt: `You are a professional IT-technical documentation translator.
                Instructions:
                1. Translate the following content into {LANG} preserving technical accuracy.
                2. Use industry-standard terminology (e.g., "firewall" → "防火墙", "load balancer" → "负载均衡器") and keep terms consistent.
                3. Keep code blocks, variable names, CLI commands, URLs.
                4. Make the prose fluent in the target language; avoid literal, stilted translation.
                5. Output **only** the translated text – no explanations, titles, or extra remarks.
                Input: {text}
                Expected Output: A clean {LANG} version of the input respecting the rules above.`,
                model: 'groq:openai/gpt-oss-120b'
            },
            { name: '对话', type: 'dialog' }
        ],
        // ========== 通用配置 ==========
        TARGET_LANG: '简体中文',
        systemPrompt: `You are helpful assistant for IT technical documentation tasks including summarization, translation, explanation, and social media replies. Follow the instructions carefully to produce accurate and contextually appropriate outputs.`,
        // ========== API 配置 ==========
        PROFILES: [
            {
                id: 'dashscope',
                name: 'dashscope',
                apiEndpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
                apiKeys: ['XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'],
                selectedModels: ['kimi-k2.5','deepseek-v3.2','qwen3.5-flash','MiniMax-M2.5']
            },
            {
                id: 'groq',
                name: 'groq',
                // https://console.groq.com/docs/rate-limits
                apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
                apiKeys: [
                  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                  'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
                ],
                selectedModels: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'groq/compound', 'groq/compound-mini', 'moonshotai/kimi-k2-instruct-0905','meta-llama/llama-4-scout-17b-16e-instruct']
            },
            {
                id: 'cerebras',
                name: 'cerebras',
                // https://inference-docs.cerebras.ai/support/rate-limits
                apiEndpoint: 'https://api.cerebras.ai/v1/chat/completions',
                apiKeys: [
                    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
                ],
                selectedModels: ['qwen-3-235b-a22b-instruct-2507','llama3.1-8b','gpt-oss-120b','zai-glm-4.7']
            },
        ],
    };
    GM_addStyle(`
        @property --kissai-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        :root {
          --ai-bg:               rgb(0, 0, 0);
          --ai-border:           rgba(255, 255, 255, 0.1);
          --ai-shadow:           rgba(0, 0, 0, 0.6);
          --ai-hover:            rgba(30, 30, 30, 0.9);
          --ai-border-radius:    4px;
          --ai-dropdown-radius:  var(--ai-border-radius);
        }
        .ai-float-toolbar,
        .ai-dialog {
          position:         fixed !important;
          z-index:          2147483647 !important;
          box-sizing:       border-box !important;
          font-family:      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size:        12px !important;
          line-height:      1.4 !important;
          color:            #f0f0f0 !important;
          text-align:       left !important;
          text-shadow:      none !important;
          letter-spacing:   normal !important;
          word-spacing:     normal !important;
          text-transform:   none !important;
          font-weight:      normal !important;
          font-style:       normal !important;
          border-radius:    4px;
          background:       transparent;
          border:           none;
          box-shadow:       0 4px 20px rgba(0, 0, 0, 0.6);
          padding:          2px;
        }
        .ai-float-toolbar *,
        .ai-dialog * {
          box-sizing: border-box !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          letter-spacing: normal !important;
          word-spacing: normal !important;
          text-transform: none !important;
          line-height: inherit !important;
          vertical-align: baseline !important;
          float: none !important;
          clear: none !important;
        }
        .ai-float-toolbar button,
        .ai-dialog button {
          all: unset !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-sizing: border-box !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 12px !important;
          font-weight: normal !important;
          line-height: 1.2 !important;
          color: #f0f0f0 !important;
          cursor: pointer !important;
          padding: 1px 4px !important;
          margin: 0 !important;
          border: none !important;
          background: none !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          width: auto !important;
          min-width: 0 !important;
          text-decoration: none !important;
          text-indent: 0 !important;
          text-align: center !important;
          white-space: nowrap !important;
          vertical-align: middle !important;
          position: relative !important;
          transform: none !important;
          opacity: 1 !important;
          visibility: visible !important;
        }
        [class^="ai-"]::selection,
        [class^="ai-"] *::selection,
        [class*=" ai-"]::selection,
        [class*=" ai-"] *::selection {
          background: rgba(34, 197, 94, 0.6) !important;
          color: #ffffff !important;
          text-shadow: none !important;
        }
        .ai-float-toolbar::before,
        .ai-dialog::before,
        .ai-float-toolbar::after,
        .ai-dialog::after {
          content:          '';
          position:         absolute;
          left:             0;
          top:              0;
          right:            0;
          bottom:           0;
          z-index:          -2;
          border-radius:    inherit;
          pointer-events:   none;
          box-sizing:       border-box;
        }
        .ai-float-toolbar::before,
        .ai-dialog::before {
          background:       conic-gradient(from var(--kissai-angle), red, orange, yellow, green, cyan, blue, purple, red);
          animation:        ai-border-spin 3s linear infinite;
          inset:            -1px;
        }
        .ai-float-toolbar::after,
        .ai-dialog::after {
          background:       rgb(0, 0, 0);
          z-index:          -1;
          border-radius:    inherit;
          inset:            1px;
        }
        .ai-toolbar-inner-container {
          display:          flex !important;
          flex-direction:   row !important;
          align-items:      center !important;
          gap:              1px !important;
          padding:          0 !important;
          margin:           0 !important;
          height:           auto !important;
          min-height:       0 !important;
          line-height:      normal !important;
        }
        .ai-float-toolbar {
          display:          none;
          pointer-events:   auto;
        }
        .ai-float-toolbar.show {
          display:          block !important;
        }
        .ai-btn,
        .ai-text-btn,
        .ai-new-chat-btn,
        .ai-history-delete,
        .ai-send-btn,
        .ai-toolbar-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1px 4px !important;
          margin: 0 !important;
          color: #f0f0f0 !important;
          font-size: 12px !important;
          font-weight: normal !important;
          white-space: nowrap !important;
          cursor: pointer !important;
          line-height: 1.2 !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          text-decoration: none !important;
          text-indent: 0 !important;
          vertical-align: middle !important;
          float: none !important;
          position: relative !important;
          transform: none !important;
          border-radius: var(--ai-border-radius) !important;
          outline: none !important;
          box-shadow: none !important;
        }
        .ai-btn,
        .ai-text-btn,
        .ai-new-chat-btn,
        .ai-history-delete,
        .ai-send-btn {
          background: #2a2a2a !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }
        .ai-toolbar-btn {
          background: none !important;
          border: none !important;
        }
        .ai-dialog {
          background:       transparent;
          width:            480px;
          min-height:       80px;
          max-height:       95vh;
          min-width:        300px;
          display:          none;
          flex-direction:   column;
          resize:           none;
          overflow:         visible;
        }
        .ai-dialog.show {
          display:          flex !important;
          flex-direction:   column !important;
        }
        .ai-resize-handle {
          position: absolute;
          right: 0;
          bottom: 0;
          width: 16px;
          height: 16px;
          cursor: nwse-resize;
          z-index: 10;
        }
        .ai-dialog-header {
          display:          flex !important;
          flex-direction:   row !important;
          align-items:      center !important;
          justify-content:  space-between !important;
          flex-shrink:      0 !important;
          padding:          1px 4px !important;
          margin:           0 !important;
          box-sizing:       border-box !important;
          background-color: var(--ai-hover) !important;
          border-bottom:    1px solid var(--ai-border) !important;
          border-radius:    calc(var(--ai-border-radius) - 2px) calc(var(--ai-border-radius) - 2px) 0 0 !important;
          cursor:           move !important;
          user-select:      none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          position:         relative !important;
          height:           auto !important;
          min-height:       0 !important;
          line-height:      normal !important;
        }
        .ai-header-left {
          display: flex !important;
          align-items: center !important;
          flex: 1 !important;
          min-width: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ai-header-right {
          display: flex !important;
          align-items: center !important;
          gap: 2px !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ai-model-dropdown {
          position: relative !important;
          width: auto !important;
          display: flex !important;
          align-items: center !important;
          min-width: 0 !important;
          max-width: 300px !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ai-model-select-trigger {
          display: inline-block !important;
          width: auto !important;
          max-width: 100% !important;
          height: auto !important;
          min-height: 0 !important;
          padding: 2px 0 !important;
          padding-left: 5px !important;
          margin: 0 !important;
          border: none !important;
          background: transparent !important;
          color: #f0f0f0 !important;
          font-size: 12px !important;
          font-weight: normal !important;
          cursor: pointer !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          text-align: left !important;
          line-height: 1.2 !important;
          text-decoration: none !important;
          text-indent: 0 !important;
          vertical-align: middle !important;
        }
        .ai-model-options,
        .ai-history-dropdown {
          position: fixed !important;
          display: none;
          background: #2a2a2a !important;
          border: 1px solid var(--ai-border) !important;
          border-radius: var(--ai-dropdown-radius) !important;
          z-index: 9999 !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          padding: 1px !important;
          pointer-events: auto !important;
          max-height: 60vh !important;
          overflow-y: auto !important;
        }
        .ai-model-options,
        .ai-history-dropdown,
        .ai-dialog-content {
          scrollbar-width: thin;
          scrollbar-color: #4a90e2 transparent;
        }
        .ai-model-options::-webkit-scrollbar,
        .ai-history-dropdown::-webkit-scrollbar,
        .ai-dialog-content::-webkit-scrollbar {
          width: 2px;
        }
        .ai-model-options::-webkit-scrollbar-track,
        .ai-history-dropdown::-webkit-scrollbar-track,
        .ai-dialog-content::-webkit-scrollbar-track {
          background: transparent;
        }
        .ai-model-options::-webkit-scrollbar-thumb,
        .ai-history-dropdown::-webkit-scrollbar-thumb,
        .ai-dialog-content::-webkit-scrollbar-thumb {
          background-color: #4a90e2;
          border-radius: var(--ai-border-radius);
        }
        .ai-model-options.show,
        .ai-history-dropdown.show {
          display: block !important;
        }
        .ai-model-option {
          padding: 2px 4px !important;
          margin: 0 !important;
          color: #888 !important;
          cursor: pointer !important;
          font-size: 12px !important;
          font-weight: normal !important;
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: none !important;
          line-height: 1.2 !important;
          height: auto !important;
          min-height: 0 !important;
          display: flex !important;
          align-items: center !important;
          text-align: left !important;
          border-radius: var(--ai-border-radius) !important;
          text-decoration: none !important;
          text-indent: 0 !important;
        }
        .ai-model-option:hover {
          background: var(--ai-hover) !important;
          color: #f0f0f0 !important;
        }
        .ai-model-option.selected {
          background: transparent !important;
          color: #f0f0f0 !important;
        }
        .ai-history-delete:hover {
          background: rgba(255, 0, 0, 0.2) !important;
          color: #ff6666 !important;
        }
        .ai-history-item {
          padding: 1px 4px !important;
          margin: 0 !important;
          border-radius: var(--ai-border-radius) !important;
          cursor: pointer !important;
          font-size: 12px !important;
          font-weight: normal !important;
          color: #888 !important;
          border-bottom: 1px solid rgba(255,255,255,0.03) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 4px !important;
          line-height: 1.2 !important;
          height: auto !important;
          min-height: 0 !important;
          text-decoration: none !important;
          text-indent: 0 !important;
        }
        .ai-history-item:last-child {
          border-bottom: none !important;
        }
        .ai-history-item:hover {
          background: rgba(30, 30, 30, 0.9) !important;
          color: #f0f0f0 !important;
        }
        .ai-history-time {
          font-size: 12px !important;
          font-weight: normal !important;
          opacity: 0.6 !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
          line-height: 1.2 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ai-history-summary {
          flex: 1 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          line-height: 1.2 !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .ai-dialog-content {
          flex:             1 1 auto !important;
          overflow-y:       auto !important;
          overflow-x:       hidden !important;
          padding:          4px;
          min-height:       20px;
          box-sizing:       border-box;
          user-select:      text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
        }
        .ai-message {
          display:          flex;
          gap:              2px;
          margin-bottom:    2px;
        }
        .ai-message.user-message {
          justify-content:  flex-end;
          margin-left:      1%;
          margin-right:     0%;
        }
        .ai-message:not(.user-message) {
          justify-content:  flex-start;
          margin-right:     1%;
          margin-left:      0%;
        }
        .ai-message-content {
          max-width:        99%;
          padding:          2px 6px !important;
          border-radius:    var(--ai-border-radius);
          font-size:        12px !important;
          line-height:      1.4 !important;
          font-family:      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          background:       rgba(30, 30, 30, 0.9);
          overflow:         visible;
          word-wrap:        break-word;
          color:            #f0f0f0 !important;
          user-select:      text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          white-space:      normal !important;
          flex:             0 1 auto;
        }
        .ai-message.user-message .ai-message-content {
          background-color: #4a90e2;
          color:            #fff !important;
          white-space: normal !important;
          margin-left:      2%;
          margin-right:     2%;
        }
        .ai-message:not(.user-message) .ai-message-content {
          white-space: normal !important;
          margin-left:      2%;
          margin-right:     2%;
        }
        .ai-compact-message {
          padding: 2px 6px !important;
          margin: 0 2px !important;
          font-size: 12px !important;
          line-height: 1.4 !important;
          color: #888 !important;
          font-style: italic;
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          max-width: 96% !important;
        }
        .ai-message-content span:only-child {
          display:          flex !important;
          align-items:      center !important;
          min-height:       14px !important;
        }
        .ai-message-content * {
          font-size: 12px !important;
          line-height: 1.4 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .ai-footer-area {
          display:          flex !important;
          flex-direction:   row !important;
          align-items:      center !important;
          flex-shrink:      0 !important;
          gap:              1px !important;
          padding:          1px 4px !important;
          margin:           0 !important;
          box-sizing:       border-box !important;
          border-top:       1px solid var(--ai-border) !important;
          border-radius:    0 0 calc(var(--ai-border-radius) - 2px) calc(var(--ai-border-radius) - 2px) !important;
          background-color: rgba(0,0,0,0.2) !important;
          height:           auto !important;
          min-height:       0 !important;
          line-height:      normal !important;
        }
        .ai-input-field {
          flex: 1 !important;
          padding: 2px 4px !important;
          font-size: 12px !important;
          font-weight: normal !important;
          color: #f0f0f0 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: var(--ai-border-radius) !important;
          background: transparent !important;
          resize: none !important;
          outline: none !important;
          line-height: 1.4 !important;
          min-height: calc(12px * 1.4 + 4px) !important;
          max-height: calc(12px * 1.4 * 3 + 4px) !important;
          height: auto;
          overflow-y: hidden;
          overflow-x: hidden !important;
          scrollbar-width: none;
          box-shadow: none !important;
          text-shadow: none !important;
          margin: 0 !important;
          text-indent: 0 !important;
          text-decoration: none !important;
        }
        .ai-input-field::-webkit-scrollbar {
          display: none;
        }
        .ai-input-field:focus {
          outline: none !important;
          box-shadow: none !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .ai-send-btn {
          transition: background 0.2s !important;
          align-self: stretch !important;
          height: auto !important;
        }
        .ai-send-btn:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
        @keyframes ai-border-spin {
          to { --kissai-angle: 360deg; }
        }
        .ai-dialog-content pre {
          background: #1e1e1e !important;
          padding: 6px 8px !important;
          border-radius: 4px;
          overflow-x: auto;
          margin: 4px 0 !important;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .ai-dialog-content code {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
          background: rgba(255,255,255,0.1) !important;
          padding: 1px 4px !important;
          border-radius: 3px;
        }
        .ai-dialog-content pre code {
          background: none !important;
          padding: 0 !important;
        }
        .ai-dialog-content p {
          margin: 2px 0 !important;
        }
        .ai-dialog-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 4px 0;
          background: rgba(255,255,255,0.02);
        }
        .ai-dialog-content th,
        .ai-dialog-content td {
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 4px 6px;
          text-align: left;
          vertical-align: top;
        }
        .ai-dialog-content th {
          background: rgba(255,255,255,0.05);
          font-weight: bold;
        }
        .ai-dialog-content tr:nth-child(even) {
          background: rgba(255,255,255,0.02);
        }
        .ai-dialog-content strong,
        .ai-dialog-content b {
          font-weight: bold !important;
          color: #f0f0f0 !important;
        }
        .ai-dialog-content em,
        .ai-dialog-content i {
          font-style: italic !important;
          color: #888 !important;
        }
        .ai-dialog-content blockquote {
          margin: 0 !important;
          padding: 2px 8px !important;
          border-left: 3px solid #4a90e2;
          background: rgba(255,255,255,0.02);
          color: #888 !important;
        }
        .ai-dialog-content hr {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 6px 0;
        }
        .ai-dialog-content img {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
          margin: 4px 0;
        }
        .ai-dialog-content a {
          color: #58a6ff;
          text-decoration: underline;
        }
        .ai-dialog-content a:hover {
          color: #79c0ff;
          text-decoration: none;
        }
        .ai-dialog-content ul,
        .ai-dialog-content ol {
          margin: 2px 0 !important;
          padding-left: 18px !important;
        }
        .ai-dialog-content li {
          margin: 0.2em 0 !important;
          padding-left: 0 !important;
        }
        .ai-dialog.magnify {
          position: fixed !important;
          height: 100vh !important;
          max-width: none !important;
          max-height: none !important;
          min-width: none !important;
          min-height: none !important;
          resize: none !important;
          z-index: 2147483647 !important;
        }
        .ai-dialog.magnify .ai-dialog-header {
          cursor: default !important;
        }
        .ai-dialog.magnify .ai-dialog-content {
          flex: 1 !important;
          height: calc(100vh - 120px) !important;
        }
        .ai-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background: #4a90e2;
          vertical-align: text-bottom;
          animation: ai-cursor-blink 1s ease-in-out infinite;
        }
        @keyframes ai-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
    `);
    // Markdown 流式处理器 - 修复未闭合的语法并过滤思考内容
    class MarkdownStreamFixer {
        preprocessContent(content) {
            if (!content) return content;
            let result = content;
            result = this.removeThinkingContent(result);
            result = this.fixCodeBlocks(result);
            result = this.fixInlineCode(result);
            result = this.fixEmphasis(result);
            result = this.fixLinks(result);
            return result;
        }
        removeThinkingContent(content) {
            // 移除完整的 <think>...</think> 块
            content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
            // 移除未闭合的 <think>... (流式输出中可能还没收到闭合标签)
            content = content.replace(/<think>[\s\S]*$/gi, '');
            return content.trim();
        }
        fixCodeBlocks(content) {
            const matches = content.match(/```/g);
            if (matches && matches.length % 2 !== 0) {
                return content + '\n```';
            }
            return content;
        }
        fixInlineCode(content) {
            const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
            const backtickCount = (withoutCodeBlocks.match(/`/g) || []).length;
            if (backtickCount % 2 !== 0) {
                return content + '`';
            }
            return content;
        }
        fixEmphasis(content) {
            const withoutCode = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
            const doubleStarCount = (withoutCode.match(/\*\*/g) || []).length;
            if (doubleStarCount % 2 !== 0) {
                content += '**';
            }
            const updatedWithoutCode = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '').replace(/\*\*/g, '');
            const singleStarCount = (updatedWithoutCode.match(/\*/g) || []).length;
            if (singleStarCount % 2 !== 0) {
                content += '*';
            }
            return content;
        }
        fixLinks(content) {
            if (/\[[^\]]*\]\([^)]*$/.test(content)) {
                return content + ')';
            }
            if (/\[[^\]]*\]\[[^\]]*$/.test(content)) {
                return content + ']';
            }
            return content;
        }
    }
    class AIAssistant {
        constructor() {
            this.toolbar = null;
            this.dialog = null;
            this.modelSelect = null;
            this.modelOptions = null;
            this.historyDropdown = null;
            this.currentRequest = null;
            this.requestState = {
                isRequesting: false,
                abortController: null,
                retryTimeout: null
            };
            this.uiState = {
                isDialogOpen: false,
                isToolbarVisible: false,
                isModelDropdownOpen: false,
                isHistoryDropdownOpen: false,
                isMagnified: false,
                selectedText: '',
                isDragging: false,
                isComposing: false
            };
            this.conversationState = {
                currentConversation: null,
                currentModel: null,
                availableModels: [],
                dialogPosition: null,
                dialogInitEvent: null
            };
            this.markdownState = new MarkdownStreamFixer();
            this.init();
        }
        updateConversationState(updates) {
            Object.assign(this.conversationState, updates);
        }
        updateRequestState(updates) {
            Object.assign(this.requestState, updates);
        }
        get selectedText() { return this.uiState.selectedText; }
        get currentModel() { return this.conversationState.currentModel; }
        set currentModel(value) { this.conversationState.currentModel = value; }
        get availableModels() { return this.conversationState.availableModels; }
        set availableModels(value) { this.conversationState.availableModels = value; }
        get dialogPosition() { return this.conversationState.dialogPosition; }
        set dialogPosition(value) { this.conversationState.dialogPosition = value; }
        get dialogInitEvent() { return this.conversationState.dialogInitEvent; }
        init() {
            this.initMarkdown();
            this.createToolbar();
            this.createDialog();
            this.bindEvents();
            this.setupResizer();
            this.setDefaultModel();
        }
        closeAllDropdowns() {
            this.modelOptions.classList.remove('show');
            this.historyDropdown.classList.remove('show');
            this.dialog.classList.remove('menu-open');
            this.uiState.isModelDropdownOpen = false;
            this.uiState.isHistoryDropdownOpen = false;
        }
        positionDropdown(element) {
            const dialogRect = this.dialog.getBoundingClientRect();
            const headerHeight = this.dialog.querySelector('.ai-dialog-header').offsetHeight;
            element.style.top = `${dialogRect.top + headerHeight}px`;
            element.style.left = `${dialogRect.left + dialogRect.width * 0.01}px`;
            element.style.width = `${dialogRect.width * 0.98}px`;
        }
        showStatusMessage(contentEl, html) {
            if (contentEl && contentEl.parentNode) {
                contentEl.innerHTML = '';
                const compactMsg = document.createElement('div');
                compactMsg.className = 'ai-compact-message';
                compactMsg.innerHTML = html;
                contentEl.parentNode.replaceChild(compactMsg, contentEl);
            } else {
                this.appendCompactMessage(html);
            }
        }
        initMarkdown() {
            if (typeof markdownit !== 'undefined') {
                window.md = markdownit({
                    html: true,
                    breaks: true,
                    linkify: true,
                    typographer: false,
                    quotes: '""\'\'',
                    highlight: function (str, lang) {
                        if (lang && typeof hljs !== 'undefined' && hljs.getLanguage(lang)) {
                            try {
                                return '<pre class="hljs"><code>' +
                                    hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
                                    '</code></pre>';
                            } catch (__) { }
                        }
                        return '<pre><code>' + window.md.utils.escapeHtml(str) + '</code></pre>';
                    },
                    tables: true,
                    taskLists: true,
                    sup: true,
                    footnote: true,
                    deflist: true,
                    abbr: true,
                    mark: true,
                    ins: true,
                    del: true
                });
                const defaultRender = window.md.renderer.rules.link_open || function (tokens, idx, options, env, renderer) {
                    return renderer.renderToken(tokens, idx, options);
                };
                window.md.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
                    const token = tokens[idx];
                    token.attrSet('target', '_blank');
                    token.attrSet('rel', 'noopener noreferrer');
                    return defaultRender(tokens, idx, options, env, renderer);
                };
            }
        }
        createToolbar() {
            this.toolbar = document.createElement('div');
            this.toolbar.className = 'ai-float-toolbar';
            const innerContainer = document.createElement('div');
            innerContainer.className = 'ai-toolbar-inner-container';
            // 从配置读取工具栏按钮
            CONFIG.TOOLBAR_ACTIONS.forEach(action => {
                const btn = document.createElement('button');
                btn.className = 'ai-toolbar-btn';
                btn.textContent = action.name;
                if (action.type === 'dialog') {
                    btn.onclick = (e) => { e.stopPropagation(); this.handleDirectDialog(e); };
                } else {
                    btn.onclick = (e) => { e.stopPropagation(); this.handleAction(action, e); };
                }
                innerContainer.appendChild(btn);
            });
            this.toolbar.appendChild(innerContainer);
            document.body.appendChild(this.toolbar);
        }
        createDialog() {
            this.dialog = document.createElement('div');
            this.dialog.className = 'ai-dialog';
            this.dialog.innerHTML = `
                <div class="ai-dialog-header">
                    <div class="ai-header-left">
                        <div class="ai-model-dropdown">
                            <button class="ai-model-select-trigger">Select Model</button>
                            <div class="ai-model-options"></div>
                        </div>
                    </div>
                    <div class="ai-header-right">
                        <button class="ai-text-btn" id="ai-magnify-btn" title="放大模式">放大模式</button>
                        <button class="ai-text-btn" id="ai-new-chat-btn" title="新建对话">新建对话</button>
                        <button class="ai-text-btn" id="ai-history-btn" title="历史记录">历史记录</button>
                    </div>
                </div>
                <div class="ai-history-dropdown"></div>
                <div class="ai-dialog-content"></div>
                <div class="ai-footer-area">
                    <textarea class="ai-input-field" placeholder="提问..." rows="1"></textarea>
                    <button class="ai-send-btn">发送消息</button>
                </div>
                <div class="ai-resize-handle"></div>
            `;
            document.body.appendChild(this.dialog);
            this.modelSelect = this.dialog.querySelector('.ai-model-select-trigger');
            this.modelOptions = this.dialog.querySelector('.ai-model-options');
            this.historyDropdown = this.dialog.querySelector('.ai-history-dropdown');
            this.updateModelList();
            this.setDefaultModel();
        }
        setDefaultModel(force = false) {
            if (!force && this.currentModel) return;
            if (CONFIG.PROFILES.length === 0 || CONFIG.PROFILES[0].selectedModels.length === 0) return;
            const firstProfile = CONFIG.PROFILES[0];
            const firstModel = firstProfile.selectedModels[0];
            this.currentModel = `${firstProfile.id}:${firstModel}`;
            const currentModelObj = this.availableModels.find(m => m.value === this.currentModel);
            if (currentModelObj) {
                this.modelSelect.textContent = currentModelObj.label;
            }
        }
        updateModelList() {
            this.availableModels = [];
            this.modelOptions.innerHTML = '';
            CONFIG.PROFILES.forEach(profile => {
                profile.selectedModels.forEach(modelId => {
                    const value = `${profile.id}:${modelId}`;
                    const label = `${profile.name}:${modelId}`;
                    this.availableModels.push({ value, label, modelId, profileId: profile.id });
                    const option = document.createElement('div');
                    option.className = 'ai-model-option';
                    option.dataset.value = value;
                    option.dataset.label = label;
                    option.textContent = label;
                    if (value === this.currentModel) {
                        option.classList.add('selected');
                    }
                    this.modelOptions.appendChild(option);
                });
            });
        }
        setupResizer() {
            const handle = this.dialog.querySelector('.ai-resize-handle');
            let startX, startY, startWidth, startHeight;
            const onMouseDown = (e) => {
                e.preventDefault();
                e.stopPropagation();
                startX = e.clientX;
                startY = e.clientY;
                startWidth = parseInt(document.defaultView.getComputedStyle(this.dialog).width, 10);
                startHeight = parseInt(document.defaultView.getComputedStyle(this.dialog).height, 10);
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            const onMouseMove = (e) => {
                const newWidth = startWidth + e.clientX - startX;
                const newHeight = startHeight + e.clientY - startY;
                if (newWidth > 300) this.dialog.style.width = newWidth + 'px';
                if (newHeight > 200) this.dialog.style.height = newHeight + 'px';
            };
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            handle.addEventListener('mousedown', onMouseDown);
        }
        bindEvents() {
            this.dialog.querySelector('.ai-send-btn').onclick = () => this.sendMessage();
            const input = this.dialog.querySelector('.ai-input-field');
            input.addEventListener('compositionstart', () => { this.uiState.isComposing = true; });
            input.addEventListener('compositionend', () => {
                this.uiState.isComposing = false;
                this.adjustTextareaHeight();
            });
            input.addEventListener('input', () => { this.adjustTextareaHeight(); });
            input.addEventListener('paste', () => { setTimeout(() => this.adjustTextareaHeight(), 0); });
            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !this.uiState.isComposing) {
                    e.preventDefault();
                    this.sendMessage();
                }
            };
            input.onclick = () => this.closeAllDropdowns();
            const contentArea = this.dialog.querySelector('.ai-dialog-content');
            contentArea.onclick = () => this.closeAllDropdowns();
            this.dialog.querySelector('#ai-new-chat-btn').onclick = () => {
                this.closeAllDropdowns();
                this.startNewConversation();
            };
            this.dialog.querySelector('#ai-history-btn').onclick = (e) => {
                e.stopPropagation();
                this.toggleHistory();
            };
            this.dialog.querySelector('#ai-magnify-btn').onclick = (e) => {
                e.stopPropagation();
                this.toggleMagnify();
            };
            this.modelSelect.onclick = (e) => {
                e.stopPropagation();
                this.historyDropdown.classList.remove('show');
                this.uiState.isHistoryDropdownOpen = false;
                this.modelOptions.classList.toggle('show');
                const isModelOptionsOpen = this.modelOptions.classList.contains('show');
                this.uiState.isModelDropdownOpen = isModelOptionsOpen;
                if (isModelOptionsOpen) {
                    this.positionDropdown(this.modelOptions);
                    this.dialog.classList.add('menu-open');
                } else {
                    this.dialog.classList.remove('menu-open');
                }
            };
            this.modelOptions.onclick = (e) => {
                if (e.target.classList.contains('ai-model-option')) {
                    const value = e.target.dataset.value;
                    if (this.currentModel === value) {
                        this.closeAllDropdowns();
                        return;
                    }
                    this.currentModel = value;
                    this.modelSelect.textContent = e.target.dataset.label;
                    this.dialog.querySelectorAll('.ai-model-option').forEach(opt => opt.classList.remove('selected'));
                    e.target.classList.add('selected');
                    this.modelOptions.classList.remove('show');
                    this.dialog.classList.remove('menu-open');
                    if (this.conversationState.currentConversation && this.conversationState.currentConversation.messages.length > 0) {
                        const messages = this.conversationState.currentConversation.messages;
                        const lastMsg = messages[messages.length - 1];
                        if (lastMsg.role === 'assistant') {
                            messages.pop();
                        }
                        const newLastMsg = messages[messages.length - 1];
                        if (newLastMsg && newLastMsg.role === 'user') {
                            const modelObj = this.availableModels.find(m => m.value === value);
                            const modelDisplayName = modelObj ? modelObj.label : value;
                            const tempMsgDiv = this.appendCompactMessage(`<span style="color: #4a90e2;">已切换模型为 ${modelDisplayName}，正在重新生成回答...</span>`);
                            tempMsgDiv.isTemporary = true;
                            if (this.currentRequest) {
                                this.currentRequest.abort();
                                this.currentRequest = null;
                            }
                            this.updateRequestState({
                                isRequesting: false,
                                abortController: null
                            });
                            this.performRequest();
                        }
                    }
                }
            };
            document.addEventListener('mouseup', this.handleSelection.bind(this));
            document.addEventListener('dblclick', (e) => {
                if (!e.target.closest('.ai-dialog') && !e.target.closest('.ai-float-toolbar')) {
                    if (this.dialog && this.dialog.classList.contains('show')) {
                        this.closeDialog();
                    }
                }
            });
            document.addEventListener('mousedown', (e) => {
                if (!e.target.closest('.ai-model-dropdown') && this.uiState.isModelDropdownOpen) {
                    this.modelOptions.classList.remove('show');
                    this.uiState.isModelDropdownOpen = false;
                    if (!this.uiState.isHistoryDropdownOpen) {
                        this.dialog.classList.remove('menu-open');
                    }
                }
                if (!e.target.closest('.ai-dialog') && this.uiState.isHistoryDropdownOpen) {
                    this.historyDropdown.classList.remove('show');
                    this.uiState.isHistoryDropdownOpen = false;
                    this.dialog.classList.remove('menu-open');
                }
                if (!e.target.closest('.ai-dialog') && !e.target.closest('.ai-float-toolbar')) {
                    this.hideToolbar();
                }
            });
            this.initDrag();
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.dialog.classList.contains('magnify')) {
                    this.exitMagnify();
                }
            });
        }
        initDrag() {
            const header = this.dialog.querySelector('.ai-dialog-header');
            let dragStartX, dragStartY, dialogStartX, dialogStartY;
            const onMouseDown = (e) => {
                if (e.target.closest('button') ||
                    e.target.closest('.ai-model-select-trigger') ||
                    e.target.closest('.ai-model-options') ||
                    e.target.closest('.ai-history-dropdown') ||
                    e.target.closest('.ai-dialog-content') ||
                    e.target.closest('.ai-footer-area')) {
                    return;
                }
                e.preventDefault();
                this.closeAllDropdowns();
                this.uiState.isDragging = true;
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                dialogStartX = this.dialog.offsetLeft;
                dialogStartY = this.dialog.offsetTop;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
            };
            const onMouseMove = (e) => {
                if (!this.uiState.isDragging) return;
                const dx = e.clientX - dragStartX;
                const dy = e.clientY - dragStartY;
                let newLeft = dialogStartX + dx;
                let newTop = dialogStartY + dy;
                if (!this.dialog.classList.contains('magnify')) {
                    const viewH = window.innerHeight;
                    const MARGIN = 20;
                    if (newTop < MARGIN) newTop = MARGIN;
                    if (newTop > viewH - 100) newTop = viewH - 100;
                }
                this.dialog.style.left = `${newLeft}px`;
                this.dialog.style.top = `${newTop}px`;
            };
            const onMouseUp = () => {
                this.uiState.isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
            };
            header.addEventListener('mousedown', onMouseDown);
        }
        handleSelection(e) {
            if (e.target.closest('.ai-dialog') || e.target.closest('.ai-float-toolbar')) return;
            const text = window.getSelection().toString().trim();
            if (text.length > 0) {
                this.uiState.selectedText = text;
                this.showToolbar(e);
            } else {
                this.uiState.selectedText = '';
                this.hideToolbar();
            }
        }
        showToolbar(e) {
            this.toolbar.style.display = 'block';
            const toolbarRect = this.toolbar.getBoundingClientRect();
            let x = e.clientX - toolbarRect.width / 2;
            let y = e.clientY - toolbarRect.height - 2;
            if (x < 5) x = 5;
            if (x > window.innerWidth - toolbarRect.width - 5) x = window.innerWidth - toolbarRect.width - 5;
            if (y < 5) y = e.clientY + 25;
            this.toolbar.style.left = `${x}px`;
            this.toolbar.style.top = `${y}px`;
            this.toolbar.classList.add('show');
            this.uiState.isToolbarVisible = true;
        }
        hideToolbar() {
            this.toolbar.classList.remove('show');
            this.uiState.isToolbarVisible = false;
            setTimeout(() => {
                if (!this.toolbar.classList.contains('show')) {
                    this.toolbar.style.display = 'none';
                }
            }, 200);
        }
        openDialog(event) {
            this.dialog.classList.remove('magnify');
            this.dialog.style.width = '';
            this.dialog.style.height = '';
            this.dialog.style.maxHeight = '';
            this.dialog.classList.add('show');
            this.conversationState.dialogInitEvent = event;
            this.uiState.isDialogOpen = true;
            const currentModelObj = this.availableModels.find(m => m.value === this.currentModel);
            if (currentModelObj) {
                this.modelSelect.textContent = currentModelObj.label;
            }
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.positionDialog();
                });
            });
            setTimeout(() => {
                const inputField = this.dialog.querySelector('.ai-input-field');
                if (inputField) {
                    inputField.style.height = 'auto';
                    inputField.focus();
                    this.adjustTextareaHeight();
                }
            }, 100);
        }
        positionDialog() {
            const MARGIN = 20;
            const MOUSE_OFFSET = 15;
            const viewW = window.innerWidth;
            const viewH = window.innerHeight;
            const event = this.dialogInitEvent;
            let x, y;
            const dialogW = this.dialog.offsetWidth;
            const dialogH = this.dialog.offsetHeight;
            if (dialogW > viewW - 2 * MARGIN) {
                this.dialog.style.width = `${viewW - 2 * MARGIN}px`;
            }
            if (event) {
                const mouseX = event.clientX;
                const mouseY = event.clientY;
                x = mouseX - dialogW / 2;
                x = Math.max(MARGIN, Math.min(x, viewW - dialogW - MARGIN));
                y = mouseY + MOUSE_OFFSET;
                if (y + dialogH > viewH - MARGIN) {
                    y = mouseY - dialogH - MOUSE_OFFSET;
                }
            } else {
                x = (viewW - dialogW) / 2;
                y = viewH * 0.1;
            }
            x = Math.max(MARGIN, Math.min(x, viewW - dialogW - MARGIN));
            this.dialog.style.left = `${x}px`;
            this.dialog.style.top = `${y}px`;
            if (!this.dialog.style.height) {
                const availableHeight = viewH - y - MARGIN;
                this.dialog.style.maxHeight = `${availableHeight}px`;
                if (availableHeight < 200) {
                    const newTop = Math.max(MARGIN, viewH - 300);
                    this.dialog.style.top = `${newTop}px`;
                    this.dialog.style.maxHeight = `${viewH - newTop - MARGIN}px`;
                }
            }
        }
        closeDialog() {
            this.saveCurrentConversation();
            this.dialog.classList.remove('show');
            this.uiState.isDialogOpen = false;
            if (this.currentRequest) {
                this.currentRequest.abort();
                this.currentRequest = null;
            }
            this.updateRequestState({
                isRequesting: false,
                abortController: null
            });
        }
        handleAction(action, event) {
            this.hideToolbar();
            if (!this.selectedText || this.selectedText.trim() === '') {
                return;
            }
            // action 现在是配置对象，包含 name, prompt, model 等属性
            const lang = CONFIG.TARGET_LANG;
            const instruction = action.prompt
                .replace(/{LANG}/g, lang)
                .replace(/{text}/g, this.selectedText);
            // 检查是否指定了特定模型
            let modelOverride = null;
            if (action.model) {
                const modelExists = this.availableModels.some(m => m.value === action.model);
                if (modelExists) {
                    modelOverride = action.model;
                }
            }
            this.updateConversationState({
                currentConversation: {
                    id: Date.now(),
                    messages: [
                        { role: 'system', content: CONFIG.systemPrompt + '\n\n' + instruction },
                        { role: 'user', content: this.selectedText }
                    ]
                }
            });
            this.clearDialogContent();
            this.openDialog(event);
            // 如果指定了模型，更新显示
            if (modelOverride) {
                const modelObj = this.availableModels.find(m => m.value === modelOverride);
                if (modelObj) {
                    this.modelSelect.textContent = modelObj.label;
                }
            }
            this.performRequest(modelOverride);
        }
        handleDirectDialog(event) {
            this.hideToolbar();
            this.startNewConversation();
            this.openDialog(event);
        }
        startNewConversation() {
            this.saveCurrentConversation();
            const newConversation = {
                id: Date.now(),
                messages: []
            };
            if (CONFIG.systemPrompt) {
                newConversation.messages.push({ role: 'system', content: CONFIG.systemPrompt });
            }
            this.conversationState.currentConversation = newConversation;
            this.clearDialogContent();
        }
        clearDialogContent() {
            this.dialog.querySelector('.ai-dialog-content').innerHTML = '';
        }
        saveCurrentConversation() {
            if (!this.conversationState.currentConversation || this.conversationState.currentConversation.messages.length === 0) return;
            if (this.conversationState.currentConversation.messages.length === 1 && this.conversationState.currentConversation.messages[0].role === 'system') return;
            let summary = 'New Conversation';
            const firstUserMsg = this.conversationState.currentConversation.messages.find(m => m.role === 'user');
            if (firstUserMsg) {
                summary = firstUserMsg.content.replace(/\n/g, ' ').trim();
                if (summary.length > 200) summary = summary.substring(0, 200) + '...';
            }
            const item = {
                id: this.conversationState.currentConversation.id,
                timestamp: Date.now(),
                summary: summary,
                messages: this.conversationState.currentConversation.messages
            };
            let history = GM_getValue('kiss_ai_history', []);
            history = history.filter(h => h.id !== item.id);
            history.unshift(item);
            if (history.length > 20) history.pop();
            GM_setValue('kiss_ai_history', history);
        }
        toggleHistory() {
            if (this.uiState.isHistoryDropdownOpen) {
                this.closeAllDropdowns();
                return;
            }
            this.renderHistoryList();
            this.positionDropdown(this.historyDropdown);
            this.historyDropdown.classList.add('show');
            this.dialog.classList.add('menu-open');
            this.uiState.isHistoryDropdownOpen = true;
        }
        renderHistoryList() {
            const history = GM_getValue('kiss_ai_history', []);
            this.historyDropdown.innerHTML = '';
            if (history.length === 0) {
                this.historyDropdown.innerHTML = '<div class="ai-history-item">No history</div>';
            } else {
                history.forEach(h => {
                    const div = document.createElement('div');
                    div.className = 'ai-history-item';
                    const date = new Date(h.timestamp).toLocaleString();
                    div.innerHTML = `
                        <span class="ai-history-time">${date}</span>
                        <span class="ai-history-summary">${h.summary}</span>
                        <span class="ai-history-delete" data-id="${h.id}">删除</span>
                    `;
                    div.onclick = (e) => {
                        if (e.target.classList.contains('ai-history-delete')) {
                            e.stopPropagation();
                            return;
                        }
                        this.restoreConversation(h);
                    };
                    const deleteBtn = div.querySelector('.ai-history-delete');
                    deleteBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.deleteHistoryItem(h.id);
                    };
                    this.historyDropdown.appendChild(div);
                });
            }
        }
        restoreConversation(historyItem) {
            this.saveCurrentConversation();
            this.updateConversationState({
                currentConversation: {
                    id: historyItem.id,
                    messages: historyItem.messages
                }
            });
            this.clearDialogContent();
            this.conversationState.currentConversation.messages.forEach(m => {
                if (m.role !== 'system') {
                    this.appendMessage(m.role, m.content);
                }
            });
            this.closeAllDropdowns();
        }
        deleteHistoryItem(itemId) {
            let history = GM_getValue('kiss_ai_history', []);
            history = history.filter(h => h.id !== itemId);
            GM_setValue('kiss_ai_history', history);
            this.renderHistoryList();
        }
        toggleMagnify() {
            if (this.uiState.isMagnified) {
                this.exitMagnify();
            } else {
                this.enterMagnify();
            }
        }
        enterMagnify() {
            this.updateConversationState({
                dialogPosition: {
                    x: this.dialog.offsetLeft,
                    y: this.dialog.offsetTop,
                    width: this.dialog.style.width || (this.dialog.offsetWidth + 'px'),
                    height: this.dialog.style.height || '',
                    maxHeight: this.dialog.style.maxHeight || ''
                }
            });
            this.closeAllDropdowns();
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            const availableWidth = window.innerWidth - scrollbarWidth;
            const currentWidth = this.dialog.offsetWidth;
            const expandedWidth = Math.max(Math.min(currentWidth * 1.2, availableWidth * 0.7), availableWidth * 0.5);
            const currentX = this.dialog.offsetLeft;
            const maxX = availableWidth - expandedWidth;
            let newX = currentX <= maxX ? currentX : maxX;
            if (newX < 0) newX = 0;
            if (newX + expandedWidth > availableWidth) {
                newX = availableWidth - expandedWidth;
            }
            this.dialog.classList.add('magnify');
            this.dialog.style.left = Math.max(0, newX) + 'px';
            this.dialog.style.top = '0px';
            this.dialog.style.width = expandedWidth + 'px';
            this.uiState.isMagnified = true;
        }
        exitMagnify() {
            this.dialog.classList.remove('magnify');
            if (this.dialogPosition) {
                this.dialog.style.left = `${this.dialogPosition.x}px`;
                this.dialog.style.top = `${this.dialogPosition.y}px`;
                this.dialog.style.width = this.dialogPosition.width;
                this.dialog.style.height = this.dialogPosition.height || '';
                this.dialog.style.maxHeight = this.dialogPosition.maxHeight || '';
            }
            this.uiState.isMagnified = false;
        }
        adjustTextareaHeight() {
            const textarea = this.dialog.querySelector('.ai-input-field');
            if (!textarea) return;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            const maxH = parseFloat(getComputedStyle(textarea).maxHeight);
            textarea.style.overflowY = (maxH && textarea.scrollHeight > maxH) ? 'auto' : 'hidden';
        }
        sendMessage() {
            const input = this.dialog.querySelector('.ai-input-field');
            const content = input.value.trim();
            if (!content) return;
            input.value = '';
            this.adjustTextareaHeight();
            if (!this.conversationState.currentConversation) {
                this.startNewConversation();
            }
            this.conversationState.currentConversation.messages.push({ role: 'user', content: content });
            this.appendMessage('user', content);
            if (this.requestState.isRequesting) {
                if (this.currentRequest) {
                    this.currentRequest.abort();
                    this.currentRequest = null;
                }
                this.updateRequestState({
                    isRequesting: false,
                    abortController: null
                });
            }
            this.performRequest();
        }
        appendMessage(role, text, targetElement) {
            const container = targetElement || this.dialog.querySelector('.ai-dialog-content');
            const msgDiv = document.createElement('div');
            msgDiv.className = `ai-message ${role === 'user' ? 'user-message' : 'ai-message'}`;
            const contentDiv = document.createElement('div');
            contentDiv.className = 'ai-message-content';
            if (role === 'assistant' && !text) {
                contentDiv.innerHTML = '<span class="ai-cursor"></span>';
            } else if (role === 'assistant') {
                const fixedContent = this.markdownState.preprocessContent(text);
                if (typeof window.md !== 'undefined') {
                    try {
                        contentDiv.innerHTML = window.md.render(fixedContent);
                    } catch (e) {
                        contentDiv.textContent = fixedContent;
                    }
                } else {
                    contentDiv.textContent = fixedContent;
                }
            } else {
                contentDiv.textContent = text;
            }
            msgDiv.appendChild(contentDiv);
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
            return msgDiv;
        }
        appendCompactMessage(text, targetElement) {
            const container = targetElement || this.dialog.querySelector('.ai-dialog-content');
            const msgDiv = document.createElement('div');
            msgDiv.className = 'ai-compact-message';
            msgDiv.innerHTML = text;
            container.appendChild(msgDiv);
            container.scrollTop = container.scrollHeight;
            return msgDiv;
        }
        performRequest(modelOverride = null, isRetry = false) {
            if (this.requestState.isRequesting && !isRetry) {
                console.log('请求正在进行中，取消之前的请求并开始新请求');
                if (this.currentRequest) {
                    this.currentRequest.abort();
                    this.currentRequest = null;
                }
                this.requestState.isRequesting = false;
                this.requestState.abortController = null;
            }
            const selectedModelValue = modelOverride || this.currentModel || (this.availableModels.length > 0 ? this.availableModels[0].value : null);
            if (!selectedModelValue) {
                this.appendMessage('assistant', '**Error:** 请先在设置中配置并选择模型');
                return;
            }
            const modelMeta = this.availableModels.find(m => m.value === selectedModelValue);
            if (!modelMeta) {
                this.appendMessage('assistant', '**Error:** 找不到选中的模型信息');
                return;
            }
            const profile = CONFIG.PROFILES.find(p => p.id === modelMeta.profileId);
            if (!profile) {
                this.appendMessage('assistant', '**Error:** 找不到对应的配置方案');
                return;
            }
            this.requestState.isRequesting = true;
            this.requestState.abortController = new AbortController();
            this.requestState.modelOverride = modelOverride;
            const apiKey = profile.apiKeys[Math.floor(Math.random() * profile.apiKeys.length)];
            const apiEndpoint = profile.apiEndpoint;
            const actualModelId = modelMeta.modelId;
            if (this.currentRequest) {
                this.currentRequest.abort();
                this.currentRequest = null;
            }
            if (this.requestState.retryTimeout) {
                clearTimeout(this.requestState.retryTimeout);
                this.requestState.retryTimeout = null;
            }
            this.sseBuffer = '';
            this.retryCount = this.retryCount || 0;
            this.maxRetries = 3;
            const contentArea = this.dialog.querySelector('.ai-dialog-content');
            if (contentArea) {
                const tempMessages = contentArea.querySelectorAll('.ai-message[isTemporary="true"]');
                tempMessages.forEach(msg => msg.remove());
            }
            const aiMsgDiv = this.appendMessage('assistant', '');
            const contentEl = aiMsgDiv.querySelector('.ai-message-content');
            let fullText = '';
            let lastProcessedIndex = 0;
            let requestCompleted = false;
            let lastRenderTime = 0;
            let renderFrameId = null;
            let pendingRender = false;
            const RENDER_INTERVAL = 50;
            const MIN_CHUNK_SIZE = 10;
            const renderUI = (force = false) => {
                if (renderFrameId) {
                    pendingRender = true;
                    return;
                }
                const now = Date.now();
                if (!force && now - lastRenderTime < RENDER_INTERVAL && fullText.length < MIN_CHUNK_SIZE) {
                    return;
                }
                renderFrameId = requestAnimationFrame(() => {
                    const processedContent = this.markdownState.preprocessContent(fullText);
                    if (typeof window.md !== 'undefined') {
                        try {
                            contentEl.innerHTML = window.md.render(processedContent) + '<span class="ai-cursor"></span>';
                        } catch (e) {
                            contentEl.innerHTML = processedContent + '<span class="ai-cursor"></span>';
                        }
                    } else {
                        contentEl.innerHTML = processedContent + '<span class="ai-cursor"></span>';
                    }
                    const container = this.dialog.querySelector('.ai-dialog-content');
                    if (container) {
                        const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 5;
                        if (wasAtBottom) {
                            container.scrollTop = container.scrollHeight;
                        }
                    }
                    lastRenderTime = Date.now();
                    renderFrameId = null;
                    if (pendingRender) {
                        pendingRender = false;
                        renderUI();
                    }
                });
            };
            const handleChunk = (text) => {
                fullText += text;
                renderUI();
            };
            const handleDone = () => {
                requestCompleted = true;
                if (renderFrameId) cancelAnimationFrame(renderFrameId);
                const fixedContent = this.markdownState.preprocessContent(fullText);
                if (typeof window.md !== 'undefined') {
                    try {
                        contentEl.innerHTML = window.md.render(fixedContent);
                    }
                    catch (e) {
                        contentEl.textContent = fixedContent;
                    }
                } else {
                    contentEl.textContent = fixedContent;
                }
                const container = this.dialog.querySelector('.ai-dialog-content');
                if (container) container.scrollTop = container.scrollHeight;
                this.conversationState.currentConversation.messages.push({ role: 'assistant', content: fullText });
                this.saveCurrentConversation();
                this.currentRequest = null;
                this.retryCount = 0;
                this.requestState.isRequesting = false;
                this.requestState.abortController = null;
            };
            const handleError = (errorMsg) => {
                const escaped = errorMsg.replace(/[&<>"']/g, m => ({
                    '&': '&',
                    '<': '<',
                    '>': '>',
                    '"': '"',
                    "'": '&#039;'
                })[m]);
                if (fullText.length > 0) {
                    // 已有部分内容，保留并追加错误提示
                    if (renderFrameId) cancelAnimationFrame(renderFrameId);
                    const fixedContent = this.markdownState.preprocessContent(fullText);
                    if (typeof window.md !== 'undefined') {
                        try { contentEl.innerHTML = window.md.render(fixedContent); }
                        catch (e) { contentEl.textContent = fixedContent; }
                    } else {
                        contentEl.textContent = fixedContent;
                    }
                    this.appendCompactMessage(`<span style="font-size: 12px; color: #ff6b6b; font-style: italic;">传输中断: ${escaped}</span>`);
                    this.conversationState.currentConversation.messages.push({ role: 'assistant', content: fullText });
                    this.saveCurrentConversation();
                } else {
                    this.showStatusMessage(contentEl, `<span style="font-size: 12px; color: #ff6b6b; font-style: italic;">请求失败: ${escaped}</span>`);
                }
                this.currentRequest = null;
                this.requestState.isRequesting = false;
                this.requestState.abortController = null;
            };
            let messagesToSend = this.conversationState.currentConversation.messages;
            const systemMsg = messagesToSend.find(m => m.role === 'system');
            const lastEightMsgs = messagesToSend.slice(-8);
            messagesToSend = systemMsg ? [systemMsg, ...lastEightMsgs] : lastEightMsgs;
            const requestDetails = {
                method: "POST",
                url: apiEndpoint,
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                data: JSON.stringify({
                    model: actualModelId,
                    messages: messagesToSend,
                    stream: true
                }),
                timeout: 0,
                onreadystatechange: (response) => {
                    if (response.readyState === 4 && response.status && response.status !== 200 && response.status !== 0) {
                        if (response.status === 429) {
                            if (this.retryCount >= this.maxRetries) {
                                handleError("达到最大重试次数，请稍后再试");
                                this.retryCount = 0;
                                return;
                            }
                            this.retryCount++;
                            const resetTimeHeader = response.responseHeaders?.match(/x-ratelimit-reset-tokens-minute:\s*(\d+)/);
                            const retryAfter = resetTimeHeader ? parseFloat(resetTimeHeader[1]) * 1000 : 10000;
                            this.showStatusMessage(contentEl, `<span style="font-size: 12px; color: #ff9800; font-style: italic;">达到速率限制，${Math.ceil(retryAfter / 1000)}秒后自动重试 (${this.retryCount}/${this.maxRetries})...</span>`);
                            this.requestState.retryTimeout = setTimeout(() => {
                                if (!this.requestState.isRequesting) return;
                                this.showStatusMessage(contentEl, '<span style="font-size: 12px; color: #2196f3; font-style: italic;">正在重试...</span>');
                                this.performRequest(this.requestState.modelOverride, true);
                            }, retryAfter);
                            return;
                        }
                        try {
                            const errJson = JSON.parse(response.responseText);
                            handleError(errJson.error?.message || response.responseText);
                        } catch (e) {
                            handleError(`HTTP ${response.status}`);
                        }
                        return;
                    }
                },
                onprogress: (response) => {
                    if (!response.responseText) return;
                    const responseText = response.responseText;
                    const newChunk = responseText.substring(lastProcessedIndex);
                    lastProcessedIndex = responseText.length;
                    this.sseBuffer += newChunk;
                    let newlineIndex;
                    while ((newlineIndex = this.sseBuffer.indexOf('\n')) !== -1) {
                        const line = this.sseBuffer.slice(0, newlineIndex).trim();
                        this.sseBuffer = this.sseBuffer.slice(newlineIndex + 1);
                        if (line.startsWith('data: ')) {
                            const dataStr = line.substring(6).trim();
                            if (dataStr === '[DONE]') {
                                handleDone();
                                return;
                            }
                            if (dataStr) {
                                try {
                                    const data = JSON.parse(dataStr);
                                    const deltaContent = data.choices?.[0]?.delta?.content;
                                    if (deltaContent) handleChunk(deltaContent);
                                } catch (e) { }
                            }
                        }
                    }
                },
                onload: (response) => {
                    if (response.status === 200) {
                        if (!requestCompleted) {
                            handleDone();
                        }
                    }
                },
                onerror: (err) => {
                    handleError("Network Error");
                },
                ontimeout: () => {
                    handleError("Request Timeout");
                }
            };
            try {
                this.currentRequest = GM_xmlhttpRequest(requestDetails);
            } catch (error) {
                handleError("请求初始化失败");
            }
        }
    }
    if (document.body) {
        new AIAssistant();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            new AIAssistant();
        });
    }
})();
