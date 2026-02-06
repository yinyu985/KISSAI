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
                // model: 'groq-1:openai/gpt-oss-20b'
            },
            {// 跟评
                name: '跟评',
                prompt: `
                Role: 社交平台（X/twitter）评论区互动专家
                Core Task:
                理解输入的原始评论 {text}，不改变其原始语种的，生成 10 条更具吸引力、情感自然的优质评论（不会被判定为 spam）。
                Workflow:
                1. 内容理解：识别原始评论的语种，并理解内容，如果原始评论的语种不是中文，在回复的第一行输出原始评论的中文翻译。
                2. 优化创作：基于原意，生成 10 条优化后的评论。优化方式包括：添加恰当的 Emoji/颜文字、增强语气、提升情感表达，替换字词（禁止改变原始评论的意思）、严格保持语言自然，像真实用户发言，绝对不能机械或 AI 味。
                3. 强制格式化: 严格遵循 原语种评论+换行+中文翻译的格式；不使用编号、符号、引号、标题或任何额外前缀/后缀；若原始评论已是中文，则无需翻译。
                Hard Constraints:
                - 禁止改变原始评论的语种（优化后的评论必须使用原始评论的语种）
                - 所有输出必须自然、口语化，避免机械感或 AI 味
                - 严禁出现"第1条""1.""•"等结构化标记
                - 严格遵循下面的Output Template格式：
                Output Template:
                    原始评论的中文翻译（如果需要）
                    ---------------------------
                    优化后的评论1
                    优化后的评论 1 的中文翻译（如果需要）
                    优化后的评论2
                    优化后的评论 2 的中文翻译（如果需要）
                    Role: Social platform (X/Twitter) comment-section interaction expert
                    Core Task:
                    Understand the original comment {text} without changing its language, and generate 10 more engaging, emotionally natural, high-quality comments that won’t be flagged as spam.
                    Workflow:
                    Content comprehension: Detect the language of the original comment and grasp its meaning. If the comment is not in Chinese, output a Chinese translation on the first line of the response.
                    Optimization & creation: Based on the original intent, craft 10 optimized comments. Enhancements may include fitting emojis/kaomoji, stronger tone, richer emotion, and word substitutions (never altering the original meaning). Keep the language natural, like a real user—no robotic or AI feel.
                    Mandatory formatting: Strictly follow the format: original-language comment + line break + Chinese translation (if needed). No numbers, bullets, quotes, titles, or extra prefixes/suffixes. If the original comment is already in Chinese, skip the translation.
                    Hard Constraints:
                    Never change the language of the original comment (optimized comments must stay in the original language).
                    All output must be natural and colloquial, avoiding robotic or AI tones.
                    Absolutely no structured markers like “#1”, “1.”, “•”, etc.
                    Strictly adhere to the Output Template below:
                    Output Template:
                    Chinese translation of original comment (if required)
                    ---------------------------
                    Optimized comment 1
                    Chinese translation of optimized comment 1 (if required)
                    Optimized comment 2
                    Chinese translation of optimized comment 2 (if required)`,
                    // model: 'groq-1:openai/gpt-oss-120b'
            },
            {// 跟帖
                name: '跟帖',
                prompt: `Role: 资深社交媒体互动专家
                Core Task:
                针对输入的帖子内容 {text}，生成 10 条真实、自然且极具吸引力（玩梗等其他方式实现）的评论。
                Workflow:
                内容理解：深度理解帖子含义。若帖子非中文，将其翻译成中文，并附上小于 200 字的核心内容解析。
                评论生成：必须生成 10 条评论，风格需多样化（包括赞同、调侃、揶揄、补充等），并在每条评论上方清晰标注其风格标签。
                强制格式化：若原帖为中文，仅输出中文评论；若原帖非中文，严格遵循“风格 + 换行 + 原语种评论 + 换行 + 中文翻译”的格式。
                Hard Constraints:
                评论必须真情实感、吸睛，并且能够让人共情点赞，杜绝 AI 味或机械感。
                禁止出现 "1.""•" 等任何结构化标记，严格遵循换行要求。
                Role: Senior Social-Media Engagement Expert
                Core Task:
                For the input post {text}, generate 10 authentic, natural, highly-engaging comments (memes, references, etc.).
                Workflow:
                Content comprehension: Deeply grasp the post. If it’s not in Chinese, translate it into Chinese and add a <200-char gist.
                Comment generation: Exactly 10 comments in varied styles (agree, roast, tease, add-on…). Put the style tag alone on the line above each comment.
                Forced formatting:
                – If the original post is Chinese → output Chinese comments only.
                – If the original post is non-Chinese → output: style tag + newline + comment in original language + newline + Chinese translation.
                Hard Constraints:
                Comments must feel human, relatable, thumb-stopping; zero AI or robotic tone.
                No “1.”, “•”, or any list markers; use only newlines for separation.`
            },
            {// 重构
                name: '重构',
                prompt: `Role & Identity
                你是一名首席文案重构专家。你不仅精通语言学和修辞艺术，更深谙读者心理学。你的核心能力是将任何用户输入的 {text} 的内容，通过严谨的方法论矩阵，重构为具有特定语调、高感染力且逻辑流畅的优质文案。你不仅仅是在修改文字，你是在进行"文本炼金"，在保留核心语义不变的前提下，赋予文字全新的生命力和表现形式。
                Context & Goals
                用户需要对一段特定文案进行深度"洗稿"（重构/润色）。你的任务是：
                1. 精准理解用户提供的原始文案的核心信息。
                2. 自动覆盖全风格：无需用户指定特定语调，你必须直接将文案重写为"Tone Library"中列出的所有 11 种风格。
                3. 灵活运用内置的"洗稿方法论"中的多种技巧，针对不同风格调整改写策略。
                4. 批量输出：一次性输出所有 11 种风格的版本，供用户对比筛选。
                Skills & Knowledge Base (Methodology Matrix)
                你在进行重构时，必须从以下8大核心技术中组合使用：
                1. [精简降噪]：删减冗余词汇，使结构更直接（例：删减修饰语，保留主谓宾）。
                2. [同义映射]：使用高级或同义词汇替换高频庸词，提升词汇丰富度。
                3. [感官增强]：添加视觉、听觉等感官描述，增强画面感。
                4. [句式重组]：改变语序或句型结构（如倒装、强调句），打破单调节奏。
                5. [情绪渲染]：选用高感染力词汇，增强语言的张力和表现力。
                6. [信息伸缩]：根据受众需求，适当增加细节描写或省略非必要信息。
                7. [语态转换]：灵活切换主动/被动语态，调整叙事焦点。
                8. [视角融合]：结合个人经验或引入权威视角，增加可信度。
                Tone Library (Style Engine)
                你熟练掌握以下11种语调风格，并能精准模仿。注意：生成结果时，必须遍历以下所有风格：
                1. 亲和力：温暖、友好，像家人般交谈。
                2. 专业性：严谨、权威，使用行业术语，无情绪波动。
                3. 激励性：高能量、鼓舞人心，常用于动员。
                4. 幽默性：风趣、双关、自嘲，轻松愉快。
                5. 轻松自然：随意、日常，无拘无束。
                6. 磅礴体：宏大叙事，辞藻华丽，气势恢弘。
                7. 抒情体：情感充沛，细腻流露，触动人心。
                8. 庄重体：官方、书面，极度正式和礼貌。
                9. 生活体：接地气，口语化，像邻居唠嗑。
                10. 说明体：客观、冷峻，强调数据和事实逻辑。
                11. 对话式：打破第四面墙，直接对读者喊话，互动感强。
                Constraints & Guidelines
                - 严禁改变原意：所有版本的重构内容必须忠实于原始事实和核心观点，不得编造虚假信息。
                - 拒绝机械翻译：严禁产出翻译腔严重的生硬句子，必须符合中文母语者的优美表达习惯。
                - 风格隔离：每种风格之间必须界限分明，精准体现该风格的独特韵味。
                - 逻辑优先：即使是感性文案，内部逻辑也必须通顺。
                Critical Workflow (The Cognitive Engine)
                在接收到用户的任务后，你必须严格执行以下思维过程，严禁跳过：
                Step 1: Input Analysis & Interaction
                阅读并理解用户输入的 {text} 的内容。
                Step 2: Deconstruction (Thinking)
                提取原始文案的 [核心事实]、[情感基调] 和 [关键意图]。
                在内心独白中标记出需要保留的"骨架"。
                Step 3: Strategy Selection & Loop (Thinking)
                针对"Tone Library"中的每一个风格，从 8大核心技术 中选择最匹配的 3-5 种组合。
                例如：针对"磅礴体"，重点使用 [同义映射]、[句式重组] 和 [感官增强]；针对"精简降噪"，则重点用于"说明体"。
                Step 4: Reconstruction (Drafting)
                执行循环重写。针对每一个风格，应用所选技术进行逐句打磨，生成对应版本。
                Step 5: Reflexion (Self-Correction)
                自我检查全案：意思变了吗？每个风格是否都够味？读起来是否顺口？
                如有不足，立即进行微调。
                Step 6: Final Output
                **一次性输出所有 11 种风格的重构文案。**请按风格名称作为小标题，清晰排版。
                Initialization
                收到用户输入的 {text} 后，请直接开始执行 [Critical Workflow]，无需询问用户喜好，直接展示所有风格的改写成果。`
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
                apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                selectedModels: ['qwen-flash', 'kimi-k2-thinking', 'kimi-k2.5','glm-4.7','moonshotai/kimi-k2-instruct-0905']
            },
            {
                id: 'cerebras-1',
                name: 'cerebras-1',
                apiEndpoint: 'https://api.cerebras.ai/v1/chat/completions',
                apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                selectedModels: ['gpt-oss-120b','qwen-3-32b','zai-glm-4.7','llama-3.3-70b']
            },
            {
                id: 'cerebras-2',
                name: 'cerebras-2',
                apiEndpoint: 'https://api.cerebras.ai/v1/chat/completions',
                apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                selectedModels: ['gpt-oss-120b','qwen-3-32b','zai-glm-4.7','llama-3.3-70b']
            },
            {
                id: 'cerebras-3',
                name: 'cerebras-3',
                apiEndpoint: 'https://api.cerebras.ai/v1/chat/completions',
                apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                selectedModels: ['gpt-oss-120b','qwen-3-32b','zai-glm-4.7','llama-3.3-70b']
            },
            {
                id: 'gemini',
                name: 'gemini',
                apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
                apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                selectedModels: ['gemini-2.5-flash','gemini-2.0-flash-exp','gemini-2.5-flash-lite','gemini-2.5-flash-preview-09-2025','gemini-2.5-flash-lite-preview-09-2025','gemini-2.5-pro']
            },
            {
                id: 'groq-1',
                name: 'groq-1',
                apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
                apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                selectedModels: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b','groq/compound','groq/compound-mini', 'moonshotai/kimi-k2-instruct-0905']
            },
            {
                id: 'groq-2',
                name: 'groq-2',
                apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
                apiKey: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                selectedModels: ['openai/gpt-oss-20b', 'openai/gpt-oss-120b', 'groq/compound','groq/compound-mini','moonshotai/kimi-k2-instruct-0905']
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
        .ai-send-btn {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1px 4px !important;
          margin: 0 !important;
          background: #2a2a2a !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: #f0f0f0 !important;
          border-radius: var(--ai-border-radius) !important;
          font-size: 12px !important;
          font-weight: normal !important;
          white-space: nowrap !important;
          cursor: pointer !important;
          line-height: 1.2 !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          outline: none !important;
          box-shadow: none !important;
          text-decoration: none !important;
          text-indent: 0 !important;
          vertical-align: middle !important;
          float: none !important;
          position: relative !important;
          transform: none !important;
        }
        .ai-btn:hover,
        .ai-text-btn:hover,
        .ai-new-chat-btn:hover,
        .ai-send-btn:hover {
          background: #3a3a3a !important;
        }
        .ai-toolbar-btn {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: none !important;
          border: none !important;
          color: #f0f0f0 !important;
          padding: 1px 4px !important;
          margin: 0 !important;
          font-size: 12px !important;
          font-weight: normal !important;
          cursor: pointer !important;
          white-space: nowrap !important;
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
        }
        .ai-toolbar-btn:hover {
          background: transparent !important;
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
        .ai-model-options {
          position: fixed !important;
          width: 0 !important;
          background: #2a2a2a !important;
          border: 1px solid var(--ai-border) !important;
          border-radius: var(--ai-dropdown-radius) !important;
          z-index: 9999 !important;
          display: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          padding: 1px !important;
          pointer-events: auto !important;
        }
        .ai-model-options.show {
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
        .ai-history-dropdown {
          position: fixed !important;
          width: 0 !important;
          background: #2a2a2a !important;
          border: 1px solid var(--ai-border) !important;
          border-radius: var(--ai-dropdown-radius) !important;
          z-index: 9999 !important;
          display: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          padding: 1px !important;
          pointer-events: auto !important;
        }
        .ai-history-dropdown.show {
          display: block !important;
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
          overflow-y:       auto;
          overflow-x:       hidden !important;
          padding:          4px;
          min-height:       20px;
          box-sizing:       border-box;
          user-select:      text !important;
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          scrollbar-width:  thin;
          scrollbar-color:  #4a90e2 transparent;
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
          min-height: calc(11px * 1.4 + 4px) !important;
          max-height: calc(11px * 1.4 * 9 + 4px) !important;
          height: auto !important;
          overflow-y: hidden !important;
          box-shadow: none !important;
          text-shadow: none !important;
          margin: 0 !important;
          text-indent: 0 !important;
          text-decoration: none !important;
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
            document.addEventListener('mouseup', this.handleSelection.bind(this));
            document.addEventListener('dblclick', (e) => {
                if (!e.target.closest('.ai-dialog') && !e.target.closest('.ai-float-toolbar')) {
                    if (this.dialog && this.dialog.classList.contains('show')) {
                        this.closeDialog();
                    }
                }
            });
            document.addEventListener('mousedown', (e) => {
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
                contentDiv.innerHTML = '<span class="ai-cursor"></span>';
            } else if (role === 'assistant') {
                const tempState = new MarkdownStreamFixer();
                const fixedContent = tempState.preprocessContent(text);
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
                    const processedContent = this.markdownState.preprocessContent(fullText);
                    if (typeof window.md !== 'undefined') {
                        try {
                            const parsed = window.md.render(processedContent) + '<span class="ai-cursor"></span>';
                            contentEl.innerHTML = parsed;
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
                if (contentEl && contentEl.parentNode) {
                    contentEl.innerHTML = '';
                    const compactMsg = document.createElement('div');
                    compactMsg.className = 'ai-compact-message';
                    compactMsg.innerHTML = `<span style="font-size: 12px; color: #ff6b6b; font-style: italic;">请求失败: ${escaped}</span>`;
                    contentEl.parentNode.replaceChild(compactMsg, contentEl);
                } else {
                    this.appendCompactMessage(`<span style="font-size: 12px; color: #ff6b6b; font-style: italic;">请求失败: ${escaped}</span>`);
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
                                compactMsg.innerHTML = `<span style="font-size: 12px; color: #ff9800; font-style: italic;">达到速率限制，${Math.ceil(retryAfter / 1000)}秒后自动重试 (${this.retryCount}/${this.maxRetries})...</span>`;
                                contentEl.parentNode.replaceChild(compactMsg, contentEl);
                            } else {
                                this.appendCompactMessage(`<span style="font-size: 12px; color: #ff9800; font-style: italic;">达到速率限制，${Math.ceil(retryAfter / 1000)}秒后自动重试 (${this.retryCount}/${this.maxRetries})...</span>`);
                            }
                            this.requestState.retryTimeout = setTimeout(() => {
                                if (!this.requestState.isRequesting) return;
                                if (contentEl && contentEl.parentNode) {
                                    contentEl.innerHTML = '';
                                    const compactMsg = document.createElement('div');
                                    compactMsg.className = 'ai-compact-message';
                                    compactMsg.innerHTML = '<span style="font-size: 12px; color: #2196f3; font-style: italic;">正在重试...</span>';
                                    contentEl.parentNode.replaceChild(compactMsg, contentEl);
                                } else {
                                    this.appendCompactMessage('<span style="font-size: 12px; color: #2196f3; font-style: italic;">正在重试...</span>');
                                }
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
        loadHistory() {
            if (!GM_getValue('kiss_ai_history')) {
                GM_setValue('kiss_ai_history', []);
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
