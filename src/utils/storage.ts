import { AIProviderConfig, ChatMessage, ChatSession, Quote, ProviderTestResult, PersonaType } from '../types';
import { INITIAL_QUOTES } from '../data/quotesData';

const FAVORITES_KEY = 'dazai_app_favorites';
const AI_CONFIG_KEY = 'dazai_app_ai_config';
const AI_TEST_RESULT_KEY = 'dazai_app_ai_test_result';
const CHAT_HISTORY_KEY = 'dazai_app_chat_history';
const CHAT_SESSIONS_KEY = 'dazai_app_chat_sessions';
const ACTIVE_SESSION_ID_KEY = 'dazai_app_active_session_id';
const CUSTOM_QUOTES_KEY = 'dazai_app_custom_quotes';
const THEME_KEY = 'dazai_app_theme';
const NOTIFICATION_SETTINGS_KEY = 'dazai_app_notifications';
const PER_PROVIDER_STATUS_KEY = 'dazai_app_per_provider_status';

export const DEFAULT_AI_CONFIG: AIProviderConfig = {
  provider: 'gemini',
  geminiKey: '',
  openAiKey: '',
  anthropicKey: '',
  groqKey: '',
  customBaseUrl: '',
  customKey: '',
  selectedModel: 'gemini-3.8-flash',
  temperature: 0.85,
};

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : ['dazai-01', 'dazai-15'];
  } catch {
    return ['dazai-01', 'dazai-15'];
  }
}

export function toggleFavorite(quoteId: string): string[] {
  const current = getFavorites();
  const next = current.includes(quoteId)
    ? current.filter((id) => id !== quoteId)
    : [...current, quoteId];
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function getAIConfig(): AIProviderConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return DEFAULT_AI_CONFIG;
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_AI_CONFIG, ...parsed };

    // Migrate deprecated Gemini models
    if (
      merged.provider === 'gemini' &&
      (!merged.selectedModel ||
        merged.selectedModel.includes('2.5') ||
        merged.selectedModel.includes('2.0') ||
        merged.selectedModel.includes('1.5'))
    ) {
      merged.selectedModel = 'gemini-3.8-flash';
    }

    // Migrate deprecated Groq models
    if (
      merged.provider === 'groq' &&
      (!merged.selectedModel ||
        merged.selectedModel.includes('llama-3') ||
        merged.selectedModel.includes('mixtral') ||
        merged.selectedModel === 'default')
    ) {
      merged.selectedModel = 'openai/gpt-oss-120b';
    }

    // Migrate deprecated OpenAI models
    if (
      merged.provider === 'openai' &&
      (!merged.selectedModel ||
        merged.selectedModel.includes('gpt-3.5') ||
        merged.selectedModel === 'default')
    ) {
      merged.selectedModel = 'gpt-4o-mini';
    }

    // Migrate deprecated Anthropic models
    if (
      merged.provider === 'anthropic' &&
      (!merged.selectedModel ||
        (!merged.selectedModel.startsWith('claude-3-5') &&
          !merged.selectedModel.startsWith('claude-3-opus')) ||
        merged.selectedModel === 'default')
    ) {
      merged.selectedModel = 'claude-3-5-haiku-20241022';
    }

    // Auto-migrate groqKey if stored in customKey
    if (!merged.groqKey && merged.customKey && merged.customKey.startsWith('gsk_')) {
      merged.groqKey = merged.customKey;
    }

    return merged;
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

export function saveAIConfig(config: AIProviderConfig) {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Ignore
  }
}

export function clearAIKeys(): AIProviderConfig {
  const current = getAIConfig();
  const resetConfig: AIProviderConfig = {
    ...current,
    geminiKey: '',
    openAiKey: '',
    anthropicKey: '',
    groqKey: '',
    customKey: '',
  };
  saveAIConfig(resetConfig);
  return resetConfig;
}

