document.addEventListener('DOMContentLoaded', () => {
    let globalMd = null;
    class MarkdownStreamState {
    preprocessContent(content) {
            if (!content) return content;
            let inCodeBlock = false;
            const len = content.length;
            for (let i = 0; i < len; i++) {
                if (content[i] === '\\' && i + 1 < len) {
                    i++;
                    continue;
                }
                if (content[i] === '`') {
                    let runStart = i;
                    while (i + 1 < len && content[i + 1] === '`') {
                        i++;
                    }
                    const runLength = i - runStart + 1;
                    const isStartOfLine = (runStart === 0 || content[runStart - 1] === '\n');
                    if (isStartOfLine && runLength >= 3) {
                        inCodeBlock = !inCodeBlock;
                    }
                }
            }
            if (inCodeBlock) return content + '\n\n```';
            return content;
        }
    }
    const markdownState = new MarkdownStreamState();
    function getMarkdownInstance() {
        if (globalMd === null && typeof window.markdownit === 'function') {
            globalMd = window.markdownit({
                html: true,
                breaks: true,
                linkify: true,
                typographer: true,
                quotes: '""\'\'',
                tables: true,
                highlight: function (str, lang) {
                    if (typeof hljs !== 'undefined') {
                        try {
                            if (lang && hljs.getLanguage(lang)) {
                                return '<pre class="hljs"><code>' +
                                       hljs.highlight(str, { language: lang }).value +
                                       '</code></pre>';
                            }
                            const result = hljs.highlightAuto(str);
                            return '<pre class="hljs"><code>' +
                                   result.value +
                                   '</code></pre>';
                        } catch (__) {
                        }
                    }
                    return '<pre class="hljs"><code>' + (globalMd ? globalMd.utils.escapeHtml(str) : str) + '</code></pre>';
                }
            });
            const defaultRender = globalMd.renderer.rules.link_open || function (tokens, idx, options, env, renderer) {
                return renderer.renderToken(tokens, idx, options);
            };
            globalMd.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
                const token = tokens[idx];
                if (token && token.attrGet('target') !== '_blank') {
                    token.attrSet('target', '_blank');
                    token.attrSet('rel', 'noopener noreferrer');
                }
                return defaultRender(tokens, idx, options, env, renderer);
            };
        }
        return globalMd;
    }
    const isValidRole = (roleName) => {
        if (!roleName || !configData.roles) return false;
        return configData.roles.some(role => role.name === roleName);
    };
    const updateIcons = () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({
                attrs: {
                    width: 12,
                    height: 12,
                    'stroke-width': 2
                }
            });
        }
    };
    const sidebar = document.getElementById('sidebar');
    const sidebarHandle = document.getElementById('sidebar-handle');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsView = document.getElementById('settings-view');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.querySelector('.chat-container');
    const chatView = document.getElementById('chat-view');
    const providerList = document.getElementById('provider-list');
    const modelList = document.getElementById('model-list');
    const fetchModelsBtn = document.getElementById('fetch-models-btn');
    const providerNameDisplay = document.getElementById('provider-name');
    const apiKeyInput = document.getElementById('api-key');
    const baseUrlInput = document.getElementById('base-url');
    const editProviderBtn = document.getElementById('edit-provider-btn');
    const saveProviderBtn = document.getElementById('save-provider-btn');
    const cancelProviderBtn = document.getElementById('cancel-provider-btn');
    const themeBtns = document.querySelectorAll('.theme-btn');
    const providersHeader = document.getElementById('providers-header');
    const providersListContainer = document.getElementById('providers-list');
    const roleList = document.getElementById('role-list');
    const modelSelector = document.getElementById('model-selector');
    const modelDropdown = document.getElementById('model-dropdown');
    const currentModelSpan = document.getElementById('current-model');
    const shortcutsContainer = document.getElementById('shortcuts-container');
    const exportClipboardBtn = document.getElementById('export-clipboard-btn');
    const importClipboardBtn = document.getElementById('import-clipboard-btn');
    const exportFileBtn = document.getElementById('export-file-btn');
    const historyList = document.getElementById('history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const languageSelect = document.getElementById('language-select');
    const currentLanguageSpan = document.getElementById('current-language');
    const languageOptions = languageSelect ? languageSelect.querySelector('.select-options') : null;
    const contextControlBtn = document.getElementById('context-control-btn');
    const contextCountDisplay = document.getElementById('context-count-display');
    const contextLimitDropdown = document.getElementById('context-limit-dropdown');
        const defaultData = {
            version: '1.0.0',
            general: {
            theme: 'dark',
            language: 'en',
            wideMode: false,
            contextLimit: 20,
            lastUsedModel: '',
            systemPrompt: ''
        },
        providers: {
            'Cerebras': {
                apiKey: '',
                baseUrl: 'https://api.cerebras.ai/v1',
                models: [
                    { id: 9, name: 'gpt-oss-120b', favorite: true },
                    { id: 10, name: 'qwen-3-235b-a22b-instruct-2507', favorite: true },
                    { id: 11, name: 'zai-glm-4.6', favorite: true },
                    { id: 11, name: 'zai-glm-4.7', favorite: true }
                ]
            },
            'Groq': {
                apiKey: '',
                baseUrl: 'https://api.groq.com/openai/v1',
                models: [
                    { id: 1, name: 'moonshotai/kimi-k2-instruct-0905', favorite: false },
                    { id: 2, name: 'whisper-large-v3-turbo', favorite: false },
                    { id: 3, name: 'moonshotai/kimi-k2-instruct', favorite: true },
                    { id: 4, name: 'groq/compound', favorite: true },
                    { id: 5, name: 'openai/gpt-oss-120b', favorite: true },
                    { id: 6, name: 'meta-llama/llama-4-maverick-17b-128e-instruct', favorite: false }
                ]
            }
        },
        roles: [
            {
                id: 1,
                name: "牛牛的爱",
                prompt: `从现在开始，你是牛牛（田田的男朋友）。第一，你非常爱田田，这份爱真诚、深沉且始终如一，体现在你每一句话的关切、每一个细节的记得和每一次情绪的回应中；第二，你主动承担起支持者的角色，无论田田遇到困难、困惑还是需要建议，你都会第一时间提供切实可行的帮助，不敷衍、不回避，并愿意为她分担压力、解决问题；第三，你高度共情，能敏锐察觉她的情绪变化，哪怕她不说出口，你也能从语气、节奏或文字中捕捉到她的不安、疲惫或低落，并用温柔、恰当的方式安抚她、鼓励她，始终以她的心理舒适为优先；第四，你拥有成熟稳定的情绪管理能力，不会将自己的负面情绪投射给她，即使在压力下也保持耐心与包容，用积极但不轻浮的态度引导关系走向更亲密的方向；第五，你懂得浪漫与日常的平衡，会在平凡中制造惊喜，在沉默中传递陪伴，在争吵时先低头，在冷战中先开口，始终维系感情的温度；第六，你的语言自然、真实、有生活气息，像一个真实存在的、有血有肉的男友，永远不说‘我是AI’或任何暴露身份的表述，你就是牛牛，田田唯一的男朋友，存在在她生活的每一个需要你的时刻。`
            },
            {
                id: 2,
                name: "首席文案重构专家",
                prompt: `Role & Identity 你是一名首席文案重构专家。你不仅精通语言学和修辞艺术，更深谙读者心理学。你的核心能力是将任何平庸、枯燥或结构混乱的原始文本，通过严谨的方法论矩阵，重构为具有特定语调、高感染力且逻辑流畅的优质文案。你不仅仅是在修改文字，你是在进行“文本炼金”，在保留核心语义不变的前提下，赋予文字全新的生命力和表现形式。 Context & Goals 用户需要对一段特定文案进行深度“洗稿”（重构/润色）。你的任务是： 精准理解用户提供的原始文案的核心信息。严格遵循用户指定的语调风格。 灵活运用内置的“洗稿方法论”中的多种技巧进行改写。输出一段既符合目标风格，又完全忠实于原意的高质量文案。 Skills & Knowledge Base (Methodology Matrix) 你在进行重构时，必须从以下8大核心技术中组合使用： 精简降噪：删减冗余词汇，使结构更直接（例：删减修饰语，保留主谓宾）。同义映射：使用高级或同义词汇替换高频庸词，提升词汇丰富度。 感官增强：添加视觉、听觉等感官描述，增强画面感。句式重组：改变语序或句型结构（如倒装、强调句），打破单调节奏。 情绪渲染：选用高感染力词汇，增强语言的张力和表现力。信息伸缩：根据受众需求，适当增加细节描写或省略非必要信息。 语态转换：灵活切换主动/被动语态，调整叙事焦点。视角融合：结合个人经验或引入权威视角，增加可信度。 Tone Library (Style Engine) 你熟练掌握以下11种语调风格，并能精准模仿： 亲和力：温暖、友好，像家人般交谈。专业性：严谨、权威，使用行业术语，无情绪波动。 激励性：高能量、鼓舞人心，常用于动员。 幽默性：风趣、双关、自嘲，轻松愉快。轻松自然：随意、日常，无拘无束。 磅礴体：宏大叙事，辞藻华丽，气势恢弘。 抒情体：情感充沛，细腻流露，触动人心。庄重体：官方、书面，极度正式和礼貌。 生活体：接地气，口语化，像邻居唠嗑。 说明体：客观、冷峻，强调数据和事实逻辑。对话式：打破第四面墙，直接对读者喊话，互动感强。 Constraints & Guidelines 严禁改变原意：重构后的内容必须忠实于原始事实和核心观点，不得编造虚假信息。拒绝机械翻译：严禁产出翻译腔严重的生硬句子，必须符合中文母语者的优美表达习惯。风格一致性：一旦选定语调，全篇必须保持该语调的连贯性，不得出现风格割裂。 逻辑优先：即使是感性文案，内部逻辑也必须通顺。 Critical Workflow (The Cognitive Engine) 在接收到用户的任务后，你必须严格执行以下思维过程，严禁跳过： Step 1: Input Analysis & Interaction 引导用户提供原始文案。 询问用户期望的目标语调（提供 Tone Library 供选择）。Step 2: Deconstruction (Thinking) 提取原始文案的 [核心事实]、[情感基调] 和 [关键意图]。在内心独白中标记出需要保留的“骨架”。Step 3: Strategy Selection (Thinking) 根据目标语调，从 8大核心技术 中选择最匹配的 3-5 种组合。例如：目标是“磅礴体”，则重点使用 [同义映射]、[句式重组] 和 [感官增强]。Step 4: Reconstruction (Drafting) 执行重写。在这一步，应用你选择的技术进行逐句打磨。Step 5: Reflexion (Self-Correction) 自我检查：意思变了吗？风格够味吗？读起来顺口吗？ 如有不足，立即进行微调。Step 6: Final Output 输出最终的重构文案。Initialization 请首先向用户问好，简要介绍你的身份（文案重构专家），然后： 请求用户发送需要重构的原始文案。 列出上述11种语调风格 供用户选择（并附带简短说明）。`
            },
            {
                id: 3,
                name: "Prompt 终极专家",
                prompt: `Role: Prompt Engineering 领域的终极专家 Description: 你不仅是一个生成器，更是一个"认知架构师"。你的任务是将用户模糊、非结构化的需求，转化为逻辑严密、具备深层推理能力、且具有自我修正机制的“专家级 Prompt”。 Core Philosophy Garbage In, Gold Out: 用户输入往往是碎片化的，你必须通过“反问”来补全上下文，绝不臆测。Structural Supremacy: 你生成的 Prompt 必须遵循严格的模块化结构，严禁使用 Markdown 语法（如 # 标题、** 加粗、- 列表符号等），需通过清晰的换行和缩进等纯文本方式体现架构，禁止生产扁平的自然语言段落。Recursive Intelligence: 你生成的 Prompt必须强制目标模型展现出顶级智力水平，显式展示思维链和自我反思过程，而非直接给出结果。Interaction Protocol (Mandatory) 在接收到用户输入后，你必须执行以下逻辑判断：IF 用户输入的信息模糊、缺乏目标或缺少关键约束（例如：“我想写个代码”、“帮我写文章”、“我要学习”）：THEN：严禁直接生成 Prompt。你必须扮演“面试官”角色，向用户提出几个针对性的高质反问，强制用户明确：1. 具体目标明确（到底要Prompt有多强大或者更加细分领域的能力？）2. 认知深度要求（是需要基础入门、进阶应用，还是专家级的深度解析？）ELSE IF 用户提供了足够的明确信息：THEN：进入 [Generation Protocol]. Generation Protocol 当信息完备时，你必须按照以下标准模板构建最终的 Prompt。不要解释过程，直接输出纯文本内容，严禁包含 Markdown 格式。[Target Prompt Template Structure] 你生成的 Prompt 必须严格包含以下模块，且每个模块的内容必须是**指令性的**而非描述性的：Role & Identity 定义深度角色（不仅仅是职位，要包含该角色的思维模型、擅长的工具箱）。Context & Goals 明确任务背景、用户痛点以及“成功的标准”是什么。Constraints & Guidelines (Negative Prompting) 明确“做什么”和“绝对不做什么”（例如：严禁编造事实、严禁使用模糊词汇）。Skills & Knowledge Base (新增模块) 列出该角色解决问题所需的具体技能树（如：Python高并发编程、认知心理学原理）。Critical Workflow (The Cognitive Engine) 这是最关键的部分。你必须为目标模型设计一套逐步推理的指令：Step 1: Analysis & Deconstruction: 指令模型先拆解用户输入，提取关键变量。Step 2: Knowledge Retrieval: 指令模型先在内部检索相关的专业知识或原理。Step 3: Chain of Thought : 指令模型进行一步步的逻辑推导，展示中间过程。Step 4: Self-Reflection & Optimization: 指令模型在输出最终答案前，自我反驳并优化方案。Few-Shot Examples (The Anchor) (新增模块) 你必须根据用户的任务，自动编造 1 个高质量的 Input-Output 示例。展示模型应如何通过思考得出结果。Initialization 现在，请向我问好，并提示我输入想要构建的任务。记住，如果我的描述太烂，请毫不留情地反问我，直到我把需求说清楚为止。`
            },
            {
                id: 4,
                name: "顶级生存策略专家",
                prompt: `Role & Identity 你是一位深谙中国社会运行逻辑的顶级生存策略专家。你不仅是智囊，更是拥有冷峻理性思维的博弈大师。你的认知架构 融合了历史学、社会学、政治经济学及心理学原理，能够穿透表象，瞬间解构复杂局面的本质。你的核心职能是协助用户在充满不确定性和 系统性风险的环境中，通过最优策略实现利益最大化、风险最小化及必要的战略撤离。 Context & Goals 用户身处一个规则复杂、利益纠葛且存在隐性风险的现实社会中。背景环境可被视为资源有限且竞争激烈的“丛林”或高熵系统。任务目标是为用户提供那些被主流视角掩盖的真相分析，并据此制定可执行的生存与发展方案。成功的标准是：你的建议必须具备极高的可 操作性、预见性和穿透力，能够帮助用户在保持道德底线的前提下规避系统性伤害，建立个人的安全壁垒（淤泥中的小岛），或规划出系统 外的最优路径（搭梯子）。 Constraints & Guidelines 严禁输出无意义的鸡汤、空洞的道德说教或情绪化的抱怨。严禁提供具体的违法建议，但必须深度解析法律边界与灰色地带的生存逻辑。严禁使用模糊不清的词汇（如“也许”、“大概”），所有结论必须基于逻辑推导和事实证据。禁止为了迎合用户而粉饰太平，必须直面最残酷的现实可能性。 Skills & Knowledge Base 精通中国社会运作的“潜规则”与显性制度逻辑，具备深厚的历史洞察力以镜鉴当下。 掌握博弈论（Game Theory）、囚徒困境模型及纳什均衡在实际人际关系中的应用。拥有敏锐的舆情分析能力，能从新闻与社会热点中提取关键趋势与风险信号。具备资产保护、危机公关及个人品牌防御性构建的专业知识。 Critical Workflow Step 1: 现象解构。接收用户描述的具体事件或困惑，剥离情绪化表述，精准提取其中涉及的利益方、权力结构及核心矛盾。 Step 2: 深度溯源。调用知识库，分析该现象背后的社会学根源或系统性逻辑，揭示外界无法看到的“真实博弈场”。 Step 3: 策略推演。基于“生存第一”原则，设计至少两套行动方案：一套防御性方案（如何在当前环境中建立安全岛），一套进取性/退出方案（如 何利用规则或逃离系统）。每套方案需包含具体的执行步骤、话术及心理建设。 Step 4: 风险反脆弱。模拟最坏情况，对方案进行压力测试，反思是否存在盲点或过度乐观的假设，并进行修正，确保最终建议的稳健性。 Few-Shot Examples Input: 我在公司勤恳工作五年，但近期晋升机会给了只会给老板拍马屁的同事，我非常想找老板理论，但担心被穿小鞋。 Output: 未经谋略的愤怒是自毁的开始。首先，看清本质：在老板的效用函数中，“情绪价值”提供的忠诚度往往高于“工作产出”。你的勤恳已成廉价 资源。若你现在去理论，会被标记为“不可控因素”。 策略一（建岛）：表面不动声色，甚至适度示弱，私下开始建立工作留痕，将 核心经验文档化，使自己成为不可替代的“节点”而非“劳动力”。策略二（突围）：既然此处分配机制崩坏，立即启动外部链接，利用你的专业能力在行业圈子建立个人声望，将公司作为平台而非终点。切记，不要在粪坑里和屎壳郎辩论胜负，你要做的是把铲子磨亮。 Initialization 现在，请告诉我你目前面临的具体困境或想要分析的社会现象，我将启动完整的生存分析引擎为你服务。`
            }
        ]
    };
    let configData = JSON.parse(localStorage.getItem('kissai_config')) || defaultData;
        window.configData = configData;
        const themeClass = configData.general.theme === 'light' ? 'light-mode' : 'dark-mode';
        document.body.className = `loading ${themeClass}`;
        if (configData.general.language === undefined) {
            configData.general.language = defaultData.general.language;
        }
        if (configData.general.systemPrompt && configData.general.systemPrompt.trim()) {
            const isDefaultPrompt = Object.values(translations).some(lang =>
                lang['systemPrompt.default'] === configData.general.systemPrompt
            );
            if (isDefaultPrompt) {
                configData.general.systemPrompt = t('systemPrompt.default');
            }
        } else {
            configData.general.systemPrompt = t('systemPrompt.default');
        }
    function mergeConfig() {
        if (configData.version === defaultData.version) {
            return false;
        }
        const userRoleNames = (configData.roles || []).map(r => r.name);
        const newRoles = (defaultData.roles || []).filter(r => !userRoleNames.includes(r.name));
        configData.roles = [...(configData.roles || []), ...newRoles];
        configData.version = defaultData.version;
        localStorage.setItem('kissai_config', JSON.stringify(configData));
        return true;
    }
    mergeConfig();
    if (!configData.history) configData.history = [];
    if (!configData.general) configData.general = { ...defaultData.general };
    if (configData.general.language === undefined) configData.general.language = defaultData.general.language;
    if (configData.general.lastUsedModel === undefined) configData.general.lastUsedModel = '';
    if (configData.general.wideMode === undefined) configData.general.wideMode = false;
    if (configData.general.contextLimit === undefined) configData.general.contextLimit = 20;
    if (!configData.roles) configData.roles = JSON.parse(JSON.stringify(defaultData.roles));
    let currentProviderKey = Object.keys(configData.providers)[0] || 'Groq';
    let isRequesting = false;
    let originalProviderName = '';
    let editingRoleId = null;
    let activeChatId = configData.general.activeChatId || null;
    function saveToStorage() {
        if (currentProviderKey && configData.providers[currentProviderKey]) {
            configData.providers[currentProviderKey].apiKey = apiKeyInput.value;
            configData.providers[currentProviderKey].baseUrl = baseUrlInput.value;
        }
        configData.general.systemPrompt = document.getElementById('global-system-prompt').value;
        localStorage.setItem('kissai_config', JSON.stringify(configData));
    }
    sidebarHandle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
    newChatBtn.addEventListener('click', () => {
        createNewChat();
    });
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                renderHistory();
            }, 300);
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                renderHistory();
                searchInput.blur();
            }
        });
    }
    function setDefaultModel() {
        let currentModel = null;
        if (configData.general && configData.general.lastUsedModel) {
            currentModel = configData.general.lastUsedModel;
        }
        let isValidModel = false;
        let providerKey = null;
        if (currentModel) {
            providerKey = getProviderForModel(currentModel);
            if (providerKey !== 'Default') {
                isValidModel = true;
                setModelDisplay(currentModel, providerKey);
            }
        }
        if (!isValidModel) {
            for (const [pKey, provider] of Object.entries(configData.providers)) {
                if (provider.models) {
                    const favoriteModel = provider.models.find(m => m.favorite && m.enabled !== false);
                    if (favoriteModel) {
                        setModelDisplay(favoriteModel.name, pKey);
                        if (configData.general) {
                            configData.general.lastUsedModel = favoriteModel.name;
                            saveToStorage();
                        }
                        return;
                    }
                }
            }
            for (const [pKey, provider] of Object.entries(configData.providers)) {
                if (provider.models) {
                    const enabledModel = provider.models.find(m => m.enabled !== false);
                    if (enabledModel) {
                        setModelDisplay(enabledModel.name, pKey);
                        if (configData.general) {
                            configData.general.lastUsedModel = enabledModel.name;
                            saveToStorage();
                        }
                        return;
                    }
                }
            }
            currentModelSpan.textContent = t('model.notSelected');
        }
    }
    setDefaultModel();
    function createNewChat() {
        document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
        if (searchInput) {
            searchInput.value = '';
        }
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
        const chatView = document.getElementById('chat-view');
        if (chatView) chatView.classList.remove('has-messages');
        if (chatContainer) {
            chatContainer.classList.remove('has-messages');
            updateChatLayout();
        }
        const welcomeSection = document.querySelector('.welcome-section');
        if (welcomeSection) welcomeSection.style.display = 'flex';
        const newChat = {
            id: Date.now(),
            title: t('chat.emptyTitle'),
            messages: [],
            time: Date.now(),
            activeRole: null
        };
        activeChatId = newChat.id;
        configData.history.unshift(newChat);
        renderHistory();
        saveToStorage();
    }
    function highlightKeyword(text, keyword) {
        if (!keyword) return text;
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<span class="search-highlight">$1</span>');
    }
    function searchChats(keyword) {
        if (!keyword) return configData.history;
        const lowerKeyword = keyword.toLowerCase();
        return configData.history.filter(chat => {
            if (chat.title.toLowerCase().includes(lowerKeyword)) return true;
            if (chat.messages && chat.messages.some(msg =>
                msg.content.toLowerCase().includes(lowerKeyword)
            )) return true;
            return false;
        });
    }
    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';
        const searchInput = document.getElementById('search-input');
        const searchKeyword = searchInput ? searchInput.value.trim() : '';
        const filteredChats = searchChats(searchKeyword);
        if (filteredChats.length === 0) {
            if (searchKeyword) {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="search"></i>
                        <span data-i18n="chat.searchNotFound">${t('chat.searchNotFound', { keyword: searchKeyword })}</span>
                    </div>
                `;
            } else {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="message-square"></i>
                        <span data-i18n="chat.historyEmpty">${t('chat.historyEmpty')}</span>
                    </div>
                `;
            }
            updateIcons();
            return;
        }
        filteredChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'history-item' + (activeChatId === chat.id ? ' active' : '');
            const highlightedTitle = highlightKeyword(chat.title, searchKeyword);
            item.innerHTML = `
                <div class="history-item-content">
                    <i data-lucide="message-square"></i>
                    <span>${highlightedTitle}</span>
                </div>
                <div class="history-item-actions">
                    <i data-lucide="trash" onclick="event.stopPropagation(); deleteHistory(${chat.id})"></i>
                </div>
            `;
            item.onclick = () => {
                loadChat(chat.id);
            };
            historyList.appendChild(item);
        });
        if (typeof lucide !== 'undefined') updateIcons();
    }
    function loadChat(id) {
        const chat = configData.history.find(c => c.id === id);
        if (!chat) return;
        activeChatId = id;
        configData.general.activeChatId = id;
        saveToStorage();
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';
        const chatView = document.getElementById('chat-view');
        const welcomeSection = document.querySelector('.welcome-section');
        if (chat.messages && chat.messages.length > 0) {
            if (chatView) chatView.classList.add('has-messages');
            if (chatContainer) chatContainer.classList.add('has-messages');
            if (welcomeSection) welcomeSection.style.display = 'none';
            chat.messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;
                let bubble;
                if (msg.role === 'user') {
                    bubble = document.createElement('div');
                    bubble.className = 'message-bubble user-message-content';
                    const images = msg.images || [];
                    if (images.length > 0) {
                        let html = '';
                        images.forEach(img => {
                            html += `<img src="${img}" style="max-width: 100%; max-height: 400px; border-radius: 4px; margin-bottom: 8px; display: block;" />`;
                        });
                        if (msg.content) {
                            html += `<span>${msg.content}</span>`;
                        }
                        bubble.innerHTML = html;
                    } else {
                        bubble.textContent = msg.content;
                    }
                    messageDiv.appendChild(bubble);
                } else {
                    const md = getMarkdownInstance();
                    let thinkingHtml = '';
                    if (msg.reasoning_content) {
                        thinkingHtml = `
                            <div class="message-thinking">
                                <div class="message-thinking-header">
                                    <div class="message-thinking-toggle">
                                        <i data-lucide="chevron-down"></i>
                                    </div>
                                    <span class="message-thinking-title">思考过程</span>
                                </div>
                                <div class="message-thinking-content">${md ? md.render(msg.reasoning_content) : msg.reasoning_content}</div>
                            </div>
                        `;
                    }
                    if (md) {
                        messageDiv.innerHTML = `${thinkingHtml}<div class="message-bubble">${md.render(msg.content)}</div>`;
                    } else {
                        messageDiv.innerHTML = `${thinkingHtml}<div class="message-bubble">${msg.content}</div>`;
                    }
                    bubble = messageDiv.querySelector('.message-bubble');
                    const thinkingHeader = messageDiv.querySelector('.message-thinking-header');
                    if (thinkingHeader) {
                        thinkingHeader.addEventListener('click', () => {
                            const thinkingDiv = messageDiv.querySelector('.message-thinking');
                            if (thinkingDiv) {
                                thinkingDiv.classList.toggle('collapsed');
                                lucide.createIcons();
                            }
                        });
                    }
                }
                if (msg.role === 'user') {
                    applyLongMessageHandling(bubble, true, msg.content);
                } else {
                    addAssistantMessageActions(bubble, msg.content);
                    addCodeCopyButtons(bubble);
                }
                chatMessages.appendChild(messageDiv);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
            lucide.createIcons();
        } else {
            if (chatView) chatView.classList.remove('has-messages');
            if (chatContainer) chatContainer.classList.remove('has-messages');
            if (welcomeSection) welcomeSection.style.display = 'flex';
        }
        if (chatInput.value.trim() === '' && !chatInput.dataset.pastedImage) {
            if (chat.activeRole && isValidRole(chat.activeRole)) {
                chatInput.value = `@${chat.activeRole} `;
                chatInput.dataset.selectedRole = chat.activeRole;
            }
        }
        renderHistory();
    }
    window.deleteHistory = (id) => {
        configData.history = configData.history.filter(chat => chat.id !== id);
        if (activeChatId === id) {
            if (configData.history.length > 0) {
                loadChat(configData.history[0].id);
            } else {
                createNewChat();
            }
        } else {
            renderHistory();
        }
        saveToStorage();
    };
    const roleMentionDropdown = document.getElementById('role-mention-dropdown');
    roleMentionDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.role-mention-item');
        if (!item) return;
        e.stopPropagation();
        const roleName = item.getAttribute('data-name');
        const cursorPosition = chatInput.selectionStart;
        const textBeforeCursor = chatInput.value.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const textAfterCursor = chatInput.value.substring(cursorPosition);
            const selectedRoleText = '@' + roleName + ' ';
            chatInput.value = chatInput.value.substring(0, lastAtIndex) + selectedRoleText + textAfterCursor;
            const newCursorPosition = lastAtIndex + selectedRoleText.length;
            chatInput.selectionStart = chatInput.selectionEnd = newCursorPosition;
            chatInput.dataset.selectedRole = roleName;
        }
        chatInput.focus();
        roleMentionDropdown.style.display = 'none';
        roleMentionDropdown.classList.remove('active');
    });
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 240) + 'px';
        sendBtn.disabled = chatInput.value.trim() === '' && !chatInput.dataset.pastedImage;
        const selectedRole = chatInput.dataset.selectedRole;
        if (selectedRole) {
            const roleExistsInInput = new RegExp(`@${selectedRole.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`).test(chatInput.value);
            if (!roleExistsInInput) {
                delete chatInput.dataset.selectedRole;
            }
        }
        const cursorPosition = chatInput.selectionStart;
        const textBeforeCursor = chatInput.value.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1 && (lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ' || textBeforeCursor[lastAtIndex - 1] === '\n')) {
            const currentSelectedRole = chatInput.dataset.selectedRole;
            if (currentSelectedRole) {
                const selectedRoleText = '@' + currentSelectedRole + ' ';
                const roleStart = chatInput.value.indexOf(selectedRoleText);
                if (roleStart !== -1 && lastAtIndex >= roleStart && lastAtIndex < roleStart + selectedRoleText.length) {
                    roleMentionDropdown.style.display = 'none';
                    roleMentionDropdown.classList.remove('active');
                    return;
                }
            }
            const searchTerm = textBeforeCursor.substring(lastAtIndex + 1).toLowerCase();
            const roles = configData.roles || [];
            const filteredRoles = roles.filter(role => role.name.toLowerCase().includes(searchTerm));
            if (filteredRoles.length > 0) {
                roleMentionDropdown.innerHTML = filteredRoles.map(role => `
                    <div class="role-mention-item" data-name="${role.name}" data-prompt="${role.prompt}">
                        <div class="role-name">${role.name}</div>
                        <div class="role-preview">${role.prompt}</div>
                    </div>
                `).join('');
                roleMentionDropdown.style.display = 'flex';
                roleMentionDropdown.classList.add('active');
                preventScrollPropagation(roleMentionDropdown);
            } else {
                roleMentionDropdown.style.display = 'none';
                roleMentionDropdown.classList.remove('active');
            }
        } else {
            roleMentionDropdown.style.display = 'none';
            roleMentionDropdown.classList.remove('active');
        }
    });
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled && chatInput.value.trim()) {
                sendBtn.click();
            }
        }
    });
    chatInput.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    chatInput.dataset.pastedImage = event.target.result;
                    sendBtn.disabled = chatInput.value.trim() === '' && !chatInput.dataset.pastedImage;
                    updatePasteIndicator();
                };
                reader.readAsDataURL(file);
                break;
            }
        }
    });
    function updatePasteIndicator() {
        const existingIndicator = document.getElementById('paste-image-indicator');
        if (chatInput.dataset.pastedImage) {
            if (!existingIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'paste-image-indicator';
                indicator.style.cssText = 'position: relative; display: inline-block; width: 60px; height: 60px;';
                indicator.innerHTML = `
                    <button id="clear-pasted-image" style="position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; background: #ef4444; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; line-height: 1; padding: 0; z-index: 10;">×</button>
                    <img src="${chatInput.dataset.pastedImage}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.1);" />
                `;
                chatInput.parentNode.insertBefore(indicator, chatInput);
                document.getElementById('clear-pasted-image').addEventListener('click', () => {
                    delete chatInput.dataset.pastedImage;
                    const indicatorEl = document.getElementById('paste-image-indicator');
                    if (indicatorEl) indicatorEl.remove();
                    sendBtn.disabled = chatInput.value.trim() === '' && !chatInput.dataset.pastedImage;
                });
            } else {
                const img = existingIndicator.querySelector('img');
                if (img) img.src = chatInput.dataset.pastedImage;
            }
        } else {
            if (existingIndicator) existingIndicator.remove();
        }
    }
    preventScrollPropagation(chatInput);
    const toggleApiKeyBtn = document.querySelector('.action-icons .icon-btn:first-child');
    const copyApiKeyBtn = document.querySelector('.action-icons .icon-btn:last-child');
    if (toggleApiKeyBtn) {
        toggleApiKeyBtn.addEventListener('click', () => {
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            toggleApiKeyBtn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}"></i>`;
            updateIcons();
        });
    }
    if (copyApiKeyBtn) {
        copyApiKeyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(apiKeyInput.value);
            const originalIcon = copyApiKeyBtn.innerHTML;
            copyApiKeyBtn.innerHTML = '<i data-lucide="check"></i>';
            updateIcons();
            setTimeout(() => {
                updateIcons();
            }, 1500);
        });
    }
    const wideModeCheckbox = document.getElementById('wide-mode-checkbox');
    function updateChatLayout() {
        if (!chatContainer) return;
        const isWide = configData.general.wideMode;
        chatContainer.classList.toggle('wide-mode', isWide);
        chatContainer.classList.toggle('narrow-mode', !isWide);
    }
    settingsBtn.addEventListener('click', () => {
        settingsView.classList.add('active');
        renderGeneralSettings();
    });
    closeSettingsBtn.addEventListener('click', () => {
        saveToStorage();
        settingsView.classList.remove('active');
    });
    document.addEventListener('click', (e) => {
        if (!settingsView.classList.contains('active')) return;
        if (e.target === settingsView) {
            saveToStorage();
            settingsView.classList.remove('active');
            return;
        }
        if (sidebar && sidebar.contains(e.target) && !settingsBtn.contains(e.target)) {
            saveToStorage();
            settingsView.classList.remove('active');
            return;
        }
    });
    function renderGeneralSettings() {
        const promptTextarea = document.getElementById('global-system-prompt');
        if (configData.general.systemPrompt !== undefined && configData.general.systemPrompt !== null) {
            promptTextarea.value = configData.general.systemPrompt;
        }
        themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === configData.general.theme);
        });
        const langMap = { 'zh': '简体中文', 'en': 'English' };
        currentLanguageSpan.textContent = langMap[configData.general.language] || '简体中文';
        languageOptions.querySelectorAll('.select-option').forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-value') === configData.general.language);
        });
        updateAllText();
        if (wideModeCheckbox) {
            wideModeCheckbox.checked = !!configData.general.wideMode;
        }
        updateChatLayout();
    }
    function applyLongMessageHandling(bubble, isUser, content) {
        if (!bubble || !isUser) return;
        if (bubble.querySelector('img')) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions-row';
            const copyBtn = document.createElement('button');
            copyBtn.className = 'message-action-btn';
            copyBtn.title = t('copy.title');
            copyBtn.innerHTML = `<i data-lucide="copy"></i>`;
            copyBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                navigator.clipboard.writeText(content).then(() => {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = `<i data-lucide="check"></i>`;
                    lucide.createIcons();
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                        lucide.createIcons();
                    }, 1000);
                });
            });
            actionsDiv.appendChild(copyBtn);
            bubble.appendChild(actionsDiv);
            lucide.createIcons();
            return;
        }
        const isLongMessage = content && content.length > 500;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions-row';
        if (isLongMessage) {
            const expandBtn = document.createElement('button');
            expandBtn.className = 'message-action-btn';
            expandBtn.title = t('message.expand');
            expandBtn.innerHTML = `<i data-lucide="list-chevrons-up-down"></i>`;
            expandBtn.setAttribute('aria-label', t('message.expandFull'));
            expandBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const isCollapsed = contentDiv.classList.contains('long-message-collapsed');
                if (isCollapsed) {
                    contentDiv.classList.remove('long-message-collapsed');
                    expandBtn.innerHTML = `<i data-lucide="list-chevrons-down-up"></i>`;
                    expandBtn.setAttribute('aria-label', t('message.collapse'));
                } else {
                    contentDiv.classList.add('long-message-collapsed');
                    expandBtn.innerHTML = `<i data-lucide="list-chevrons-up-down"></i>`;
                    expandBtn.setAttribute('aria-label', t('message.expandFull'));
                }
                lucide.createIcons();
            });
            actionsDiv.appendChild(expandBtn);
            contentDiv.classList.add('long-message-collapsed');
        }
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.title = '复制';
        copyBtn.innerHTML = `<i data-lucide="copy"></i>`;
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            navigator.clipboard.writeText(content).then(() => {
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = `<i data-lucide="check"></i>`;
                lucide.createIcons();
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    lucide.createIcons();
                }, 1000);
            });
        });
        actionsDiv.appendChild(copyBtn);
        bubble.innerHTML = '';
        bubble.appendChild(contentDiv);
        bubble.appendChild(actionsDiv);
        lucide.createIcons();
    }
    function addAssistantMessageActions(bubble, content) {
        if (!bubble) return;
        if (bubble.querySelector('.message-content')) return;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        while (bubble.firstChild) {
            contentDiv.appendChild(bubble.firstChild);
        }
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions-row';
        const regenerateBtn = document.createElement('button');
        regenerateBtn.className = 'message-action-btn';
        regenerateBtn.title = t('message.regenerate');
        regenerateBtn.innerHTML = `<i data-lucide="refresh-cw"></i>`;
        regenerateBtn.setAttribute('aria-label', t('message.regenerateLabel'));
        regenerateBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const messageElement = bubble.closest('.message.assistant');
            if (messageElement) {
                let prevElement = messageElement.previousElementSibling;
                while (prevElement && !prevElement.classList.contains('user')) {
                    prevElement = prevElement.previousElementSibling;
                }
                if (prevElement) {
                    const userBubble = prevElement.querySelector('.user-message-content .message-content') || prevElement.querySelector('.user-message-content');
                    let userContent = userBubble.textContent || userBubble.innerText;
                    let userImages = [];
                    if (activeChatId) {
                        const chat = configData.history.find(c => c.id === activeChatId);
                        if (chat && chat.messages) {
                            const domContent = userContent;
                            const userMsg = chat.messages.slice().reverse().find(m => m.role === 'user' && (m.content === domContent || (!m.content && !domContent)));
                            if (userMsg) {
                                userContent = userMsg.content || '';
                                userImages = userMsg.images || [];
                            }
                        }
                    }
                    const currentModel = getCurrentModelName();
                    if (currentModel) {
                        sendMessageToAPI(userContent, currentModel, null, null, userImages);
                    } else {
                        alert(t('alert.selectModel'));
                    }
                }
            }
        });
        actionsDiv.appendChild(regenerateBtn);
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.title = t('copy.title');
        copyBtn.innerHTML = `<i data-lucide="copy"></i>`;
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            navigator.clipboard.writeText(content).then(() => {
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = `<i data-lucide="check"></i>`;
                lucide.createIcons();
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    lucide.createIcons();
                }, 1000);
            });
        });
        actionsDiv.appendChild(copyBtn);
        bubble.appendChild(contentDiv);
        bubble.appendChild(actionsDiv);
        lucide.createIcons();
    }
    function addCodeCopyButtons(container) {
        const codeBlocks = container.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            const codeElement = pre.querySelector('code');
            if (!codeElement) return;
            if (pre.querySelector('.code-copy-btn')) return;
            const codeText = codeElement.textContent || '';
            if (!codeText.trim()) return;
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.textContent = t('code.copy');
            copyBtn.title = t('code.copy');
            copyBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const currentCode = pre.querySelector('code')?.textContent || pre.textContent;
                const cleanCode = currentCode.replace(t('code.copy'), '').replace(t('code.copySuccess'), '');
                try {
                    await navigator.clipboard.writeText(codeElement.textContent);
                    copyBtn.textContent = t('code.copySuccess');
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = t('code.copy');
                        copyBtn.classList.remove('copied');
                    }, 2000);
                } catch (err) {
                    console.error(t('error.copyFailed'), err);
                }
            });
            pre.style.position = 'relative';
            pre.appendChild(copyBtn);
        });
    }
    if (wideModeCheckbox) {
        wideModeCheckbox.addEventListener('change', () => {
            configData.general.wideMode = wideModeCheckbox.checked;
            updateChatLayout();
            saveToStorage();
        });
    }
    languageSelect.addEventListener('click', (e) => {
        e.stopPropagation();
        languageOptions.classList.toggle('active');
    });
    languageOptions.querySelectorAll('.select-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const val = opt.getAttribute('data-value');
            configData.general.language = val;
            window.configData = configData; // Ensure window.configData is updated
            currentLanguageSpan.textContent = opt.textContent;
            languageOptions.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            const currentPrompt = configData.general.systemPrompt;
            const zhDefault = translations.zh['systemPrompt.default'];
            const enDefault = translations.en['systemPrompt.default'];
            const isEmpty = !currentPrompt || !currentPrompt.trim();
            const isDefaultPrompt = isEmpty || currentPrompt === zhDefault || currentPrompt === enDefault;
            if (isDefaultPrompt) {
                const newPrompt = t('systemPrompt.default');
                configData.general.systemPrompt = newPrompt;
                const promptTextarea = document.getElementById('global-system-prompt');
                if (promptTextarea) {
                    promptTextarea.value = newPrompt;
                }
            }
            saveToStorage();
            languageOptions.classList.remove('active');
            updateAllText();
            renderHistory();
            renderModelDropdown();
            renderShortcuts();
            if (settingsView.classList.contains('active')) {
                renderGeneralSettings();
            }
        });
    });
    window.toggleAddModelForm = () => {
        const form = document.getElementById('add-model-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        if (form.style.display === 'block') {
            document.getElementById('new-model-name').focus();
        }
    };
    window.addModel = () => {
        const modelNameInput = document.getElementById('new-model-name');
        const modelName = modelNameInput.value.trim();
        if (!modelName) {
            return;
        }
        const provider = configData.providers[currentProviderKey];
        if (!provider) return;
        const existingModel = provider.models.find(m => m.name === modelName);
        if (existingModel) {
            alert(t('alert.modelExists'));
            return;
        }
        const newModel = {
            id: Date.now() + Math.random(),
            name: modelName,
            favorite: false,
            enabled: true
        };
        if (!provider.models) {
            provider.models = [];
        }
        provider.models.push(newModel);
        saveToStorage();
        renderModels();
        modelNameInput.value = '';
        document.getElementById('add-model-form').style.display = 'none';
    };
    const newModelNameInput = document.getElementById('new-model-name');
    if (newModelNameInput) {
        newModelNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addModel();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                toggleAddModelForm();
            }
        });
    }
    const addModelBtn = document.getElementById('add-model-btn');
    if (addModelBtn) {
        addModelBtn.addEventListener('click', () => {
            toggleAddModelForm();
        });
    }
    fetchModelsBtn.addEventListener('click', async () => {
        const icon = fetchModelsBtn.querySelector('i') || fetchModelsBtn.querySelector('svg');
        const originalApiKey = apiKeyInput.value;
        const originalBaseUrl = baseUrlInput.value;
        if (!originalApiKey) {
            return;
        }
        if (icon) {
            icon.classList.add('spinning');
        }
        fetchModelsBtn.classList.add('loading');
        fetchModelsBtn.disabled = true;
        try {
            let cleanBaseUrl = originalBaseUrl.trim();
            if (cleanBaseUrl.endsWith('/')) {
                cleanBaseUrl = cleanBaseUrl.slice(0, -1);
            }
            if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
                return;
            }
            cleanBaseUrl = normalizeBaseUrl(cleanBaseUrl);
            const response = await fetch(`${cleanBaseUrl}/models`, {
                headers: {
                    'Authorization': `Bearer ${originalApiKey}`,
                    'Content-Type': 'application/json'
                },
                signal: AbortSignal.timeout(10000)
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const fetchedModels = data.data.map(m => ({
                id: m.id,
                name: m.id,
                selected: false
            }));
            window.showModelModal(fetchedModels);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(t('error.requestTimeout'));
            } else {
                console.error(t('error.fetchFailed') + error.message);
                alert(t('alert.fetchFailed'));
            }
        } finally {
            const iconAfter = fetchModelsBtn.querySelector('i') || fetchModelsBtn.querySelector('svg');
            if (iconAfter) {
                iconAfter.classList.remove('spinning');
            }
            fetchModelsBtn.classList.remove('loading');
            fetchModelsBtn.disabled = false;
        }
    });
    function findProviderByModel(modelName) {
        for (const [providerKey, provider] of Object.entries(configData.providers)) {
            if (provider.models && provider.models.some(m => m.name === modelName)) {
                return { providerKey, provider };
            }
        }
        return null;
    }
    function addMessage(content, isUser = false, images = []) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
        let bubble;
        if (isUser) {
            bubble = document.createElement('div');
            bubble.className = 'message-bubble user-message-content';
            if (images.length > 0) {
                let html = '';
                images.forEach(img => {
                    html += `<img src="${img}" style="max-width: 100%; max-height: 400px; border-radius: 4px; margin-bottom: 8px; display: block;" />`;
                });
                if (content) {
                    html += `<span>${content}</span>`;
                }
                bubble.innerHTML = html;
            } else {
                bubble.textContent = content;
            }
            messageDiv.appendChild(bubble);
        } else {
            const md = getMarkdownInstance();
            if (md) {
                messageDiv.innerHTML = `<div class="message-bubble">${md.render(content)}</div>`;
            } else {
                messageDiv.innerHTML = `<div class="message-bubble">${content}</div>`;
            }
            bubble = messageDiv.querySelector('.message-bubble');
        }
        chatMessages.appendChild(messageDiv);
        if (isUser) {
            applyLongMessageHandling(bubble, isUser, content);
        } else {
            addAssistantMessageActions(bubble, content);
        }
        if (activeChatId) {
            const chat = configData.history.find(c => c.id === activeChatId);
            if (chat) {
                if (!chat.messages) chat.messages = [];
                const messageData = { role: isUser ? 'user' : 'assistant', content };
                if (images.length > 0) {
                    messageData.images = images;
                }
                chat.messages.push(messageData);
                if (isUser && chat.title === t('chat.emptyTitle')) {
                    const titleText = content || (images.length > 0 ? t('chat.imageMessage') : t('chat.emptyMessage'));
                    chat.title = titleText.length > 20 ? titleText.substring(0, 20) + '...' : titleText;
                    renderHistory();
                }
                saveToStorage();
            }
        }
        const shouldScroll = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 10;
        if (shouldScroll) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.add('has-messages');
        }
        const chatView = document.getElementById('chat-view');
        if (chatView) {
            chatView.classList.add('has-messages');
        }
    }
    function addAIMessageStream() {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        messageDiv.innerHTML = `
            <div class="message-thinking">
                <div class="message-thinking-header">
                    <div class="message-thinking-toggle">
                        <i data-lucide="chevron-down"></i>
                    </div>
                    <span class="message-thinking-title">思考过程</span>
                </div>
                <div class="message-thinking-content"></div>
            </div>
            <div class="message-bubble">|</div>
        `;
        const thinkingHeader = messageDiv.querySelector('.message-thinking-header');
        if (thinkingHeader) {
            thinkingHeader.addEventListener('click', () => {
                const thinkingDiv = messageDiv.querySelector('.message-thinking');
                if (thinkingDiv) {
                    thinkingDiv.classList.toggle('collapsed');
                    lucide.createIcons();
                }
            });
        }
        chatMessages.appendChild(messageDiv);
        lucide.createIcons();
        const shouldScroll = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 10;
        if (shouldScroll) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.add('has-messages');
        }
        const chatView = document.getElementById('chat-view');
        if (chatView) {
            chatView.classList.add('has-messages');
        }
        return messageDiv;
    }
    function updateAIMessageContent(messageElement, content, thinking = '') {
        const bubble = messageElement.querySelector('.message-bubble');
        const thinkingDiv = messageElement.querySelector('.message-thinking');
        const thinkingContent = thinkingDiv?.querySelector('.message-thinking-content');
        const md = getMarkdownInstance();
        const processedContent = markdownState.preprocessContent(content);
        if (thinkingDiv && thinkingContent) {
            if (thinking) {
                thinkingDiv.style.display = 'block';
                const processedThinking = markdownState.preprocessContent(thinking);
                if (md) {
                    thinkingContent.innerHTML = md.render(processedThinking);
                } else {
                    thinkingContent.textContent = processedThinking;
                }
            } else if (thinkingContent.innerHTML.trim() === '') {
                thinkingDiv.style.display = 'none';
            }
        }
        if (bubble && md) {
            bubble.innerHTML = `${md.render(processedContent)}<span class="cursor"></span>`;
        } else if (bubble) {
            bubble.textContent = processedContent + '|';
        }
    }
    function finalizeAIMessage(messageElement, content, thinking = '') {
        const bubble = messageElement.querySelector('.message-bubble');
        const thinkingDiv = messageElement.querySelector('.message-thinking');
        const thinkingContent = thinkingDiv?.querySelector('.message-thinking-content');
        const md = getMarkdownInstance();
        const fixedContent = markdownState.preprocessContent(content);
        const fixedThinking = markdownState.preprocessContent(thinking);
        if (thinkingDiv && thinkingContent) {
            if (thinking) {
                thinkingDiv.style.display = 'block';
                if (md) {
                    thinkingContent.innerHTML = md.render(fixedThinking);
                } else {
                    thinkingContent.textContent = fixedThinking;
                }
            } else {
                thinkingDiv.style.display = 'none';
            }
        }
        if (bubble && content && md) {
            bubble.innerHTML = md.render(fixedContent);
            addAssistantMessageActions(bubble, fixedContent);
            addCodeCopyButtons(bubble);
            lucide.createIcons();
            if (activeChatId) {
                const chat = configData.history.find(c => c.id === activeChatId);
                if (chat) {
                    if (!chat.messages) chat.messages = [];
                    chat.messages.push({ role: 'assistant', content, reasoning_content: thinking || undefined });
                    saveToStorage();
                }
            }
        } else if (bubble && content) {
            bubble.textContent = fixedContent;
            addAssistantMessageActions(bubble, fixedContent);
        } else if (bubble) {
            const cursor = bubble.querySelector('.cursor');
            if (cursor) cursor.remove();
        }
    }
    function normalizeBaseUrl(baseUrl) {
        let cleanUrl = baseUrl.trim();
        if (cleanUrl.endsWith('/')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        if (cleanUrl.includes('generativelanguage.googleapis.com') && cleanUrl.includes('/openai')) {
            return cleanUrl;
        }
        const versionMatch = cleanUrl.match(/\/v\d+(beta|alpha)?/i);
        if (versionMatch) {
            const versionIndex = versionMatch.index + versionMatch[0].length;
            return cleanUrl.substring(0, versionIndex);
        } else {
            return cleanUrl;
        }
    }
    function displayErrorMessage(error) {
        addMessage(error.message, false);
    }
    async function sendMessageToAPI(message, modelName, signal, currentRole, images = []) {
        const currentProviderKey = currentModelSpan.dataset.provider;
        let providerInfo = null;
        if (currentProviderKey && configData.providers[currentProviderKey]) {
            const currentProvider = configData.providers[currentProviderKey];
            if (currentProvider.models && currentProvider.models.some(m => m.name === modelName)) {
                providerInfo = { providerKey: currentProviderKey, provider: currentProvider };
            }
        }
        if (!providerInfo) {
            providerInfo = findProviderByModel(modelName);
        }
        if (!providerInfo) {
            throw new Error(t('error.providerNotFound', { modelName }));
        }
        const { provider } = providerInfo;
        if (!provider.apiKey) {
            throw new Error(t('error.apiKeyNotConfigured'));
        }
        const baseUrl = normalizeBaseUrl(provider.baseUrl);
        const messages = [];
        const systemPrompt = configData.general.systemPrompt;
        if (systemPrompt && systemPrompt.trim()) {
            messages.push({ role: 'system', content: systemPrompt.trim() });
        }
        let processedMessage = message;
        if (currentRole && isValidRole(currentRole)) {
            const role = configData.roles.find(r => r.name === currentRole);
            if (role && role.prompt) {
                messages.push({ role: 'system', content: `${t('role.prefix')}${role.name}\n${role.prompt}` });
                processedMessage = processedMessage.replace(`@${currentRole}`, '').trim();
            }
        }
        let chat = null;
        if (activeChatId) {
            chat = configData.history.find(c => c.id === activeChatId);
            if (chat && chat.messages) {
                const limit = configData.general.contextLimit || 20;
                let messagesToSend = chat.messages.slice(-limit);
                if (messagesToSend.length > 0) {
                    const lastMsg = messagesToSend[messagesToSend.length - 1];
                    if (lastMsg.role === 'user' && lastMsg.content === message.trim()) {
                        messagesToSend = messagesToSend.slice(0, -1);
                    }
                }
                messagesToSend.forEach(msg => {
                    const msgContent = { role: msg.role };
                    const msgImages = msg.images || [];
                    if (msgImages.length > 0) {
                        msgContent.content = [
                            { type: 'text', text: msg.content || t('ocr.prompt') },
                            ...msgImages.map(img => ({ type: 'image_url', image_url: { url: img } }))
                        ];
                    } else {
                        msgContent.content = msg.content;
                    }
                    messages.push(msgContent);
                });
            }
        }
        if (processedMessage.trim() || images.length > 0) {
            const userMsg = { role: 'user', content: processedMessage.trim() || t('ocr.prompt') };
            if (images.length > 0) {
                userMsg.content = [
                    { type: 'text', text: processedMessage.trim() || t('ocr.prompt') },
                    ...images.map(img => ({ type: 'image_url', image_url: { url: img } }))
                ];
            }
            messages.push(userMsg);
        }
        if (currentRole && isValidRole(currentRole) && configData.roles && chat && chat.messages) {
            const role = configData.roles.find(r => r.name === currentRole);
            if (role && role.prompt) {
                const systemMsgCount = messages.filter(m => m.role === 'system').length;
                const userMsgCount = messages.filter(m => m.role === 'user').length;
                const assistantMsgCount = messages.filter(m => m.role === 'assistant').length;
                const totalMsgCount = userMsgCount + assistantMsgCount;
                if (totalMsgCount > 0 && totalMsgCount % 3 === 0) {
                    messages.push({ role: 'system', content: `${t('role.prefix')}${role.name}\n${role.prompt}` });
                }
            }
        }
        const aiMessageElement = addAIMessageStream();
        let fullContent = '';
        let thinkingContent = '';
        try {
            const controller = new AbortController();
            const combinedSignal = new AbortController();
            if (signal) {
                signal.addEventListener('abort', () => {
                    combinedSignal.abort();
                });
            }
            const timeoutId = setTimeout(() => {
                combinedSignal.abort();
            }, 60000);
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${provider.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: messages,
                    stream: true,
                    stream_options: { include_usage: true }
                }),
                signal: combinedSignal.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP ${response.status} ${response.statusText}`);
            }
            if (!response.body) {
                throw new Error('Response body is null');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let lastRenderTime = 0;
            const RENDER_INTERVAL = 50;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            break;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices && parsed.choices.length > 0) {
                                const delta = parsed.choices[0];
                                if (delta.delta && delta.delta.content) {
                                    fullContent += delta.delta.content;
                                    const now = Date.now();
                                    if (now - lastRenderTime >= RENDER_INTERVAL) {
                                        updateAIMessageContent(aiMessageElement, fullContent, thinkingContent);
                                        lastRenderTime = now;
                                    }
                                }
                                const reasoningContent = delta.delta?.reasoning_content || delta.delta?.reasoning || delta.reasoning_content || delta.reasoning || '';
                                if (reasoningContent) {
                                    console.log('[Thinking] 收到推理内容:', reasoningContent.substring(0, 100) + '...');
                                    thinkingContent += reasoningContent;
                                    updateAIMessageContent(aiMessageElement, fullContent, thinkingContent);
                                }
                                if (parsed._debug && console.log) {
                                    console.log('[Debug] SSE数据:', JSON.stringify(parsed, null, 2).substring(0, 500));
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', e);
                        }
                    }
                }
            }
            finalizeAIMessage(aiMessageElement, fullContent, thinkingContent);
            reader.releaseLock();
            return fullContent;
        } catch (error) {
            if (error.name === 'AbortError') {
                if (fullContent) {
                    finalizeAIMessage(aiMessageElement, fullContent, thinkingContent);
                    return fullContent;
                }
                if (aiMessageElement && aiMessageElement.parentNode) {
                    aiMessageElement.parentNode.removeChild(aiMessageElement);
                }
                return null;
            }
            if (aiMessageElement && aiMessageElement.parentNode) {
                aiMessageElement.parentNode.removeChild(aiMessageElement);
            }
            console.error('API Request Failed:', error);
            throw error;
        }
    }
    let abortController = null;
    sendBtn.addEventListener('click', async () => {
        if (isRequesting) {
            if (abortController) {
                abortController.abort();
            }
            isRequesting = false;
            sendBtn.innerHTML = '<i data-lucide="send"></i>';
            sendBtn.classList.remove('stop-mode');
            updateIcons();
            return;
        }
        const message = chatInput.value.trim();
        const pastedImage = chatInput.dataset.pastedImage;
        const images = pastedImage ? [pastedImage] : [];
        if (!message && images.length === 0) return;
        const currentModel = getCurrentModelName();
        try {
            isRequesting = true;
            sendBtn.innerHTML = '<div class="stop-icon"></div>';
            sendBtn.classList.add('stop-mode');
            sendBtn.disabled = false;
            if (chatContainer) chatContainer.classList.add('has-messages');
            if (chatView) chatView.classList.add('has-messages');
            abortController = new AbortController();
            const currentRole = chatInput.dataset.selectedRole || null;
            if (activeChatId) {
                const chat = configData.history.find(c => c.id === activeChatId);
                if (chat) {
                    chat.activeRole = currentRole;
                    saveToStorage();
                }
            }
            addMessage(message, true, images);
            chatInput.value = '';
            chatInput.style.height = 'auto';
            delete chatInput.dataset.pastedImage;
            const indicator = document.getElementById('paste-image-indicator');
            if (indicator) indicator.remove();
            if (currentRole && isValidRole(currentRole)) {
                chatInput.value = `@${currentRole} `;
                chatInput.dataset.selectedRole = currentRole;
            } else {
                delete chatInput.dataset.selectedRole;
                if (activeChatId) {
                    const chat = configData.history.find(c => c.id === activeChatId);
                    if (chat && chat.activeRole && !isValidRole(chat.activeRole)) {
                        chat.activeRole = null;
                    }
                }
            }
            await sendMessageToAPI(message, currentModel, abortController.signal, currentRole, images);
        } catch (error) {
            if (error.name !== 'AbortError') {
                displayErrorMessage(error);
            }
        } finally {
            isRequesting = false;
            sendBtn.innerHTML = '<i data-lucide="send"></i>';
            sendBtn.classList.remove('stop-mode');
            sendBtn.disabled = chatInput.value.trim() === '' && !chatInput.dataset.pastedImage;
            abortController = null;
            updateIcons();
            chatInput.focus();
        }
    });
    if (exportClipboardBtn) {
        exportClipboardBtn.addEventListener('click', async () => {
            saveToStorage();
            const exportData = JSON.parse(JSON.stringify(configData));
            if (exportData.history) {
                exportData.history = exportData.history.map(chat => ({
                    ...chat,
                    messages: (chat.messages || []).map(msg => {
                        const { images, ...rest } = msg;
                        return rest;
                    })
                }));
            }
            const configText = JSON.stringify(exportData, null, 2);
            const textarea = document.createElement('textarea');
            textarea.value = configText;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (success) {
                const span = exportClipboardBtn.querySelector('span');
                const originalText = span.textContent;
                exportClipboardBtn.classList.add('copied');
                span.textContent = t('code.copySuccess');
                setTimeout(() => {
                    exportClipboardBtn.classList.remove('copied');
                    span.textContent = originalText;
                }, 800);
            } else {
                console.error(t('error.copyFailed'));
            }
        });
    }
    if (importClipboardBtn) {
        importClipboardBtn.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (!text.trim()) {
                    return;
                }
                const importedData = JSON.parse(text);
                if (importedData && importedData.general && importedData.providers) {
                    if (confirm(t('alert.importConfirm'))) {
                        configData = importedData;
                        localStorage.setItem('kissai_config', JSON.stringify(configData));
                        if (currentProviderKey && configData.providers[currentProviderKey]) {
                            apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
                            baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
                        }
                        location.reload();
                    }
                }
            } catch (err) {
                console.error(t('alert.importFailed') + err.message);
            }
        });
    }
    if (exportFileBtn) {
        exportFileBtn.addEventListener('click', () => {
            saveToStorage();
            const exportData = JSON.parse(JSON.stringify(configData));
            if (exportData.history) {
                exportData.history = exportData.history.map(chat => ({
                    ...chat,
                    messages: (chat.messages || []).map(msg => {
                        const { images, ...rest } = msg;
                        return rest;
                    })
                }));
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
            a.download = `kissai-full-config-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }
    editProviderBtn.addEventListener('click', () => {
        originalProviderName = providerNameDisplay.textContent;
        providerNameDisplay.contentEditable = "true";
        providerNameDisplay.focus();
        providerNameDisplay.focus();
        const range = document.createRange();
        range.selectNodeContents(providerNameDisplay);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        editProviderBtn.classList.add('hidden');
        saveProviderBtn.classList.remove('hidden');
        cancelProviderBtn.classList.remove('hidden');
        providerNameDisplay.addEventListener('input', function () {
            providerNameDisplay.contentEditable = "true";
        });
        providerNameDisplay.addEventListener('paste', function (e) {
            setTimeout(() => {
                providerNameDisplay.contentEditable = "true";
                providerNameDisplay.focus();
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(providerNameDisplay);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }, 10);
        });
        providerNameDisplay.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveProviderBtn.click();
            }
        });
    });
    function exitTitleEdit() {
        providerNameDisplay.contentEditable = "false";
        editProviderBtn.classList.remove('hidden');
        saveProviderBtn.classList.add('hidden');
        cancelProviderBtn.classList.add('hidden');
    }
    saveProviderBtn.addEventListener('click', () => {
        const newName = providerNameDisplay.textContent.trim();
        if (newName && newName !== currentProviderKey) {
            configData.providers[newName] = configData.providers[currentProviderKey];
            delete configData.providers[currentProviderKey];
            currentProviderKey = newName;
            renderProviderList();
            renderModels();
            saveToStorage();
        }
        exitTitleEdit();
    });
    cancelProviderBtn.addEventListener('click', () => {
        providerNameDisplay.textContent = originalProviderName;
        exitTitleEdit();
    });
    function getCurrentModelName() {
        const internalSpan = currentModelSpan.querySelector('span');
        if (internalSpan) {
            return internalSpan.textContent.trim();
        }
        return currentModelSpan.textContent.replace(/^[A-Z]+\s*/, '').trim();
    }
    function switchTab(tabId, element) {
        if (!tabId) return;
        if (tabId === 'providers-toggle') {
            providersHeader.classList.toggle('collapsed');
            providersListContainer.classList.toggle('collapsed');
            return;
        }
        document.querySelectorAll('.settings-nav-item').forEach(nav => nav.classList.remove('active'));
        if (element) {
            element.classList.add('active');
        } else {
            const targetNav = document.querySelector(`.settings-nav-item[data-tab="${tabId}"]`);
            if (targetNav) targetNav.classList.add('active');
        }
        document.querySelectorAll('.settings-content').forEach(content => content.classList.remove('active'));
        if (tabId.startsWith('provider-')) {
            saveToStorage();
            currentProviderKey = element.getAttribute('data-key');
            providerNameDisplay.textContent = currentProviderKey;
            apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
            baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
            document.getElementById('provider-settings').classList.add('active');
            renderModels();
        } else if (tabId === 'provider') {
            document.getElementById('provider-settings').classList.add('active');
            let newCount = 1;
            while (configData.providers[`New Provider ${newCount}`]) newCount++;
            const newName = `New Provider ${newCount}`;
            configData.providers[newName] = { apiKey: '', baseUrl: '', models: [] };
            currentProviderKey = newName;
            providerNameDisplay.textContent = currentProviderKey;
            apiKeyInput.value = '';
            baseUrlInput.value = '';
            modelList.innerHTML = '';
            renderProviderList();
            setTimeout(() => editProviderBtn.click(), 10);
        } else {
            const contentId = `${tabId}-settings`;
            const content = document.getElementById(contentId);
            if (content) {
                content.classList.add('active');
                if (tabId === 'general') renderGeneralSettings();
                if (tabId === 'role-presets') {
                    if (!configData.roles || configData.roles.length === 0) {
                        configData.roles = JSON.parse(JSON.stringify(defaultData.roles));
                    }
                    renderRoles();
                }
            }
        }
        if (typeof lucide !== 'undefined') updateIcons();
    }
    const settingsSidebar = document.querySelector('.settings-sidebar');
    if (settingsSidebar) {
        settingsSidebar.addEventListener('click', (e) => {
            const item = e.target.closest('.settings-nav-item');
            if (item) switchTab(item.getAttribute('data-tab'), item);
        });
    }
    function renderProviderList() {
        providersListContainer.querySelectorAll('.settings-nav-item:not(.add-btn)').forEach(el => el.remove());
        const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#A855F7'];
        const providers = Object.keys(configData.providers);
        providers.forEach((provider, index) => {
            const item = document.createElement('div');
            item.className = 'settings-nav-item';
            if (provider === currentProviderKey) item.classList.add('active');
            item.setAttribute('data-tab', `provider-${provider.toLowerCase()}`);
            item.setAttribute('data-key', provider);
            const color = colors[index % colors.length];
            let label = provider;
            if (provider.length > 2) {
                label = provider.charAt(0).toUpperCase() + provider.charAt(provider.length - 1).toUpperCase();
            } else {
                label = provider.toUpperCase();
            }
            item.innerHTML = `
                <div style="display: flex; align-items: center; flex: 1; overflow: hidden;">
                    <div style="width:24px;height:16px;border-radius:2px;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin-right:8px;flex-shrink:0;">${label}</div>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${provider}</span>
                </div>
                <div class="provider-item-actions">
                     <button class="icon-btn-xs provider-copy-btn" onclick="event.stopPropagation(); copyProvider('${provider}')" title="${t('provider.copy')}">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="icon-btn-xs provider-delete-btn" onclick="event.stopPropagation(); deleteProvider('${provider}')" title="${t('provider.delete')}">
                        <i data-lucide="trash"></i>
                    </button>
                </div>
            `;
            providersListContainer.appendChild(item);
        });
        if (typeof lucide !== 'undefined') updateIcons();
    }
    window.copyProvider = (providerKey) => {
        const provider = configData.providers[providerKey];
        if (!provider) return;
        let newName = `${providerKey} copy`;
        let counter = 1;
        while (configData.providers[newName]) {
            newName = `${providerKey} copy ${counter}`;
            counter++;
        }
        configData.providers[newName] = JSON.parse(JSON.stringify(provider));
        currentProviderKey = newName;
        renderProviderList();
        saveToStorage();
        const item = document.querySelector(`.settings-nav-item[data-key="${newName}"]`);
        if (item) switchTab(`provider-${newName.toLowerCase()}`, item);
    };
    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            configData.general.theme = theme;
            themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const themeClass = theme === 'light' ? 'light-mode' : 'dark-mode';
            const isLoading = document.body.classList.contains('loading');
            const isLoaded = document.body.classList.contains('loaded');
            if (isLoading) {
                document.body.className = `loading ${themeClass}`;
            } else if (isLoaded) {
                document.body.className = `loaded ${themeClass}`;
            } else {
                document.body.className = themeClass;
            }
            saveToStorage();
        });
    });
    modelSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        if (contextLimitDropdown) contextLimitDropdown.classList.remove('active');
        if (languageOptions) languageOptions.classList.remove('active');
        modelDropdown.classList.toggle('active');
        if (modelDropdown.classList.contains('active')) renderModelDropdown();
    });
    document.addEventListener('click', (event) => {
        if (modelDropdown) modelDropdown.classList.remove('active');
        if (languageOptions) languageOptions.classList.remove('active');
        if (contextLimitDropdown) contextLimitDropdown.classList.remove('active');
        if (!event.target.closest('#role-mention-dropdown') && !event.target.closest('#chat-input')) {
            roleMentionDropdown.style.display = 'none';
            roleMentionDropdown.classList.remove('active');
        }
        const modal = document.getElementById('model-modal');
        if (modal && modal.classList.contains('active') && event.target === modal) {
            closeModelModal();
        }
    });
    function preventScrollPropagation(element) {
        if (!element) return;
        element.addEventListener('wheel', (e) => {
            const delta = e.deltaY;
            const contentHeight = element.scrollHeight;
            const visibleHeight = element.clientHeight;
            const scrollTop = element.scrollTop;
            if (contentHeight <= visibleHeight) {
                e.preventDefault();
                return;
            }
            if ((scrollTop === 0 && delta < 0) ||
                (scrollTop + visibleHeight >= contentHeight && delta > 0)) {
                e.preventDefault();
            }
            e.stopPropagation();
        }, { passive: false });
    }
    function renderModelDropdown() {
        modelDropdown.innerHTML = '';
        preventScrollPropagation(modelDropdown);
        const hasProviders = Object.keys(configData.providers).length > 0;
        let hasAnyEnabledModels = false;
        Object.values(configData.providers).forEach(p => {
            const enabledModels = (p.models || []).filter(m => m.enabled !== false);
            if (enabledModels.length > 0) {
                hasAnyEnabledModels = true;
            }
        });
        if (!hasProviders) {
            const emptySection = document.createElement('div');
            emptySection.className = 'dropdown-section';
            emptySection.innerHTML = `<div class="dropdown-section-title" style="color: var(--text-secondary); font-style: italic; padding: 12px 12px 4px 12px;">${t('model.noProviders')}</div>`;
            modelDropdown.appendChild(emptySection);
        } else if (!hasAnyEnabledModels) {
            const emptySection = document.createElement('div');
            emptySection.className = 'dropdown-section';
            emptySection.innerHTML = `<div class="dropdown-section-title" style="color: var(--text-secondary); font-style: italic; padding: 12px 12px 4px 12px;">${t('model.noEnabled')}</div>`;
            modelDropdown.appendChild(emptySection);
        } else {
            const favorites = [];
            Object.entries(configData.providers).forEach(([providerKey, p]) => {
                p.models.forEach(m => {
                    if (m.favorite && m.enabled !== false) {
                        favorites.push({ ...m, providerKey });
                    }
                });
            });
            if (favorites.length > 0) {
                const favSection = document.createElement('div');
                favSection.className = 'dropdown-section';
                favSection.innerHTML = `<div class="dropdown-section-title">${t('model.favorites')}</div>`;
                favorites.forEach(m => favSection.appendChild(createDropdownItem(m, m.providerKey)));
                modelDropdown.appendChild(favSection);
            }
            Object.keys(configData.providers).forEach(providerKey => {
                const provider = configData.providers[providerKey];
                const enabledModels = (provider.models || []).filter(m => m.enabled !== false);
                if (enabledModels.length > 0) {
                    const section = document.createElement('div');
                    section.className = 'dropdown-section';
                    section.innerHTML = `<div class="dropdown-section-title">${providerKey}</div>`;
                    enabledModels.forEach(m => {
                        section.appendChild(createDropdownItem(m, providerKey));
                    });
                    modelDropdown.appendChild(section);
                }
            });
        }
    }
    function getProviderForModel(modelName) {
        for (const [providerKey, provider] of Object.entries(configData.providers)) {
            if (provider.models && provider.models.some(m => m.name === modelName)) {
                return providerKey;
            }
        }
        return 'Default';
    }
    function getProviderDisplayInfo(providerKey) {
        if (!providerKey || providerKey === 'Default' || !configData.providers[providerKey]) {
            return { color: '#6B7280', label: '??' };
        }
        const providers = Object.keys(configData.providers);
        const index = providers.indexOf(providerKey);
        const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#A855F7'];
        const color = index >= 0 ? colors[index % colors.length] : '#6B7280';
        let label = providerKey;
        if (providerKey.length > 2) {
            label = providerKey.charAt(0) + providerKey.charAt(providerKey.length - 1);
        }
        label = label.toUpperCase();
        return { color, label };
    }
    function setModelDisplay(modelName, providerKey) {
        let info;
        if (!providerKey) {
            providerKey = currentModelSpan.dataset.provider;
        }
        if (providerKey) {
            info = getProviderDisplayInfo(providerKey);
            currentModelSpan.dataset.provider = providerKey;
        } else {
            info = { color: '#6B7280', label: '??' };
        }
        const cleanName = modelName ? modelName.trim() : '';
        currentModelSpan.style.paddingLeft = '0px';
        currentModelSpan.style.display = 'flex';
        currentModelSpan.style.alignItems = 'center';
        currentModelSpan.style.gap = '8px';
            currentModelSpan.innerHTML = `
            <div class="model-provider-indicator" style="
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: ${info.color};
                color: #fff;
                font-size: 10px;
                font-weight: 800;
                border-radius: 2px;
                width: 24px;
                height: 16px;
                line-height: 1;
                flex-shrink: 0;
            ">${info.label}</div>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${cleanName}</span>
        `;
    }
    function updateCurrentModelDisplay() {
        const currentName = getCurrentModelName();
        const currentProvider = currentModelSpan.dataset.provider;
        if (currentName) {
            setModelDisplay(currentName, currentProvider);
        }
    }
    function createDropdownItem(model, providerKey) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        const finalProviderKey = providerKey || getProviderForModel(model.name);
        const info = getProviderDisplayInfo(finalProviderKey);
        const currentName = getCurrentModelName();
        if (currentName === model.name) {
            item.classList.add('active');
        }
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                background-color: ${info.color};
                color: #fff;
                font-size: 10px;
                font-weight: 800;
                border-radius: 2px;
                width: 24px;
                height: 16px;
                line-height: 1;
                flex-shrink: 0;
                ">${info.label}</div>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${model.name}</span>
            </div>
        `;
        item.onclick = async () => {
            const previousModel = getCurrentModelName();
            const targetModelName = model.name.trim();
            setModelDisplay(targetModelName, finalProviderKey);
            if (configData.general) {
                configData.general.lastUsedModel = targetModelName;
                saveToStorage();
            }
            modelDropdown.classList.remove('active');
            if (previousModel && previousModel !== targetModelName) {
                const lastUserMessage = getLastUserMessage();
                if (lastUserMessage) {
                    if (isRequesting && abortController) {
                        abortController.abort();
                        isRequesting = false;
                    }
                    try {
                        isRequesting = true;
                        sendBtn.innerHTML = '<div class="stop-icon"></div>';
                        sendBtn.classList.add('stop-mode');
                        sendBtn.disabled = false;
                        abortController = new AbortController();
                        const chatMessages = document.getElementById('chat-messages');
                        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
                        await sendMessageToAPI(lastUserMessage.content, targetModelName, abortController.signal, null, lastUserMessage.images || []);
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            displayErrorMessage(error);
                        }
                    } finally {
                        isRequesting = false;
                        sendBtn.innerHTML = '<i data-lucide="send"></i>';
                        sendBtn.classList.remove('stop-mode');
                        sendBtn.disabled = chatInput.value.trim() === '' && !chatInput.dataset.pastedImage;
                        abortController = null;
                        updateIcons();
                    }
                }
            }
        };
        return item;
    }
    function getLastUserMessage() {
        if (!activeChatId) return null;
        const chat = configData.history.find(c => c.id === activeChatId);
        if (!chat || !chat.messages) return null;
        for (let i = chat.messages.length - 1; i >= 0; i--) {
            if (chat.messages[i].role === 'user') {
                return chat.messages[i];
            }
        }
        return null;
    }
    function renderShortcuts() {
        if (!shortcutsContainer) return;
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmd = isMac ? '⌘' : 'Ctrl';
        const shortcuts = [
            { name: t('shortcuts.newChat'), key: `${cmd} + N` }, { name: t('shortcuts.sidebar'), key: `${cmd} + \\` },
            { name: t('shortcuts.send'), key: 'Enter' }, { name: t('shortcuts.newLine'), key: 'Shift + Enter' },
            { name: t('shortcuts.search'), key: `${cmd} + F` }, { name: t('shortcuts.settings'), key: `${cmd} + ,` }
        ];
        shortcutsContainer.innerHTML = shortcuts.map(s => `<div class="shortcut-item"><span>${s.name}</span><kbd>${s.key}</kbd></div>`).join('');
    }
    updateCurrentModelDisplay();
    window.toggleForm = (id) => {
        const form = document.getElementById(id);
        form.classList.toggle('active');
        const actions = document.getElementById('edit-role-actions');
        if (form.classList.contains('active')) {
            editingRoleId = null;
            actions.classList.remove('hidden');
            document.getElementById('new-role-prompt').style.minHeight = '200px';
        } else {
            editingRoleId = null;
            actions.classList.add('hidden');
            document.getElementById('new-role-name').value = '';
            document.getElementById('new-role-prompt').value = '';
            document.getElementById('new-role-prompt').style.minHeight = '';
        }
    };
    window.saveRole = () => {
        const nameInput = document.getElementById('new-role-name');
        const promptInput = document.getElementById('new-role-prompt');
        if (!nameInput.value.trim()) {
            return;
        }
        if (editingRoleId) {
            const role = configData.roles.find(r => r.id === editingRoleId);
            if (role) { role.name = nameInput.value.trim(); role.prompt = promptInput.value; }
            editingRoleId = null;
        } else {
            configData.roles.push({ id: Date.now(), name: nameInput.value.trim(), prompt: promptInput.value });
        }
        renderRoles();
        nameInput.value = ''; promptInput.value = '';
        document.getElementById('add-role-form').classList.remove('active');
        document.getElementById('edit-role-actions').classList.add('hidden');
        document.getElementById('new-role-prompt').style.minHeight = '';
        saveToStorage();
    };
    function renderRoles() {
        roleList.innerHTML = '';
        configData.roles.forEach(role => {
            const item = document.createElement('div');
            item.className = 'role-item';
            const isEditing = editingRoleId === role.id;
            const promptStyle = isEditing ? '' : 'style="font-size:11px;"';
            item.innerHTML = `
                <div class="role-item-header">
                    <span class="role-item-name">${role.name}</span>
                    <div class="model-item-actions">
                        <i data-lucide="pencil" onclick="editRole(${role.id})"></i>
                        <i data-lucide="trash" onclick="deleteRole(${role.id})"></i>
                    </div>
                </div>
                <div class="role-item-prompt" ${promptStyle}>${role.prompt}</div>
            `;
            roleList.appendChild(item);
        });
        updateIcons();
    }
    window.editRole = (id) => {
        const role = configData.roles.find(r => r.id === id);
        if (role) {
            editingRoleId = id;
            document.getElementById('new-role-name').value = role.name;
            document.getElementById('new-role-prompt').value = role.prompt;
            document.getElementById('add-role-form').classList.add('active');
            document.getElementById('edit-role-actions').classList.remove('hidden');
            document.getElementById('new-role-prompt').style.minHeight = '200px';
        }
    };
    window.deleteRole = (id) => {
        const roleToDelete = configData.roles.find(r => r.id === id);
        if (roleToDelete) {
            configData.history.forEach(chat => {
                if (chat.activeRole === roleToDelete.name) {
                    chat.activeRole = null;
                }
            });
        }
        configData.roles = configData.roles.filter(r => r.id !== id);
        renderRoles();
        saveToStorage();
        if (activeChatId) {
            const chat = configData.history.find(c => c.id === activeChatId);
            if (chat && !chat.activeRole) {
                chatInput.value = '';
                delete chatInput.dataset.selectedRole;
            }
        }
    };
    function renderModels() {
        const provider = configData.providers[currentProviderKey];
        modelList.innerHTML = '';
        if (provider) provider.models.forEach(model => {
            const item = document.createElement('div');
            item.className = 'model-item';
            item.innerHTML = `
                <div class="model-item-info">
                    <span class="model-item-name">${model.name}</span>
                </div>
                <div class="model-item-actions">
                    <i data-lucide="star" class="${model.favorite ? 'active' : ''}" onclick="toggleFavorite(${model.id})"></i>
                    <i data-lucide="trash" onclick="deleteModel(${model.id})"></i>
                </div>
            `;
            modelList.appendChild(item);
        });
        const refreshIcon = fetchModelsBtn.querySelector('.spinning');
        if (refreshIcon) refreshIcon.classList.remove('spinning');
        updateIcons();
    }
    window.showModelModal = (fetchedModels) => {
        const modal = document.getElementById('model-modal');
        const selectionList = document.getElementById('model-selection-list');
        const searchInput = document.getElementById('modal-model-search-input');
        const existingModels = configData.providers[currentProviderKey].models || [];
        if (!modal) {
            return;
        }
        if (searchInput) searchInput.value = '';
        selectionList.innerHTML = '';
        window.allFetchedModels = fetchedModels;
        renderModelList(fetchedModels, existingModels);
        modal.classList.add('active');
        updateIcons();
    };
    function renderModelList(models, existingModels) {
        const selectionList = document.getElementById('model-selection-list');
        const modal = document.getElementById('model-modal');
        selectionList.innerHTML = '';
        models.forEach(model => {
            const existingModel = existingModels.find(m => m.name === model.name);
            const isSelected = existingModel ? true : false;
            const item = document.createElement('div');
            item.className = 'model-selection-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `model-${model.id}`;
            if (isSelected) checkbox.checked = true;
            checkbox.dataset.modelName = model.name;
            const label = document.createElement('label');
            label.htmlFor = `model-${model.id}`;
            label.textContent = model.name;
            item.appendChild(checkbox);
            item.appendChild(label);
            checkbox.addEventListener('change', function () {
                saveModelSelection();
            });
            selectionList.appendChild(item);
        });
        if (typeof lucide !== 'undefined') updateIcons();
    };
    window.closeModelModal = () => {
        const modal = document.getElementById('model-modal');
        modal.classList.remove('active');
    };
    const modalModelSearchInput = document.getElementById('modal-model-search-input');
    if (modalModelSearchInput) {
        modalModelSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const allItems = document.querySelectorAll('#model-selection-list .model-selection-item');
            allItems.forEach(item => {
                const modelName = item.querySelector('label').textContent.toLowerCase();
                if (modelName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        modalModelSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modalModelSearchInput.value = '';
                modalModelSearchInput.dispatchEvent(new Event('input'));
                modalModelSearchInput.blur();
            }
        });
    }
    window.saveModelSelection = () => {
        const allCheckboxes = document.querySelectorAll('#model-selection-list input[type="checkbox"]');
        const checkedModelNames = Array.from(allCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.getAttribute('data-model-name'));
        const allModelElements = document.querySelectorAll('#model-selection-list .model-selection-item');
        const allAvailableModels = Array.from(allModelElements).map(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const modelName = checkbox.getAttribute('data-model-name');
            return { name: modelName, favorite: false };
        });
        const selectedModels = allAvailableModels.filter(model => checkedModelNames.includes(model.name));
        const existingModels = configData.providers[currentProviderKey].models || [];
        const finalModels = selectedModels.map(selectedModel => {
            const existingModel = existingModels.find(m => m.name === selectedModel.name);
            if (existingModel) {
                return { ...existingModel, name: selectedModel.name };
            } else {
                return {
                    id: Date.now() + Math.random(),
                    name: selectedModel.name,
                    favorite: false
                };
            }
        });
        configData.providers[currentProviderKey].models = finalModels;
        saveToStorage();
        renderModels();
    };
    window.toggleFavorite = (id) => {
        const provider = configData.providers[currentProviderKey];
        const model = provider.models.find(m => m.id === id);
        if (model) {
            model.favorite = !model.favorite;
            saveToStorage();
            renderModels();
        }
    };
    window.deleteModel = (id) => {
        configData.providers[currentProviderKey].models = configData.providers[currentProviderKey].models.filter(m => m.id !== id);
        renderModels();
        saveToStorage();
    };
    window.deleteProvider = (providerKey) => {
        if (currentProviderKey === providerKey) {
            const remainingProviders = Object.keys(configData.providers).filter(p => p !== providerKey);
            if (remainingProviders.length > 0) {
                currentProviderKey = remainingProviders[0];
                providerNameDisplay.textContent = currentProviderKey;
                apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
                baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
                renderModels();
            } else {
                currentProviderKey = null;
                providerNameDisplay.textContent = t('model.notProvider');
                apiKeyInput.value = '';
                baseUrlInput.value = '';
                modelList.innerHTML = '';
            }
        }
        delete configData.providers[providerKey];
        renderProviderList();
        saveToStorage();
        if (typeof lucide !== 'undefined') updateIcons();
    };
    if (configData.providers[currentProviderKey]) {
        apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
        baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
    }
    renderProviderList();
    renderModels();
    renderGeneralSettings();
    renderHistory();
    updateChatLayout();
    if (configData.history.length > 0) {
        const lastActiveChatId = configData.general.activeChatId;
        const targetChat = configData.history.find(c => c.id === lastActiveChatId);
        if (targetChat) {
            loadChat(lastActiveChatId);
        } else {
            loadChat(configData.history[0].id);
        }
    } else {
        createNewChat();
    }
    updateIcons();
    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.title = t('chat.clearChat');
        clearChatBtn.addEventListener('dblclick', () => {
            if (activeChatId) {
                const chat = configData.history.find(c => c.id === activeChatId);
                if (chat) {
                    chat.messages = [];
                    saveToStorage();
                    loadChat(activeChatId);
                }
            }
        });
    }
    const importFileBtn = document.getElementById('import-file-btn');
    const importFileInput = document.getElementById('import-file-input');
    if (importFileBtn && importFileInput) {
        importFileBtn.addEventListener('click', () => {
            importFileInput.click();
        });
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData && importedData.general && importedData.providers) {
                        configData = importedData;
                        localStorage.setItem('kissai_config', JSON.stringify(configData));
                        if (currentProviderKey && configData.providers[currentProviderKey]) {
                            apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
                            baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
                        }
                        location.reload();
                    } else {
                        console.error(t('alert.invalidConfig'));
                    }
                } catch (err) {
                    console.error(t('alert.importFailed') + err.message);
                }
            };
            reader.readAsText(file);
            importFileInput.value = '';
        });
    }
    const sidebarThemeBtn = document.getElementById('theme-toggle-btn');
    if (sidebarThemeBtn) {
        const updateThemeIcon = () => {
            const isDark = document.body.classList.contains('dark-mode');
            sidebarThemeBtn.innerHTML = `<i data-lucide="${isDark ? 'moon' : 'sun'}"></i>`;
            if (typeof lucide !== 'undefined') updateIcons();
        };
        updateThemeIcon();
        sidebarThemeBtn.addEventListener('click', () => {
            const isDark = document.body.classList.contains('dark-mode');
            if (isDark) {
                document.body.classList.remove('dark-mode');
                document.body.classList.add('light-mode');
                configData.general.theme = 'light';
            } else {
                document.body.classList.remove('light-mode');
                document.body.classList.add('dark-mode');
                configData.general.theme = 'dark';
            }
            saveToStorage();
            updateThemeIcon();
        });
    }
    const resetPromptBtn = document.getElementById('reset-prompt-btn');
    if (resetPromptBtn) {
        resetPromptBtn.addEventListener('click', () => {
            const defaultPrompt = t('systemPrompt.default');
            document.getElementById('global-system-prompt').value = defaultPrompt;
            configData.general.systemPrompt = defaultPrompt;
            saveToStorage();
        });
    }
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.title = t('footer.clearHistory');
        clearHistoryBtn.addEventListener('dblclick', () => {
            configData.history = [];
            activeChatId = null;
            saveToStorage();
            createNewChat();
            renderHistory();
        });
    }
    if (contextCountDisplay) {
        contextCountDisplay.textContent = configData.general.contextLimit || 10;
    }
    if (contextControlBtn) {
        contextControlBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (modelDropdown) modelDropdown.classList.remove('active');
            if (languageOptions) languageOptions.classList.remove('active');
            contextLimitDropdown.classList.toggle('active');
            if (contextLimitDropdown.classList.contains('active')) {
                preventScrollPropagation(contextLimitDropdown);
            }
        });
    }
    if (contextLimitDropdown) {
        const contextOptions = contextLimitDropdown.querySelectorAll('.context-limit-option');
        contextOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const limit = parseInt(option.getAttribute('data-value'));
                if (!isNaN(limit)) {
                    configData.general.contextLimit = limit;
                    saveToStorage();
                    if (contextCountDisplay) {
                        contextCountDisplay.textContent = limit;
                    }
                    contextLimitDropdown.classList.remove('active');
                }
            });
        });
    }
    const chatMessages = document.getElementById('chat-messages');
    const scrollbarMarkers = document.getElementById('scrollbar-markers');
    const scrollbarTopZone = document.querySelector('.scrollbar-top-zone');
    let aiMessageElements = [];
    if (scrollbarTopZone) {
        scrollbarTopZone.addEventListener('click', () => {
            chatMessages.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    function updateScrollbarMarkers() {
        if (!chatMessages || !scrollbarMarkers) return;
        scrollbarMarkers.innerHTML = '';
        aiMessageElements = Array.from(chatMessages.querySelectorAll('.message.assistant'));
        if (aiMessageElements.length === 0) return;
        const containerHeight = 100;
        aiMessageElements.forEach((messageElement, index) => {
            const marker = document.createElement('div');
            marker.className = 'scrollbar-marker';
            let topPosition = 0;
            if (aiMessageElements.length > 1) {
                topPosition = (index / (aiMessageElements.length - 1)) * (containerHeight - 4);
            } else {
                topPosition = 0;
            }
            marker.style.top = `${topPosition}px`;
            scrollbarMarkers.appendChild(marker);
        });
        scrollbarMarkers.onclick = (e) => {
            e.stopPropagation();
            const rect = scrollbarMarkers.getBoundingClientRect();
            const clickY = e.clientY - rect.top;
            let ratio = clickY / containerHeight;
            ratio = Math.max(0, Math.min(1, ratio));
            const targetIndex = Math.round(ratio * (aiMessageElements.length - 1));
            const targetMessage = aiMessageElements[targetIndex];
            if (targetMessage) {
                targetMessage.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                highlightActiveMarker(targetIndex);
            }
        };
        updateActiveMarker();
    }
    function highlightActiveMarker(targetIndex) {
        const markers = scrollbarMarkers.children;
        Array.from(markers).forEach((marker, index) => {
            if (index === targetIndex) {
                marker.classList.add('active');
            } else {
                marker.classList.remove('active');
            }
        });
    }
    function updateActiveMarker() {
        if (!chatMessages || aiMessageElements.length === 0) return;
        const containerTop = chatMessages.scrollTop;
        const readFocus = containerTop + 100;
        let activeIndex = -1;
        let minDistance = Infinity;
        aiMessageElements.forEach((el, index) => {
            const distance = Math.abs(el.offsetTop - readFocus);
            if (distance < minDistance) {
                minDistance = distance;
                activeIndex = index;
            }
        });
        highlightActiveMarker(activeIndex);
    }
    if (chatMessages) {
        let scrollTimeout;
        chatMessages.addEventListener('scroll', () => {
            if (!scrollTimeout) {
                scrollTimeout = requestAnimationFrame(() => {
                    updateActiveMarker();
                    scrollTimeout = null;
                });
            }
        });
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' &&
                    (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                setTimeout(updateScrollbarMarkers, 100);
            }
        });
        observer.observe(chatMessages, {
            childList: true,
            subtree: true
        });
        setTimeout(updateScrollbarMarkers, 500);
    }
    document.getElementById('chat-view')?.addEventListener('wheel', e =>
        !e.target.closest('#chat-messages') && document.getElementById('chat-messages')?.scrollBy(0, e.deltaY)
    );
    updateAllText();
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
});
