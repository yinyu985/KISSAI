document.addEventListener('DOMContentLoaded', () => {
    // Helper to refresh icons with consistent size
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
    // DOM Elements
    const sidebar = document.getElementById('sidebar');
    const sidebarHandle = document.getElementById('sidebar-handle');
    const settingsBtn = document.getElementById('settings-btn');
    const closeSettingsBtn = document.getElementById('close-settings');
    const settingsView = document.getElementById('settings-view');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatContainer = document.querySelector('.chat-container');
    const chatView = document.getElementById('chat-view');

    // Provider elements
    const providerList = document.getElementById('provider-list');
    const modelList = document.getElementById('model-list');
    const fetchModelsBtn = document.getElementById('fetch-models-btn');
    const providerNameDisplay = document.getElementById('provider-name');
    const apiKeyInput = document.getElementById('api-key');
    const baseUrlInput = document.getElementById('base-url');


    // Provider Title Actions
    const editProviderBtn = document.getElementById('edit-provider-btn');
    const saveProviderBtn = document.getElementById('save-provider-btn');
    const cancelProviderBtn = document.getElementById('cancel-provider-btn');

    // Others
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

    // Language Dropdown
    const languageSelect = document.getElementById('language-select');
    const currentLanguageSpan = document.getElementById('current-language');
    const languageOptions = languageSelect.querySelector('.select-options');

    // Default State
    const defaultData = {
        general: {
            theme: 'dark',
            language: 'zh',
            systemPrompt: '',
            wideMode: false
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
            'Gemini': {
                apiKey: '',
                baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
                models: [
                    { id: 7, name: 'google/gemini-pro', favorite: true },
                    { id: 8, name: 'google/gemini-ultra', favorite: false }
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

    // Load State and ensure history exists
    let configData = JSON.parse(localStorage.getItem('kissai_config')) || defaultData;
    if (!configData.history) configData.history = [];
    if (!configData.general) configData.general = { ...defaultData.general };
    // Ensure wideMode is default false if not set
    if (configData.general.wideMode === undefined) configData.general.wideMode = false;

    let currentProviderKey = 'Groq';
    let isRequesting = false;
    let originalProviderName = '';
    let editingRoleId = null;
    let activeChatId = null; // Track current chat session

    function saveToStorage() {
        if (currentProviderKey && configData.providers[currentProviderKey]) {
            configData.providers[currentProviderKey].apiKey = apiKeyInput.value;
            configData.providers[currentProviderKey].baseUrl = baseUrlInput.value;
        }
        configData.general.systemPrompt = document.getElementById('global-system-prompt').value;
        localStorage.setItem('kissai_config', JSON.stringify(configData));
    }

    // --- Sidebar Logic ---
    sidebarHandle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    newChatBtn.addEventListener('click', () => {
        createNewChat();
    });

    function createNewChat() {
        // Clear active states in sidebar
        document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));

        // Reset chat UI
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
            messages: [], // Store messages here
            time: Date.now()
        };
        activeChatId = newChat.id;
        configData.history.unshift(newChat);
        renderHistory();
        saveToStorage();
    }

    function renderHistory() {
        if (!historyList) return;
        historyList.innerHTML = '';
        if (configData.history.length === 0) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="message-square"></i>
                    <span>此处显示您的对话历史记录。</span>
                </div>
            `;
            updateIcons();
            return;
        }

        configData.history.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'history-item' + (activeChatId === chat.id ? ' active' : '');
            item.innerHTML = `
                <div class="history-item-content">
                    <i data-lucide="message-square"></i>
                    <span>${chat.title}</span>
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

        // Reset UI
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) chatMessages.innerHTML = '';

        const chatView = document.getElementById('chat-view');
        const welcomeSection = document.querySelector('.welcome-section');

        if (chat.messages && chat.messages.length > 0) {
            if (chatView) chatView.classList.add('has-messages');
            if (chatContainer) chatContainer.classList.add('has-messages');
            if (welcomeSection) welcomeSection.style.display = 'none';

            chat.messages.forEach(msg => {
                // We use a simplified addMessage logic here to avoid re-saving
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;

                if (msg.role === 'user') {
                    messageDiv.innerHTML = `<div class="message-bubble user-message-content">${msg.content}</div>`;
                } else {
                    if (typeof window.markdownit === 'function') {
                        const md = window.markdownit({
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
                        }).use(anchorPlugin);

                        // Set default target for all links
                        const defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, renderer) {
                            return renderer.renderToken(tokens, idx, options);
                        };
                        md.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
                            const token = tokens[idx];
                            if (token && token.attrGet('target') !== '_blank') {
                                token.attrSet('target', '_blank');
                                token.attrSet('rel', 'noopener noreferrer');
                            }
                            return defaultRender(tokens, idx, options, env, renderer);
                        };

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

        renderHistory(); // Refresh active state
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

    // --- Chat Input Logic ---
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 240) + 'px';
        sendBtn.disabled = chatInput.value.trim() === '';
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // 按回车键发送（如果没有按Shift）
            e.preventDefault(); // 阻止默认换行行为
            if (!sendBtn.disabled && chatInput.value.trim()) {
                sendBtn.click(); // 触发发送按钮点击事件
            }
        }
        // 按Shift+回车键会自然换行，不需要额外处理
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

    // --- Settings Logic ---
    settingsBtn.addEventListener('click', () => {
        settingsView.classList.add('active');
        renderGeneralSettings();
    });

    closeSettingsBtn.addEventListener('click', () => {
        saveToStorage();
        settingsView.classList.remove('active');
    });

    function renderGeneralSettings() {
        document.getElementById('global-system-prompt').value = configData.general.systemPrompt || '';
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
        renderShortcuts();
    }

    if (wideModeCheckbox) {
        wideModeCheckbox.addEventListener('change', () => {
            configData.general.wideMode = wideModeCheckbox.checked;
            updateChatLayout();
            saveToStorage();
        });
    }

    // Language Dropdown
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

    // Fetch Models Logic
    fetchModelsBtn.addEventListener('click', async () => {
        const icon = fetchModelsBtn.querySelector('i') || fetchModelsBtn.querySelector('svg');
        const originalApiKey = apiKeyInput.value;
        const originalBaseUrl = baseUrlInput.value;

        if (!originalApiKey) {
            alert('请先输入 API Key');
            return;
        }

        if (icon) {
            icon.classList.add('spinning');
        }
        fetchModelsBtn.classList.add('loading'); // Use class for state
        fetchModelsBtn.disabled = true;

        try {
            // Clean and validate Base URL
            let cleanBaseUrl = originalBaseUrl.trim();

            // Remove trailing slashes
            if (cleanBaseUrl.endsWith('/')) {
                cleanBaseUrl = cleanBaseUrl.slice(0, -1);
            }

            // Ensure it starts with http:// or https://
            if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
                alert('Base URL 必须以 http:// 或 https:// 开头');
                return;
            }

            // Use normalizeBaseUrl function to handle API version paths properly
            cleanBaseUrl = normalizeBaseUrl(cleanBaseUrl);

            // Check if it's Google Gemini API and handle differently
            let response;
            if (cleanBaseUrl.includes('generativelanguage.googleapis.com')) {
                // Google Gemini API uses API key as query parameter for models
                response = await fetch(`${cleanBaseUrl}/models?key=${originalApiKey}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    // Add timeout
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
            } else {
                // Standard OpenAI-compatible API
                response = await fetch(`${cleanBaseUrl}/models`, {
                    headers: {
                        'Authorization': `Bearer ${originalApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    // Add timeout
                    signal: AbortSignal.timeout(10000) // 10 second timeout
                });
            }

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const fetchedModels = data.data.map(m => ({
                id: m.id,
                name: m.id,
                selected: false
            }));

            // Show modal with fetched models
            window.showModelModal(fetchedModels);
        } catch (error) {
            if (error.name === 'AbortError') {
                alert('请求超时，请检查网络连接或API端点是否可用');
            } else {
                alert('获取模型失败，请检查 API Key 和 Base URL 是否正确：' + error.message);
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

    // Helper function to find provider by model name
    function findProviderByModel(modelName) {
        for (const [providerKey, provider] of Object.entries(configData.providers)) {
            if (provider.models && provider.models.some(m => m.name === modelName)) {
                return { providerKey, provider };
            }
        }
        return null;
    }

    // Add message to chat
    function addMessage(content, isUser = false) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;

        if (isUser) {
            // Add a special class to preserve formatting for user messages
            messageDiv.innerHTML = `<div class="message-bubble user-message-content">${content}</div>`;
        } else {
            // Use markdown-it to render AI responses
            if (typeof window.markdownit === 'function') {
                const md = window.markdownit({
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
                }).use(anchorPlugin);

                // Set default target for all links
                const defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, renderer) {
                    return renderer.renderToken(tokens, idx, options);
                };
                md.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
                    const token = tokens[idx];
                    if (token && token.attrGet('target') !== '_blank') {
                        token.attrSet('target', '_blank');
                        token.attrSet('rel', 'noopener noreferrer');
                    }
                    return defaultRender(tokens, idx, options, env, renderer);
                };

                messageDiv.innerHTML = `<div class="message-bubble">${md.render(content)}</div>`;
            } else {
                messageDiv.innerHTML = `<div class="message-bubble">${content}</div>`;
            }
        }

        chatMessages.appendChild(messageDiv);

        // Store message in active chat history
        if (activeChatId) {
            const chat = configData.history.find(c => c.id === activeChatId);
            if (chat) {
                if (!chat.messages) chat.messages = [];
                chat.messages.push({ role: isUser ? 'user' : 'assistant', content });

                // If this is the first user message, update the title
                if (isUser && chat.title === '空白对话') {
                    chat.title = content.length > 20 ? content.substring(0, 20) + '...' : content;
                    renderHistory();
                }
                saveToStorage();
            }
        }

        // Only scroll to bottom if user is at the bottom of the chat
        const shouldScroll = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 10;
        if (shouldScroll) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Add has-messages class to chat container (to move input to bottom)
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.add('has-messages');
        }

        // Also add to chat-view for consistency
        const chatView = document.getElementById('chat-view');
        if (chatView) {
            chatView.classList.add('has-messages');
        }
    }

    // Add AI message with streaming support
    function addAIMessageStream() {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';
        messageDiv.innerHTML = `<div class="message-bubble">|</div>`;
        chatMessages.appendChild(messageDiv);

        // Only scroll to bottom if user is at the bottom of the chat
        const shouldScroll = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 10;
        if (shouldScroll) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        // Add has-messages class to chat container (to move input to bottom)
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.classList.add('has-messages');
        }

        // Also add to chat-view for consistency
        const chatView = document.getElementById('chat-view');
        if (chatView) {
            chatView.classList.add('has-messages');
        }

        return messageDiv;
    }

    // Update AI message content
    function updateAIMessageContent(messageElement, content) {
        const bubble = messageElement.querySelector('.message-bubble');
        if (bubble && typeof window.markdownit === 'function') {
            const md = new window.markdownit({
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
            }).use(anchorPlugin);

            // Set default target for all links
            const defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, renderer) {
                return renderer.renderToken(tokens, idx, options);
            };
            md.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
                const token = tokens[idx];
                if (token && token.attrGet('target') !== '_blank') {
                    token.attrSet('target', '_blank');
                    token.attrSet('rel', 'noopener noreferrer');
                }
                return defaultRender(tokens, idx, options, env, renderer);
            };

            bubble.innerHTML = `${md.render(content)}<span class="cursor"></span>`;
        } else if (bubble) {
            bubble.textContent = content + '|';
        }
    }

    // Create a markdown-it plugin to remove anchor links like {#...}
    function anchorPlugin(md) {
        const rule = function (state) {
            for (let i = 0; i < state.tokens.length; i++) {
                if (state.tokens[i].type === 'text') {
                    state.tokens[i].content = state.tokens[i].content.replace(/\{#[^}]+\}/g, '');
                }
            }
        };

        md.core.ruler.push('remove_anchors', rule);
    }

    // Finalize AI message (remove cursor)
    function finalizeAIMessage(messageElement, content) {
        const bubble = messageElement.querySelector('.message-bubble');
        if (bubble && content && typeof window.markdownit === 'function') {
            const md = window.markdownit({
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
            }).use(anchorPlugin);

            // Set default target for all links
            const defaultRender = md.renderer.rules.link_open || function (tokens, idx, options, env, renderer) {
                return renderer.renderToken(tokens, idx, options);
            };
            md.renderer.rules.link_open = function (tokens, idx, options, env, renderer) {
                const token = tokens[idx];
                if (token && token.attrGet('target') !== '_blank') {
                    token.attrSet('target', '_blank');
                    token.attrSet('rel', 'noopener noreferrer');
                }
                return defaultRender(tokens, idx, options, env, renderer);
            };

            bubble.innerHTML = md.render(content);

            // Store AI response in active chat
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
            // Fallback: just remove cursor
            const cursor = bubble.querySelector('.cursor');
            if (cursor) cursor.remove();
        }
    }

    // Normalize base URL - keep existing API version path (like /v1, /v1beta, etc.)
    // Only add /v1 if no API version path is found
    function normalizeBaseUrl(baseUrl) {
        let cleanUrl = baseUrl.trim();

        // Remove trailing slashes
        if (cleanUrl.endsWith('/')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }

        // Check if URL already contains a version path like /v1, /v1beta, /v1alpha, etc.
        const versionMatch = cleanUrl.match(/\/v\d+(beta|alpha)?/i);
        if (versionMatch) {
            // If a version path exists, return everything up to and including that version
            const versionIndex = versionMatch.index + versionMatch[0].length;
            return cleanUrl.substring(0, versionIndex);
        } else {
            // If no version path found, return the URL as is without adding anything
            // Different providers may have different API structures (e.g., Google uses /v1beta, some might have no version)
            return cleanUrl;
        }
    }

    // Display error message in chat
    function displayErrorMessage(error, httpStatus = null) {
        let errorContent = '';

        if (httpStatus) {
            errorContent = `HTTP ${httpStatus}: ${error.message || '请求失败'}`;
        } else {
            errorContent = error.message || '未知错误';
        }

        // Add the error as an assistant message
        addMessage(errorContent, false);
    }

    // Send message to API with streaming support
    async function sendMessageToAPI(message, modelName, signal) {
        const providerInfo = findProviderByModel(modelName);
        if (!providerInfo) {
            throw new Error(`未找到模型 ${modelName} 的提供商配置`);
        }

        const { provider } = providerInfo;
        if (!provider.apiKey) {
            throw new Error('API Key 未配置');
        }

        // Clean and prepare Base URL using the normalizeBaseUrl function
        const baseUrl = normalizeBaseUrl(provider.baseUrl);

        // Prepare messages array with context
        const messages = [];
        const systemPrompt = configData.general.systemPrompt;
        if (systemPrompt && systemPrompt.trim()) {
            messages.push({ role: 'system', content: systemPrompt.trim() });
        }

        // Add conversation history if available
        if (activeChatId) {
            const chat = configData.history.find(c => c.id === activeChatId);
            if (chat && chat.messages) {
                chat.messages.forEach(msg => {
                    messages.push({ role: msg.role, content: msg.content });
                });
            }
        }

        // Add current user message (if not already added via addMessage earlier)
        // Wait, addMessage already pushes to history. So we should take the history but EXCLUDE the last one if we're adding it here?
        // Actually, sendBtn handler calls addMessage(message, true) BEFORE sendMessageToAPI.
        // So the last message in history IS the current message.

        // Create initial AI message element for streaming
        const aiMessageElement = addAIMessageStream();
        let fullContent = '';

        try {
            const controller = new AbortController();
            // Combine the passed signal with our own timeout
            const combinedSignal = new AbortController();

            // If a signal was provided, combine it with timeout
            if (signal) {
                signal.addEventListener('abort', () => {
                    combinedSignal.abort();
                });
            }

            // Set timeout (60s) and add to combined signal
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
                    stream: true,  // Enable streaming
                    stream_options: { include_usage: true }  // Include token usage
                }),
                signal: combinedSignal.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Try to get more detailed error information
                let errorDetails = '';
                try {
                    const errorData = await response.json();
                    errorDetails = errorData.error?.message || errorData.message || '';
                } catch (e) {
                    // If we can't parse JSON, use status text
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
                buffer = lines.pop() || ''; // Keep last incomplete line in buffer

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6); // Remove 'data: ' prefix
                        if (data === '[DONE]') {
                            break;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.choices && parsed.choices.length > 0) {
                                const delta = parsed.choices[0];
                                if (delta.delta && delta.delta.content) {
                                    fullContent += delta.delta.content;
                                    // Update the AI message content in real-time
                                    updateAIMessageContent(aiMessageElement, fullContent);
                                }
                            }
                        } catch (e) {
                            // Skip invalid JSON lines
                            console.warn('Failed to parse SSE data:', e);
                        }
                    }
                }
            }

            // Finalize the message (remove cursor)
            finalizeAIMessage(aiMessageElement, fullContent);

            reader.releaseLock();
            return fullContent;
        } catch (error) {
            // If it's an AbortError (user cancelled), keep the partial content
            if (error.name === 'AbortError' && fullContent) {
                // Just finalize the current partial content without removing it
                finalizeAIMessage(aiMessageElement, fullContent);
                return fullContent; // Don't throw error for cancelled requests
            }

            // For other errors, remove the streaming message element
            if (aiMessageElement && aiMessageElement.parentNode) {
                aiMessageElement.parentNode.removeChild(aiMessageElement);
            }

            // Re-throw error to be handled by the caller
            throw error;
        }
    }

    // Store the abort controller globally to allow stopping requests
    let abortController = null;

    // Send / Stop Button Logic
    sendBtn.addEventListener('click', async () => {
        if (isRequesting) {
            // Stop the ongoing request
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

        const currentModel = currentModelSpan.textContent;

        try {
            isRequesting = true;
            sendBtn.innerHTML = '<div class="stop-icon"></div>';
            sendBtn.classList.add('stop-mode');
            sendBtn.disabled = false; // MUST be clickable
            chatInput.disabled = true;

            // Immediately hide welcome section
            if (chatContainer) chatContainer.classList.add('has-messages');
            if (chatView) chatView.classList.add('has-messages');

            // Create new abort controller for this request
            abortController = new AbortController();

            // Add user message
            addMessage(message, true);
            chatInput.value = '';
            chatInput.style.height = 'auto';

            // Send to API (this handles AI response internally with streaming)
            await sendMessageToAPI(message, currentModel, abortController.signal);

        } catch (error) {
            // Only display error if it's not an AbortError (user cancelled)
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

    // JSON Export Logic
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

    // --- Provider Title Editing ---
    editProviderBtn.addEventListener('click', () => {
        originalProviderName = providerNameDisplay.textContent;
        providerNameDisplay.contentEditable = "true";
        providerNameDisplay.focus();
        document.execCommand('selectAll', false, null);
        editProviderBtn.classList.add('hidden');
        saveProviderBtn.classList.remove('hidden');
        cancelProviderBtn.classList.remove('hidden');

        // Ensure continued editing capability after paste or other events
        providerNameDisplay.addEventListener('input', function () {
            // Keep element editable
            providerNameDisplay.contentEditable = "true";
        });

        // Also make sure to keep focus after paste
        providerNameDisplay.addEventListener('paste', function (e) {
            setTimeout(() => {
                providerNameDisplay.contentEditable = "true";
                providerNameDisplay.focus();
                // Move cursor to end of text after paste
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(providerNameDisplay);
                range.collapse(false); // false means collapse to end
                selection.removeAllRanges();
                selection.addRange(range);
            }, 10);
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

            // Update the sidebar item in-place or via re-render
            currentProviderKey = newName;
            renderProviderList();
            renderModels(); // Refresh the list
            saveToStorage();
        }
        exitTitleEdit();
    });

    cancelProviderBtn.addEventListener('click', () => {
        providerNameDisplay.textContent = originalProviderName;
        exitTitleEdit();
    });

    // --- Settings Tab Logic ---
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
            // Show real API key, not masked version
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
                if (tabId === 'role-presets') renderRoles();
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
        Object.keys(configData.providers).forEach(provider => {
            const item = document.createElement('div');
            item.className = 'settings-nav-item';
            if (provider === currentProviderKey) item.classList.add('active');
            item.setAttribute('data-tab', `provider-${provider.toLowerCase()}`);
            item.setAttribute('data-key', provider);
            item.innerHTML = `
                <div style="display: flex; align-items: center; flex: 1;">
                    <img src="https://api.dicebear.com/7.x/initials/svg?seed=${provider}" style="width:10px;height:10px;border-radius:2px;margin-right:8px;">
                    <span style="flex: 1;">${provider}</span>
                </div>
                <div class="provider-actions">
                    <i data-lucide="trash" onclick="event.stopPropagation(); deleteProvider('${provider}')" class="provider-delete-btn"></i>
                </div>
            `;
            providersListContainer.appendChild(item);
        });
    }

    // Theme Switching
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

    // Model Selector Dropdown
    modelSelector.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle('active');
        if (modelDropdown.classList.contains('active')) renderModelDropdown();
    });

    document.addEventListener('click', () => {
        if (modelDropdown) modelDropdown.classList.remove('active');
        if (languageOptions) languageOptions.classList.remove('active');

        // Close modal when clicking outside
        const modal = document.getElementById('model-modal');
        if (modal && modal.classList.contains('active') && event.target === modal) {
            closeModelModal();
        }
    });

    function renderModelDropdown() {
        modelDropdown.innerHTML = '';

        // 1. Favorites Section (Quick Access)
        const favorites = [];
        Object.values(configData.providers).forEach(p => {
            p.models.forEach(m => {
                if (m.favorite && m.enabled !== false) favorites.push(m);
            });
        });

        if (favorites.length > 0) {
            const favSection = document.createElement('div');
            favSection.className = 'dropdown-section';
            favSection.innerHTML = '<div class="dropdown-section-title">已收藏</div>';
            favorites.forEach(m => favSection.appendChild(createDropdownItem(m)));
            modelDropdown.appendChild(favSection);
        }

        // 2. Provider Sections
        Object.keys(configData.providers).forEach(providerKey => {
            const provider = configData.providers[providerKey];
            const enabledModels = (provider.models || []).filter(m => m.enabled !== false);

            if (enabledModels.length > 0) {
                const section = document.createElement('div');
                section.className = 'dropdown-section';
                // Use original providerKey to preserve case
                section.innerHTML = `<div class="dropdown-section-title">${providerKey}</div>`;

                enabledModels.forEach(m => {
                    section.appendChild(createDropdownItem(m));
                });

                modelDropdown.appendChild(section);
            }
        });
    }

    function createDropdownItem(model) {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `<span>${model.name}</span>`;
        item.onclick = () => { currentModelSpan.textContent = model.name; modelDropdown.classList.remove('active'); };
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

    window.toggleForm = (id) => document.getElementById(id).classList.toggle('active');

    window.saveRole = () => {
        const nameInput = document.getElementById('new-role-name');
        const promptInput = document.getElementById('new-role-prompt');
        if (editingRoleId) {
            const role = configData.roles.find(r => r.id === editingRoleId);
            if (role) { role.name = nameInput.value; role.prompt = promptInput.value; }
            editingRoleId = null;
        } else {
            configData.roles.push({ id: Date.now(), name: nameInput.value, prompt: promptInput.value });
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

        // Ensure refresh icon is not sticking in spinning state
        const refreshIcon = fetchModelsBtn.querySelector('.spinning');
        if (refreshIcon) refreshIcon.classList.remove('spinning');

        updateIcons();
    }

    // Modal functions
    window.showModelModal = (fetchedModels) => {
        const modal = document.getElementById('model-modal');
        const selectionList = document.getElementById('model-selection-list');
        const existingModels = configData.providers[currentProviderKey].models || [];

        if (!modal) {
            return;
        }

        selectionList.innerHTML = '';

        fetchedModels.forEach(model => {
            const existingModel = existingModels.find(m => m.name === model.name);
            const isSelected = existingModel ? true : false;

            const item = document.createElement('div');
            item.className = 'model-selection-item';
            item.innerHTML = `
                <input type="checkbox" id="model-${model.id}" ${isSelected ? 'checked' : ''} data-model-name="${model.name}">
                <label for="model-${model.id}">${model.name}</label>
            `;

            // Add event listener to save immediately on change
            const checkbox = item.querySelector('input[type="checkbox"]');
            checkbox.addEventListener('change', function () {
                saveModelSelection();
            });

            selectionList.appendChild(item);
        });

        modal.classList.add('active');
        if (typeof lucide !== 'undefined') updateIcons();
    };

    window.closeModelModal = () => {
        const modal = document.getElementById('model-modal');
        modal.classList.remove('active');
    };

    window.saveModelSelection = () => {
        const allCheckboxes = document.querySelectorAll('#model-selection-list input[type="checkbox"]');
        const checkedModelNames = Array.from(allCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.getAttribute('data-model-name'));

        // Get all available models from the modal list (both existing and new)
        const allModelElements = document.querySelectorAll('#model-selection-list .model-selection-item');
        const allAvailableModels = Array.from(allModelElements).map(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const modelName = checkbox.getAttribute('data-model-name');
            return { name: modelName, favorite: false };
        });

        // Keep only the checked models from available models
        const selectedModels = allAvailableModels.filter(model => checkedModelNames.includes(model.name));

        // Preserve existing model settings (like favorite status) if they exist
        const existingModels = configData.providers[currentProviderKey].models || [];

        const finalModels = selectedModels.map(selectedModel => {
            const existingModel = existingModels.find(m => m.name === selectedModel.name);
            if (existingModel) {
                // Preserve existing settings like favorite
                return { ...existingModel, name: selectedModel.name };
            } else {
                // New model from API, initialize with default settings
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
        if (Object.keys(configData.providers).length <= 1) {
            alert('至少需要保留一个模型提供商');
            return;
        }

        if (currentProviderKey === providerKey) {
            // 如果删除的是当前选中的provider，切换到第一个可用的provider
            const remainingProviders = Object.keys(configData.providers).filter(p => p !== providerKey);
            if (remainingProviders.length > 0) {
                currentProviderKey = remainingProviders[0];
                providerNameDisplay.textContent = currentProviderKey;
                apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
                // Show real API key, not masked version
                baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
                renderModels();
            }
        }

        delete configData.providers[providerKey];
        renderProviderList();
        saveToStorage();

        if (typeof lucide !== 'undefined') updateIcons();
    };

    // Set initial provider data
    if (configData.providers[currentProviderKey]) {
        apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
        baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
    }

    renderProviderList();
    renderModels();
    renderGeneralSettings();
    renderHistory();
    updateChatLayout();

    // Auto-load last chat or start fresh
    if (configData.history.length > 0) {
        loadChat(configData.history[0].id);
    } else {
        createNewChat();
    }

    updateIcons();
});
