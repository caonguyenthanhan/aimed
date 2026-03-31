// Internationalization system for AIMed
export type Locale = 'vi' | 'en' | 'fr' | 'zh' | 'ru' | 'hi'

export const localeNames: Record<Locale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  fr: 'Français',
  zh: '中文',
  ru: 'Русский',
  hi: 'हिन्दी'
}

export const translations: Record<Locale, Record<string, string>> = {
  vi: {
    // Header
    'nav.home': 'Trang chủ',
    'nav.consult': 'Tư vấn',
    'nav.confide': 'Tâm sự',
    'nav.guide': 'Hướng dẫn',
    'nav.tools': 'Công cụ',
    'nav.login': 'Đăng nhập',
    
    // Sidebar
    'sidebar.history': 'Lịch sử hội thoại',
    'sidebar.search': 'Tìm kiếm...',
    'sidebar.new': 'Mới',
    'sidebar.refresh': 'Làm mới',
    'sidebar.close': 'Đóng',
    'sidebar.open': 'Mở lịch sử',
    'sidebar.noConversations': 'Chưa có hội thoại',
    'sidebar.noTitle': 'Chưa có tiêu đề',
    'sidebar.loading': 'Đang tải...',
    'sidebar.connectionError': 'Không kết nối được',
    
    // Chat
    'chat.placeholder': 'Nhập câu hỏi của bạn...',
    'chat.send': 'Gửi tin nhắn',
    'chat.stopRecording': 'Dừng ghi âm',
    'chat.startRecording': 'Bắt đầu ghi âm',
    'chat.voiceChat': 'Trò chuyện giọng nói',
    'chat.liveOn': 'Bật Live',
    'chat.liveOff': 'Tắt Live',
    'chat.liveTextOn': 'Bật Live text',
    'chat.liveTextOff': 'Tắt Live text',
    'chat.apiKey': 'Thiết lập API key',
    'chat.image': 'Ảnh',
    'chat.pdf': 'PDF/Doc',
    
    // Disclaimer
    'disclaimer.text': 'Thông tin chỉ mang tính tham khảo. Hãy tham khảo ý kiến bác sĩ.',
    
    // Suggested questions
    'suggest.headache': 'Tôi bị đau đầu, có phải cảm cúm không?',
    'suggest.anxiety': 'Liệu pháp nào giúp giảm lo âu?',
    'suggest.paracetamol': 'Thông tin về thuốc Paracetamol?',
    'suggest.preventFlu': 'Cách phòng ngừa cảm cúm?',
    'suggest.immuneFood': 'Chế độ ăn tăng cường miễn dịch?',
    'suggest.exercise': 'Tập thể dục như thế nào để khỏe mạnh?',
    'suggest.heartDisease': 'Cách phòng ngừa bệnh tim mạch?',
    'suggest.healthCheck': 'Kiểm tra sức khỏe định kỳ gồm gì?',
    
    // Welcome
    'welcome.greeting': 'Xin chào! Tôi là trợ lý AI y tế được huấn luyện chuyên biệt. Tôi có thể giúp bạn tìm hiểu về các vấn đề sức khỏe. Bạn có câu hỏi gì không?',
  },
  
  en: {
    // Header
    'nav.home': 'Home',
    'nav.consult': 'Consult',
    'nav.confide': 'Confide',
    'nav.guide': 'Guide',
    'nav.tools': 'Tools',
    'nav.login': 'Login',
    
    // Sidebar
    'sidebar.history': 'Chat History',
    'sidebar.search': 'Search...',
    'sidebar.new': 'New',
    'sidebar.refresh': 'Refresh',
    'sidebar.close': 'Close',
    'sidebar.open': 'Open history',
    'sidebar.noConversations': 'No conversations yet',
    'sidebar.noTitle': 'Untitled',
    'sidebar.loading': 'Loading...',
    'sidebar.connectionError': 'Connection failed',
    
    // Chat
    'chat.placeholder': 'Type your question...',
    'chat.send': 'Send message',
    'chat.stopRecording': 'Stop recording',
    'chat.startRecording': 'Start recording',
    'chat.voiceChat': 'Voice Chat',
    'chat.liveOn': 'Live ON',
    'chat.liveOff': 'Live OFF',
    'chat.liveTextOn': 'Live text ON',
    'chat.liveTextOff': 'Live text OFF',
    'chat.apiKey': 'API key settings',
    'chat.image': 'Image',
    'chat.pdf': 'PDF/Doc',
    
    // Disclaimer
    'disclaimer.text': 'Information is for reference only. Please consult a doctor.',
    
    // Suggested questions
    'suggest.headache': 'I have a headache, is it the flu?',
    'suggest.anxiety': 'What therapies help reduce anxiety?',
    'suggest.paracetamol': 'Information about Paracetamol?',
    'suggest.preventFlu': 'How to prevent the flu?',
    'suggest.immuneFood': 'Diet to boost immunity?',
    'suggest.exercise': 'How to exercise for good health?',
    'suggest.heartDisease': 'How to prevent heart disease?',
    'suggest.healthCheck': 'What does a health check include?',
    
    // Welcome
    'welcome.greeting': 'Hello! I am a specialized AI health assistant. I can help you learn about health issues. Do you have any questions?',
  },
  
  fr: {
    // Header
    'nav.home': 'Accueil',
    'nav.consult': 'Consulter',
    'nav.confide': 'Confier',
    'nav.guide': 'Guide',
    'nav.tools': 'Outils',
    'nav.login': 'Connexion',
    
    // Sidebar
    'sidebar.history': 'Historique',
    'sidebar.search': 'Rechercher...',
    'sidebar.new': 'Nouveau',
    'sidebar.refresh': 'Actualiser',
    'sidebar.close': 'Fermer',
    'sidebar.open': 'Ouvrir historique',
    'sidebar.noConversations': 'Pas de conversations',
    'sidebar.noTitle': 'Sans titre',
    'sidebar.loading': 'Chargement...',
    'sidebar.connectionError': 'Connexion échouée',
    
    // Chat
    'chat.placeholder': 'Tapez votre question...',
    'chat.send': 'Envoyer',
    'chat.stopRecording': 'Arrêter',
    'chat.startRecording': 'Enregistrer',
    'chat.voiceChat': 'Chat vocal',
    'chat.liveOn': 'Live ON',
    'chat.liveOff': 'Live OFF',
    'chat.liveTextOn': 'Texte live ON',
    'chat.liveTextOff': 'Texte live OFF',
    'chat.apiKey': 'Clé API',
    'chat.image': 'Image',
    'chat.pdf': 'PDF/Doc',
    
    // Disclaimer
    'disclaimer.text': 'Information à titre indicatif. Consultez un médecin.',
    
    // Suggested questions
    'suggest.headache': 'J\'ai mal à la tête, est-ce la grippe?',
    'suggest.anxiety': 'Quelles thérapies réduisent l\'anxiété?',
    'suggest.paracetamol': 'Informations sur le Paracétamol?',
    'suggest.preventFlu': 'Comment prévenir la grippe?',
    'suggest.immuneFood': 'Régime pour renforcer l\'immunité?',
    'suggest.exercise': 'Comment faire du sport sainement?',
    'suggest.heartDisease': 'Prévenir les maladies cardiaques?',
    'suggest.healthCheck': 'Que comprend un bilan de santé?',
    
    // Welcome
    'welcome.greeting': 'Bonjour! Je suis un assistant IA santé spécialisé. Je peux vous aider à comprendre les problèmes de santé. Avez-vous des questions?',
  },
  
  zh: {
    // Header
    'nav.home': '首页',
    'nav.consult': '咨询',
    'nav.confide': '倾诉',
    'nav.guide': '指南',
    'nav.tools': '工具',
    'nav.login': '登录',
    
    // Sidebar
    'sidebar.history': '聊天记录',
    'sidebar.search': '搜索...',
    'sidebar.new': '新建',
    'sidebar.refresh': '刷新',
    'sidebar.close': '关闭',
    'sidebar.open': '打开记录',
    'sidebar.noConversations': '暂无对话',
    'sidebar.noTitle': '未命名',
    'sidebar.loading': '加载中...',
    'sidebar.connectionError': '连接失败',
    
    // Chat
    'chat.placeholder': '输入您的问题...',
    'chat.send': '发送消息',
    'chat.stopRecording': '停止录音',
    'chat.startRecording': '开始录音',
    'chat.voiceChat': '语音聊天',
    'chat.liveOn': '开启实时',
    'chat.liveOff': '关闭实时',
    'chat.liveTextOn': '实时文本开',
    'chat.liveTextOff': '实时文本关',
    'chat.apiKey': 'API密钥设置',
    'chat.image': '图片',
    'chat.pdf': 'PDF/文档',
    
    // Disclaimer
    'disclaimer.text': '信息仅供参考。请咨询医生。',
    
    // Suggested questions
    'suggest.headache': '我头疼，是感冒吗？',
    'suggest.anxiety': '哪些疗法可以减轻焦虑？',
    'suggest.paracetamol': '扑热息痛的信息？',
    'suggest.preventFlu': '如何预防流感？',
    'suggest.immuneFood': '增强免疫力的饮食？',
    'suggest.exercise': '如何健康运动？',
    'suggest.heartDisease': '如何预防心脏病？',
    'suggest.healthCheck': '体检包括什么？',
    
    // Welcome
    'welcome.greeting': '你好！我是专业的AI健康助手。我可以帮助您了解健康问题。您有什么问题吗？',
  },
  
  ru: {
    // Header
    'nav.home': 'Главная',
    'nav.consult': 'Консультация',
    'nav.confide': 'Доверие',
    'nav.guide': 'Руководство',
    'nav.tools': 'Инструменты',
    'nav.login': 'Войти',
    
    // Sidebar
    'sidebar.history': 'История чата',
    'sidebar.search': 'Поиск...',
    'sidebar.new': 'Новый',
    'sidebar.refresh': 'Обновить',
    'sidebar.close': 'Закрыть',
    'sidebar.open': 'Открыть историю',
    'sidebar.noConversations': 'Нет разговоров',
    'sidebar.noTitle': 'Без названия',
    'sidebar.loading': 'Загрузка...',
    'sidebar.connectionError': 'Ошибка подключения',
    
    // Chat
    'chat.placeholder': 'Введите ваш вопрос...',
    'chat.send': 'Отправить',
    'chat.stopRecording': 'Остановить',
    'chat.startRecording': 'Записать',
    'chat.voiceChat': 'Голосовой чат',
    'chat.liveOn': 'Live ВКЛ',
    'chat.liveOff': 'Live ВЫКЛ',
    'chat.liveTextOn': 'Текст live ВКЛ',
    'chat.liveTextOff': 'Текст live ВЫКЛ',
    'chat.apiKey': 'Настройки API',
    'chat.image': 'Фото',
    'chat.pdf': 'PDF/Документ',
    
    // Disclaimer
    'disclaimer.text': 'Информация только для справки. Проконсультируйтесь с врачом.',
    
    // Suggested questions
    'suggest.headache': 'У меня болит голова, это грипп?',
    'suggest.anxiety': 'Какие методы помогают при тревоге?',
    'suggest.paracetamol': 'Информация о парацетамоле?',
    'suggest.preventFlu': 'Как предотвратить грипп?',
    'suggest.immuneFood': 'Диета для иммунитета?',
    'suggest.exercise': 'Как правильно заниматься спортом?',
    'suggest.heartDisease': 'Профилактика болезней сердца?',
    'suggest.healthCheck': 'Что включает медосмотр?',
    
    // Welcome
    'welcome.greeting': 'Здравствуйте! Я специализированный AI-помощник по здоровью. Я могу помочь вам узнать о проблемах со здоровьем. У вас есть вопросы?',
  },
  
  hi: {
    // Header
    'nav.home': 'होम',
    'nav.consult': 'परामर्श',
    'nav.confide': 'विश्वास',
    'nav.guide': 'गाइड',
    'nav.tools': 'उपकरण',
    'nav.login': 'लॉगिन',
    
    // Sidebar
    'sidebar.history': 'चैट इतिहास',
    'sidebar.search': 'खोजें...',
    'sidebar.new': 'नया',
    'sidebar.refresh': 'रिफ्रेश',
    'sidebar.close': 'बंद करें',
    'sidebar.open': 'इतिहास खोलें',
    'sidebar.noConversations': 'कोई बातचीत नहीं',
    'sidebar.noTitle': 'बिना शीर्षक',
    'sidebar.loading': 'लोड हो रहा है...',
    'sidebar.connectionError': 'कनेक्शन विफल',
    
    // Chat
    'chat.placeholder': 'अपना सवाल लिखें...',
    'chat.send': 'भेजें',
    'chat.stopRecording': 'रिकॉर्डिंग बंद करें',
    'chat.startRecording': 'रिकॉर्ड करें',
    'chat.voiceChat': 'वॉइस चैट',
    'chat.liveOn': 'लाइव चालू',
    'chat.liveOff': 'लाइव बंद',
    'chat.liveTextOn': 'लाइव टेक्स्ट चालू',
    'chat.liveTextOff': 'लाइव टेक्स्ट बंद',
    'chat.apiKey': 'API कुंजी सेटिंग्स',
    'chat.image': 'फोटो',
    'chat.pdf': 'PDF/डॉक',
    
    // Disclaimer
    'disclaimer.text': 'जानकारी केवल संदर्भ के लिए है। कृपया डॉक्टर से परामर्श करें।',
    
    // Suggested questions
    'suggest.headache': 'मुझे सिरदर्द है, क्या यह फ्लू है?',
    'suggest.anxiety': 'चिंता कम करने के लिए कौन सी थेरेपी?',
    'suggest.paracetamol': 'पैरासिटामोल के बारे में जानकारी?',
    'suggest.preventFlu': 'फ्लू से कैसे बचें?',
    'suggest.immuneFood': 'इम्यूनिटी बढ़ाने का आहार?',
    'suggest.exercise': 'स्वस्थ व्यायाम कैसे करें?',
    'suggest.heartDisease': 'दिल की बीमारी से बचाव?',
    'suggest.healthCheck': 'स्वास्थ्य जांच में क्या शामिल है?',
    
    // Welcome
    'welcome.greeting': 'नमस्ते! मैं एक विशेष AI स्वास्थ्य सहायक हूं। मैं आपको स्वास्थ्य समस्याओं को समझने में मदद कर सकता हूं। क्या आपके कोई सवाल हैं?',
  },
}

export function t(key: string, locale: Locale = 'vi'): string {
  return translations[locale]?.[key] || translations['vi'][key] || key
}

export function getSuggestedQuestions(locale: Locale = 'vi'): string[] {
  return [
    t('suggest.headache', locale),
    t('suggest.anxiety', locale),
    t('suggest.paracetamol', locale),
    t('suggest.preventFlu', locale),
  ]
}
