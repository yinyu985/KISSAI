/**
 * KISSAI Utility Functions
 * 通用工具函数模块
 */

const KissaiUtils = {
    // ========== DOM 工具 ==========

    /**
     * 缓存的 DOM 元素引用
     * @private
     */
    _domCache: new Map(),

    /**
     * 获取 DOM 元素（带缓存）
     * @param {string} id - 元素 ID
     * @param {boolean} forceRefresh - 是否强制刷新缓存
     * @returns {HTMLElement|null}
     */
    getElement(id, forceRefresh = false) {
        if (!forceRefresh && this._domCache.has(id)) {
            const cached = this._domCache.get(id);
            // 验证元素是否仍在 DOM 中
            if (cached && document.contains(cached)) {
                return cached;
            }
        }
        const element = document.getElementById(id);
        if (element) {
            this._domCache.set(id, element);
        }
        return element;
    },

    /**
     * 清除 DOM 缓存
     */
    clearDomCache() {
        this._domCache.clear();
    },

    // ========== 字符串工具 ==========

    /**
     * HTML 转义，防止 XSS
     * @param {string} str - 原始字符串
     * @returns {string} 转义后的字符串
     */
    escapeHtml(str) {
        if (!str) return '';
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return str.replace(/[&<>"']/g, char => escapeMap[char]);
    },

    /**
     * 转义正则表达式特殊字符
     * @param {string} str
     * @returns {string}
     */
    escapeRegex(str) {
        if (!str) return '';
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    /**
     * 高亮关键词（安全版本）
     * @param {string} text - 原始文本
     * @param {string} keyword - 关键词
     * @returns {string} 带高亮标记的 HTML
     */
    highlightKeyword(text, keyword) {
        if (!keyword || !text) return this.escapeHtml(text);
        const escapedText = this.escapeHtml(text);
        const escapedKeyword = this.escapeHtml(keyword);
        const regex = new RegExp(`(${this.escapeRegex(escapedKeyword)})`, 'gi');
        return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
    },

    /**
     * 截断文本
     * @param {string} text
     * @param {number} maxLength
     * @returns {string}
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    // ========== 防抖节流 ==========

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间（毫秒）
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // ========== 时间工具 ==========

    /**
     * 格式化时间戳
     * @param {number} timestamp
     * @returns {string}
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    },

    // ========== 数据工具 ==========

    /**
     * 深拷贝对象
     * @param {*} obj
     * @returns {*}
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * 生成唯一 ID
     * @returns {number}
     */
    generateId() {
        return Date.now() + Math.random();
    },

    // ========== 剪贴板工具 ==========

    /**
     * 复制文本到剪贴板
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        }
    },

    /**
     * 从剪贴板读取文本
     * @returns {Promise<string>}
     */
    async readFromClipboard() {
        return await navigator.clipboard.readText();
    },

    // ========== URL 工具 ==========

    /**
     * 规范化 Base URL
     * @param {string} baseUrl
     * @returns {string}
     */
    normalizeBaseUrl(baseUrl) {
        let cleanUrl = baseUrl.trim();
        if (cleanUrl.endsWith('/')) {
            cleanUrl = cleanUrl.slice(0, -1);
        }
        // 处理 Google AI 的特殊路径
        if (cleanUrl.includes('generativelanguage.googleapis.com') && cleanUrl.includes('/openai')) {
            return cleanUrl;
        }
        // 处理版本号路径
        const versionMatch = cleanUrl.match(/\/v\d+(beta|alpha)?/i);
        if (versionMatch) {
            const versionIndex = versionMatch.index + versionMatch[0].length;
            return cleanUrl.substring(0, versionIndex);
        }
        return cleanUrl;
    },

    // ========== 滚动工具 ==========

    /**
     * 阻止滚动事件冒泡
     * @param {HTMLElement} element
     */
    preventScrollPropagation(element) {
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
};

// 导出到全局
window.KissaiUtils = KissaiUtils;
