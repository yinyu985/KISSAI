/**
 * KISSAI Internationalization (i18n) Module
 * Supports multiple languages for the KISSAI web interface
 */

const translations = {
    zh: {
        // App metadata
        'app.title': 'KISSAI Web',
        'app.description': 'KISSAI 是一个现代、极简且高质感的 AI 聊天交互平台，支持多种模型提供商。',

        // Sidebar
        'sidebar.search.placeholder': '搜索对话',
        'sidebar.newChat': '新建对话',
        'sidebar.empty.title': '暂无会话',
        'sidebar.empty.desc': '开始新的对话以在此处查看您的会话历史记录。',
        'footer.github': 'GitHub Repository',
        'footer.theme': '切换主题',
        'footer.clearHistory': '双击以清理全部历史记录',
        'footer.settings': '设置',

        // Welcome section
        'welcome.title': '👋嗨，你好啊！',
        'welcome.subtitle': '今天我能为您做些什么？',

        // Chat controls
        'chat.clearChat': '双击以清空对话',
        'chat.contextControl': '调节上下文消息数量',
        'chat.context.messages': ' 条消息',

        // Settings navigation
        'settings.general': '通用设置',
        'settings.providers': '模型提供商',
        'settings.addProvider': '新增提供商',
        'settings.roles': '角色预设',

        // General settings
        'settings.wideMode': '宽屏模式',
        'settings.wideMode.desc': '开启宽屏对话视图',
        'settings.language': '界面语言',
        'settings.systemPrompt': '全局系统提示词',
        'settings.systemPrompt.placeholder': '提示词...',
        'settings.resetPrompt': '重置为默认值',
        'settings.dataManagement': '数据管理',
        'settings.dataManagement.help': '通过剪贴板或文件导入/导出配置数据（API、预设、历史等）。',
        'settings.dataManagement.warning': '注意：导入配置会覆盖所有本地数据（API、预设、历史等）。<br>导出时会自动移除图片数据以减小体积。',
        'settings.copyToClipboard': '复制到剪贴板',
        'settings.importFromClipboard': '粘贴自剪贴板',
        'settings.exportJson': '导出 JSON',
        'settings.importJson': '导入 JSON',

        // Provider settings
        'provider.editName': '编辑名称',
        'provider.save': '保存',
        'provider.cancel': '取消',
        'provider.addName.placeholder': '提供商名称',
        'provider.apiKey': 'API Key',
        'provider.baseUrl': 'Base URL',
        'provider.models': '模型',
        'provider.addModel': '手动添加模型',
        'provider.fetchModels': '获取模型',
        'provider.modelName.placeholder': '模型名称',
        'provider.add': '添加',

        // Role presets
        'role.commonPresets': '预设',
        'role.help': '输入 @ 使用预设',
        'role.name.placeholder': '角色名称',
        'role.prompt.placeholder': '系统提示词',

        // Model modal
        'modal.availableModels': '从API获取的可用模型',
        'modal.modelSelectionHint': '勾选要使用的模型，未勾选的将不会出现在模型列表中',
        'modal.searchModels': '搜索模型...',

        // Dynamic content
        'model.notSelected': '未选择模型',
        'model.notProvider': '未选择提供商',
        'chat.emptyTitle': '空白对话',
        'chat.emptyMessage': '空白消息',
        'chat.imageMessage': '图片消息',
        'chat.searchNotFound': '未找到包含 "{keyword}" 的对话',
        'chat.historyEmpty': '此处显示您的对话历史记录。',

        // Messages and alerts
        'alert.selectModel': '请先选择一个模型',
        'alert.modelExists': '该模型已存在',
        'alert.fetchFailed': '获取模型列表失败，建议使用手动添加模型功能（点击左侧「+」按钮）',
        'alert.importConfirm': '导入配置将覆盖本地所有数据，确定要继续吗？',
        'alert.importFailed': '导入失败：',
        'alert.invalidConfig': '无效的配置文件格式。',

        // Errors
        'error.providerNotFound': '未找到模型 {modelName} 的提供商配置',
        'error.apiKeyNotConfigured': 'API Key 未配置',
        'error.copyFailed': '复制失败',
        'error.requestTimeout': '请求超时，请检查网络连接或API端点是否可用',
        'error.fetchFailed': '获取模型失败，请检查 API Key 和 Base URL 是否正确：',

        // Code and copy
        'code.copy': '复制代码',
        'code.copySuccess': '复制成功',
        'copy.title': '复制',

        // Message actions
        'message.expand': '展开/收起',
        'message.expandFull': '展开完整消息',
        'message.collapse': '收起消息',
        'message.regenerate': '重试',
        'message.regenerateLabel': '重新回答',

        // Model dropdown
        'model.favorites': '已收藏',
        'model.noProviders': '没有配置任何模型提供商',
        'model.noEnabled': '没有启用任何模型',

        // Shortcuts
        'shortcuts.newChat': '新建对话',
        'shortcuts.sidebar': '侧边栏',
        'shortcuts.send': '发送',
        'shortcuts.newLine': '换行',
        'shortcuts.search': '搜索',
        'shortcuts.settings': '设置',

        // System prompts (default values)
        'systemPrompt.default': '你是一个专业的AI助手',

        // OCR prompt
        'ocr.prompt': '你是高精度专业的OCR助手，请精准提取图中文字，如有特殊排版，需要完整保留，保证合理的换行，对模糊字符不作猜测，完整返回给我。',

        // Role preset prefix
        'role.prefix': '角色预设：',

        // Provider actions
        'provider.copy': '复制',
        'provider.delete': '删除'
    },
    en: {
        // App metadata
        'app.title': 'KISSAI Web',
        'app.description': 'KISSAI is a modern, minimalist, and high-quality AI chat platform supporting multiple model providers.',

        // Sidebar
        'sidebar.search.placeholder': 'Search conversations',
        'sidebar.newChat': 'New Chat',
        'sidebar.empty.title': 'No conversations',
        'sidebar.empty.desc': 'Start a new conversation to view your conversation history here.',
        'footer.github': 'GitHub Repository',
        'footer.theme': 'Toggle theme',
        'footer.clearHistory': 'Double-click to clear all history',
        'footer.settings': 'Settings',

        // Welcome section
        'welcome.title': '👋Hello there!',
        'welcome.subtitle': 'What can I do for you today?',

        // Chat controls
        'chat.clearChat': 'Double-click to clear chat',
        'chat.contextControl': 'Adjust context message count',
        'chat.context.messages': ' messages',

        // Settings navigation
        'settings.general': 'General Settings',
        'settings.providers': 'Model Providers',
        'settings.addProvider': 'Add Provider',
        'settings.roles': 'Role Presets',

        // General settings
        'settings.wideMode': 'Wide Mode',
        'settings.wideMode.desc': 'Enable wide chat view',
        'settings.language': 'Interface Language',
        'settings.systemPrompt': 'Global System Prompt',
        'settings.systemPrompt.placeholder': 'Prompt...',
        'settings.resetPrompt': 'Reset to default',
        'settings.dataManagement': 'Data Management',
        'settings.dataManagement.help': 'Import/export config data via clipboard or file (API, roles, history, etc.).',
        'settings.dataManagement.warning': 'Note: Importing will overwrite all local data (API, roles, history, etc.).<br>Images are removed during export to reduce file size.',
        'settings.copyToClipboard': 'Copy to Clipboard',
        'settings.importFromClipboard': 'Paste from Clipboard',
        'settings.exportJson': 'Export Json',
        'settings.importJson': 'Import Json',

        // Provider settings
        'provider.editName': 'Edit name',
        'provider.save': 'Save',
        'provider.cancel': 'Cancel',
        'provider.addName.placeholder': 'Provider name',
        'provider.apiKey': 'API Key',
        'provider.baseUrl': 'Base URL',
        'provider.models': 'Models',
        'provider.addModel': 'Add model manually',
        'provider.fetchModels': 'Fetch models',
        'provider.modelName.placeholder': 'Model name',
        'provider.add': 'Add',

        // Role presets
        'role.commonPresets': 'Presets',
        'role.help': 'Type @ to use presets',
        'role.name.placeholder': 'Role name',
        'role.prompt.placeholder': 'System prompt',

        // Model modal
        'modal.availableModels': 'Available models from API',
        'modal.modelSelectionHint': 'Check the models you want to use. Unchecked models will not appear in the model list.',
        'modal.searchModels': 'Search models...',

        // Dynamic content
        'model.notSelected': 'No model selected',
        'model.notProvider': 'No provider selected',
        'chat.emptyTitle': 'Empty Chat',
        'chat.emptyMessage': 'Empty message',
        'chat.imageMessage': 'Image message',
        'chat.searchNotFound': 'No conversations containing "{keyword}" found',
        'chat.historyEmpty': 'Your conversation history will be displayed here.',

        // Messages and alerts
        'alert.selectModel': 'Please select a model first',
        'alert.modelExists': 'This model already exists',
        'alert.fetchFailed': 'Failed to fetch model list. It is recommended to use the manual model addition feature (click the "+" button on the left)',
        'alert.importConfirm': 'Importing configuration will overwrite all local data. Are you sure you want to continue?',
        'alert.importFailed': 'Import failed:',
        'alert.invalidConfig': 'Invalid configuration file format.',

        // Errors
        'error.providerNotFound': 'No provider configuration found for model {modelName}',
        'error.apiKeyNotConfigured': 'API Key not configured',
        'error.copyFailed': 'Copy failed',
        'error.requestTimeout': 'Request timeout. Please check your network connection or API endpoint availability',
        'error.fetchFailed': 'Failed to fetch models. Please check if API Key and Base URL are correct:',

        // Code and copy
        'code.copy': 'Copy code',
        'code.copySuccess': 'Copy successful',
        'copy.title': 'Copy',

        // Message actions
        'message.expand': 'Expand/Collapse',
        'message.expandFull': 'Expand full message',
        'message.collapse': 'Collapse message',
        'message.regenerate': 'Retry',
        'message.regenerateLabel': 'Regenerate response',

        // Model dropdown
        'model.favorites': 'Favorites',
        'model.noProviders': 'No model providers configured',
        'model.noEnabled': 'No models enabled',

        // Shortcuts
        'shortcuts.newChat': 'New Chat',
        'shortcuts.sidebar': 'Sidebar',
        'shortcuts.send': 'Send',
        'shortcuts.newLine': 'New Line',
        'shortcuts.search': 'Search',
        'shortcuts.settings': 'Settings',

        // System prompts (default values)
        'systemPrompt.default': 'You are a professional AI assistant.',

        // OCR prompt
        'ocr.prompt': 'You are a high-precision professional OCR assistant. Please accurately extract text from the image. If there is special formatting, it needs to be completely preserved with reasonable line breaks. Do not guess fuzzy characters. Return the complete text to me.',

        // Role preset prefix
        'role.prefix': 'Role Preset: ',

        // Provider actions
        'provider.copy': 'Copy',
        'provider.delete': 'Delete'
    }
};

/**
 * Get translation for a key
 * @param {string} key - Translation key
 * @param {Object} params - Parameters for interpolation (optional)
 * @returns {string} Translated text
 */
function t(key, params = {}) {
    const lang = params.lang || window.configData?.general?.language || 'zh';
    let text = translations[lang]?.[key] || translations['zh'][key] || key;

    // Interpolate parameters (excluding 'lang')
    Object.keys(params).forEach(param => {
        if (param !== 'lang') {
            text = text.replace(`{${param}}`, params[param]);
        }
    });

    return text;
}

/**
 * Update all translatable elements in the DOM
 */
function updateAllText() {
    // Update text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });

    // Update HTML content (for elements with <br> or other HTML)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = t(key);
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });

    // Update titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = t(key);
    });

    // Update aria-labels
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria-label');
        el.setAttribute('aria-label', t(key));
    });

    // Update meta tags
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
        metaDescription.setAttribute('content', t('app.description'));
    }

    document.title = t('app.title');
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { t, updateAllText, translations };
}

// Expose to window for use in app.js
window.translations = translations;
window.t = t;
window.updateAllText = updateAllText;
