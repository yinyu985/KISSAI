/**
 * KISSAI Markdown Module
 * Markdown 渲染和流式处理
 */

const KissaiMarkdown = {
    /**
     * markdown-it 实例
     * @private
     */
    _md: null,

    /**
     * 获取 markdown-it 实例（懒加载单例）
     * @returns {Object|null}
     */
    getInstance() {
        if (this._md === null && typeof window.markdownit === 'function') {
            this._md = window.markdownit({
                html: true,
                breaks: true,
                linkify: true,
                typographer: true,
                quotes: '""\'\'',
                tables: true,
                highlight: this._highlightCode.bind(this)
            });

            // 自定义链接渲染：新窗口打开
            this._customizeLinkRenderer();
        }
        return this._md;
    },

    /**
     * 代码高亮处理
     * @private
     */
    _highlightCode(str, lang) {
        if (typeof hljs !== 'undefined') {
            try {
                if (lang && hljs.getLanguage(lang)) {
                    return '<pre class="hljs"><code>' +
                        hljs.highlight(str, { language: lang }).value +
                        '</code></pre>';
                }
                const result = hljs.highlightAuto(str);
                return '<pre class="hljs"><code>' + result.value + '</code></pre>';
            } catch (__) {
                // 高亮失败，使用纯文本
            }
        }
        const escaped = this._md ? this._md.utils.escapeHtml(str) : KissaiUtils.escapeHtml(str);
        return '<pre class="hljs"><code>' + escaped + '</code></pre>';
    },

    /**
     * 自定义链接渲染器
     * @private
     */
    _customizeLinkRenderer() {
        const defaultRender = this._md.renderer.rules.link_open ||
            function (tokens, idx, options, _env, renderer) {
                return renderer.renderToken(tokens, idx, options);
            };

        this._md.renderer.rules.link_open = (tokens, idx, options, _env, renderer) => {
            const token = tokens[idx];
            if (token && token.attrGet('target') !== '_blank') {
                token.attrSet('target', '_blank');
                token.attrSet('rel', 'noopener noreferrer');
            }
            return defaultRender(tokens, idx, options, _env, renderer);
        };
    },

    /**
     * 渲染 Markdown 内容
     * @param {string} content
     * @returns {string} HTML
     */
    render(content) {
        const md = this.getInstance();
        if (md && content) {
            return md.render(content);
        }
        return KissaiUtils.escapeHtml(content || '');
    }
};

/**
 * Markdown 流式处理器
 * 修复未闭合的语法并过滤思考内容
 */
class MarkdownStreamProcessor {
    /**
     * 预处理流式内容，修复未闭合的语法
     * @param {string} content
     * @returns {string}
     */
    preprocessContent(content) {
        if (!content) return content;

        let result = content;
        result = this._removeThinkingContent(result);
        result = this._fixCodeBlocks(result);
        result = this._fixInlineCode(result);
        result = this._fixEmphasis(result);
        result = this._fixLinks(result);

        return result;
    }

    /**
     * 移除思考内容标签
     * @private
     */
    _removeThinkingContent(content) {
        // 移除完整的 <think>...</think> 块
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, '');
        // 移除未闭合的 <think>...（流式输出中可能还没收到闭合标签）
        content = content.replace(/<think>[\s\S]*$/gi, '');
        return content.trim();
    }

    /**
     * 修复未闭合的代码块
     * @private
     */
    _fixCodeBlocks(content) {
        // 检测是否在代码块内
        let inCodeBlock = false;
        const len = content.length;

        for (let i = 0; i < len; i++) {
            // 跳过转义字符
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

        if (inCodeBlock) {
            return content + '\n\n```';
        }
        return content;
    }

    /**
     * 修复未闭合的行内代码
     * @private
     */
    _fixInlineCode(content) {
        // 排除代码块后检查反引号数量
        const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
        const backtickCount = (withoutCodeBlocks.match(/`/g) || []).length;

        if (backtickCount % 2 !== 0) {
            return content + '`';
        }
        return content;
    }

    /**
     * 修复未闭合的强调语法
     * @private
     */
    _fixEmphasis(content) {
        const withoutCode = content
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`[^`]*`/g, '');

        // 检查 **
        const doubleStarCount = (withoutCode.match(/\*\*/g) || []).length;
        if (doubleStarCount % 2 !== 0) {
            content += '**';
        }

        // 检查单个 *
        const updatedWithoutCode = content
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`[^`]*`/g, '')
            .replace(/\*\*/g, '');
        const singleStarCount = (updatedWithoutCode.match(/\*/g) || []).length;

        if (singleStarCount % 2 !== 0) {
            content += '*';
        }

        return content;
    }

    /**
     * 修复未闭合的链接语法
     * @private
     */
    _fixLinks(content) {
        // [text](url 未闭合
        if (/\[[^\]]*\]\([^)]*$/.test(content)) {
            return content + ')';
        }
        // [text][ref 未闭合
        if (/\[[^\]]*\]\[[^\]]*$/.test(content)) {
            return content + ']';
        }
        return content;
    }
}

// 创建全局实例
window.KissaiMarkdown = KissaiMarkdown;
window.MarkdownStreamProcessor = MarkdownStreamProcessor;