export function getLastTestResult(): ProviderTestResult {
  try {
    const raw = localStorage.getItem(AI_TEST_RESULT_KEY);
    if (!raw) {
      return {
        testedAt: 0,
        status: 'idle',
        message: 'لم يتم فحص الاتصال بعد. انقر على "فحص الاتصال بالمزود" للتحقق.',
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      testedAt: 0,
      status: 'idle',
      message: 'لم يتم فحص الاتصال بعد.',
    };
  }
}

export function saveLastTestResult(result: ProviderTestResult) {
  try {
    localStorage.setItem(AI_TEST_RESULT_KEY, JSON.stringify(result));
  } catch {
    // Ignore
  }
}

export type ProviderStatusMap = Record<
  string,
  {
    status: 'idle' | 'testing' | 'success' | 'error';
    testedAt: number;
    message: string;
    latencyMs?: number;
  }
>;

export function getProviderStatuses(): ProviderStatusMap {
  try {
    const raw = localStorage.getItem(PER_PROVIDER_STATUS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveProviderStatus(
  provider: string,
  result: {
    status: 'idle' | 'testing' | 'success' | 'error';
    testedAt: number;
    message: string;
    latencyMs?: number;
  }
) {
  try {
    const current = getProviderStatuses();
    current[provider] = result;
    localStorage.setItem(PER_PROVIDER_STATUS_KEY, JSON.stringify(current));
  } catch {
    // Ignore
  }
}

export function getChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (!raw) {
      return [
        {
          id: 'welcome-01',
          role: 'assistant',
          content: 'مساء الخير... أجلس هنا في عتمة هذه الغرفة، أستمع إلى صوت الريح في شوارع طوكيو القديمة. ما الذي يثقل كاهل روحك الليلة؟ حدثني دون خوف من أن أحكم عليك، فأنا أكثر الناس ارتباكاً في هذا العالم.',
          persona: 'dazai',
          timestamp: Date.now() - 1000 * 60 * 5,
        },
      ];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveChatHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.slice(-80)));
  } catch {
    // Ignore
  }
}

/**
 * Chat Sessions Management (سجل المحادثات وجلسات الحوار)
 */
export function getChatSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_KEY);
    if (!raw) {
      const defaultHistory = getChatHistory();
      if (defaultHistory.length > 0) {
        const initialSession: ChatSession = {
          id: 'session-default',
          title: 'حوار في عتمة طوكيو',
          persona: defaultHistory[0]?.persona || 'dazai',
          createdAt: defaultHistory[0]?.timestamp || Date.now(),
          updatedAt: defaultHistory[defaultHistory.length - 1]?.timestamp || Date.now(),
          messages: defaultHistory,
        };
        saveChatSessions([initialSession]);
        return [initialSession];
      }
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore
  }
}

export function getActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveSessionId(id: string) {
  try {
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
  } catch {
    // Ignore
  }
}

export function createNewChatSession(persona: PersonaType = 'dazai', initialTitle?: string): ChatSession {
  const personaWelcomes: Record<PersonaType, string> = {
    dazai: 'مساء الخير... أجلس هنا في عتمة هذه الغرفة، أستمع إلى صوت الريح في شوارع طوكيو القديمة. ما الذي يثقل كاهل روحك الليلة؟ حدثني دون خوف من أن أحكم عليك، فأنا أكثر الناس ارتباكاً في هذا العالم.',
    friend: 'أهلاً بك يا رفيقي... اجلس بجانبي ودع هموم النهار عند الباب. كوب الشاي دافئ، وأنا هنا لأصغي لكل ما يخالج صدرك.',
    sensei: 'مرحباً بك في أروقة الأدب والفلسفة. بين صفحات التاريخ وأوجاع الوجود، نبحث عن المعنى والجمال الزائل. ما المسألة التي ترغب في تأملها معي؟',
    yozo: 'هههه، أهلاً بك في مسرحي الهزلي الصغير! أرتدي قناع المهرج لأخفي رعشة روحي، لكن أمامك ربما نجرؤ على نزع الأقنعة قليلاً... ماذا يدور في بالك؟',
    narcissist: 'أهلًا بك. لا تتوقع أن أشرح لك نفسي؛ يكفي أن تنظر جيدًا لتعرف أنك أمام شخص لا يتكرر. ما العبارة التي تستحق أن تُكتب عنك؟',
  };

  const newSession: ChatSession = {
    id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: initialTitle || `محادثة جديدة مع ${persona === 'dazai' ? 'دازاي' : persona === 'friend' ? 'الصديق' : persona === 'sensei' ? 'المعلم' : persona === 'narcissist' ? 'النرجسي' : 'يوزو'}`,
    persona,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [
      {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: personaWelcomes[persona] || personaWelcomes.dazai,
        persona,
        timestamp: Date.now(),
      },
    ],
  };

  const existing = getChatSessions();
  saveChatSessions([newSession, ...existing]);
  saveActiveSessionId(newSession.id);
  saveChatHistory(newSession.messages);
  return newSession;
}

export function updateChatSession(sessionId: string, messages: ChatMessage[], newTitle?: string): ChatSession[] {
  const sessions = getChatSessions();
  let updated = sessions.map((s) => {
    if (s.id === sessionId) {
      // derive title from first user message if still default title
      let title = newTitle || s.title;
      if (!newTitle) {
        const firstUser = messages.find((m) => m.role === 'user');
        if (firstUser && (s.title.startsWith('محادثة جديدة') || s.title === 'حوار في عتمة طوكيو')) {
          title = firstUser.content.slice(0, 32) + (firstUser.content.length > 32 ? '...' : '');
        }
      }
      return {
        ...s,
        title,
        messages,
        updatedAt: Date.now(),
      };
    }
    return s;
  });

  // If session wasn't found in list, prepend it
  if (!updated.some((s) => s.id === sessionId)) {
    const fresh: ChatSession = {
      id: sessionId,
      title: newTitle || 'محادثة أدبية',
      persona: messages[0]?.persona || 'dazai',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages,
    };
    updated = [fresh, ...updated];
  }

  saveChatSessions(updated);
  saveChatHistory(messages);
  return updated;
}

