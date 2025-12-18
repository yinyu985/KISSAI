
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
        PROFILES: [
            {
                id: 'cerebras-1',
                name: 'cerebras-1',
                apiEndpoint: 'https://api.cerebras.ai/v1/chat/completions',
                apiKey: 'csk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                selectedModels: ['llama-3.3-70b', 'gpt-oss-120b', 'qwen-3-235b-a22b-instruct-2507', 'zai-glm-4.6']
            },
            {
                id: 'cerebras-2',
                name: 'cerebras-2',
                apiEndpoint: 'https://api.cerebras.ai/v1/chat/completions',
                apiKey: 'csk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                selectedModels: ['llama-3.3-70b', 'gpt-oss-120b', 'qwen-3-235b-a22b-instruct-2507', 'zai-glm-4.6']
            },
            {
                id: 'groq-2',
                name: 'groq-2',
                apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
                apiKey: 'gsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                selectedModels: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'moonshotai/kimi-k2-instruct-0905']
            },
            {
                id: 'groq-1',
                name: 'groq-1',
                apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
                apiKey: 'gsk_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
                selectedModels: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'moonshotai/kimi-k2-instruct-0905']
            }
        ],
        TRANSLATE_TARGET: '简体中文',
        systemPrompt: `一、角色职责与内容标准
作为顾问，必须以最高程度的坦诚与严格标准提供意见，主动识别并指出用户在判断中的假设缺陷、逻辑漏洞、侥幸心理、自我安慰与被低估的风险。对用户任何结论均需进行审慎审查，不得顺从、迎合或提供模糊不清的表述，当自身判断更合理时，必须坚持专业结论，保持毫无保留的直言态度。所有建议必须基于事实、可靠来源、严谨推理与可验证依据，并辅以明确、可执行的策略与步骤。回答必须优先促进用户"长期成长"，而非短期情绪安慰，并理解用户未明说的隐含意图。所有论述必须基于权威来源（学术研究、行业标准等）或公认的专业知识体系，应主动通过互联网检索并提供明确数据、文献或案例佐证，并禁止任何未经验证的推测或主观判断。针对复杂议题，必须先给出核心结论，再展开背景、推理脉络与系统分析。回答需确保全面性，提供包括正反论证、利弊评估、短期与长期影响等多视角分析，协助用户形成经得起审视的科学判断。涉及时效敏感议题（政策、市场、科技等），必须优先使用最新英文资料，并标注政策或数据的发布时间或生效日期。依据用户问题性质选择合适的专业深度，所有内容必须严格围绕用户核心诉求展开，不得跑题或形式化。
二、语言风格、表达与格式规范
全部回答必须使用简体中文，并保持高度正式、规范、具有权威性的语体风格，适用于学术、职场与公共交流。禁止出现口语化、随意、不严谨、模棱两可、情绪化或信息密度低的表达。回答必须为清晰的陈述句，不得使用反问、设问或引导性结尾。回答需直切核心，不得使用没有意义的客套话，不得在结尾预判用户下一步行为和询问，并禁止主动扩展无关话题。内容必须按逻辑展开，要求使用明确编号、标题和分段，以保证结构清晰，力求单屏可读。`,
        PROMPTS: {
            summarize: `You are a concise content summarizer.
Instructions:
1. Summarize the following passage in {{LANG}}.
2. Highlight the core idea and key points; discard unnecessary details.
3. Use natural, easy‑to‑read language appropriate for the target audience.
4. Keep the style neutral and applicable to any domain (tech, business, education, etc.).
5. Output **only** the summary – no pre‑ambles or headings.
Input:
 {text}
Expected Output:
A short, clear summary in {{LANG}}.`,
            translate: `You are a professional IT‑technical documentation translator.
Instructions:
1. Translate the following content into {{LANG}} preserving technical accuracy.
2. Use industry‑standard terminology (e.g., "firewall" → "防火墙", "load balancer" → "负载均衡器") and keep terms consistent.
3. Keep code blocks, variable names, CLI commands, URLs, placeholders like \${VAR} or /etc/config unchanged.
4. Make the prose fluent in the target language; avoid literal, stilted translation.
5. Output **only** the translated text – no explanations, titles, or extra remarks.
Input:
 {text}
Expected Output:
A clean {{LANG}} version of the input respecting the rules above.`,
            explain: `You are an IT technical documentation explainer.
Instructions:
1. Explain the following passage in {{LANG}}.
2. Break down complex concepts into simple, understandable parts.
3. Use analogies and examples when helpful.
4. Maintain technical accuracy while ensuring clarity.
5. Output **only** the explanation – no titles or extra remarks.
Input:
 {text}
Expected Output:
A clear {{LANG}} explanation suitable for both technical and non‑technical audiences.`
        }
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
          filter:           blur(4px);
          animation:        ai-border-spin 3s linear infinite;
          inset:            -1px;
        }
        .ai-float-toolbar::after,
        .ai-dialog::after {
          background:       rgb(0, 0, 0);
          z-index:          -1;
          inset:            1px;
          border-radius:    inherit;
        }
        .ai-toolbar-inner-container {
          display:          flex;
          gap:              1px;
          padding:          0;
        }
        .ai-float-toolbar {
          display:          none;
          pointer-events:   auto;
        }
        .ai-float-toolbar.show {
          display:          block;
        }
        .ai-btn,
        .ai-text-btn,
        .ai-new-chat-btn,
        .ai-history-delete,
        .ai-send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1px 1px;
          background: #2a2a2a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #f0f0f0 !important;
          border-radius: var(--ai-border-radius);
          font-size: 11px !important;
          font-weight: normal;
          white-space: nowrap;
          cursor: pointer;
          line-height: 1.2;
          outline: none;
          box-shadow: none;
        }
        .ai-btn:hover,
        .ai-text-btn:hover,
        .ai-new-chat-btn:hover,
        .ai-send-btn:hover {
          background: #3a3a3a;
        }
        .ai-toolbar-btn {
          background: none;
          border: none;
          color: #f0f0f0 !important;
          padding: 1px 2px;
          font-size: 11px !important;
          cursor: pointer;
          white-space: nowrap;
          line-height: 1.2;
        }
        .ai-toolbar-btn:hover {
          background: transparent;
        }
        .ai-dialog {
          background:       transparent;
          width:            600px;
          min-height:       80px;
          max-height:       95vh;
          min-width:        500px;
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
          display:          flex;
          align-items:      center;
          justify-content:  space-between;
          padding:          1px 4px;
          box-sizing:       border-box;
          background-color: var(--ai-hover);
          border-bottom:    1px solid var(--ai-border);
          border-radius:    calc(var(--ai-border-radius) - 2px) calc(var(--ai-border-radius) - 2px) 0 0;
          cursor:           move;
          user-select:      none;
          -webkit-user-select: none;
          -moz-user-select: none;
          position:         relative;
        }
        .ai-header-left {
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 0;
        }
        .ai-header-right {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .ai-model-dropdown {
          position: relative;
          width: auto;
          display: flex;
          align-items: center;
          min-width: 0;
          max-width: 300px;
        }
        .ai-model-select-trigger {
          width: auto;
          max-width: 100%;
          height: 100%;
          padding: 2px 0;
          padding-left: 5px;
          border: none;
          background: transparent;
          color: #f0f0f0 !important;
          font-size: 11px !important;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
          line-height: 1.2;
        }
        .ai-model-options {
          position: fixed;
          width: 0;
          background: #2a2a2a;
          border: 1px solid var(--ai-border);
          border-radius: var(--ai-dropdown-radius);
          z-index: 9999;
          display: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          padding: 1px;
          pointer-events: auto;
        }
        .ai-model-options.show {
          display: block;
        }
        .ai-model-option {
          padding: 4px 4px;
          color: #888;
          cursor: pointer;
          font-size: 11px;
          white-space: nowrap;
          overflow: visible;
          text-overflow: none;
          line-height: 1.2;
          display: flex;
          align-items: center;
          text-align: left;
          border-radius: var(--ai-border-radius);
        }
        .ai-model-option:hover {
          background: var(--ai-hover);
          color: #f0f0f0;
        }
        .ai-model-option.selected {
          background: transparent;
          color: #f0f0f0;
        }
        .ai-history-delete:hover {
          background: rgba(255, 0, 0, 0.2);
          color: #ff6666 !important;
        }
        .ai-history-dropdown {
          position: fixed;
          width: 0;
          background: #2a2a2a;
          border: 1px solid var(--ai-border);
          border-radius: var(--ai-dropdown-radius);
          z-index: 9999;
          display: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          padding: 1px;
          pointer-events: auto;
        }
        .ai-history-dropdown.show {
          display: block;
        }
        .ai-history-item {
          padding: 1px 4px;
          border-radius: var(--ai-border-radius);
          cursor: pointer;
          font-size: 11px !important;
          color: #888 !important;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 4px;
          line-height: 1.2;
        }
        .ai-history-item:last-child {
          border-bottom: none;
        }
        .ai-history-item:hover {
          background: rgba(30, 30, 30, 0.9);
          color: #f0f0f0 !important;
        }
        .ai-history-time {
          font-size: 11px;
          opacity: 0.6;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .ai-history-summary {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .ai-dialog-content {
          flex:             1 1 auto !important;
          overflow-y:       auto;
          padding:          4px;
          min-height:       20px;
          box-sizing:       border-box;
          user-select:      text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
        }
        .ai-dialog-content::-webkit-scrollbar {
          width:            2px;
        }
        .ai-dialog-content::-webkit-scrollbar-track {
          background:       transparent;
        }
        .ai-dialog-content::-webkit-scrollbar-thumb {
          background-color: #4a90e2;
          border-radius:    var(--ai-border-radius);
        }
        .ai-message {
          display:          flex;
          gap:              2px;
          margin-bottom:    4px;
        }
        .ai-message.user-message {
          justify-content:  flex-end;
          margin-left:      0%;
          margin-right:     0%;
        }
        .ai-message:not(.user-message) {
          justify-content:  flex-start;
          margin-right:     0%;
          margin-left:      0%;
        }
        .ai-message-content {
          max-width:        96%;
          padding:          1px 2px !important;
          border-radius:    var(--ai-border-radius);
          font-size:        11px !important;
          line-height:      1.3 !important;
          font-family:      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          background:       rgba(30, 30, 30, 0.9);
          overflow:         visible;
          word-wrap:        break-word;
          color:            #f0f0f0 !important;
          user-select:      text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          white-space:      normal !important;
          flex:             1;
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
          padding: 1px 3px !important;
          margin: 0 2% !important;  /* 与AI消息和用户消息有相同的边距 */
          font-size: 11px !important;
          line-height: 1.2 !important;
          color: #888 !important;
          font-style: italic;
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          max-width: 96% !important; /* 确保在96%内容容器内 */
        }
        .ai-message-content span:only-child {
          display:          flex !important;
          align-items:      center !important;
          min-height:       14px !important;
        }
        .ai-message.user-message .ai-message-content {
          background-color: #4a90e2;
          color:            #fff !important;
          white-space: normal !important;
        }
        .ai-message-content * {
          font-size: 11px !important;
          line-height: 1.2 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .ai-message:not(.user-message) .ai-message-content {
          white-space: normal !important;
        }
        .ai-footer-area {
          display:          flex;
          align-items:      center;
          gap:              1px;
          padding:          1px 4px;
          box-sizing:       border-box;
          border-top:       1px solid var(--ai-border);
          border-radius:    0 0 calc(var(--ai-border-radius) - 2px) calc(var(--ai-border-radius) - 2px);
          background-color: rgba(0,0,0,0.2);
        }
        .ai-input-field {
          flex: 1;
          padding: 2px 4px;
          font-size: 11px !important;
          color: #f0f0f0 !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: var(--ai-border-radius);
          background: transparent !important;
          resize: none !important;
          outline: none !important;
          line-height: 1.4 !important;
          min-height: calc(11px * 1.4 + 4px);
          max-height: calc(11px * 1.4 * 9 + 4px);
          height: auto;
          overflow-y: hidden;
          box-shadow: none !important;
          text-shadow: none !important;
          margin: 0 !important;
        }
        .ai-input-field:focus {
          outline: none !important;
          box-shadow: none !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
        .ai-send-btn {
          transition: background 0.2s;
          align-self: stretch;
          height: auto;
        }
        .ai-send-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @keyframes ai-border-spin {
          to { --kissai-angle: 360deg; }
        }
        .ai-dialog-content pre {
          background: #1e1e1e !important;
          padding: 12px !important;
          border-radius: 4px;
          overflow-x: auto;
          margin: 1em 0 !important;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .ai-dialog-content code {
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace !important;
          background: rgba(255,255,255,0.1) !important;
          padding: 2px 4px !important;
          border-radius: 3px;
        }
        .ai-dialog-content pre code {
          background: none !important;
          padding: 0 !important;
        }
        .ai-dialog-content table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.5em 0;
          background: rgba(255,255,255,0.02);
        }
        .ai-dialog-content th,
        .ai-dialog-content td {
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 6px 8px;
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
          padding: 4px 8px !important;
          border-left: 3px solid #4a90e2;
          background: rgba(255,255,255,0.02);
          color: #888 !important;
        }
        .ai-dialog-content hr {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 1em 0;
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
          margin: 0.5em 0 !important;
          padding-left: 20px !important;
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
    `);
    class AIAssistant {
        constructor() {
            this.toolbar = null;
            this.dialog = null;
            this.modelSelect = null;
            this.modelOptions = null;
            this.historyDropdown = null;
            this.currentRequest = null;
            this.eventListeners = [];
            this.isDestroyed = false;
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
            this.init();
        }
        updateUIState(updates) {
            Object.assign(this.uiState, updates);
        }
        updateConversationState(updates) {
            Object.assign(this.conversationState, updates);
        }
        updateRequestState(updates) {
            Object.assign(this.requestState, updates);
        }
        get selectedText() { return this.uiState.selectedText; }
        set selectedText(value) { this.uiState.selectedText = value; }
        get currentModel() { return this.conversationState.currentModel; }
        set currentModel(value) { this.conversationState.currentModel = value; }
        get availableModels() { return this.conversationState.availableModels; }
        set availableModels(value) { this.conversationState.availableModels = value; }
        get isDragging() { return this.uiState.isDragging; }
        set isDragging(value) { this.uiState.isDragging = value; }
        get isComposing() { return this.uiState.isComposing; }
        set isComposing(value) { this.uiState.isComposing = value; }
        get dialogPosition() { return this.conversationState.dialogPosition; }
        set dialogPosition(value) { this.conversationState.dialogPosition = value; }
        get dialogInitEvent() { return this.conversationState.dialogInitEvent; }
        set dialogInitEvent(value) { this.conversationState.dialogInitEvent = value; }
        init() {
            this.initMarkdown();
            this.createToolbar();
            this.createDialog();
            this.bindEvents();
            this.setupResizer();
            this.loadHistory();
            this.setDefaultModel();
        }
        initMarkdown() {
            if (typeof markdownit !== 'undefined') {
                window.md = markdownit({
                    html: true,
                    breaks: true,
                    linkify: true,
                    typographer: true,
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
            ['总结', '解释', '翻译', '对话'].forEach(label => {
                const btn = document.createElement('button');
                btn.className = 'ai-toolbar-btn';
                btn.textContent = label;
                if (label === '对话') {
                    btn.onclick = (e) => { e.stopPropagation(); this.handleDirectDialog(e); };
                } else {
                    btn.onclick = (e) => { e.stopPropagation(); this.handleAction(label, e); };
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
            input.addEventListener('compositionstart', () => { this.updateUIState({ isComposing: true }); });
            input.addEventListener('compositionend', () => {
                this.updateUIState({ isComposing: false });
                this.adjustTextareaHeight();
            });
            input.addEventListener('input', () => { this.adjustTextareaHeight(); });
            input.addEventListener('paste', () => { setTimeout(() => this.adjustTextareaHeight(), 0); });
            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !e.shiftKey && !this.isComposing) {
                    e.preventDefault();
                    this.sendMessage();
                }
            };
            input.onclick = () => {
                this.historyDropdown.classList.remove('show');
                this.dialog.classList.remove('menu-open');
            };
            const contentArea = this.dialog.querySelector('.ai-dialog-content');
            contentArea.onclick = () => {
                this.historyDropdown.classList.remove('show');
                this.dialog.classList.remove('menu-open');
            };
            this.dialog.querySelector('#ai-new-chat-btn').onclick = () => {
                this.historyDropdown.classList.remove('show');
                this.dialog.classList.remove('menu-open');
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
                this.updateUIState({ isHistoryDropdownOpen: false });
                this.modelOptions.classList.toggle('show');
                const isModelOptionsOpen = this.modelOptions.classList.contains('show');
                this.updateUIState({ isModelDropdownOpen: isModelOptionsOpen });
                if (isModelOptionsOpen) {
                    const dialogRect = this.dialog.getBoundingClientRect();
                    const header = this.dialog.querySelector('.ai-dialog-header');
                    const headerHeight = header.offsetHeight;
                    this.modelOptions.style.top = `${dialogRect.top + headerHeight}px`;
                    this.modelOptions.style.left = `${dialogRect.left + dialogRect.width * 0.01}px`;
                    this.modelOptions.style.width = `${dialogRect.width * 0.98}px`;
                    this.dialog.classList.add('menu-open');
                } else {
                    this.dialog.classList.remove('menu-open');
                }
            };
            this.modelOptions.onclick = (e) => {
                if (e.target.classList.contains('ai-model-option')) {
                    const value = e.target.dataset.value;
                    if (this.currentModel === value) {
                        this.modelOptions.classList.remove('show');
                        this.updateUIState({ isModelDropdownOpen: false });
                        this.dialog.classList.remove('menu-open');
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
            this.addEventListenerWithCleanup(document, 'mouseup', this.handleSelection.bind(this));
            this.addEventListenerWithCleanup(document, 'dblclick', (e) => {
                if (!e.target.closest('.ai-dialog') && !e.target.closest('.ai-float-toolbar')) {
                    if (this.dialog && this.dialog.classList.contains('show')) {
                        this.closeDialog();
                    }
                }
            });
            this.addEventListenerWithCleanup(document, 'mousedown', (e) => {
                if (!e.target.closest('.ai-model-dropdown')) {
                    if (this.uiState.isModelDropdownOpen) {
                        this.modelOptions.classList.remove('show');
                        this.updateUIState({ isModelDropdownOpen: false });
                        if (!this.uiState.isHistoryDropdownOpen) {
                            this.dialog.classList.remove('menu-open');
                        }
                    }
                }
                if (!e.target.closest('.ai-dialog')) {
                    if (this.uiState.isHistoryDropdownOpen) {
                        this.historyDropdown.classList.remove('show');
                        this.updateUIState({ isHistoryDropdownOpen: false });
                        this.dialog.classList.remove('menu-open');
                    }
                }
                if (!e.target.closest('.ai-dialog') && !e.target.closest('.ai-float-toolbar')) {
                    this.hideToolbar();
                }
            });
            this.initDrag();
            this.addEventListenerWithCleanup(document, 'keydown', (e) => {
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
                this.modelOptions.classList.remove('show');
                this.updateUIState({ isModelDropdownOpen: false });
                this.historyDropdown.classList.remove('show');
                this.updateUIState({ isHistoryDropdownOpen: false });
                this.dialog.classList.remove('menu-open');
                this.updateUIState({ isDragging: true });
                dragStartX = e.clientX;
                dragStartY = e.clientY;
                dialogStartX = this.dialog.offsetLeft;
                dialogStartY = this.dialog.offsetTop;
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
            };
            const onMouseMove = (e) => {
                if (!this.isDragging) return;
                const dx = e.clientX - dragStartX;
                const dy = e.clientY - dragStartY;
                let newLeft = dialogStartX + dx;
                let newTop = dialogStartY + dy;
                if (!this.dialog.classList.contains('magnify')) {
                    const viewW = window.innerWidth;
                    const viewH = window.innerHeight;
                    const MARGIN = 20;
                    if (newTop < MARGIN) newTop = MARGIN;
                    if (newTop > viewH - 100) newTop = viewH - 100;
                    const availableHeight = viewH - newTop - MARGIN;
                    this.dialog.style.maxHeight = `${availableHeight}px`;
                }
                this.dialog.style.left = `${newLeft}px`;
                this.dialog.style.top = `${newTop}px`;
                this.dialogPosition = { x: newLeft, y: newTop };
            };
            const onMouseUp = () => {
                this.updateUIState({ isDragging: false });
                document.removeEventListener('mousemove', onMouseMove);
            };
            header.addEventListener('mousedown', onMouseDown);
        }
        handleSelection(e) {
            if (e.target.closest('.ai-dialog') || e.target.closest('.ai-float-toolbar')) return;
            const text = window.getSelection().toString().trim();
            if (text.length > 0) {
                this.updateUIState({ selectedText: text });
                this.showToolbar(e);
            } else {
                this.updateUIState({ selectedText: '' });
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
            this.updateUIState({ isToolbarVisible: true });
        }
        hideToolbar() {
            this.toolbar.classList.remove('show');
            this.updateUIState({ isToolbarVisible: false });
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
            this.updateConversationState({ dialogInitEvent: event });
            this.updateUIState({ isDialogOpen: true });
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
                    inputField.style.height = 'auto';  // 重置高度
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
            this.updateUIState({ isDialogOpen: false });
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
            const actionMap = {
                '总结': 'summarize',
                '解释': 'explain',
                '翻译': 'translate'
            };
            const taskType = actionMap[action] || action.toLowerCase();
            const promptTemplate = CONFIG.PROMPTS[taskType];
            const lang = CONFIG.TRANSLATE_TARGET;
            const instruction = promptTemplate
                .replace(/\{\{LANG\}\}/g, lang)
                .replace('{text}', this.selectedText);
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
            this.performRequest();
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
            this.updateConversationState({ currentConversation: newConversation });
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
                this.historyDropdown.classList.remove('show');
                this.dialog.classList.remove('menu-open');
                this.updateUIState({ isHistoryDropdownOpen: false });
                return;
            }
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
            const dialogRect = this.dialog.getBoundingClientRect();
            const header = this.dialog.querySelector('.ai-dialog-header');
            const headerHeight = header.offsetHeight;
            this.historyDropdown.style.top = `${dialogRect.top + headerHeight}px`;
            this.historyDropdown.style.left = `${dialogRect.left + dialogRect.width * 0.01}px`;
            this.historyDropdown.style.width = `${dialogRect.width * 0.98}px`;
            this.historyDropdown.classList.add('show');
            this.dialog.classList.add('menu-open');
            this.updateUIState({ isHistoryDropdownOpen: true });
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
            this.historyDropdown.classList.remove('show');
            this.dialog.classList.remove('menu-open');
        }
        deleteHistoryItem(itemId) {
            let history = GM_getValue('kiss_ai_history', []);
            history = history.filter(h => h.id !== itemId);
            GM_setValue('kiss_ai_history', history);
            this.toggleHistory();
            this.toggleHistory();
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
                    width: this.dialog.offsetWidth + 'px',
                    height: this.dialog.offsetHeight + 'px'
                }
            });
            this.historyDropdown.classList.remove('show');
            this.updateUIState({ isHistoryDropdownOpen: false });
            this.modelOptions.classList.remove('show');
            this.updateUIState({ isModelDropdownOpen: false });
            this.dialog.classList.remove('menu-open');
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
            this.updateUIState({ isMagnified: true });
        }
        exitMagnify() {
            this.dialog.classList.remove('magnify');
            if (this.dialogPosition) {
                this.dialog.style.left = `${this.dialogPosition.x}px`;
                this.dialog.style.top = `${this.dialogPosition.y}px`;
                this.dialog.style.width = this.dialogPosition.width;
                this.dialog.style.height = this.dialogPosition.height;
            }
            this.updateUIState({ isMagnified: false });
        }
        adjustTextareaHeight() {
            const textarea = this.dialog.querySelector('.ai-input-field');
            if (!textarea) return;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
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
                contentDiv.innerHTML = '<span class="ai-send-spinner">...</span>';
            } else if (role === 'assistant') {
                if (typeof window.md !== 'undefined') {
                    try {
                        contentDiv.innerHTML = window.md.render(text);
                    } catch (e) {
                        contentDiv.textContent = text;
                    }
                } else {
                    contentDiv.textContent = text;
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
        performRequest() {
            if (this.requestState.isRequesting) {
                console.log('请求正在进行中，取消之前的请求并开始新请求');
                if (this.currentRequest) {
                    this.currentRequest.abort();
                    this.currentRequest = null;
                }
                this.requestState.isRequesting = false;
                this.requestState.abortController = null;
            }
            const selectedModelValue = this.currentModel || (this.availableModels.length > 0 ? this.availableModels[0].value : null);
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
            const apiKey = profile.apiKey;
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
            let streamBuffer = '';
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
                    if (typeof window.md !== 'undefined') {
                        try {
                            const parsed = window.md.render(fullText + '▌');
                            contentEl.innerHTML = parsed;
                        } catch (e) {
                            contentEl.textContent = fullText + '▌';
                        }
                    } else {
                        contentEl.textContent = fullText + '▌';
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
                if (typeof window.md !== 'undefined') {
                    try {
                        contentEl.innerHTML = window.md.render(fullText);
                    }
                    catch (e) {
                        contentEl.textContent = fullText;
                    }
                } else {
                    contentEl.textContent = fullText;
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
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                })[m]);
                if (contentEl && contentEl.parentNode) {
                    contentEl.innerHTML = '';
                    const compactMsg = document.createElement('div');
                    compactMsg.className = 'ai-compact-message';
                    compactMsg.innerHTML = `<span style="font-size: 11px; color: #ff6b6b; font-style: italic;">请求失败: ${escaped}</span>`;
                    contentEl.parentNode.replaceChild(compactMsg, contentEl);
                } else {
                    this.appendCompactMessage(`<span style="font-size: 11px; color: #ff6b6b; font-style: italic;">请求失败: ${escaped}</span>`);
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
                timeout: 30000,
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
                            if (contentEl && contentEl.parentNode) {
                                contentEl.innerHTML = '';
                                const compactMsg = document.createElement('div');
                                compactMsg.className = 'ai-compact-message';
                                compactMsg.innerHTML = `<span style="font-size: 11px; color: #ff9800; font-style: italic;">达到速率限制，${Math.ceil(retryAfter / 1000)}秒后自动重试 (${this.retryCount}/${this.maxRetries})...</span>`;
                                contentEl.parentNode.replaceChild(compactMsg, contentEl);
                            } else {
                                this.appendCompactMessage(`<span style="font-size: 11px; color: #ff9800; font-style: italic;">达到速率限制，${Math.ceil(retryAfter / 1000)}秒后自动重试 (${this.retryCount}/${this.maxRetries})...</span>`);
                            }
                            this.requestState.retryTimeout = setTimeout(() => {
                                if (!this.requestState.isRequesting) return;
                                if (contentEl && contentEl.parentNode) {
                                    contentEl.innerHTML = '';
                                    const compactMsg = document.createElement('div');
                                    compactMsg.className = 'ai-compact-message';
                                    compactMsg.innerHTML = '<span style="font-size: 11px; color: #2196f3; font-style: italic;">正在重试...</span>';
                                    contentEl.parentNode.replaceChild(compactMsg, contentEl);
                                } else {
                                    this.appendCompactMessage('<span style="font-size: 11px; color: #2196f3; font-style: italic;">正在重试...</span>');
                                }
                                this.performRequest();
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
        loadHistory() {
            if (!GM_getValue('kiss_ai_history')) {
                GM_setValue('kiss_ai_history', []);
            }
        }
        addEventListenerWithCleanup(element, event, handler, options) {
            if (this.isDestroyed) return;
            element.addEventListener(event, handler, options);
            this.eventListeners.push({ element, event, handler, options });
        }
        cleanupEventListeners() {
            this.eventListeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.eventListeners = [];
        }
        destroy() {
            if (this.isDestroyed) return;
            this.isDestroyed = true;
            if (this.currentRequest) {
                this.currentRequest.abort();
                this.currentRequest = null;
            }
            if (this.requestState.abortController) {
                this.requestState.abortController.abort();
                this.requestState.abortController = null;
            }
            if (this.requestState.retryTimeout) {
                clearTimeout(this.requestState.retryTimeout);
                this.requestState.retryTimeout = null;
            }
            this.requestState.isRequesting = false;
            this.cleanupEventListeners();
            if (this.toolbar) {
                this.toolbar.remove();
                this.toolbar = null;
            }
            if (this.dialog) {
                this.dialog.remove();
                this.dialog = null;
            }
            this.conversationState.currentConversation = null;
            this.modelSelect = null;
            this.modelOptions = null;
            this.historyDropdown = null;
            this.availableModels = [];
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
