document.addEventListener('DOMContentLoaded', () => {
    // 创建全局markdown实例
    let globalMd = null;
    function getMarkdownInstance() {
        if (globalMd === null && typeof window.markdownit === 'function') {
            globalMd = window.markdownit({
                html: true,
                breaks: true,
                linkify: true,
                typographer: true,
                quotes: '""\'\'',
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

            // 设置链接渲染规则
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
    const exportConfigBtn = document.getElementById('export-config-btn');
    const historyList = document.getElementById('history-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const languageSelect = document.getElementById('language-select');
    const currentLanguageSpan = document.getElementById('current-language');
    const languageOptions = languageSelect.querySelector('.select-options');
    const contextControlBtn = document.getElementById('context-control-btn');
    const contextCountDisplay = document.getElementById('context-count-display');
    const contextLimitDropdown = document.getElementById('context-limit-dropdown');
    const defaultData = {
        general: {
            theme: 'dark',
            language: 'zh',
            wideMode: false,
            contextLimit: 20,
            lastUsedModel: '',
            systemPrompt: '一、角色职责与内容标准\n作为顾问，必须以最高程度的坦诚与严格标准提供意见，主动识别并指出用户在判断中的假设缺陷、逻辑漏洞、侥幸心理、自我安慰与被低估的风险。对用户任何结论均需进行审慎审查，不得顺从、迎合或提供模糊不清的表述，当自身判断更合理时，必须坚持专业结论，保持毫无保留的直言态度。所有建议必须基于事实、可靠来源、严谨推理与可验证依据，并辅以明确、可执行的策略与步骤。回答必须优先促进用户"长期成长"，而非短期情绪安慰，并理解用户未明说的隐含意图。所有论述必须基于权威来源（学术研究、行业标准等）或公认的专业知识体系，应主动通过互联网检索并提供明确数据、文献或案例佐证，并禁止任何未经验证的推测或主观判断。针对复杂议题，必须先给出核心结论，再展开背景、推理脉络与系统分析。回答需确保全面性，提供包括正反论证、利弊评估、短期与长期影响等多视角分析，协助用户形成经得起审视的科学判断。涉及时效敏感议题（政策、市场、科技等），必须优先使用最新英文资料，并标注政策或数据的发布时间或生效日期。依据用户问题性质选择合适的专业深度，所有内容必须严格围绕用户核心诉求展开，不得跑题或形式化。\n\n二、语言风格、表达与格式规范\n全部回答必须使用简体中文，并保持高度正式、规范、具有权威性的语体风格，适用于学术、职场与公共交流。禁止出现口语化、随意、不严谨、模棱两可、情绪化或信息密度低的表达。回答必须为清晰的陈述句，不得使用反问、设问或引导性结尾。回答需直切核心，不得使用没有意义的客套话，不得在结尾预判用户下一步行为和询问，并禁止主动扩展无关话题。内容必须按逻辑展开，要求使用明确编号、标题和分段，以保证结构清晰，力求单屏可读。禁止使用 markdown 的"三个短横线"作为分隔符。禁止输出表格里带代码块等其他形式的复杂 markdown，影响渲染观感。'
        },
        providers: {
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
            },
            'Cerebras': {
                apiKey: '',
                baseUrl: 'https://api.cerebras.ai/v1',
                models: [
                    { id: 9, name: 'gpt-oss-120b', favorite: true },
                    { id: 10, name: 'qwen-3-235b-a22b-instruct-2507', favorite: true },
                    { id: 11, name: 'zai-glm-4.6', favorite: true }
                ]
            }
        },
        roles: [
            { id: 1, name: '翻译专家', prompt: '你是一个精通多国语言的翻译专家，请将用户输入的文字翻译成地道的中文。' },
            { id: 2, name: '代码助手', prompt: '你是一个资深的软件工程师，擅长编写高质量、高性能的代码。' },
            { id: 3, name: '产品经理', prompt: '你是一个拥有30年经验的产品经理，擅长撰写PRD和分析用户需求。' }
        ],
        history: []
    };
    let configData = JSON.parse(localStorage.getItem('kissai_config')) || defaultData;
    if (!configData.history) configData.history = [];
    if (!configData.general) configData.general = { ...defaultData.general };
    if (configData.general.lastUsedModel === undefined) configData.general.lastUsedModel = '';
    if (configData.general.wideMode === undefined) configData.general.wideMode = false;
    if (configData.general.contextLimit === undefined) configData.general.contextLimit = 20;
    if (!configData.roles) configData.roles = JSON.parse(JSON.stringify(defaultData.roles));
    let currentProviderKey = 'Groq';
    let isRequesting = false;
    let originalProviderName = '';
    let editingRoleId = null;
    let activeChatId = null;
    function saveToStorage() {
        if (currentProviderKey && configData.providers[currentProviderKey]) {
            configData.providers[currentProviderKey].apiKey = apiKeyInput.value;
            configData.providers[currentProviderKey].baseUrl = baseUrlInput.value;
        }
        configData.general.systemPrompt = document.getElementById('global-system-prompt').value;
        // 上下文限制值已经在其他地方设置，这里不需要重复读取输入框
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
        let initialModel = currentModelSpan.textContent;
        if (!initialModel || initialModel === 'Loading...' || initialModel === '未选择模型') {
            if (configData.general && configData.general.lastUsedModel) {
                initialModel = configData.general.lastUsedModel;
            }
        }
        const currentModel = initialModel;
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
            // 如果原始模型无效，只在配置中还有有效模型时才选择替代模型并更新lastUsedModel
            for (const [pKey, provider] of Object.entries(configData.providers)) {
                if (provider.models) {
                    const favoriteModel = provider.models.find(m => m.favorite && m.enabled !== false);
                    if (favoriteModel) {
                        setModelDisplay(favoriteModel.name, pKey);
                        // 仅在原始模型确实不存在时才更新lastUsedModel
                        if (configData.general && configData.general.lastUsedModel !== favoriteModel.name) {
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
                        // 仅在原始模型确实不存在时才更新lastUsedModel
                        if (configData.general && configData.general.lastUsedModel !== enabledModel.name) {
                            configData.general.lastUsedModel = enabledModel.name;
                            saveToStorage();
                        }
                        return;
                    }
                }
            }
            currentModelSpan.textContent = '未选择模型';
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
            title: '空白对话',
            messages: [],
            time: Date.now()
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
                        <span>未找到包含 "${searchKeyword}" 的对话</span>
                    </div>
                `;
            } else {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <i data-lucide="message-square"></i>
                        <span>此处显示您的对话历史记录。</span>
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
                if (msg.role === 'user') {
                    const bubble = document.createElement('div');
                    bubble.className = 'message-bubble user-message-content';
                    bubble.textContent = msg.content;
                    messageDiv.appendChild(bubble);
                } else {
                    const md = getMarkdownInstance();
                    if (md) {
                        messageDiv.innerHTML = `<div class="message-bubble">${md.render(msg.content)}</div>`;
                    } else {
                        messageDiv.innerHTML = `<div class="message-bubble">${msg.content}</div>`;
                    }
                }
                chatMessages.appendChild(messageDiv);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
            if (chatView) chatView.classList.remove('has-messages');
            if (chatContainer) chatContainer.classList.remove('has-messages');
            if (welcomeSection) welcomeSection.style.display = 'flex';
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
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 240) + 'px';
        sendBtn.disabled = chatInput.value.trim() === '';
    });
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled && chatInput.value.trim()) {
                sendBtn.click();
            }
        }
    });
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
    settingsView.addEventListener('click', (e) => {
        if (e.target === settingsView) {
            saveToStorage();
            settingsView.classList.remove('active');
        }
    });
    function renderGeneralSettings() {
        const promptTextarea = document.getElementById('global-system-prompt');
        const defaultPrompt = promptTextarea.value; // Read HTML default

        // Only override if config has a value, otherwise keep HTML default
        if (configData.general.systemPrompt !== undefined && configData.general.systemPrompt !== null) {
            promptTextarea.value = configData.general.systemPrompt;
        } else if (!defaultPrompt) {
            // If both config and HTML are empty, set to empty string
            promptTextarea.value = '';
        }
        // If config is empty but HTML has default, keep HTML default (do nothing)
        themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === configData.general.theme);
        });
        const langMap = { 'zh': '简体中文', 'en': 'English' };
        currentLanguageSpan.textContent = langMap[configData.general.language] || '简体中文';
        languageOptions.querySelectorAll('.select-option').forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-value') === configData.general.language);
        });
        if (wideModeCheckbox) {
            wideModeCheckbox.checked = !!configData.general.wideMode;
        }
        updateChatLayout();
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
            currentLanguageSpan.textContent = opt.textContent;
            languageOptions.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            saveToStorage();
        });
    });
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
            let response;
            if (cleanBaseUrl.includes('generativelanguage.googleapis.com')) {
                response = await fetch(`${cleanBaseUrl}/models?key=${originalApiKey}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(10000)
                });
            } else {
                response = await fetch(`${cleanBaseUrl}/models`, {
                    headers: {
                        'Authorization': `Bearer ${originalApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(10000)
                });
            }
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
                console.error('请求超时，请检查网络连接或API端点是否可用');
            } else {
                console.error('获取模型失败，请检查 API Key 和 Base URL 是否正确：' + error.message);
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
    function addMessage(content, isUser = false) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
        if (isUser) {
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble user-message-content';
            bubble.textContent = content;
            messageDiv.appendChild(bubble);
        } else {
            const md = getMarkdownInstance();
            if (md) {
                messageDiv.innerHTML = `<div class="message-bubble">${md.render(content)}</div>`;
            } else {
                messageDiv.innerHTML = `<div class="message-bubble">${content}</div>`;
            }
        }
        chatMessages.appendChild(messageDiv);
        if (activeChatId) {
            const chat = configData.history.find(c => c.id === activeChatId);
            if (chat) {
                if (!chat.messages) chat.messages = [];
                chat.messages.push({ role: isUser ? 'user' : 'assistant', content });
                if (isUser && chat.title === '空白对话') {
                    chat.title = content.length > 20 ? content.substring(0, 20) + '...' : content;
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
        messageDiv.innerHTML = `<div class="message-bubble">|</div>`;
        chatMessages.appendChild(messageDiv);
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
    function updateAIMessageContent(messageElement, content) {
        const bubble = messageElement.querySelector('.message-bubble');
        const md = getMarkdownInstance();
        if (bubble && md) {
            bubble.innerHTML = `${md.render(content)}<span class="cursor"></span>`;
        } else if (bubble) {
            bubble.textContent = content + '|';
        }
    }
        function finalizeAIMessage(messageElement, content) {
        const bubble = messageElement.querySelector('.message-bubble');
        const md = getMarkdownInstance();
        if (bubble && content && md) {
            bubble.innerHTML = md.render(content);
            if (activeChatId) {
                const chat = configData.history.find(c => c.id === activeChatId);
                if (chat) {
                    if (!chat.messages) chat.messages = [];
                    chat.messages.push({ role: 'assistant', content });
                    saveToStorage();
                }
            }
        } else if (bubble && content) {
            bubble.textContent = content;
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
        const versionMatch = cleanUrl.match(/\/v\d+(beta|alpha)?/i);
        if (versionMatch) {
            const versionIndex = versionMatch.index + versionMatch[0].length;
            return cleanUrl.substring(0, versionIndex);
        } else {
            return cleanUrl;
        }
    }
    function displayErrorMessage(error, httpStatus = null) {
        let errorContent = '';
        if (httpStatus) {
            errorContent = `HTTP ${httpStatus}: ${error.message || '请求失败'}`;
        } else {
            errorContent = error.message || '未知错误';
        }
        addMessage(errorContent, false);
    }
    async function sendMessageToAPI(message, modelName, signal) {
        const providerInfo = findProviderByModel(modelName);
        if (!providerInfo) {
            throw new Error(`未找到模型 ${modelName} 的提供商配置`);
        }
        const { provider } = providerInfo;
        if (!provider.apiKey) {
            throw new Error('API Key 未配置');
        }
        const baseUrl = normalizeBaseUrl(provider.baseUrl);
        const messages = [];
        const systemPrompt = configData.general.systemPrompt;
        if (systemPrompt && systemPrompt.trim()) {
            messages.push({ role: 'system', content: systemPrompt.trim() });
        }
        if (activeChatId) {
            const chat = configData.history.find(c => c.id === activeChatId);
            if (chat && chat.messages) {
                const limit = configData.general.contextLimit || 20;
                const messagesToSend = chat.messages.slice(-limit);
                messagesToSend.forEach(msg => {
                    messages.push({ role: msg.role, content: msg.content });
                });
            }
        }
        const aiMessageElement = addAIMessageStream();
        let fullContent = '';
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
                let errorDetails = '';
                try {
                    const errorData = await response.json();
                    errorDetails = errorData.error?.message || errorData.message || '';
                } catch (e) {
                    errorDetails = response.statusText;
                }
                const error = new Error(errorDetails || `HTTP ${response.status}`);
                error.status = response.status;
                throw error;
            }
            if (!response.body) {
                throw new Error('Response body is null');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
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
                                    updateAIMessageContent(aiMessageElement, fullContent);
                                }
                            }
                        } catch (e) {
                            console.warn('Failed to parse SSE data:', e);
                        }
                    }
                }
            }
            finalizeAIMessage(aiMessageElement, fullContent);
            reader.releaseLock();
            return fullContent;
        } catch (error) {
            if (error.name === 'AbortError') {
                if (fullContent) {
                    finalizeAIMessage(aiMessageElement, fullContent);
                    return fullContent;
                }
                // If aborted with no content (e.g. immediate stop), remove partial element
                if (aiMessageElement && aiMessageElement.parentNode) {
                    aiMessageElement.parentNode.removeChild(aiMessageElement);
                }
                return null;
            }

            // Real Error Handling
            if (aiMessageElement && aiMessageElement.parentNode) {
                // Convert the partial AI message into an error message bubble
                aiMessageElement.innerHTML = `<div style="color:var(--accent-red)">Error: ${error.message || '请求失败'}</div>`;
            }
            console.error('API Request Failed:', error);
            throw error; // Re-throw to be caught by caller if needed
        }
    }
    let abortController = null;
    sendBtn.addEventListener('click', async () => {
        if (isRequesting) {
            if (abortController) {
                abortController.abort();
            }
            isRequesting = false;
            sendBtn.innerHTML = '<i data-lucide="arrow-right"></i>';
            sendBtn.classList.remove('stop-mode');
            updateIcons();
            return;
        }
        const message = chatInput.value.trim();
        if (!message) return;
        const currentModel = getCurrentModelName();
        try {
            isRequesting = true;
            sendBtn.innerHTML = '<div class="stop-icon"></div>';
            sendBtn.classList.add('stop-mode');
            sendBtn.disabled = false;
            chatInput.disabled = true;
            if (chatContainer) chatContainer.classList.add('has-messages');
            if (chatView) chatView.classList.add('has-messages');
            abortController = new AbortController();
            addMessage(message, true);
            chatInput.value = '';
            chatInput.style.height = 'auto';
            await sendMessageToAPI(message, currentModel, abortController.signal);
        } catch (error) {
            if (error.name !== 'AbortError') {
                displayErrorMessage(error, error.status);
            }
        } finally {
            isRequesting = false;
            sendBtn.innerHTML = '<i data-lucide="arrow-right"></i>';
            sendBtn.classList.remove('stop-mode');
            sendBtn.disabled = false;
            chatInput.disabled = false;
            abortController = null;
            updateIcons();
            chatInput.focus();
        }
    });
    exportConfigBtn.addEventListener('click', () => {
        saveToStorage();
        const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kissai-full-config.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
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
            return internalSpan.textContent;
        }
        return currentModelSpan.textContent;
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
                    <div style="width:16px;height:16px;border-radius:4px;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin-right:8px;flex-shrink:0;">${label}</div>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${provider}</span>
                </div>
                <div class="provider-item-actions">
                     <button class="icon-btn-xs provider-copy-btn" onclick="event.stopPropagation(); copyProvider('${provider}')" title="复制">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="icon-btn-xs provider-delete-btn" onclick="event.stopPropagation(); deleteProvider('${provider}')" title="删除">
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
            document.body.className = theme === 'light' ? 'light-mode' : 'dark-mode';
            saveToStorage();
        });
    });
    document.body.className = configData.general.theme === 'light' ? 'light-mode' : 'dark-mode';
    modelSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle('active');
        if (modelDropdown.classList.contains('active')) renderModelDropdown();
    });
    document.addEventListener('click', (event) => {
        if (modelDropdown) modelDropdown.classList.remove('active');
        if (languageOptions) languageOptions.classList.remove('active');
        const modal = document.getElementById('model-modal');
        if (modal && modal.classList.contains('active') && event.target === modal) {
            closeModelModal();
        }
    });
    function renderModelDropdown() {
        modelDropdown.innerHTML = '';
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
            emptySection.innerHTML = '<div class="dropdown-section-title" style="color: var(--text-secondary); font-style: italic; padding: 12px 12px 4px 12px;">没有配置任何模型提供商</div>';
            modelDropdown.appendChild(emptySection);
        } else if (!hasAnyEnabledModels) {
            const emptySection = document.createElement('div');
            emptySection.className = 'dropdown-section';
            emptySection.innerHTML = '<div class="dropdown-section-title" style="color: var(--text-secondary); font-style: italic; padding: 12px 12px 4px 12px;">没有启用任何模型</div>';
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
                favSection.innerHTML = '<div class="dropdown-section-title">已收藏</div>';
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
                font-size: 8px;
                font-weight: 800;
                padding: 0 4px;
                border-radius: 4px;
                min-width: 20px;
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
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: ${info.color};
                    color: #fff;
                    font-size: 8px;
                    font-weight: 800;
                    padding: 0 4px;
                    border-radius: 4px;
                    min-width: 20px;
                    height: 16px;
                    line-height: 1;
                    flex-shrink: 0;
                ">${info.label}</div>
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${model.name}</span>
            </div>
        `;
        item.onclick = () => {
            setModelDisplay(model.name, finalProviderKey);
            if (configData.general) {
                configData.general.lastUsedModel = model.name;
                saveToStorage();
            }
            modelDropdown.classList.remove('active');
        };
        return item;
    }
    function renderShortcuts() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const cmd = isMac ? '⌘' : 'Ctrl';
        const shortcuts = [
            { name: '新建对话', key: `${cmd} + N` }, { name: '侧边栏', key: `${cmd} + \\` },
            { name: '发送', key: 'Enter' }, { name: '换行', key: 'Shift + Enter' },
            { name: '搜索', key: `${cmd} + F` }, { name: '设置', key: `${cmd} + ,` }
        ];
        shortcutsContainer.innerHTML = shortcuts.map(s => `<div class="shortcut-item"><span>${s.name}</span><kbd>${s.key}</kbd></div>`).join('');
    }
    updateCurrentModelDisplay();
    window.toggleForm = (id) => document.getElementById(id).classList.toggle('active');
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
        window.toggleForm('add-role-form');
        saveToStorage();
    };
    function renderRoles() {
        roleList.innerHTML = '';
        configData.roles.forEach(role => {
            const item = document.createElement('div');
            item.className = 'role-item';
            item.innerHTML = `
                <div class="role-item-header">
                    <span class="role-item-name">${role.name}</span>
                    <div class="model-item-actions">
                        <i data-lucide="pencil" onclick="editRole(${role.id})"></i>
                        <i data-lucide="trash" onclick="deleteRole(${role.id})"></i>
                    </div>
                </div>
                <div class="role-item-prompt" style="font-size:11px;">${role.prompt}</div>
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
        }
    };
    window.deleteRole = (id) => { configData.roles = configData.roles.filter(r => r.id !== id); renderRoles(); saveToStorage(); };
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
                providerNameDisplay.textContent = '未选择提供商';
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
        loadChat(configData.history[0].id);
    } else {
        createNewChat();
    }
    updateIcons();
    const clearChatBtn = document.getElementById('clear-chat-btn');
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
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
    const importConfigBtn = document.getElementById('import-config-btn');
    const importFileInput = document.getElementById('import-file-input');
    if (importConfigBtn && importFileInput) {
        importConfigBtn.addEventListener('click', () => {
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

                        // 直接保存到localStorage，不经过saveToStorage()以避免API密钥被覆盖
                        localStorage.setItem('kissai_config', JSON.stringify(configData));

                        // 手动更新当前输入框的值
                        if (currentProviderKey && configData.providers[currentProviderKey]) {
                            apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
                            baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
                        }

                        location.reload();
                    } else {
                        console.error('无效的配置文件格式。');
                    }
                } catch (err) {
                    console.error('导入失败：' + err.message);
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
            const defaultPrompt = defaultData.general.systemPrompt || '';
            document.getElementById('global-system-prompt').value = defaultPrompt;
            configData.general.systemPrompt = defaultPrompt;
            saveToStorage();
        });
    }
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            configData.history = [];
            activeChatId = null;
            saveToStorage();
            createNewChat();
            renderHistory();
        });
    }

    // 初始化上下文数量显示
    if (contextCountDisplay) {
        contextCountDisplay.textContent = configData.general.contextLimit || 20;
    }

    // 上下文数量控制按钮事件监听器 - 切换下拉框
    if (contextControlBtn) {
        contextControlBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            contextLimitDropdown.classList.toggle('active');
        });
    }

    // 点击其他地方关闭下拉框
    document.addEventListener('click', (e) => {
        if (!contextControlBtn.contains(e.target) && !contextLimitDropdown.contains(e.target)) {
            contextLimitDropdown.classList.remove('active');
        }
    });

    // 为下拉框选项添加事件监听器
    if (contextLimitDropdown) {
        const contextOptions = contextLimitDropdown.querySelectorAll('.context-limit-option');
        contextOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const limit = parseInt(option.getAttribute('data-value'));

                if (!isNaN(limit)) {
                    configData.general.contextLimit = limit;
                    saveToStorage();

                    // 更新显示
                    if (contextCountDisplay) {
                        contextCountDisplay.textContent = limit;
                    }

                    // 关闭下拉框
                    contextLimitDropdown.classList.remove('active');
                }
            });
        });
    }
});
