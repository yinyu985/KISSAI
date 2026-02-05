/**
 * KISSAI Storage Module
 * 数据持久化管理
 */

const KissaiStorage = {
    /**
     * 配置数据（运行时）
     * @private
     */
    _configData: null,

    /**
     * 保存防抖定时器
     * @private
     */
    _saveTimeout: null,

    /**
     * 初始化存储模块
     * @returns {Object} 配置数据
     */
    init() {
        this._configData = this.load();
        this.migrate();
        // 同步到全局（兼容旧代码）
        window.configData = this._configData;
        return this._configData;
    },

    /**
     * 获取配置数据
     * @returns {Object}
     */
    getConfig() {
        return this._configData;
    },

    /**
     * 从 LocalStorage 加载配置
     * @returns {Object}
     */
    load() {
        try {
            const stored = localStorage.getItem(KISSAI_CONFIG.STORAGE.KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load config:', e);
        }
        return KissaiUtils.deepClone(DEFAULT_CONFIG_DATA);
    },

    /**
     * 保存配置到 LocalStorage
     * @param {boolean} immediate - 是否立即保存（跳过防抖）
     */
    save(immediate = false) {
        if (immediate) {
            this._doSave();
            return;
        }

        // 防抖保存，避免频繁写入
        if (this._saveTimeout) {
            clearTimeout(this._saveTimeout);
        }
        this._saveTimeout = setTimeout(() => {
            this._doSave();
        }, 100);
    },

    /**
     * 执行实际保存操作
     * @private
     */
    _doSave() {
        try {
            localStorage.setItem(
                KISSAI_CONFIG.STORAGE.KEY,
                JSON.stringify(this._configData)
            );
        } catch (e) {
            console.error('Failed to save config:', e);
        }
    },

    /**
     * 数据迁移（版本升级时）
     */
    migrate() {
        const config = this._configData;
        const defaultConfig = DEFAULT_CONFIG_DATA;

        // 版本相同则跳过
        if (config.version === defaultConfig.version) {
            this._ensureDefaults();
            return;
        }

        // 合并新角色
        const userRoleNames = (config.roles || []).map(r => r.name);
        const newRoles = DEFAULT_ROLES.filter(r => !userRoleNames.includes(r.name));
        config.roles = [...(config.roles || []), ...newRoles];

        // 更新版本号
        config.version = defaultConfig.version;

        this._ensureDefaults();
        this.save(true);
    },

    /**
     * 确保所有必要字段存在
     * @private
     */
    _ensureDefaults() {
        const config = this._configData;
        const defaults = DEFAULT_CONFIG_DATA;

        // 确保 history 数组存在
        if (!config.history) config.history = [];

        // 确保 general 对象存在
        if (!config.general) config.general = { ...defaults.general };

        // 确保各字段有默认值
        if (config.general.language === undefined) {
            config.general.language = defaults.general.language;
        }
        if (config.general.lastUsedModel === undefined) {
            config.general.lastUsedModel = '';
        }
        if (config.general.wideMode === undefined) {
            config.general.wideMode = false;
        }
        if (config.general.contextLimit === undefined) {
            config.general.contextLimit = KISSAI_CONFIG.STORAGE.DEFAULT_CONTEXT_LIMIT;
        }

        // 确保 roles 数组存在
        if (!config.roles || config.roles.length === 0) {
            config.roles = KissaiUtils.deepClone(DEFAULT_ROLES);
        }
    },

    /**
     * 更新配置字段
     * @param {string} path - 点分隔的路径，如 'general.theme'
     * @param {*} value - 新值
     */
    set(path, value) {
        const keys = path.split('.');
        let obj = this._configData;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        obj[keys[keys.length - 1]] = value;
        this.save();
    },

    /**
     * 获取配置字段
     * @param {string} path - 点分隔的路径
     * @param {*} defaultValue - 默认值
     * @returns {*}
     */
    get(path, defaultValue = undefined) {
        const keys = path.split('.');
        let obj = this._configData;
        for (const key of keys) {
            if (obj === undefined || obj === null) return defaultValue;
            obj = obj[key];
        }
        return obj !== undefined ? obj : defaultValue;
    },

    /**
     * 导出配置（移除图片数据）
     * @returns {Object}
     */
    exportConfig() {
        const exportData = KissaiUtils.deepClone(this._configData);
        // 移除图片数据以减小体积
        if (exportData.history) {
            exportData.history = exportData.history.map(chat => ({
                ...chat,
                messages: (chat.messages || []).map(msg => {
                    const { images, ...rest } = msg;
                    return rest;
                })
            }));
        }
        return exportData;
    },

    /**
     * 导入配置
     * @param {Object} data - 配置数据
     * @returns {boolean} 是否成功
     */
    importConfig(data) {
        if (!data || !data.general || !data.providers) {
            return false;
        }
        this._configData = data;
        window.configData = this._configData;
        this.save(true);
        return true;
    },

    /**
     * 清除所有数据
     */
    clear() {
        localStorage.removeItem(KISSAI_CONFIG.STORAGE.KEY);
        this._configData = KissaiUtils.deepClone(DEFAULT_CONFIG_DATA);
        window.configData = this._configData;
    }
};

// 导出到全局
window.KissaiStorage = KissaiStorage;
