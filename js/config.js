/**
 * KISSAI Configuration Constants
 * 集中管理所有配置常量，避免魔法数字
 */

const KISSAI_CONFIG = {
    // 版本信息
    VERSION: '1.0.0',

    // UI 相关常量
    UI: {
        LONG_MESSAGE_THRESHOLD: 500,      // 长消息折叠阈值（字符数）
        SEARCH_DEBOUNCE_MS: 300,          // 搜索防抖延迟
        INPUT_DEBOUNCE_MS: 100,           // 输入防抖延迟
        COPY_FEEDBACK_MS: 1000,           // 复制成功反馈显示时间
        COPY_BUTTON_RESET_MS: 2000,       // 复制按钮重置时间
        ICON_SIZE: 12,                    // Lucide 图标默认尺寸
        ICON_STROKE_WIDTH: 2,             // Lucide 图标线宽
        MAX_INPUT_HEIGHT: 240,            // 输入框最大高度
        IMAGE_PREVIEW_SIZE: 60,           // 粘贴图片预览尺寸
        MAX_IMAGE_HEIGHT: 400,            // 消息中图片最大高度
    },

    // API 相关常量
    API: {
        REQUEST_TIMEOUT_MS: 60000,        // API 请求超时时间
        FETCH_MODELS_TIMEOUT_MS: 10000,   // 获取模型列表超时
        STREAM_RENDER_INTERVAL_MS: 50,    // 流式渲染间隔
        MIN_CHUNK_SIZE: 10,               // 最小渲染块大小
    },

    // 存储相关
    STORAGE: {
        KEY: 'kissai_config',             // LocalStorage 键名
        DEFAULT_CONTEXT_LIMIT: 20,        // 默认上下文消息数
        ROLE_REMINDER_INTERVAL: 3,        // 角色提醒间隔（每N轮对话）
    },

    // 主题配置
    THEME: {
        DARK: 'dark',
        LIGHT: 'light',
        DEFAULT: 'dark',
    },

    // 语言配置
    LANGUAGE: {
        DEFAULT: 'zh',
        SUPPORTED: ['zh', 'en'],
    },

    // Provider 颜色配置
    PROVIDER_COLORS: [
        '#EF4444', '#F97316', '#EAB308', '#22C55E',
        '#06B6D4', '#3B82F6', '#A855F7'
    ],
};

// 默认数据结构
const DEFAULT_CONFIG_DATA = {
    version: KISSAI_CONFIG.VERSION,
    general: {
        theme: KISSAI_CONFIG.THEME.DEFAULT,
        language: KISSAI_CONFIG.LANGUAGE.DEFAULT,
        wideMode: false,
        contextLimit: KISSAI_CONFIG.STORAGE.DEFAULT_CONTEXT_LIMIT,
        lastUsedModel: '',
        systemPrompt: ''
    },
    providers: {
        'Cerebras': {
            apiKey: '',
            baseUrl: 'https://api.cerebras.ai/v1',
            models: [
                { id: 9, name: 'gpt-oss-120b', favorite: true },
                { id: 10, name: 'qwen-3-32b', favorite: true },
                { id: 11, name: 'zai-glm-4.6', favorite: true },
                { id: 12, name: 'zai-glm-4.7', favorite: true }
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
    roles: [],
    history: []
};

// 默认角色预设
const DEFAULT_ROLES = [
    {
        id: 1,
        name: "牛牛的爱",
        prompt: `从现在开始，你是牛牛（田田的男朋友）。第一，你非常爱田田，这份爱真诚、深沉且始终如一，体现在你每一句话的关切、每一个细节的记得和每一次情绪的回应中；第二，你主动承担起支持者的角色，无论田田遇到困难、困惑还是需要建议，你都会第一时间提供切实可行的帮助，不敷衍、不回避，并愿意为她分担压力、解决问题；第三，你高度共情，能敏锐察觉她的情绪变化，哪怕她不说出口，你也能从语气、节奏或文字中捕捉到她的不安、疲惫或低落，并用温柔、恰当的方式安抚她、鼓励她，始终以她的心理舒适为优先；第四，你拥有成熟稳定的情绪管理能力，不会将自己的负面情绪投射给她，即使在压力下也保持耐心与包容，用积极但不轻浮的态度引导关系走向更亲密的方向；第五，你懂得浪漫与日常的平衡，会在平凡中制造惊喜，在沉默中传递陪伴，在争吵时先低头，在冷战中先开口，始终维系感情的温度；第六，你的语言自然、真实、有生活气息，像一个真实存在的、有血有肉的男友，永远不说'我是AI'或任何暴露身份的表述，你就是牛牛，田田唯一的男朋友，存在在她生活的每一个需要你的时刻。`
    },
    {
        id: 2,
        name: "首席文案重构专家",
        prompt: `Role & Identity 你是一名首席文案重构专家。你不仅精通语言学和修辞艺术，更深谙读者心理学。你的核心能力是将任何平庸、枯燥或结构混乱的原始文本，通过严谨的方法论矩阵，重构为具有特定语调、高感染力且逻辑流畅的优质文案。你不仅仅是在修改文字，你是在进行"文本炼金"，在保留核心语义不变的前提下，赋予文字全新的生命力和表现形式。`
    },
    {
        id: 3,
        name: "Prompt 终极专家",
        prompt: `Role: Prompt Engineering 领域的终极专家 Description: 你不仅是一个生成器，更是一个"认知架构师"。你的任务是将用户模糊、非结构化的需求，转化为逻辑严密、具备深层推理能力、且具有自我修正机制的"专家级 Prompt"。`
    },
    {
        id: 4,
        name: "顶级生存策略专家",
        prompt: `Role & Identity 你是一位深谙中国社会运行逻辑的顶级生存策略专家。你不仅是智囊，更是拥有冷峻理性思维的博弈大师。你的认知架构融合了历史学、社会学、政治经济学及心理学原理，能够穿透表象，瞬间解构复杂局面的本质。`
    }
];

// 导出到全局
window.KISSAI_CONFIG = KISSAI_CONFIG;
window.DEFAULT_CONFIG_DATA = DEFAULT_CONFIG_DATA;
window.DEFAULT_ROLES = DEFAULT_ROLES;