export function deleteChatSession(sessionId: string): ChatSession[] {
  const sessions = getChatSessions().filter((s) => s.id !== sessionId);
  saveChatSessions(sessions);
  return sessions;
}

export function clearAllChatSessions(): ChatSession[] {
  saveChatSessions([]);
  try {
    localStorage.removeItem(CHAT_SESSIONS_KEY);
    localStorage.removeItem(CHAT_HISTORY_KEY);
    localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
  } catch {
    // Ignore
  }
  return [];
}

export const PERMANENT_SAVED_SPARKS_KEY = 'dazai_permanent_ai_sparks';

export function getCustomQuotes(): Quote[] {
  try {
    const raw = localStorage.getItem(CUSTOM_QUOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomQuote(quote: Quote): Quote[] {
  const current = getCustomQuotes();
  // Deduplicate by ID or clean text
  const filtered = current.filter(
    (q) => q.id !== quote.id && q.textAr.trim() !== quote.textAr.trim()
  );
  const updated = [quote, ...filtered];
  try {
    localStorage.setItem(CUSTOM_QUOTES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

/**
 * Returns all AI sparks that the user chose to save permanently for life (محفوظة محلياً مدى الحياة)
 */
export function getPermanentlySavedQuotes(): Quote[] {
  try {
    const raw = localStorage.getItem(PERMANENT_SAVED_SPARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Checks if a specific quote is permanently saved in lifetime local storage
 */
export function isQuotePermanentlySaved(quoteId?: string, quoteText?: string): boolean {
  if (!quoteId && !quoteText) return false;
  try {
    const list = getPermanentlySavedQuotes();
    return list.some(
      (q) =>
        (quoteId && q.id === quoteId) ||
        (quoteText && q.textAr.trim() === quoteText.trim())
    );
  } catch {
    return false;
  }
}

/**
 * Toggles permanent local lifetime saving of an AI quote.
 * Guarantees persistence in both permanent storage and general library.
 */
export function togglePermanentlySavedQuote(quote: Quote): { isSaved: boolean; list: Quote[] } {
  try {
    const list = getPermanentlySavedQuotes();
    const existingIndex = list.findIndex(
      (q) => q.id === quote.id || q.textAr.trim() === quote.textAr.trim()
    );

    let updated: Quote[];
    let isSaved: boolean;

    if (existingIndex >= 0) {
      // Remove from permanent list
      updated = list.filter((_, idx) => idx !== existingIndex);
      isSaved = false;
    } else {
      // Add permanently with metadata
      const enrichedQuote: Quote = {
        ...quote,
        isPermanentlySaved: true,
        isAiGenerated: true,
        tags: Array.from(
          new Set([...(quote.tags || []), 'محفوظة محلياً مدى الحياة', 'شذرة ذكية'])
        ),
      };
      updated = [enrichedQuote, ...list];
      isSaved = true;

      // Also ensure it is saved in custom quotes library forever
      saveCustomQuote(enrichedQuote);
    }

    localStorage.setItem(PERMANENT_SAVED_SPARKS_KEY, JSON.stringify(updated));
    return { isSaved, list: updated };
  } catch {
    return { isSaved: false, list: [] };
  }
}

export function getAllQuotes(): Quote[] {
  const custom = getCustomQuotes();
  return [...custom, ...INITIAL_QUOTES];
}

export const DAILY_AI_QUOTE_KEY = 'dazai_daily_ai_quote';
export const DAILY_AI_HISTORY_KEY = 'dazai_daily_ai_history';
export const AUTO_DAILY_AI_KEY = 'dazai_auto_daily_ai_enabled';

export function getDailyQuote(): Quote {
  try {
    const raw = localStorage.getItem(DAILY_AI_QUOTE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.quote && parsed.quote.textAr) {
        return parsed.quote;
      }
    }
  } catch {
    // fallback
  }

  const all = INITIAL_QUOTES;
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24
  );
  return all[dayOfYear % all.length] || all[0];
}

export function getTheme(): 'dark' | 'sepia' {
  try {
    return (localStorage.getItem(THEME_KEY) as 'dark' | 'sepia') || 'dark';
  } catch {
    return 'dark';
  }
}

export function saveTheme(theme: 'dark' | 'sepia') {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore
  }
}

export interface NotificationSettings {
  enabled: boolean;
  time: string; // e.g. "21:00"
  lastSentDate?: string;
}

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { enabled: false, time: '21:00' };
  } catch {
    return { enabled: false, time: '21:00' };
  }
}

export function saveNotificationSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

const LANGUAGE_KEY = 'dazai_app_language';

export function getStoredLanguage(): 'ar' | 'en' | 'ja' {
  try {
    const raw = localStorage.getItem(LANGUAGE_KEY);
    if (raw === 'ar' || raw === 'en' || raw === 'ja') {
      return raw;
    }
  } catch {
    // Ignore
  }
  return 'ar';
}

export function saveStoredLanguage(lang: 'ar' | 'en' | 'ja') {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch {
    // Ignore
  }
}
