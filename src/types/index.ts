export type CategoryId = 'solitude' | 'existence' | 'relationships' | 'faint_hope' | 'letters';

export type AppLanguage = 'ar' | 'en' | 'ja';

export interface CategoryInfo {
  id: CategoryId;
  name: string;
  kanji: string;
  description: string;
  iconName: string;
}

export interface Quote {
  id: string;
  textAr: string;
  textJp: string;
  source: string;
  chapter: string;
  category: CategoryId;
  reflection: string;
  tags: string[];
  year: number;
  readingTimeSec: number;
  isDailyFeatured?: boolean;
  isAiGenerated?: boolean;
  isPermanentlySaved?: boolean;
  dailyDate?: string;
  providerUsed?: string;
  modelUsed?: string;
}

export interface DailyAIQuoteRecord {
  dateKey: string; // "YYYY-MM-DD"
  quote: Quote;
  generatedAt: number;
  provider: AIProvider;
  model: string;
  topic: string;
}

export type AIProvider = 'gemini' | 'openai' | 'anthropic' | 'groq' | 'custom';

export type PersonaType = 'dazai' | 'friend' | 'sensei' | 'yozo' | 'narcissist' | 'ashPhilosopher';

export interface PersonaInfo {
  id: PersonaType;
  title: string;
  kanji: string;
  subtitle: string;
  description: string;
  quoteSample: string;
  avatarSeed: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  persona: PersonaType;
  timestamp: number;
  providerUsed?: string;
  isAudioPlaying?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  persona: PersonaType;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface AIProviderConfig {
  provider: AIProvider;
  geminiKey: string;
  openAiKey: string;
  anthropicKey: string;
  groqKey: string;
  customBaseUrl: string;
  customKey: string;
  selectedModel: string;
  temperature: number;
}

export interface ProviderTestResult {
  testedAt: number;
  status: 'idle' | 'testing' | 'success' | 'error';
  message: string;
  latencyMs?: number;
  provider?: string;
  model?: string;
}

export interface CardExportConfig {
  style: 'dark-ink' | 'parchment' | 'forest-night' | 'monochrome';
  aspectRatio: 'square' | 'story' | 'landscape';
  showJapanese: boolean;
  showHankoSeal: boolean;
  showReflection: boolean;
  fontSize: 'sm' | 'md' | 'lg';
  textAlign?: 'center' | 'right';
  quoteMarkStyle?: 'classic' | 'brackets' | 'none';
  sealPosition?: 'center' | 'left' | 'right';
}
