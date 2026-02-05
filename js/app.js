/**
 * KISSAI Web Application
 * 主应用逻辑 - 重构版本
 */

document.addEventListener('DOMContentLoaded', () => {
    // ========== 初始化 ==========

    // 初始化存储
    const configData = KissaiStorage.init();

    // 应用初始主题
    const themeClass = configData.general.theme === 'light' ? 'light-mode' : 'dark-mode';
    document.body.className = `loading ${themeClass}`;

    // 处理系统提示词的语言
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

    // ========== DOM 元素缓存 ==========

    const DOM = {
        // 使用 getter 实现懒加载缓存
        get sidebar() { return KissaiUtils.getElement('sidebar'); },
        get sidebarHandle() { return KissaiUtils.getElement('sidebar-handle'); },
        get settingsBtn() { return KissaiUtils.getElement('settings-btn'); },
        get closeSettingsBtn() { return KissaiUtils.getElement('close-settings'); },
        get settingsView() { return KissaiUtils.getElement('settings-view'); },
        get chatInput() { return KissaiUtils.getElement('chat-input'); },
        get sendBtn() { return KissaiUtils.getElement('send-btn'); },
        get chatContainer() { return document.querySelector('.chat-container'); },
        get chatView() { return KissaiUtils.getElement('chat-view'); },
        get chatMessages() { return KissaiUtils.getElement('chat-messages'); },
        get providerList() { return KissaiUtils.getElement('provider-list'); },
        get modelList() { return KissaiUtils.getElement('model-list'); },
        get fetchModelsBtn() { return KissaiUtils.getElement('fetch-models-btn'); },
        get providerNameDisplay() { return KissaiUtils.getElement('provider-name'); },
        get apiKeyInput() { return KissaiUtils.getElement('api-key'); },
        get baseUrlInput() { return KissaiUtils.getElement('base-url'); },
        get editProviderBtn() { return KissaiUtils.getElement('edit-provider-btn'); },
        get saveProviderBtn() { return KissaiUtils.getElement('save-provider-btn'); },
        get cancelProviderBtn() { return KissaiUtils.getElement('cancel-provider-btn'); },
        get themeBtns() { return document.querySelectorAll('.theme-btn'); },
        get providersHeader() { return KissaiUtils.getElement('providers-header'); },
        get providersListContainer() { return KissaiUtils.getElement('providers-list'); },
        get roleList() { return KissaiUtils.getElement('role-list'); },
        get modelSelector() { return KissaiUtils.getElement('model-selector'); },
        get modelDropdown() { return KissaiUtils.getElement('model-dropdown'); },
        get currentModelSpan() { return KissaiUtils.getElement('current-model'); },
        get exportClipboardBtn() { return KissaiUtils.getElement('export-clipboard-btn'); },
        get importClipboardBtn() { return KissaiUtils.getElement('import-clipboard-btn'); },
        get exportFileBtn() { return KissaiUtils.getElement('export-file-btn'); },
        get historyList() { return KissaiUtils.getElement('history-list'); },
        get newChatBtn() { return KissaiUtils.getElement('new-chat-btn'); },
        get languageSelect() { return KissaiUtils.getElement('language-select'); },
        get currentLanguageSpan() { return KissaiUtils.getElement('current-language'); },
        get languageOptions() { return DOM.languageSelect?.querySelector('.select-options'); },
        get contextControlBtn() { return KissaiUtils.getElement('context-control-btn'); },
        get contextCountDisplay() { return KissaiUtils.getElement('context-count-display'); },
        get contextLimitDropdown() { return KissaiUtils.getElement('context-limit-dropdown'); },
        get roleMentionDropdown() { return KissaiUtils.getElement('role-mention-dropdown'); },
        get searchInput() { return KissaiUtils.getElement('search-input'); },
        get wideModeCheckbox() { return KissaiUtils.getElement('wide-mode-checkbox'); },
        get clearChatBtn() { return KissaiUtils.getElement('clear-chat-btn'); },
        get clearHistoryBtn() { return KissaiUtils.getElement('clear-history-btn'); },
        get resetPromptBtn() { return KissaiUtils.getElement('reset-prompt-btn'); },
        get scrollbarMarkers() { return KissaiUtils.getElement('scrollbar-markers'); },
        get scrollbarTopZone() { return document.querySelector('.scrollbar-top-zone'); },
    };

    // ========== 应用状态 ==========

    let currentProviderKey = Object.keys(configData.providers)[0] || 'Groq';
    let originalProviderName = '';
    let editingRoleId = null;
    let activeChatId = configData.general.activeChatId || null;
    let abortController = null;

    // Markdown 流式处理器
    const markdownProcessor = new MarkdownStreamProcessor();

    // ========== 工具函数 ==========

    /**
     * 更新 Lucide 图标
     */
    const updateIcons = () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({
                attrs: {
                    width: KISSAI_CONFIG.UI.ICON_SIZE,
                    height: KISSAI_CONFIG.UI.ICON_SIZE,
                    'stroke-width': KISSAI_CONFIG.UI.ICON_STROKE_WIDTH
                },
                nameAttr: 'data-lucide' // 确保只处理未转换的图标
            });
        }
    };

    /**
     * 验证角色是否有效
     */
    const isValidRole = (roleName) => {
        if (!roleName || !configData.roles) return false;
        return configData.roles.some(role => role.name === roleName);
    };

    /**
     * 保存到存储
     */
    const saveToStorage = () => {
        // 同步当前 Provider 的输入值
        if (currentProviderKey && configData.providers[currentProviderKey]) {
            configData.providers[currentProviderKey].apiKey = DOM.apiKeyInput?.value || '';
            configData.providers[currentProviderKey].baseUrl = DOM.baseUrlInput?.value || '';
        }
        // 同步系统提示词
        const promptTextarea = KissaiUtils.getElement('global-system-prompt');
        if (promptTextarea) {
            configData.general.systemPrompt = promptTextarea.value;
        }
        KissaiStorage.save();
    };

    /**
     * 获取当前模型名称
     */
    const getCurrentModelName = () => {
        const internalSpan = DOM.currentModelSpan?.querySelector('span');
        if (internalSpan) {
            return internalSpan.textContent.trim();
        }
        return DOM.currentModelSpan?.textContent.replace(/^[A-Z]+\s*/, '').trim() || '';
    };

    /**
     * 获取模型对应的 Provider
     */
    const getProviderForModel = (modelName) => {
        for (const [providerKey, provider] of Object.entries(configData.providers)) {
            if (provider.models && provider.models.some(m => m.name === modelName)) {
                return providerKey;
            }
        }
        return 'Default';
    };

    /**
     * 获取 Provider 显示信息
     */
    const getProviderDisplayInfo = (providerKey) => {
        const providers = Object.keys(configData.providers);
        const index = providers.indexOf(providerKey);
        const color = KISSAI_CONFIG.PROVIDER_COLORS[index % KISSAI_CONFIG.PROVIDER_COLORS.length];

        let label = providerKey;
        if (providerKey.length > 2) {
            label = providerKey.charAt(0).toUpperCase() +
                providerKey.charAt(providerKey.length - 1).toUpperCase();
        } else {
            label = providerKey.toUpperCase();
        }

        return { color, label };
    };

    /**
     * 设置模型显示
     */
    const setModelDisplay = (modelName, providerKey) => {
        if (!DOM.currentModelSpan) return;

        const info = getProviderDisplayInfo(providerKey);
        DOM.currentModelSpan.innerHTML = `
            <div style="
                display: inline-flex;
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
                margin-right: 6px;
                flex-shrink: 0;
            ">${info.label}</div>
            <span>${modelName}</span>
        `;
        DOM.currentModelSpan.dataset.provider = providerKey;
    };

    /**
     * 更新当前模型显示
     */
    const updateCurrentModelDisplay = () => {
        const currentModel = getCurrentModelName();
        if (currentModel) {
            const providerKey = getProviderForModel(currentModel);
            if (providerKey !== 'Default') {
                setModelDisplay(currentModel, providerKey);
            }
        }
    };

    /**
     * 设置默认模型
     */
    const setDefaultModel = () => {
        let currentModel = configData.general?.lastUsedModel || null;

        if (currentModel) {
            const providerKey = getProviderForModel(currentModel);
            if (providerKey !== 'Default') {
                setModelDisplay(currentModel, providerKey);
                return;
            }
        }

        // 查找收藏的模型
        for (const [pKey, provider] of Object.entries(configData.providers)) {
            if (provider.models) {
                const favoriteModel = provider.models.find(m => m.favorite && m.enabled !== false);
                if (favoriteModel) {
                    setModelDisplay(favoriteModel.name, pKey);
                    configData.general.lastUsedModel = favoriteModel.name;
                    saveToStorage();
                    return;
                }
            }
        }

        // 查找任意启用的模型
        for (const [pKey, provider] of Object.entries(configData.providers)) {
            if (provider.models) {
                const enabledModel = provider.models.find(m => m.enabled !== false);
                if (enabledModel) {
                    setModelDisplay(enabledModel.name, pKey);
                    configData.general.lastUsedModel = enabledModel.name;
                    saveToStorage();
                    return;
                }
            }
        }

        if (DOM.currentModelSpan) {
            DOM.currentModelSpan.textContent = t('model.notSelected');
        }
    };

    // ========== 聊天布局 ==========

    const updateChatLayout = () => {
        if (!DOM.chatContainer) return;
        const isWide = configData.general.wideMode;
        DOM.chatContainer.classList.toggle('wide-mode', isWide);
        DOM.chatContainer.classList.toggle('narrow-mode', !isWide);
    };


    // ========== 历史记录管理 ==========

    /**
     * 搜索聊天记录
     */
    const searchChats = (keyword) => {
        if (!keyword) return configData.history;
        const lowerKeyword = keyword.toLowerCase();
        return configData.history.filter(chat => {
            if (chat.title.toLowerCase().includes(lowerKeyword)) return true;
            if (chat.messages && chat.messages.some(msg =>
                msg.content.toLowerCase().includes(lowerKeyword)
            )) return true;
            return false;
        });
    };

    /**
     * 渲染历史记录列表
     */
    const renderHistory = () => {
        if (!DOM.historyList) return;

        const searchKeyword = DOM.searchInput?.value.trim() || '';
        const filteredChats = searchChats(searchKeyword);

        if (filteredChats.length === 0) {
            const emptyMessage = searchKeyword
                ? t('chat.searchNotFound', { keyword: KissaiUtils.escapeHtml(searchKeyword) })
                : t('chat.historyEmpty');
            const iconName = searchKeyword ? 'search' : 'message-square';

            DOM.historyList.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="${iconName}"></i>
                    <span>${emptyMessage}</span>
                </div>
            `;
            updateIcons();
            return;
        }

        // 使用 DocumentFragment 优化 DOM 操作
        const fragment = document.createDocumentFragment();

        filteredChats.forEach(chat => {
            const item = document.createElement('div');
            item.className = 'history-item' + (activeChatId === chat.id ? ' active' : '');

            // 创建内容区域
            const contentDiv = document.createElement('div');
            contentDiv.className = 'history-item-content';
            contentDiv.innerHTML = `
                <i data-lucide="message-square"></i>
                <span>${KissaiUtils.highlightKeyword(chat.title, searchKeyword)}</span>
            `;

            // 创建操作区域
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'history-item-actions';

            const deleteIcon = document.createElement('i');
            deleteIcon.setAttribute('data-lucide', 'trash');
            deleteIcon.dataset.chatId = chat.id; // 直接设置，不经过 HTML 解析
            actionsDiv.appendChild(deleteIcon);

            item.appendChild(contentDiv);
            item.appendChild(actionsDiv);

            item.addEventListener('click', (e) => {
                if (!e.target.closest('.history-item-actions')) {
                    loadChat(chat.id);
                }
            });

            fragment.appendChild(item);
        });

        DOM.historyList.innerHTML = '';
        DOM.historyList.appendChild(fragment);
        updateIcons();
    };

    /**
     * 创建新聊天
     */
    const createNewChat = () => {
        document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));

        if (DOM.searchInput) {
            DOM.searchInput.value = '';
        }

        if (DOM.chatMessages) {
            DOM.chatMessages.innerHTML = '';
        }

        DOM.chatView?.classList.remove('has-messages');
        DOM.chatContainer?.classList.remove('has-messages');
        updateChatLayout();

        const welcomeSection = document.querySelector('.welcome-section');
        if (welcomeSection) welcomeSection.style.display = 'flex';

        const newChat = {
            id: KissaiUtils.generateId(),
            title: t('chat.emptyTitle'),
            messages: [],
            time: Date.now(),
            activeRole: null
        };

        activeChatId = newChat.id;
        configData.general.activeChatId = newChat.id;
        configData.history.unshift(newChat);
        renderHistory();
        saveToStorage();
    };

    /**
     * 加载聊天记录
     */
    const loadChat = (id) => {
        const chat = configData.history.find(c => c.id === id);
        if (!chat) return;

        activeChatId = id;
        configData.general.activeChatId = id;
        saveToStorage();

        if (DOM.chatMessages) {
            DOM.chatMessages.innerHTML = '';
        }

        const welcomeSection = document.querySelector('.welcome-section');

        if (chat.messages && chat.messages.length > 0) {
            DOM.chatView?.classList.add('has-messages');
            DOM.chatContainer?.classList.add('has-messages');
            if (welcomeSection) welcomeSection.style.display = 'none';

            chat.messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${msg.role === 'user' ? 'user' : 'assistant'}`;

                if (msg.role === 'user') {
                    const bubble = document.createElement('div');
                    bubble.className = 'message-bubble user-message-content';

                    const images = msg.images || [];
                    if (images.length > 0) {
                        let html = '';
                        images.forEach(img => {
                            html += `<img src="${img}" style="max-width: 100%; max-height: ${KISSAI_CONFIG.UI.MAX_IMAGE_HEIGHT}px; border-radius: 4px; margin-bottom: 8px; display: block;" />`;
                        });
                        if (msg.content) {
                            html += `<span>${KissaiUtils.escapeHtml(msg.content)}</span>`;
                        }
                        bubble.innerHTML = html;
                    } else {
                        bubble.textContent = msg.content;
                    }

                    messageDiv.appendChild(bubble);
                    applyLongMessageHandling(bubble, true, msg.content);
                } else {
                    let thinkingHtml = '';
                    if (msg.reasoning_content) {
                        const renderedThinking = KissaiMarkdown.render(msg.reasoning_content);
                        thinkingHtml = `
                            <div class="message-thinking">
                                <div class="message-thinking-header">
                                    <div class="message-thinking-toggle">
                                        <i data-lucide="chevron-down"></i>
                                    </div>
                                    <span class="message-thinking-title">${t('thinking.title')}</span>
                                </div>
                                <div class="message-thinking-content">${renderedThinking}</div>
                            </div>
                        `;
                    }

                    const renderedContent = KissaiMarkdown.render(msg.content);
                    messageDiv.innerHTML = `${thinkingHtml}<div class="message-bubble">${renderedContent}</div>`;

                    const bubble = messageDiv.querySelector('.message-bubble');
                    const thinkingHeader = messageDiv.querySelector('.message-thinking-header');

                    if (thinkingHeader) {
                        thinkingHeader.addEventListener('click', () => {
                            const thinkingDiv = messageDiv.querySelector('.message-thinking');
                            thinkingDiv?.classList.toggle('collapsed');
                            updateIcons();
                        });
                    }

                    addAssistantMessageActions(bubble, msg.content);
                    addCodeCopyButtons(bubble);
                }

                DOM.chatMessages.appendChild(messageDiv);
            });

            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
            updateIcons();
        } else {
            DOM.chatView?.classList.remove('has-messages');
            DOM.chatContainer?.classList.remove('has-messages');
            if (welcomeSection) welcomeSection.style.display = 'flex';
        }

        // 恢复角色
        if (DOM.chatInput && DOM.chatInput.value.trim() === '' && !DOM.chatInput.dataset.pastedImage) {
            if (chat.activeRole && isValidRole(chat.activeRole)) {
                DOM.chatInput.value = `@${chat.activeRole} `;
                DOM.chatInput.dataset.selectedRole = chat.activeRole;
            }
        }

        renderHistory();
    };

    /**
     * 删除历史记录
     */
    const deleteHistory = (id) => {
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

    // 暴露到全局（兼容 HTML 中的 onclick）
    window.deleteHistory = deleteHistory;


    // ========== 消息处理 ==========

    /**
     * 处理长消息（折叠/展开）
     */
    const applyLongMessageHandling = (bubble, isUser, content) => {
        if (!bubble || !isUser) return;

        // 图片消息只添加复制按钮
        if (bubble.querySelector('img')) {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions-row';

            const copyBtn = createCopyButton(content);
            actionsDiv.appendChild(copyBtn);
            bubble.appendChild(actionsDiv);
            updateIcons();
            return;
        }

        const isLongMessage = content && content.length > KISSAI_CONFIG.UI.LONG_MESSAGE_THRESHOLD;

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

            expandBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = contentDiv.classList.contains('long-message-collapsed');
                contentDiv.classList.toggle('long-message-collapsed');
                expandBtn.innerHTML = isCollapsed
                    ? `<i data-lucide="list-chevrons-down-up"></i>`
                    : `<i data-lucide="list-chevrons-up-down"></i>`;
                expandBtn.setAttribute('aria-label', isCollapsed ? t('message.collapse') : t('message.expandFull'));
                updateIcons();
            });

            actionsDiv.appendChild(expandBtn);
            contentDiv.classList.add('long-message-collapsed');
        }

        const copyBtn = createCopyButton(content);
        actionsDiv.appendChild(copyBtn);

        bubble.innerHTML = '';
        bubble.appendChild(contentDiv);
        bubble.appendChild(actionsDiv);
        updateIcons();
    };

    /**
     * 创建复制按钮
     */
    const createCopyButton = (content) => {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-action-btn';
        copyBtn.title = t('copy.title');
        copyBtn.innerHTML = `<i data-lucide="copy"></i>`;

        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const success = await KissaiUtils.copyToClipboard(content);
            if (success) {
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = `<i data-lucide="check"></i>`;
                updateIcons();
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    updateIcons();
                }, KISSAI_CONFIG.UI.COPY_FEEDBACK_MS);
            }
        });

        return copyBtn;
    };

    /**
     * 添加助手消息操作按钮
     */
    const addAssistantMessageActions = (bubble, content) => {
        if (!bubble || bubble.querySelector('.message-content')) return;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        while (bubble.firstChild) {
            contentDiv.appendChild(bubble.firstChild);
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions-row';

        // 重新生成按钮
        const regenerateBtn = document.createElement('button');
        regenerateBtn.className = 'message-action-btn';
        regenerateBtn.title = t('message.regenerate');
        regenerateBtn.innerHTML = `<i data-lucide="refresh-cw"></i>`;
        regenerateBtn.setAttribute('aria-label', t('message.regenerateLabel'));

        regenerateBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const messageElement = bubble.closest('.message.assistant');
            if (!messageElement) return;

            // 找到对应的用户消息
            let prevElement = messageElement.previousElementSibling;
            while (prevElement && !prevElement.classList.contains('user')) {
                prevElement = prevElement.previousElementSibling;
            }

            if (prevElement) {
                const userBubble = prevElement.querySelector('.user-message-content .message-content') ||
                    prevElement.querySelector('.user-message-content');
                let userContent = userBubble?.textContent || '';
                let userImages = [];

                // 从历史记录中获取完整数据
                if (activeChatId) {
                    const chat = configData.history.find(c => c.id === activeChatId);
                    if (chat && chat.messages) {
                        const userMsg = chat.messages.slice().reverse().find(m =>
                            m.role === 'user' && (m.content === userContent || (!m.content && !userContent))
                        );
                        if (userMsg) {
                            userContent = userMsg.content || '';
                            userImages = userMsg.images || [];
                        }
                    }
                }

                const currentModel = getCurrentModelName();
                if (currentModel) {
                    await handleSendMessage(userContent, currentModel, null, userImages);
                } else {
                    alert(t('alert.selectModel'));
                }
            }
        });

        actionsDiv.appendChild(regenerateBtn);

        // 复制按钮
        const copyBtn = createCopyButton(content);
        actionsDiv.appendChild(copyBtn);

        bubble.appendChild(contentDiv);
        bubble.appendChild(actionsDiv);
        updateIcons();
    };

    /**
     * 添加代码复制按钮
     */
    const addCodeCopyButtons = (container) => {
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
                try {
                    await KissaiUtils.copyToClipboard(codeElement.textContent);
                    copyBtn.textContent = t('code.copySuccess');
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.textContent = t('code.copy');
                        copyBtn.classList.remove('copied');
                    }, KISSAI_CONFIG.UI.COPY_BUTTON_RESET_MS);
                } catch (err) {
                    console.error(t('error.copyFailed'), err);
                }
            });

            pre.style.position = 'relative';
            pre.appendChild(copyBtn);
        });
    };

    /**
     * 添加用户消息到界面
     */
    const addUserMessage = (content, images = []) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble user-message-content';

        if (images.length > 0) {
            let html = '';
            images.forEach(img => {
                html += `<img src="${img}" style="max-width: 100%; max-height: ${KISSAI_CONFIG.UI.MAX_IMAGE_HEIGHT}px; border-radius: 4px; margin-bottom: 8px; display: block;" />`;
            });
            if (content) {
                html += `<span>${KissaiUtils.escapeHtml(content)}</span>`;
            }
            bubble.innerHTML = html;
        } else {
            bubble.textContent = content;
        }

        messageDiv.appendChild(bubble);
        DOM.chatMessages?.appendChild(messageDiv);

        applyLongMessageHandling(bubble, true, content);

        // 保存到历史
        if (activeChatId) {
            const chat = configData.history.find(c => c.id === activeChatId);
            if (chat) {
                if (!chat.messages) chat.messages = [];
                const messageData = { role: 'user', content };
                if (images.length > 0) {
                    messageData.images = images;
                }
                chat.messages.push(messageData);

                // 更新标题
                if (chat.title === t('chat.emptyTitle')) {
                    const titleText = content || (images.length > 0 ? t('chat.imageMessage') : t('chat.emptyMessage'));
                    chat.title = KissaiUtils.truncateText(titleText, 20);
                    renderHistory();
                }
                saveToStorage();
            }
        }

        // 滚动到底部
        if (DOM.chatMessages) {
            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        }

        // 更新布局状态
        DOM.chatContainer?.classList.add('has-messages');
        DOM.chatView?.classList.add('has-messages');
    };

    /**
     * 创建 AI 消息流式容器
     */
    const createAIMessageStream = () => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';

        messageDiv.innerHTML = `
            <div class="message-thinking" style="display: none;">
                <div class="message-thinking-header">
                    <div class="message-thinking-toggle">
                        <i data-lucide="chevron-down"></i>
                    </div>
                    <span class="message-thinking-title">${t('thinking.title')}</span>
                </div>
                <div class="message-thinking-content"></div>
            </div>
            <div class="message-bubble"><span class="cursor"></span></div>
        `;

        const thinkingHeader = messageDiv.querySelector('.message-thinking-header');
        if (thinkingHeader) {
            thinkingHeader.addEventListener('click', () => {
                const thinkingDiv = messageDiv.querySelector('.message-thinking');
                thinkingDiv?.classList.toggle('collapsed');
                updateIcons();
            });
        }

        DOM.chatMessages?.appendChild(messageDiv);
        updateIcons();

        // 滚动到底部
        if (DOM.chatMessages) {
            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        }

        DOM.chatContainer?.classList.add('has-messages');
        DOM.chatView?.classList.add('has-messages');

        return messageDiv;
    };

    /**
     * 更新 AI 消息内容（流式）
     */
    const updateAIMessageContent = (messageElement, content, thinking = '') => {
        const bubble = messageElement.querySelector('.message-bubble');
        const thinkingDiv = messageElement.querySelector('.message-thinking');
        const thinkingContent = thinkingDiv?.querySelector('.message-thinking-content');

        const processedContent = markdownProcessor.preprocessContent(content);

        // 更新思考内容
        if (thinkingDiv && thinkingContent) {
            if (thinking) {
                thinkingDiv.style.display = 'block';
                const processedThinking = markdownProcessor.preprocessContent(thinking);
                thinkingContent.innerHTML = KissaiMarkdown.render(processedThinking);
            } else if (thinkingContent.innerHTML.trim() === '') {
                thinkingDiv.style.display = 'none';
            }
        }

        // 更新主内容
        if (bubble) {
            bubble.innerHTML = KissaiMarkdown.render(processedContent) + '<span class="cursor"></span>';
            // 流式渲染时也添加复制按钮
            addCodeCopyButtons(bubble);
        }
    };

    /**
     * 完成 AI 消息（移除光标，添加操作按钮）
     */
    const finalizeAIMessage = (messageElement, content, thinking = '') => {
        const bubble = messageElement.querySelector('.message-bubble');
        const thinkingDiv = messageElement.querySelector('.message-thinking');
        const thinkingContent = thinkingDiv?.querySelector('.message-thinking-content');

        const fixedContent = markdownProcessor.preprocessContent(content);
        const fixedThinking = markdownProcessor.preprocessContent(thinking);

        // 最终渲染思考内容
        if (thinkingDiv && thinkingContent) {
            if (thinking) {
                thinkingDiv.style.display = 'block';
                thinkingContent.innerHTML = KissaiMarkdown.render(fixedThinking);
            } else {
                thinkingDiv.style.display = 'none';
            }
        }

        // 最终渲染主内容
        if (bubble && content) {
            bubble.innerHTML = KissaiMarkdown.render(fixedContent);
            addAssistantMessageActions(bubble, fixedContent);
            addCodeCopyButtons(bubble);
            updateIcons();

            // 保存到历史
            if (activeChatId) {
                const chat = configData.history.find(c => c.id === activeChatId);
                if (chat) {
                    if (!chat.messages) chat.messages = [];
                    chat.messages.push({
                        role: 'assistant',
                        content,
                        reasoning_content: thinking || undefined
                    });
                    saveToStorage();
                }
            }
        } else if (bubble) {
            // 移除光标
            const cursor = bubble.querySelector('.cursor');
            if (cursor) cursor.remove();
        }
    };


    // ========== API 交互 ==========

    /**
     * 发送消息处理
     */
    const handleSendMessage = async (message, modelName, currentRole, images = []) => {
        const aiMessageElement = createAIMessageStream();
        let fullContent = '';
        let thinkingContent = '';
        let hasError = false;

        try {
            const result = await KissaiAPI.sendMessage({
                message,
                modelName,
                providerKey: DOM.currentModelSpan?.dataset.provider,
                currentRole,
                images,
                onChunk: (content, thinking) => {
                    fullContent = content;
                    thinkingContent = thinking;
                    updateAIMessageContent(aiMessageElement, content, thinking);

                    // 自动滚动
                    if (DOM.chatMessages) {
                        const shouldScroll = DOM.chatMessages.scrollHeight - DOM.chatMessages.scrollTop <=
                            DOM.chatMessages.clientHeight + 10;
                        if (shouldScroll) {
                            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
                        }
                    }
                },
                onThinking: (thinking) => {
                    thinkingContent = thinking;
                },
                onDone: (content, thinking) => {
                    finalizeAIMessage(aiMessageElement, content, thinking);
                },
                onError: (error) => {
                    hasError = true;
                    if (aiMessageElement && aiMessageElement.parentNode) {
                        aiMessageElement.parentNode.removeChild(aiMessageElement);
                    }
                    addErrorMessage(error.message);
                }
            });

            // 如果没有内容且没有错误，清理空消息
            if (!result && !hasError && !fullContent) {
                if (aiMessageElement && aiMessageElement.parentNode) {
                    aiMessageElement.parentNode.removeChild(aiMessageElement);
                }
            }

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
            throw error;
        }
    };

    /**
     * 添加错误消息
     */
    const addErrorMessage = (errorMessage) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message assistant';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.style.color = '#ff6b6b';
        bubble.textContent = errorMessage;

        messageDiv.appendChild(bubble);
        DOM.chatMessages?.appendChild(messageDiv);

        if (DOM.chatMessages) {
            DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
        }
    };

    /**
     * 获取最后一条用户消息
     */
    const getLastUserMessage = () => {
        if (!activeChatId) return null;
        const chat = configData.history.find(c => c.id === activeChatId);
        if (!chat || !chat.messages) return null;

        for (let i = chat.messages.length - 1; i >= 0; i--) {
            if (chat.messages[i].role === 'user') {
                return chat.messages[i];
            }
        }
        return null;
    };

    // ========== 设置面板 ==========

    /**
     * 渲染通用设置
     */
    const renderGeneralSettings = () => {
        const promptTextarea = KissaiUtils.getElement('global-system-prompt');
        if (promptTextarea && configData.general.systemPrompt !== undefined) {
            promptTextarea.value = configData.general.systemPrompt;
        }

        // 主题按钮
        DOM.themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === configData.general.theme);
        });

        // 语言选择
        const langMap = { 'zh': '简体中文', 'en': 'English' };
        if (DOM.currentLanguageSpan) {
            DOM.currentLanguageSpan.textContent = langMap[configData.general.language] || '简体中文';
        }

        DOM.languageOptions?.querySelectorAll('.select-option').forEach(opt => {
            opt.classList.toggle('selected', opt.getAttribute('data-value') === configData.general.language);
        });

        // 宽屏模式
        if (DOM.wideModeCheckbox) {
            DOM.wideModeCheckbox.checked = !!configData.general.wideMode;
        }

        updateAllText();
        updateChatLayout();
    };

    /**
     * 渲染 Provider 列表
     */
    const renderProviderList = () => {
        if (!DOM.providersListContainer) return;

        // 移除旧的 Provider 项
        DOM.providersListContainer.querySelectorAll('.settings-nav-item:not(.add-btn)').forEach(el => el.remove());

        const providers = Object.keys(configData.providers);

        providers.forEach((provider, index) => {
            const item = document.createElement('div');
            item.className = 'settings-nav-item';
            if (provider === currentProviderKey) item.classList.add('active');
            item.setAttribute('data-tab', `provider-${provider.toLowerCase()}`);
            item.setAttribute('data-key', provider);

            const info = getProviderDisplayInfo(provider);

            // 创建内容区域
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = 'display: flex; align-items: center; flex: 1; overflow: hidden;';
            contentDiv.innerHTML = `
                <div style="width:24px;height:16px;border-radius:2px;background:${info.color};color:white;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;margin-right:8px;flex-shrink:0;">${info.label}</div>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${KissaiUtils.escapeHtml(provider)}</span>
            `;

            // 创建操作按钮区域
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'provider-item-actions';

            const copyBtn = document.createElement('button');
            copyBtn.className = 'icon-btn-xs provider-copy-btn';
            copyBtn.title = t('provider.copy');
            copyBtn.dataset.provider = provider; // 直接设置，不经过 HTML 解析
            copyBtn.innerHTML = '<i data-lucide="copy"></i>';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-btn-xs provider-delete-btn';
            deleteBtn.title = t('provider.delete');
            deleteBtn.dataset.provider = provider; // 直接设置，不经过 HTML 解析
            deleteBtn.innerHTML = '<i data-lucide="trash"></i>';

            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(deleteBtn);

            item.appendChild(contentDiv);
            item.appendChild(actionsDiv);
            DOM.providersListContainer.appendChild(item);
        });

        updateIcons();
    };

    /**
     * 渲染模型列表
     */
    const renderModels = () => {
        if (!DOM.modelList) return;

        const provider = configData.providers[currentProviderKey];
        DOM.modelList.innerHTML = '';

        if (provider && provider.models) {
            provider.models.forEach(model => {
                const item = document.createElement('div');
                item.className = 'model-item';
                item.innerHTML = `
                    <div class="model-item-info">
                        <span class="model-item-name">${KissaiUtils.escapeHtml(model.name)}</span>
                    </div>
                    <div class="model-item-actions">
                        <i data-lucide="star" class="${model.favorite ? 'active' : ''}" data-model-id="${model.id}" data-action="favorite"></i>
                        <i data-lucide="trash" data-model-id="${model.id}" data-action="delete"></i>
                    </div>
                `;
                DOM.modelList.appendChild(item);
            });
        }

        updateIcons();
    };

    /**
     * 渲染角色列表
     */
    const renderRoles = () => {
        if (!DOM.roleList) return;

        DOM.roleList.innerHTML = '';

        configData.roles.forEach(role => {
            const item = document.createElement('div');
            item.className = 'role-item';
            const isEditing = editingRoleId === role.id;

            // 创建 header
            const header = document.createElement('div');
            header.className = 'role-item-header';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'role-item-name';
            nameSpan.textContent = role.name;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'model-item-actions';

            const editIcon = document.createElement('i');
            editIcon.setAttribute('data-lucide', 'pencil');
            editIcon.dataset.roleId = role.id;
            editIcon.dataset.action = 'edit';

            const deleteIcon = document.createElement('i');
            deleteIcon.setAttribute('data-lucide', 'trash');
            deleteIcon.dataset.roleId = role.id;
            deleteIcon.dataset.action = 'delete';

            actionsDiv.appendChild(editIcon);
            actionsDiv.appendChild(deleteIcon);
            header.appendChild(nameSpan);
            header.appendChild(actionsDiv);

            // 创建 prompt
            const promptDiv = document.createElement('div');
            promptDiv.className = 'role-item-prompt';
            if (!isEditing) {
                promptDiv.style.fontSize = '11px';
            }
            promptDiv.textContent = role.prompt;

            item.appendChild(header);
            item.appendChild(promptDiv);
            DOM.roleList.appendChild(item);
        });

        updateIcons();
    };

    /**
     * 渲染模型下拉菜单
     */
    const renderModelDropdown = () => {
        if (!DOM.modelDropdown) return;

        DOM.modelDropdown.innerHTML = '';
        KissaiUtils.preventScrollPropagation(DOM.modelDropdown);

        const hasProviders = Object.keys(configData.providers).length > 0;
        let hasAnyEnabledModels = false;

        Object.values(configData.providers).forEach(p => {
            const enabledModels = (p.models || []).filter(m => m.enabled !== false);
            if (enabledModels.length > 0) hasAnyEnabledModels = true;
        });

        if (!hasProviders) {
            DOM.modelDropdown.innerHTML = `
                <div class="dropdown-section">
                    <div class="dropdown-section-title" style="color: var(--text-secondary); font-style: italic; padding: 12px 12px 4px 12px;">
                        ${t('model.noProviders')}
                    </div>
                </div>
            `;
            return;
        }

        if (!hasAnyEnabledModels) {
            DOM.modelDropdown.innerHTML = `
                <div class="dropdown-section">
                    <div class="dropdown-section-title" style="color: var(--text-secondary); font-style: italic; padding: 12px 12px 4px 12px;">
                        ${t('model.noEnabled')}
                    </div>
                </div>
            `;
            return;
        }

        // 收藏的模型
        const favorites = [];
        Object.entries(configData.providers).forEach(([providerKey, p]) => {
            (p.models || []).forEach(m => {
                if (m.favorite && m.enabled !== false) {
                    favorites.push({ ...m, providerKey });
                }
            });
        });

        if (favorites.length > 0) {
            const favSection = document.createElement('div');
            favSection.className = 'dropdown-section';
            favSection.innerHTML = `<div class="dropdown-section-title">${t('model.favorites')}</div>`;

            favorites.forEach(m => {
                favSection.appendChild(createDropdownItem(m, m.providerKey));
            });

            DOM.modelDropdown.appendChild(favSection);
        }

        // 按 Provider 分组
        Object.entries(configData.providers).forEach(([providerKey, provider]) => {
            const enabledModels = (provider.models || []).filter(m => m.enabled !== false && !m.favorite);
            if (enabledModels.length === 0) return;

            const section = document.createElement('div');
            section.className = 'dropdown-section';
            section.innerHTML = `<div class="dropdown-section-title">${KissaiUtils.escapeHtml(providerKey)}</div>`;

            enabledModels.forEach(m => {
                section.appendChild(createDropdownItem(m, providerKey));
            });

            DOM.modelDropdown.appendChild(section);
        });
    };

    /**
     * 创建下拉菜单项
     */
    const createDropdownItem = (model, providerKey) => {
        const info = getProviderDisplayInfo(providerKey);
        const currentModel = getCurrentModelName();

        const item = document.createElement('div');
        item.className = 'dropdown-item';
        if (model.name === currentModel) {
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
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${KissaiUtils.escapeHtml(model.name)}</span>
            </div>
        `;

        item.addEventListener('click', async () => {
            const previousModel = getCurrentModelName();
            const targetModelName = model.name.trim();

            setModelDisplay(targetModelName, providerKey);
            configData.general.lastUsedModel = targetModelName;
            saveToStorage();

            DOM.modelDropdown?.classList.remove('active');

            // 如果切换了模型且有之前的用户消息，自动重新生成
            if (previousModel && previousModel !== targetModelName) {
                const lastUserMessage = getLastUserMessage();
                if (lastUserMessage) {
                    if (KissaiAPI.isRequesting) {
                        KissaiAPI.abort();
                    }

                    try {
                        updateSendButtonState(true);
                        await handleSendMessage(
                            lastUserMessage.content,
                            targetModelName,
                            null,
                            lastUserMessage.images || []
                        );
                    } catch (error) {
                        if (error.name !== 'AbortError') {
                            addErrorMessage(error.message);
                        }
                    } finally {
                        updateSendButtonState(false);
                    }
                }
            }
        });

        return item;
    };

    /**
     * 更新发送按钮状态
     */
    const updateSendButtonState = (isRequesting) => {
        if (!DOM.sendBtn) return;

        if (isRequesting) {
            DOM.sendBtn.innerHTML = '<div class="stop-icon"></div>';
            DOM.sendBtn.classList.add('stop-mode');
            DOM.sendBtn.disabled = false;
        } else {
            DOM.sendBtn.innerHTML = '<i data-lucide="send"></i>';
            DOM.sendBtn.classList.remove('stop-mode');
            DOM.sendBtn.disabled = (DOM.chatInput?.value.trim() === '') && !DOM.chatInput?.dataset.pastedImage;
            updateIcons();
        }
    };

    // ========== 事件绑定 ==========

    // 侧边栏折叠
    DOM.sidebarHandle?.addEventListener('click', () => {
        DOM.sidebar?.classList.toggle('collapsed');
    });

    // 新建聊天
    DOM.newChatBtn?.addEventListener('click', createNewChat);

    // 搜索（带防抖）
    if (DOM.searchInput) {
        const debouncedSearch = KissaiUtils.debounce(() => {
            renderHistory();
        }, KISSAI_CONFIG.UI.SEARCH_DEBOUNCE_MS);

        DOM.searchInput.addEventListener('input', debouncedSearch);

        DOM.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                DOM.searchInput.value = '';
                renderHistory();
                DOM.searchInput.blur();
            }
        });
    }

    // 历史记录删除（事件委托）
    DOM.historyList?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('[data-chat-id]');
        if (deleteBtn) {
            e.stopPropagation();
            const chatId = parseFloat(deleteBtn.dataset.chatId);
            deleteHistory(chatId);
        }
    });

    // 输入框处理（带防抖）
    if (DOM.chatInput) {
        const debouncedInputHandler = KissaiUtils.debounce(() => {
            DOM.chatInput.style.height = 'auto';
            DOM.chatInput.style.height = Math.min(DOM.chatInput.scrollHeight, KISSAI_CONFIG.UI.MAX_INPUT_HEIGHT) + 'px';
        }, KISSAI_CONFIG.UI.INPUT_DEBOUNCE_MS);

        DOM.chatInput.addEventListener('input', () => {
            debouncedInputHandler();

            // 更新发送按钮状态
            DOM.sendBtn.disabled = DOM.chatInput.value.trim() === '' && !DOM.chatInput.dataset.pastedImage;

            // 检查角色是否仍在输入中
            const selectedRole = DOM.chatInput.dataset.selectedRole;
            if (selectedRole) {
                const roleExistsInInput = new RegExp(`@${KissaiUtils.escapeRegex(selectedRole)}(?:\\s|$)`).test(DOM.chatInput.value);
                if (!roleExistsInInput) {
                    delete DOM.chatInput.dataset.selectedRole;
                }
            }

            // 角色提及下拉
            handleRoleMention();
        });

        // 回车发送
        DOM.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!DOM.sendBtn.disabled && DOM.chatInput.value.trim()) {
                    DOM.sendBtn.click();
                }
            }
        });

        // 图片粘贴
        DOM.chatInput.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        DOM.chatInput.dataset.pastedImage = event.target.result;
                        DOM.sendBtn.disabled = false;
                        updatePasteIndicator();
                    };
                    reader.readAsDataURL(file);
                    break;
                }
            }
        });

        KissaiUtils.preventScrollPropagation(DOM.chatInput);
    }

    /**
     * 处理角色提及
     */
    const handleRoleMention = () => {
        const cursorPosition = DOM.chatInput.selectionStart;
        const textBeforeCursor = DOM.chatInput.value.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1 && (lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ' || textBeforeCursor[lastAtIndex - 1] === '\n')) {
            // 检查是否已选择角色
            const currentSelectedRole = DOM.chatInput.dataset.selectedRole;
            if (currentSelectedRole) {
                const selectedRoleText = '@' + currentSelectedRole + ' ';
                const roleStart = DOM.chatInput.value.indexOf(selectedRoleText);
                if (roleStart !== -1 && lastAtIndex >= roleStart && lastAtIndex < roleStart + selectedRoleText.length) {
                    DOM.roleMentionDropdown.style.display = 'none';
                    DOM.roleMentionDropdown.classList.remove('active');
                    return;
                }
            }

            const searchTerm = textBeforeCursor.substring(lastAtIndex + 1).toLowerCase();
            const roles = configData.roles || [];
            const filteredRoles = roles.filter(role => role.name.toLowerCase().includes(searchTerm));

            if (filteredRoles.length > 0) {
                DOM.roleMentionDropdown.innerHTML = filteredRoles.map(role => `
                    <div class="role-mention-item" data-name="${KissaiUtils.escapeHtml(role.name)}">
                        <div class="role-name">${KissaiUtils.escapeHtml(role.name)}</div>
                        <div class="role-preview">${KissaiUtils.escapeHtml(KissaiUtils.truncateText(role.prompt, 100))}</div>
                    </div>
                `).join('');

                DOM.roleMentionDropdown.style.display = 'flex';
                DOM.roleMentionDropdown.classList.add('active');
                KissaiUtils.preventScrollPropagation(DOM.roleMentionDropdown);
            } else {
                DOM.roleMentionDropdown.style.display = 'none';
                DOM.roleMentionDropdown.classList.remove('active');
            }
        } else {
            DOM.roleMentionDropdown.style.display = 'none';
            DOM.roleMentionDropdown.classList.remove('active');
        }
    };

    // 角色提及下拉点击
    DOM.roleMentionDropdown?.addEventListener('click', (e) => {
        const item = e.target.closest('.role-mention-item');
        if (!item) return;

        e.stopPropagation();
        const roleName = item.getAttribute('data-name');
        const cursorPosition = DOM.chatInput.selectionStart;
        const textBeforeCursor = DOM.chatInput.value.substring(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const textAfterCursor = DOM.chatInput.value.substring(cursorPosition);
            const selectedRoleText = '@' + roleName + ' ';
            DOM.chatInput.value = DOM.chatInput.value.substring(0, lastAtIndex) + selectedRoleText + textAfterCursor;

            const newCursorPosition = lastAtIndex + selectedRoleText.length;
            DOM.chatInput.selectionStart = DOM.chatInput.selectionEnd = newCursorPosition;
            DOM.chatInput.dataset.selectedRole = roleName;
        }

        DOM.chatInput.focus();
        DOM.roleMentionDropdown.style.display = 'none';
        DOM.roleMentionDropdown.classList.remove('active');
    });

    /**
     * 更新粘贴图片指示器
     */
    const updatePasteIndicator = () => {
        const existingIndicator = KissaiUtils.getElement('paste-image-indicator');

        if (DOM.chatInput.dataset.pastedImage) {
            if (!existingIndicator) {
                const indicator = document.createElement('div');
                indicator.id = 'paste-image-indicator';
                indicator.style.cssText = `position: relative; display: inline-block; width: ${KISSAI_CONFIG.UI.IMAGE_PREVIEW_SIZE}px; height: ${KISSAI_CONFIG.UI.IMAGE_PREVIEW_SIZE}px;`;
                indicator.innerHTML = `
                    <button id="clear-pasted-image" style="position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 50%; background: #ef4444; color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px; line-height: 1; padding: 0; z-index: 10;">×</button>
                    <img src="${DOM.chatInput.dataset.pastedImage}" style="width: ${KISSAI_CONFIG.UI.IMAGE_PREVIEW_SIZE}px; height: ${KISSAI_CONFIG.UI.IMAGE_PREVIEW_SIZE}px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.1);" />
                `;
                DOM.chatInput.parentNode.insertBefore(indicator, DOM.chatInput);

                KissaiUtils.getElement('clear-pasted-image')?.addEventListener('click', () => {
                    delete DOM.chatInput.dataset.pastedImage;
                    KissaiUtils.getElement('paste-image-indicator')?.remove();
                    DOM.sendBtn.disabled = DOM.chatInput.value.trim() === '';
                });
            } else {
                const img = existingIndicator.querySelector('img');
                if (img) img.src = DOM.chatInput.dataset.pastedImage;
            }
        } else {
            existingIndicator?.remove();
        }
    };

    // 发送按钮
    DOM.sendBtn?.addEventListener('click', async () => {
        if (KissaiAPI.isRequesting) {
            KissaiAPI.abort();
            updateSendButtonState(false);
            return;
        }

        const message = DOM.chatInput.value.trim();
        const pastedImage = DOM.chatInput.dataset.pastedImage;
        const images = pastedImage ? [pastedImage] : [];

        if (!message && images.length === 0) return;

        const currentModel = getCurrentModelName();
        if (!currentModel) {
            alert(t('alert.selectModel'));
            return;
        }

        try {
            updateSendButtonState(true);

            const currentRole = DOM.chatInput.dataset.selectedRole || null;

            // 保存角色到聊天
            if (activeChatId) {
                const chat = configData.history.find(c => c.id === activeChatId);
                if (chat) {
                    chat.activeRole = currentRole;
                    saveToStorage();
                }
            }

            // 添加用户消息
            addUserMessage(message, images);

            // 清空输入
            DOM.chatInput.value = '';
            DOM.chatInput.style.height = 'auto';
            delete DOM.chatInput.dataset.pastedImage;
            KissaiUtils.getElement('paste-image-indicator')?.remove();

            // 恢复角色前缀
            if (currentRole && isValidRole(currentRole)) {
                DOM.chatInput.value = `@${currentRole} `;
                DOM.chatInput.dataset.selectedRole = currentRole;
            } else {
                delete DOM.chatInput.dataset.selectedRole;
            }

            // 隐藏欢迎区域
            const welcomeSection = document.querySelector('.welcome-section');
            if (welcomeSection) welcomeSection.style.display = 'none';

            await handleSendMessage(message, currentModel, currentRole, images);

        } catch (error) {
            if (error.name !== 'AbortError') {
                addErrorMessage(error.message);
            }
        } finally {
            updateSendButtonState(false);
            DOM.chatInput?.focus();
        }
    });

    // 设置按钮
    DOM.settingsBtn?.addEventListener('click', () => {
        DOM.settingsView?.classList.add('active');
        renderGeneralSettings();
    });

    DOM.closeSettingsBtn?.addEventListener('click', () => {
        saveToStorage();
        DOM.settingsView?.classList.remove('active');
    });

    // 点击设置面板外部关闭
    document.addEventListener('click', (e) => {
        if (!DOM.settingsView?.classList.contains('active')) return;

        if (e.target === DOM.settingsView) {
            saveToStorage();
            DOM.settingsView.classList.remove('active');
            return;
        }

        if (DOM.sidebar?.contains(e.target) && !DOM.settingsBtn?.contains(e.target)) {
            saveToStorage();
            DOM.settingsView.classList.remove('active');
        }
    });

    // 模型选择器
    DOM.modelSelector?.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.contextLimitDropdown?.classList.remove('active');
        DOM.languageOptions?.classList.remove('active');
        DOM.modelDropdown?.classList.toggle('active');

        if (DOM.modelDropdown?.classList.contains('active')) {
            renderModelDropdown();
        }
    });

    // 全局点击关闭下拉菜单
    document.addEventListener('click', (event) => {
        DOM.modelDropdown?.classList.remove('active');
        DOM.languageOptions?.classList.remove('active');
        DOM.contextLimitDropdown?.classList.remove('active');

        if (!event.target.closest('#role-mention-dropdown') && !event.target.closest('#chat-input')) {
            DOM.roleMentionDropdown.style.display = 'none';
            DOM.roleMentionDropdown?.classList.remove('active');
        }

        // 模型选择弹窗
        const modal = KissaiUtils.getElement('model-modal');
        if (modal?.classList.contains('active') && event.target === modal) {
            closeModelModal();
        }
    });



    // ========== 主题切换 ==========

    DOM.themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.getAttribute('data-theme');
            configData.general.theme = theme;

            DOM.themeBtns.forEach(b => b.classList.remove('active'));
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

    // 侧边栏主题切换按钮
    const sidebarThemeBtn = KissaiUtils.getElement('theme-toggle-btn');
    if (sidebarThemeBtn) {
        const updateThemeIcon = () => {
            const isDark = document.body.classList.contains('dark-mode');
            sidebarThemeBtn.innerHTML = `<i data-lucide="${isDark ? 'moon' : 'sun'}"></i>`;
            updateIcons();
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

    // ========== 语言切换 ==========

    DOM.languageSelect?.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.languageOptions?.classList.toggle('active');
    });

    DOM.languageOptions?.querySelectorAll('.select-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const val = opt.getAttribute('data-value');
            configData.general.language = val;
            window.configData = configData;

            DOM.currentLanguageSpan.textContent = opt.textContent;
            DOM.languageOptions.querySelectorAll('.select-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');

            // 更新默认系统提示词
            const currentPrompt = configData.general.systemPrompt;
            const zhDefault = translations.zh['systemPrompt.default'];
            const enDefault = translations.en['systemPrompt.default'];
            const isEmpty = !currentPrompt || !currentPrompt.trim();
            const isDefaultPrompt = isEmpty || currentPrompt === zhDefault || currentPrompt === enDefault;

            if (isDefaultPrompt) {
                const newPrompt = t('systemPrompt.default');
                configData.general.systemPrompt = newPrompt;
                const promptTextarea = KissaiUtils.getElement('global-system-prompt');
                if (promptTextarea) {
                    promptTextarea.value = newPrompt;
                }
            }

            saveToStorage();
            DOM.languageOptions.classList.remove('active');

            // 更新所有文本
            updateAllText();
            renderHistory();
            renderModelDropdown();

            if (DOM.settingsView?.classList.contains('active')) {
                renderGeneralSettings();
            }
        });
    });

    // ========== 宽屏模式 ==========

    DOM.wideModeCheckbox?.addEventListener('change', () => {
        configData.general.wideMode = DOM.wideModeCheckbox.checked;
        updateChatLayout();
        saveToStorage();
    });

    // ========== 上下文限制 ==========

    if (DOM.contextCountDisplay) {
        DOM.contextCountDisplay.textContent = configData.general.contextLimit || KISSAI_CONFIG.STORAGE.DEFAULT_CONTEXT_LIMIT;
    }

    DOM.contextControlBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.modelDropdown?.classList.remove('active');
        DOM.languageOptions?.classList.remove('active');
        DOM.contextLimitDropdown?.classList.toggle('active');

        if (DOM.contextLimitDropdown?.classList.contains('active')) {
            KissaiUtils.preventScrollPropagation(DOM.contextLimitDropdown);
        }
    });

    DOM.contextLimitDropdown?.querySelectorAll('.context-limit-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const limit = parseInt(option.getAttribute('data-value'));
            if (!isNaN(limit)) {
                configData.general.contextLimit = limit;
                saveToStorage();
                if (DOM.contextCountDisplay) {
                    DOM.contextCountDisplay.textContent = limit;
                }
                DOM.contextLimitDropdown.classList.remove('active');
            }
        });
    });

    // ========== Provider 管理 ==========

    // 设置侧边栏点击（事件委托）
    const settingsSidebar = document.querySelector('.settings-sidebar');
    settingsSidebar?.addEventListener('click', (e) => {
        // 先检查操作按钮（优先级更高）
        const copyBtn = e.target.closest('.provider-copy-btn');
        if (copyBtn) {
            e.stopPropagation();
            copyProvider(copyBtn.dataset.provider);
            return; // 阻止后续处理
        }

        const deleteBtn = e.target.closest('.provider-delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            deleteProvider(deleteBtn.dataset.provider);
            return; // 阻止后续处理
        }

        // 然后处理导航项点击
        const item = e.target.closest('.settings-nav-item');
        if (item) {
            const tabId = item.getAttribute('data-tab');
            switchTab(tabId, item);
        }
    });

    /**
     * 切换设置标签页
     */
    const switchTab = (tabId, element) => {
        if (!tabId) return;

        if (tabId === 'providers-toggle') {
            DOM.providersHeader?.classList.toggle('collapsed');
            DOM.providersListContainer?.classList.toggle('collapsed');
            return;
        }

        document.querySelectorAll('.settings-nav-item').forEach(nav => nav.classList.remove('active'));
        if (element) {
            element.classList.add('active');
        } else {
            const targetNav = document.querySelector(`.settings-nav-item[data-tab="${tabId}"]`);
            targetNav?.classList.add('active');
        }

        document.querySelectorAll('.settings-content').forEach(content => content.classList.remove('active'));

        if (tabId.startsWith('provider-')) {
            saveToStorage();
            currentProviderKey = element.getAttribute('data-key');
            DOM.providerNameDisplay.textContent = currentProviderKey;
            DOM.apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
            DOM.baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
            KissaiUtils.getElement('provider-settings')?.classList.add('active');
            renderModels();
        } else if (tabId === 'provider') {
            KissaiUtils.getElement('provider-settings')?.classList.add('active');

            let newCount = 1;
            while (configData.providers[`New Provider ${newCount}`]) newCount++;
            const newName = `New Provider ${newCount}`;

            configData.providers[newName] = { apiKey: '', baseUrl: '', models: [] };
            currentProviderKey = newName;
            DOM.providerNameDisplay.textContent = currentProviderKey;
            DOM.apiKeyInput.value = '';
            DOM.baseUrlInput.value = '';
            DOM.modelList.innerHTML = '';

            renderProviderList();
            setTimeout(() => DOM.editProviderBtn?.click(), 10);
        } else {
            const contentId = `${tabId}-settings`;
            const content = KissaiUtils.getElement(contentId);
            if (content) {
                content.classList.add('active');
                if (tabId === 'general') renderGeneralSettings();
                if (tabId === 'role-presets') {
                    if (!configData.roles || configData.roles.length === 0) {
                        configData.roles = KissaiUtils.deepClone(DEFAULT_ROLES);
                    }
                    renderRoles();
                }
            }
        }

        updateIcons();
    };

    /**
     * 复制 Provider
     */
    const copyProvider = (providerKey) => {
        const provider = configData.providers[providerKey];
        if (!provider) return;

        let newName = `${providerKey} copy`;
        let counter = 1;
        while (configData.providers[newName]) {
            newName = `${providerKey} copy ${counter}`;
            counter++;
        }

        configData.providers[newName] = KissaiUtils.deepClone(provider);
        currentProviderKey = newName;
        renderProviderList();
        saveToStorage();

        const item = document.querySelector(`.settings-nav-item[data-key="${newName}"]`);
        if (item) switchTab(`provider-${newName.toLowerCase()}`, item);
    };

    window.copyProvider = copyProvider;

    /**
     * 删除 Provider
     */
    const deleteProvider = (providerKey) => {
        if (currentProviderKey === providerKey) {
            const remainingProviders = Object.keys(configData.providers).filter(p => p !== providerKey);
            if (remainingProviders.length > 0) {
                currentProviderKey = remainingProviders[0];
                DOM.providerNameDisplay.textContent = currentProviderKey;
                DOM.apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
                DOM.baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
                renderModels();
            } else {
                currentProviderKey = null;
                DOM.providerNameDisplay.textContent = t('model.notProvider');
                DOM.apiKeyInput.value = '';
                DOM.baseUrlInput.value = '';
                DOM.modelList.innerHTML = '';
            }
        }

        delete configData.providers[providerKey];
        renderProviderList();
        saveToStorage();
        updateIcons();
    };

    window.deleteProvider = deleteProvider;

    // Provider 名称编辑
    DOM.editProviderBtn?.addEventListener('click', () => {
        originalProviderName = DOM.providerNameDisplay.textContent;
        DOM.providerNameDisplay.contentEditable = 'true';
        DOM.providerNameDisplay.focus();

        const range = document.createRange();
        range.selectNodeContents(DOM.providerNameDisplay);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        DOM.editProviderBtn.classList.add('hidden');
        DOM.saveProviderBtn?.classList.remove('hidden');
        DOM.cancelProviderBtn?.classList.remove('hidden');
    });

    const exitTitleEdit = () => {
        DOM.providerNameDisplay.contentEditable = 'false';
        DOM.editProviderBtn?.classList.remove('hidden');
        DOM.saveProviderBtn?.classList.add('hidden');
        DOM.cancelProviderBtn?.classList.add('hidden');
    };

    DOM.saveProviderBtn?.addEventListener('click', () => {
        const newName = DOM.providerNameDisplay.textContent.trim();
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

    DOM.cancelProviderBtn?.addEventListener('click', () => {
        DOM.providerNameDisplay.textContent = originalProviderName;
        exitTitleEdit();
    });

    // API Key 显示/隐藏
    const toggleApiKeyBtn = document.querySelector('.action-icons .icon-btn:first-child');
    toggleApiKeyBtn?.addEventListener('click', () => {
        const isPassword = DOM.apiKeyInput.type === 'password';
        DOM.apiKeyInput.type = isPassword ? 'text' : 'password';
        toggleApiKeyBtn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}"></i>`;
        updateIcons();
    });

    // API Key 复制
    const copyApiKeyBtn = document.querySelector('.action-icons .icon-btn:last-child');
    copyApiKeyBtn?.addEventListener('click', async () => {
        await KissaiUtils.copyToClipboard(DOM.apiKeyInput.value);
        copyApiKeyBtn.innerHTML = '<i data-lucide="check"></i>';
        updateIcons();
        setTimeout(() => updateIcons(), KISSAI_CONFIG.UI.COPY_FEEDBACK_MS);
    });


    // ========== 模型管理 ==========

    // 模型列表操作（事件委托）
    DOM.modelList?.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const modelId = parseFloat(target.dataset.modelId);

        if (action === 'favorite') {
            toggleFavorite(modelId);
        } else if (action === 'delete') {
            deleteModel(modelId);
        }
    });

    const toggleFavorite = (id) => {
        const provider = configData.providers[currentProviderKey];
        const model = provider?.models?.find(m => m.id === id);
        if (model) {
            model.favorite = !model.favorite;
            saveToStorage();
            renderModels();
        }
    };

    window.toggleFavorite = toggleFavorite;

    const deleteModel = (id) => {
        if (configData.providers[currentProviderKey]) {
            configData.providers[currentProviderKey].models =
                configData.providers[currentProviderKey].models.filter(m => m.id !== id);
            renderModels();
            saveToStorage();
        }
    };

    window.deleteModel = deleteModel;

    // 手动添加模型
    window.toggleAddModelForm = () => {
        const form = KissaiUtils.getElement('add-model-form');
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        if (form.style.display === 'block') {
            KissaiUtils.getElement('new-model-name')?.focus();
        }
    };

    window.addModel = () => {
        const modelNameInput = KissaiUtils.getElement('new-model-name');
        const modelName = modelNameInput?.value.trim();
        if (!modelName) return;

        const provider = configData.providers[currentProviderKey];
        if (!provider) return;

        if (provider.models?.find(m => m.name === modelName)) {
            alert(t('alert.modelExists'));
            return;
        }

        const newModel = {
            id: KissaiUtils.generateId(),
            name: modelName,
            favorite: false,
            enabled: true
        };

        if (!provider.models) provider.models = [];
        provider.models.push(newModel);

        saveToStorage();
        renderModels();
        modelNameInput.value = '';
        KissaiUtils.getElement('add-model-form').style.display = 'none';
    };

    const newModelNameInput = KissaiUtils.getElement('new-model-name');
    newModelNameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addModel();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            toggleAddModelForm();
        }
    });

    KissaiUtils.getElement('add-model-btn')?.addEventListener('click', toggleAddModelForm);

    // 获取模型列表
    DOM.fetchModelsBtn?.addEventListener('click', async () => {
        const icon = DOM.fetchModelsBtn.querySelector('i') || DOM.fetchModelsBtn.querySelector('svg');
        const apiKey = DOM.apiKeyInput?.value;
        const baseUrl = DOM.baseUrlInput?.value;

        if (!apiKey) return;

        icon?.classList.add('spinning');
        DOM.fetchModelsBtn.classList.add('loading');
        DOM.fetchModelsBtn.disabled = true;

        try {
            const models = await KissaiAPI.fetchModels(apiKey, baseUrl);
            showModelModal(models);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.error(t('error.requestTimeout'));
            } else {
                console.error(t('error.fetchFailed') + error.message);
                alert(t('alert.fetchFailed'));
            }
        } finally {
            const iconAfter = DOM.fetchModelsBtn.querySelector('i') || DOM.fetchModelsBtn.querySelector('svg');
            iconAfter?.classList.remove('spinning');
            DOM.fetchModelsBtn.classList.remove('loading');
            DOM.fetchModelsBtn.disabled = false;
        }
    });

    // 模型选择弹窗
    const showModelModal = (fetchedModels) => {
        const modal = KissaiUtils.getElement('model-modal');
        const selectionList = KissaiUtils.getElement('model-selection-list');
        const searchInput = KissaiUtils.getElement('modal-model-search-input');

        if (!modal) return;

        if (searchInput) searchInput.value = '';
        selectionList.innerHTML = '';

        window.allFetchedModels = fetchedModels;
        const existingModels = configData.providers[currentProviderKey]?.models || [];

        fetchedModels.forEach(model => {
            const isSelected = existingModels.some(m => m.name === model.name);

            const item = document.createElement('div');
            item.className = 'model-selection-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `model-${model.id}`;
            checkbox.checked = isSelected;
            checkbox.dataset.modelName = model.name;

            checkbox.addEventListener('change', saveModelSelection);

            const label = document.createElement('label');
            label.htmlFor = `model-${model.id}`;
            label.textContent = model.name;

            item.appendChild(checkbox);
            item.appendChild(label);
            selectionList.appendChild(item);
        });

        modal.classList.add('active');
        updateIcons();
    };

    window.showModelModal = showModelModal;

    const closeModelModal = () => {
        KissaiUtils.getElement('model-modal')?.classList.remove('active');
    };

    window.closeModelModal = closeModelModal;

    // 模型搜索
    const modalModelSearchInput = KissaiUtils.getElement('modal-model-search-input');
    modalModelSearchInput?.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        document.querySelectorAll('#model-selection-list .model-selection-item').forEach(item => {
            const modelName = item.querySelector('label').textContent.toLowerCase();
            item.style.display = modelName.includes(searchTerm) ? 'flex' : 'none';
        });
    });

    modalModelSearchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modalModelSearchInput.value = '';
            modalModelSearchInput.dispatchEvent(new Event('input'));
            modalModelSearchInput.blur();
        }
    });

    const saveModelSelection = () => {
        const allCheckboxes = document.querySelectorAll('#model-selection-list input[type="checkbox"]');
        const checkedModelNames = Array.from(allCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.modelName);

        const existingModels = configData.providers[currentProviderKey]?.models || [];

        const finalModels = checkedModelNames.map(name => {
            const existing = existingModels.find(m => m.name === name);
            if (existing) {
                return { ...existing };
            }
            return {
                id: KissaiUtils.generateId(),
                name,
                favorite: false
            };
        });

        configData.providers[currentProviderKey].models = finalModels;
        saveToStorage();
        renderModels();
    };

    window.saveModelSelection = saveModelSelection;

    // ========== 角色管理 ==========

    // 角色列表操作（事件委托）
    DOM.roleList?.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const roleId = parseFloat(target.dataset.roleId);

        if (action === 'edit') {
            editRole(roleId);
        } else if (action === 'delete') {
            deleteRole(roleId);
        }
    });

    window.toggleForm = (id) => {
        const form = KissaiUtils.getElement(id);
        form?.classList.toggle('active');

        const actions = KissaiUtils.getElement('edit-role-actions');
        const promptTextarea = KissaiUtils.getElement('new-role-prompt');

        if (form?.classList.contains('active')) {
            editingRoleId = null;
            actions?.classList.remove('hidden');
            if (promptTextarea) promptTextarea.style.minHeight = '200px';
        } else {
            editingRoleId = null;
            actions?.classList.add('hidden');
            KissaiUtils.getElement('new-role-name').value = '';
            if (promptTextarea) {
                promptTextarea.value = '';
                promptTextarea.style.minHeight = '';
            }
        }
    };

    window.saveRole = () => {
        const nameInput = KissaiUtils.getElement('new-role-name');
        const promptInput = KissaiUtils.getElement('new-role-prompt');

        if (!nameInput?.value.trim()) return;

        if (editingRoleId) {
            const role = configData.roles.find(r => r.id === editingRoleId);
            if (role) {
                role.name = nameInput.value.trim();
                role.prompt = promptInput.value;
            }
            editingRoleId = null;
        } else {
            configData.roles.push({
                id: KissaiUtils.generateId(),
                name: nameInput.value.trim(),
                prompt: promptInput.value
            });
        }

        renderRoles();
        nameInput.value = '';
        promptInput.value = '';
        KissaiUtils.getElement('add-role-form')?.classList.remove('active');
        KissaiUtils.getElement('edit-role-actions')?.classList.add('hidden');
        KissaiUtils.getElement('new-role-prompt').style.minHeight = '';
        saveToStorage();
    };

    const editRole = (id) => {
        const role = configData.roles.find(r => r.id === id);
        if (role) {
            editingRoleId = id;
            KissaiUtils.getElement('new-role-name').value = role.name;
            KissaiUtils.getElement('new-role-prompt').value = role.prompt;
            KissaiUtils.getElement('add-role-form')?.classList.add('active');
            KissaiUtils.getElement('edit-role-actions')?.classList.remove('hidden');
            KissaiUtils.getElement('new-role-prompt').style.minHeight = '200px';
        }
    };

    window.editRole = editRole;

    const deleteRole = (id) => {
        const roleToDelete = configData.roles.find(r => r.id === id);
        if (roleToDelete) {
            // 清除使用该角色的聊天
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
                DOM.chatInput.value = '';
                delete DOM.chatInput.dataset.selectedRole;
            }
        }
    };

    window.deleteRole = deleteRole;

    // ========== 数据导入导出 ==========

    DOM.exportClipboardBtn?.addEventListener('click', async () => {
        saveToStorage();
        const exportData = KissaiStorage.exportConfig();
        const success = await KissaiUtils.copyToClipboard(JSON.stringify(exportData, null, 2));

        if (success) {
            const span = DOM.exportClipboardBtn.querySelector('span');
            const originalText = span?.textContent;
            DOM.exportClipboardBtn.classList.add('copied');
            if (span) span.textContent = t('code.copySuccess');

            setTimeout(() => {
                DOM.exportClipboardBtn.classList.remove('copied');
                if (span) span.textContent = originalText;
            }, 800);
        }
    });

    DOM.importClipboardBtn?.addEventListener('click', async () => {
        try {
            const text = await KissaiUtils.readFromClipboard();
            if (!text.trim()) return;

            const importedData = JSON.parse(text);
            if (importedData?.general && importedData?.providers) {
                if (confirm(t('alert.importConfirm'))) {
                    KissaiStorage.importConfig(importedData);
                    location.reload();
                }
            }
        } catch (err) {
            console.error(t('alert.importFailed') + err.message);
        }
    });

    DOM.exportFileBtn?.addEventListener('click', () => {
        saveToStorage();
        const exportData = KissaiStorage.exportConfig();
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `kissai-full-config-${KissaiUtils.formatTimestamp(Date.now())}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // 文件导入
    const importFileBtn = KissaiUtils.getElement('import-file-btn');
    const importFileInput = KissaiUtils.getElement('import-file-input');

    importFileBtn?.addEventListener('click', () => importFileInput?.click());

    importFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData?.general && importedData?.providers) {
                    KissaiStorage.importConfig(importedData);
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

    // 重置系统提示词
    DOM.resetPromptBtn?.addEventListener('click', () => {
        const defaultPrompt = t('systemPrompt.default');
        KissaiUtils.getElement('global-system-prompt').value = defaultPrompt;
        configData.general.systemPrompt = defaultPrompt;
        saveToStorage();
    });

    // 清空当前对话
    DOM.clearChatBtn?.addEventListener('dblclick', () => {
        if (activeChatId) {
            const chat = configData.history.find(c => c.id === activeChatId);
            if (chat) {
                chat.messages = [];
                saveToStorage();
                loadChat(activeChatId);
            }
        }
    });

    // 清空所有历史
    DOM.clearHistoryBtn?.addEventListener('dblclick', () => {
        configData.history = [];
        activeChatId = null;
        saveToStorage();
        createNewChat();
        renderHistory();
    });


    // ========== 滚动条标记 ==========

    let aiMessageElements = [];

    DOM.scrollbarTopZone?.addEventListener('click', () => {
        DOM.chatMessages?.scrollTo({ top: 0, behavior: 'auto' });
    });

    const updateScrollbarMarkers = () => {
        if (!DOM.chatMessages || !DOM.scrollbarMarkers) return;

        DOM.scrollbarMarkers.innerHTML = '';
        aiMessageElements = Array.from(DOM.chatMessages.querySelectorAll('.message.assistant'));

        if (aiMessageElements.length === 0) return;

        const containerHeight = 320; // 与 CSS 中 .scrollbar-markers 高度一致
        const padding = 16; // 上下 padding
        const maxSpacing = 40; // 刻度之间最大间距
        const availableHeight = containerHeight - padding * 2;

        // 计算实际需要的高度
        const idealHeight = (aiMessageElements.length - 1) * maxSpacing;
        const actualHeight = Math.min(idealHeight, availableHeight);

        // 计算起始位置（居中）
        const startOffset = padding + (availableHeight - actualHeight) / 2;

        aiMessageElements.forEach((_, index) => {
            const marker = document.createElement('div');
            marker.className = 'scrollbar-marker';
            marker.dataset.index = index;

            let topPosition = startOffset;
            if (aiMessageElements.length > 1) {
                topPosition = startOffset + (index / (aiMessageElements.length - 1)) * actualHeight;
            }

            marker.style.top = `${topPosition}px`;
            DOM.scrollbarMarkers.appendChild(marker);
        });

        DOM.scrollbarMarkers.onclick = (e) => {
            e.stopPropagation();
            const marker = e.target.closest('.scrollbar-marker');
            if (marker) {
                const targetIndex = parseInt(marker.dataset.index);
                const targetMessage = aiMessageElements[targetIndex];

                if (targetMessage) {
                    // 将消息滚动到屏幕中央
                    const messageTop = targetMessage.offsetTop;
                    const containerHeight = DOM.chatMessages.clientHeight;
                    const scrollPosition = messageTop - (containerHeight / 2);

                    DOM.chatMessages.scrollTo({
                        top: Math.max(0, scrollPosition),
                        behavior: 'auto' // 改为 auto 加快速度
                    });

                    highlightActiveMarker(targetIndex);
                }
            }
        };

        updateActiveMarker();
    };

    const highlightActiveMarker = (targetIndex) => {
        const markers = DOM.scrollbarMarkers?.children;
        if (!markers) return;

        Array.from(markers).forEach((marker, index) => {
            marker.classList.toggle('active', index === targetIndex);
        });
    };

    const updateActiveMarker = () => {
        if (!DOM.chatMessages || aiMessageElements.length === 0) return;

        const containerTop = DOM.chatMessages.scrollTop;
        const containerHeight = DOM.chatMessages.clientHeight;
        const readFocus = containerTop + (containerHeight / 2);

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
    };

    // 滚动事件（节流）
    if (DOM.chatMessages) {
        let scrollTimeout;
        DOM.chatMessages.addEventListener('scroll', () => {
            if (!scrollTimeout) {
                scrollTimeout = requestAnimationFrame(() => {
                    updateActiveMarker();
                    scrollTimeout = null;
                });
            }
        });

        // 监听消息变化（防抖，避免流式输出时频繁更新）
        const observer = new MutationObserver(KissaiUtils.debounce(() => {
            updateScrollbarMarkers();
        }, 300));

        observer.observe(DOM.chatMessages, { childList: true, subtree: true });
        setTimeout(updateScrollbarMarkers, 500);
    }

    // 聊天区域滚轮穿透
    DOM.chatView?.addEventListener('wheel', e => {
        if (!e.target.closest('#chat-messages')) {
            DOM.chatMessages?.scrollBy(0, e.deltaY);
        }
    });

    // ========== 初始化完成 ==========

    // 初始化 Provider
    if (configData.providers[currentProviderKey]) {
        DOM.apiKeyInput.value = configData.providers[currentProviderKey].apiKey || '';
        DOM.baseUrlInput.value = configData.providers[currentProviderKey].baseUrl || '';
    }

    // 渲染初始界面
    setDefaultModel();
    renderProviderList();
    renderModels();
    renderGeneralSettings();
    renderHistory();
    updateChatLayout();

    // 加载上次的聊天或创建新聊天
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
    updateAllText();

    // 完成加载
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
});
