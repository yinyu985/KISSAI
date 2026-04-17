/**
 * KISSAI API Module
 * API 请求和流式响应处理
 */

const KissaiAPI = {
    /**
     * 当前请求的 AbortController
     * @private
     */
    _abortController: null,

    /**
     * 是否正在请求中
     */
    isRequesting: false,

    /**
     * Markdown 流式处理器实例
     * @private
     */
    _streamProcessor: new MarkdownStreamProcessor(),

    /**
     * 获取模型对应的 Provider
     * @param {string} modelName
     * @returns {Object|null} { providerKey, provider }
     */
    findProviderByModel(modelName) {
        const config = KissaiStorage.getConfig();
        for (const [providerKey, provider] of Object.entries(config.providers)) {
            if (provider.models && provider.models.some(m => m.name === modelName)) {
                return { providerKey, provider };
            }
        }
        return null;
    },

    /**
     * 发送消息到 API
     * @param {Object} options
     * @param {string} options.message - 用户消息
     * @param {string} options.modelName - 模型名称
     * @param {string} options.providerKey - Provider 键名
     * @param {string|null} options.currentRole - 当前角色名
     * @param {Array} options.images - 图片数组
     * @param {Function} options.onChunk - 收到数据块回调
     * @param {Function} options.onThinking - 收到思考内容回调
     * @param {Function} options.onDone - 完成回调
     * @param {Function} options.onError - 错误回调
     * @returns {Promise<string|null>} 完整响应内容
     */
    async sendMessage(options) {
        const {
            message,
            modelName,
            providerKey,
            currentRole,
            images = [],
            onChunk,
            onThinking,
            onDone,
            onError
        } = options;

        const config = KissaiStorage.getConfig();

        // 查找 Provider
        let provider = null;
        if (providerKey && config.providers[providerKey]) {
            provider = config.providers[providerKey];
        } else {
            const found = this.findProviderByModel(modelName);
            if (found) {
                provider = found.provider;
            }
        }

        if (!provider) {
            const error = new Error(t('error.providerNotFound', { modelName }));
            onError?.(error);
            return null; // 不再 throw，避免重复错误处理
        }

        if (!provider.apiKey) {
            const error = new Error(t('error.apiKeyNotConfigured'));
            onError?.(error);
            return null; // 不再 throw，避免重复错误处理
        }

        // 构建消息数组
        const messages = this._buildMessages({
            message,
            currentRole,
            images,
            config
        });

        // 创建 AbortController
        this._abortController = new AbortController();
        this.isRequesting = true;

        const baseUrl = KissaiUtils.normalizeBaseUrl(provider.baseUrl);
        let fullContent = '';
        let thinkingContent = '';
        let lastRenderTime = 0;
        let renderFrameId = null;
        let pendingRender = false;

        const { STREAM_RENDER_INTERVAL_MS, MIN_CHUNK_SIZE } = KISSAI_CONFIG.API;

        // 渲染函数（带节流）
        const renderUI = (force = false) => {
            if (renderFrameId && !force) {
                pendingRender = true;
                return;
            }

            const now = Date.now();
            if (!force && now - lastRenderTime < STREAM_RENDER_INTERVAL_MS &&
                fullContent.length < MIN_CHUNK_SIZE) {
                return;
            }

            renderFrameId = requestAnimationFrame(() => {
                onChunk?.(fullContent, thinkingContent);
                lastRenderTime = Date.now();
                renderFrameId = null;

                if (pendingRender) {
                    pendingRender = false;
                    renderUI();
                }
            });
        };

        try {
            // 设置超时
            const timeoutId = setTimeout(() => {
                this._abortController?.abort();
            }, KISSAI_CONFIG.API.REQUEST_TIMEOUT_MS);

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
                signal: this._abortController.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || `HTTP ${response.status} ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            // 流式读取
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

                                // 处理内容
                                if (delta.delta && delta.delta.content) {
                                    fullContent += delta.delta.content;
                                    renderUI();
                                }

                                // 处理思考内容
                                const reasoningContent =
                                    delta.delta?.reasoning_content ||
                                    delta.delta?.reasoning ||
                                    delta.reasoning_content ||
                                    delta.reasoning || '';

                                if (reasoningContent) {
                                    thinkingContent += reasoningContent;
                                    onThinking?.(thinkingContent);
                                    renderUI(true);
                                }
                            }
                        } catch (e) {
                            // JSON 解析失败，忽略
                        }
                    }
                }
            }

            reader.releaseLock();

            // 取消待处理的渲染
            if (renderFrameId) {
                cancelAnimationFrame(renderFrameId);
            }

            // 完成回调
            onDone?.(fullContent, thinkingContent);

            return fullContent;

        } catch (error) {
            if (renderFrameId) {
                cancelAnimationFrame(renderFrameId);
            }

            if (error.name === 'AbortError') {
                // 用户取消，如果有内容则返回
                if (fullContent) {
                    onDone?.(fullContent, thinkingContent);
                    return fullContent;
                }
                return null;
            }

            console.error('API Request Failed:', error);
            onError?.(error);
            return null; // 不再 throw，避免重复错误处理

        } finally {
            this.isRequesting = false;
            this._abortController = null;
        }
    },

    /**
     * 构建消息数组
     * @private
     */
    _buildMessages({ message, currentRole, images, config }) {
        const messages = [];

        // 系统提示词
        const systemPrompt = config.general.systemPrompt;
        if (systemPrompt && systemPrompt.trim()) {
            messages.push({ role: 'system', content: systemPrompt.trim() });
        }

        // 角色预设
        let processedMessage = message;
        if (currentRole && this._isValidRole(currentRole, config)) {
            const role = config.roles.find(r => r.name === currentRole);
            if (role && role.prompt) {
                messages.push({
                    role: 'system',
                    content: `${t('role.prefix')}${role.name}\n${role.prompt}`
                });
                processedMessage = processedMessage.replace(`@${currentRole}`, '').trim();
            }
        }

        // 历史消息
        const activeChatId = config.general.activeChatId;
        if (activeChatId) {
            const chat = config.history.find(c => c.id === activeChatId);
            if (chat && chat.messages) {
                const limit = config.general.contextLimit || KISSAI_CONFIG.STORAGE.DEFAULT_CONTEXT_LIMIT;
                let messagesToSend = chat.messages.slice(-limit);

                // 避免重复最后一条用户消息
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
                            ...msgImages.map(img => ({
                                type: 'image_url',
                                image_url: { url: img }
                            }))
                        ];
                    } else {
                        msgContent.content = msg.content;
                    }
                    messages.push(msgContent);
                });
            }
        }

        // 当前用户消息
        if (processedMessage.trim() || images.length > 0) {
            const userMsg = {
                role: 'user',
                content: processedMessage.trim() || t('ocr.prompt')
            };

            if (images.length > 0) {
                userMsg.content = [
                    { type: 'text', text: processedMessage.trim() || t('ocr.prompt') },
                    ...images.map(img => ({
                        type: 'image_url',
                        image_url: { url: img }
                    }))
                ];
            }
            messages.push(userMsg);
        }

        // 角色提醒（每隔几轮）
        if (currentRole && this._isValidRole(currentRole, config)) {
            const role = config.roles.find(r => r.name === currentRole);
            if (role && role.prompt) {
                const userMsgCount = messages.filter(m => m.role === 'user').length;
                const assistantMsgCount = messages.filter(m => m.role === 'assistant').length;
                const totalMsgCount = userMsgCount + assistantMsgCount;

                if (totalMsgCount > 0 &&
                    totalMsgCount % KISSAI_CONFIG.STORAGE.ROLE_REMINDER_INTERVAL === 0) {
                    messages.push({
                        role: 'system',
                        content: `${t('role.prefix')}${role.name}\n${role.prompt}`
                    });
                }
            }
        }

        return messages;
    },

    /**
     * 验证角色是否有效
     * @private
     */
    _isValidRole(roleName, config) {
        if (!roleName || !config.roles) return false;
        return config.roles.some(role => role.name === roleName);
    },

    /**
     * 取消当前请求
     */
    abort() {
        if (this._abortController) {
            this._abortController.abort();
        }
    },

    /**
     * 获取模型列表
     * @param {string} apiKey
     * @param {string} baseUrl
     * @returns {Promise<Array>}
     */
    async fetchModels(apiKey, baseUrl) {
        const cleanBaseUrl = KissaiUtils.normalizeBaseUrl(baseUrl);

        const response = await fetch(`${cleanBaseUrl}/models`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(KISSAI_CONFIG.API.FETCH_MODELS_TIMEOUT_MS)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data.map(m => ({
            id: m.id,
            name: m.id,
            selected: false
        }));
    }
};

// 导出到全局
window.KissaiAPI = KissaiAPI;
