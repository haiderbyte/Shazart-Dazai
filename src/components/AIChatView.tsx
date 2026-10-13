import React, { useState, useRef, useEffect } from 'react';
import { PersonaType, ChatMessage, ChatSession, AIProviderConfig } from '../types';
import { PERSONAS } from '../data/quotesData';
import {
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RefreshCw,
  User,
  Sliders,
  AlertCircle,
  Activity,
  History,
  Plus,
  Trash2,
  RotateCcw,
  Feather,
  ChevronDown,
} from 'lucide-react';
import { audioManager } from '../utils/sound';
import {
  getChatSessions,
  saveActiveSessionId,
  saveChatSessions,
  getActiveSessionId,
  createNewChatSession,
  updateChatSession,
  deleteChatSession,
  clearAllChatSessions,
} from '../utils/storage';
import { validateProvider } from '../utils/ai';
import { directChat } from '../utils/aiClient';
import { ChatHistoryModal } from './ChatHistoryModal';
import { useLanguage } from '../i18n/LanguageContext';

interface AIChatViewProps {
  aiConfig: AIProviderConfig;
  theme: 'dark' | 'sepia';
  onOpenSettings: () => void;
}

export const AIChatView: React.FC<AIChatViewProps> = ({
  aiConfig,
  theme,
  onOpenSettings,
}) => {
  const { t } = useLanguage();
  // Sessions & History state
  const [sessions, setSessions] = useState<ChatSession[]>(() => getChatSessions());
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = getActiveSessionId();
    const existing = getChatSessions();
    if (saved && existing.some((s) => s.id === saved)) {
      return saved;
    }
    if (existing.length > 0) {
      return existing[0].id;
    }
    const fresh = createNewChatSession('dazai');
    return fresh.id;
  });

  const activeSession = sessions.find((s) => s.id === activeSessionId) || sessions[0] || null;

  const [selectedPersona, setSelectedPersona] = useState<PersonaType>(() => {
    return activeSession?.persona || 'dazai';
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return activeSession?.messages || [];
  });

  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isConfirmingClearModal, setIsConfirmingClearModal] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveProviderStatus, setLiveProviderStatus] = useState<
    'idle' | 'testing' | 'online' | 'offline'
  >('idle');
  const [liveLatency, setLiveLatency] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsPersonaDropdownOpen(false);
      }
    };
    if (isPersonaDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPersonaDropdownOpen]);

  // Sync activeSession changes to state
  useEffect(() => {
    if (activeSession) {
      setMessages(activeSession.messages);
      setSelectedPersona(activeSession.persona);
      saveActiveSessionId(activeSession.id);
    }
  }, [activeSessionId]);

  // Quick Inline Provider Health Check
  const handleQuickHealthCheck = async () => {
    audioManager.playInkDrop();
    setLiveProviderStatus('testing');
    try {
      const result = await validateProvider(aiConfig);
      if (result.success) {
        audioManager.playSingingBowl();
        setLiveProviderStatus('online');
        setLiveLatency(result.latencyMs || null);
        setTimeout(() => setLiveProviderStatus('idle'), 6000);
      } else {
        setLiveProviderStatus('offline');
        setErrorMsg(result.message || 'المزود غير متاح حالياً');
      }
    } catch {
      setLiveProviderStatus('offline');
      setErrorMsg('تعذر الاتصال بالخادم لفحص المزود');
    }
  };

  const currentPersona = PERSONAS.find((p) => p.id === selectedPersona) || PERSONAS[0];

  const quickPrompts: Record<PersonaType, string[]> = {
    dazai: [
      'لماذا يشعر الإنسان بالرعب من حقيقة نفسه؟',
      'حدثني عن شمس الغروب حين تنطفئ في سماء طوكيو...',
      'هل كان قناع المهرج حماية أم سجناً؟',
      'ما معنى أن تحب عالماً يعجز عن فهمك؟',
      'كيف نعيش بصدق في مجتمع يعشق المجاملات؟',
    ],
    friend: [
      'أشعر بثقل عظيم في قلبي هذه الليلة...',
      'كيف يتعامل المرء مع صمت البيت في أواخر الليل؟',
      'هل تعتقد أننا سنعثر على السكينة يوماً ما؟',
      'أنا متعب من التظاهر بأن كل شيء على ما يرام.',
      'شاركتك قهوتي وصمتي، فبماذا تشعر الليلة؟',
    ],
    sensei: [
      'ما هي فلسفة "المونو نو أواري" في الأدب الياباني؟',
      'كيف ترى الفارق بين أدب دازاي وأدب أوتوشيما؟',
      'هل الألم ضروري لولادة النص الأدبي الخالد؟',
      'حلل لي المعنى العميق خلف جملة "لم أعد إنساناً".',
      'كيف عبر أدباء البورايها عن مأساة ما بعد الحرب؟',
    ],
    yozo: [
      'كيف استطعت إضحاك الناس وأنت ترتعد خوفاً؟',
      'ألا تخشى أن يكتشف أحدهم أنك تمثّل؟',
      'ما هي أسخف التقاليد التي يمارسها البشر برأيك؟',
      'ماذا تفعل حين تنتهي المسرحية وتعود لغرفتك؟',
      'هل تعتقد أن العالم مسرح كبير أم مقبرة ناطقة؟',
    ],
    narcissist: [
      'لماذا يزعجك أن يلمع شخص غيرك؟',
      'هل غرورك قناع أم أنك فعلًا أفضل من الجميع؟',
      'ماذا يبقى منك حين لا يصفق لك أحد؟',
      'هل تستطيع الاعتذار دون أن تحوّله إلى مديح لنفسك؟',
      'لماذا تخاف أن تكون شخصًا عاديًا؟',
    ],
    ashPhilosopher: [
      'هل يمنحنا الفقد معنى أم يتركنا أكثر فراغًا؟',
      'لماذا لا نرى قيمة اللحظة إلا بعد أن تصبح ذكرى؟',
      'هل يمكن للإنسان أن يصادق حزنه؟',
      'ماذا يبقى منّا حين ينسى العالم أسماءنا؟',
      'هل النهاية موت أم طريقة أخرى لبداية المعنى؟',
    ],
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSelectPersona = (personaId: PersonaType) => {
    audioManager.playPaperRustle();
    setSelectedPersona(personaId);
    setIsPersonaDropdownOpen(false);

    if (activeSessionId) {
      const sessionIndex = sessions.findIndex((s) => s.id === activeSessionId);
      if (sessionIndex !== -1) {
        const updated = [...sessions];
        updated[sessionIndex] = {
          ...updated[sessionIndex],
          persona: personaId,
          updatedAt: Date.now(),
        };
        setSessions(updated);
        saveChatSessions(updated);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    audioManager.playInkDrop();
    setErrorMsg(null);

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      persona: selectedPersona,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Update session immediately with user message
    const updatedSessions = updateChatSession(activeSessionId, newMessages);
    setSessions(updatedSessions);

    try {
      const data = await directChat(aiConfig, text, selectedPersona, newMessages.slice(-7, -1));

      const assistantMessage: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.reply || '... (صمت متأمل في هواء الغرفة البارد)',
        persona: selectedPersona,
        timestamp: Date.now(),
        providerUsed: data.provider,
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      const afterAssistantSessions = updateChatSession(activeSessionId, finalMessages);
      setSessions(afterAssistantSessions);
      audioManager.playPaperRustle();
    } catch (err: any) {
      setErrorMsg(err.message || 'تعذر إرسال الرسالة، يرجى المحاولة ثانية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    audioManager.playPaperRustle();
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeech = (id: string, text: string) => {
    if (!('speechSynthesis' in window)) return;

    if (playingMessageId === id) {
      window.speechSynthesis.cancel();
      setPlayingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.84;
    utterance.pitch = selectedPersona === 'yozo' ? 1.05 : 0.92;

    utterance.onend = () => setPlayingMessageId(null);
    utterance.onerror = () => setPlayingMessageId(null);

    setPlayingMessageId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleCreateNewChat = (persona: PersonaType = selectedPersona) => {
    audioManager.playPaperRustle();
    const newSess = createNewChatSession(persona);
    const updated = getChatSessions();
    setSessions(updated);
    setActiveSessionId(newSess.id);
    setSelectedPersona(persona);
    setMessages(newSess.messages);
  };

  const handleSelectSession = (session: ChatSession) => {
    audioManager.playPaperRustle();
    setActiveSessionId(session.id);
    setSelectedPersona(session.persona);
    setMessages(session.messages);
  };

  const handleDeleteSession = (sessionId: string) => {
    audioManager.playInkDrop();
    const updated = deleteChatSession(sessionId);
    setSessions(updated);
    if (activeSessionId === sessionId) {
      if (updated.length > 0) {
        setActiveSessionId(updated[0].id);
        setSelectedPersona(updated[0].persona);
        setMessages(updated[0].messages);
      } else {
        const fresh = createNewChatSession('dazai');
        setSessions([fresh]);
        setActiveSessionId(fresh.id);
        setSelectedPersona('dazai');
        setMessages(fresh.messages);
      }
    }
  };

  const handleClearAllSessions = () => {
    audioManager.playInkDrop();
    clearAllChatSessions();
    const fresh = createNewChatSession('dazai');
    setSessions([fresh]);
    setActiveSessionId(fresh.id);
    setSelectedPersona('dazai');
    setMessages(fresh.messages);
  };

  const handleClearCurrentConversation = () => {
    audioManager.playInkDrop();
    const updated = updateChatSession(activeSessionId, []);
    setSessions(updated);
    setMessages([]);
    setIsConfirmingClearModal(false);
  };

  const handleDeleteCurrentChatSession = () => {
    audioManager.playInkDrop();
    handleDeleteSession(activeSessionId);
    setIsConfirmingClearModal(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] w-full max-w-5xl xl:max-w-6xl mx-auto px-2 sm:px-4 transition-all relative">
      {/* 1. FIXED TOP HEADER BAR WITH CLASSICAL PERSONA DROPDOWN MENU (شريط علوي ثابت لا يختفي أثناء التمرير) */}
      <div
        className={`sticky top-0 z-40 p-2.5 sm:p-3.5 rounded-2xl border mb-3 transition-colors shadow-lg backdrop-blur-md ${
          theme === 'dark'
            ? 'bg-[#16161C]/95 border-[#2E2E3C] shadow-black/40'
            : 'bg-[#FAF4EB]/95 border-[#D8C7B0] shadow-stone-900/10'
        }`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Classical Dropdown Trigger Button */}
          <div className="relative flex-1 sm:flex-initial" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                audioManager.playPaperRustle();
                setIsPersonaDropdownOpen(!isPersonaDropdownOpen);
              }}
              className={`w-full sm:w-auto min-w-[240px] md:min-w-[280px] px-3.5 py-2 rounded-xl border text-right transition-all flex items-center justify-between gap-3 group relative shadow-sm ${
                isPersonaDropdownOpen
                  ? theme === 'dark'
                    ? 'border-[#8B3A3A] bg-[#8B3A3A]/25 text-[#FAF6EE] ring-1 ring-[#8B3A3A]/60'
                    : 'border-[#7A3838] bg-[#7A3838]/15 text-[#7A3838] ring-1 ring-[#7A3838]/50'
                  : theme === 'dark'
                  ? 'border-[#383849] bg-[#1E1E28] hover:bg-[#252533] hover:border-[#8B3A3A]/50 text-[#E2D9C8]'
                  : 'border-[#D9C8B2] bg-[#F2E8D8]/80 hover:bg-[#EAE0D0] hover:border-[#7A3838]/50 text-[#2C241D]'
              }`}
              title="انقر لتغيير شخصية المجلس الأدبي"
            >
              {/* Persona Hanko Stamp Seal */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center font-kanji text-base flex-shrink-0 shadow-sm transition-transform group-hover:scale-105 ${
                    theme === 'dark'
                      ? 'border-[#8B3A3A] bg-[#8B3A3A]/30 text-[#FAF6EE]'
                      : 'border-[#7A3838] bg-[#7A3838]/20 text-[#7A3838]'
                  }`}
                >
                  {currentPersona.kanji.slice(0, 1)}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-[10px] opacity-60 font-sans-ui">
                      « الشخصية الأدبية »
                    </span>
                    <span className="text-[9px] px-1 rounded bg-inherit/30 font-kanji opacity-75 border border-inherit/20">
                      {currentPersona.kanji.slice(0, 2)}
                    </span>
                  </div>
                  <div className="font-amiri font-bold text-base sm:text-lg leading-tight truncate mt-0.5">
                    {currentPersona.title}
                  </div>
                </div>
              </div>

              {/* Classical Chevron with Rotation Indicator */}
              <div className="flex items-center gap-1.5 flex-shrink-0 pl-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C46868] animate-pulse hidden sm:inline-block" />
                <ChevronDown
                  className={`w-4 h-4 opacity-75 transition-transform duration-300 ${
                    isPersonaDropdownOpen ? 'rotate-180 text-[#C46868]' : ''
                  }`}
                />
              </div>
            </button>

            {/* CLASSICAL EXPANDED DROPDOWN PANEL (قائمة الاختيار المنسدلة بتصميم كلاسيكي عتيق) */}
            {isPersonaDropdownOpen && (
              <div
                className={`absolute right-0 top-full mt-2.5 w-80 sm:w-96 rounded-2xl border shadow-2xl p-2.5 z-50 animate-ink font-amiri backdrop-blur-xl ${
                  theme === 'dark'
                    ? 'bg-[#181822]/98 border-[#8B3A3A]/50 text-[#E2D9C8] shadow-black/80'
                    : 'bg-[#FAF4EB]/98 border-[#D8C7B0] text-[#2C241D] shadow-stone-900/20'
                }`}
              >
                {/* Classical Dropdown Header */}
                <div className="px-3 py-2 border-b border-inherit/15 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#C46868]" />
                    <span className="text-xs font-bold tracking-wide">
                      اختر جليس المجلس الأدبي
                    </span>
                  </div>
                  <span className="text-[10px] font-kanji opacity-60">文豪との対話</span>
                </div>

                {/* Persona Options List */}
                <div className="space-y-1.5">
                  {PERSONAS.map((persona) => {
                    const isSelected = selectedPersona === persona.id;
                    return (
                      <button
                        key={persona.id}
                        type="button"
                        onClick={() => handleSelectPersona(persona.id)}
                        className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-start gap-3 group relative ${
                          isSelected
                            ? theme === 'dark'
                              ? 'border-[#8B3A3A] bg-[#8B3A3A]/25 text-[#FAF6EE] shadow-sm ring-1 ring-[#8B3A3A]/60'
                              : 'border-[#7A3838] bg-[#7A3838]/15 text-[#7A3838] shadow-sm ring-1 ring-[#7A3838]/50'
                            : theme === 'dark'
                            ? 'border-transparent hover:bg-[#232330] hover:border-[#383849] opacity-85 hover:opacity-100'
                            : 'border-transparent hover:bg-[#EDE1D1] hover:border-[#DECDB7] opacity-85 hover:opacity-100'
                        }`}
                      >
                        {/* Hanko Wax Stamp */}
                        <span
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center font-kanji text-base flex-shrink-0 mt-0.5 shadow-sm transition-transform group-hover:scale-105 ${
                            isSelected
                              ? theme === 'dark'
                                ? 'border-[#8B3A3A] bg-[#8B3A3A]/40 text-[#FAF6EE]'
                                : 'border-[#7A3838] bg-[#7A3838]/25 text-[#7A3838]'
                              : 'border-inherit/25 bg-inherit/10'
                          }`}
                        >
                          {persona.kanji.slice(0, 1)}
                        </span>

                        {/* Title and Literary Tone Description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-base leading-tight">
                              {persona.title}
                            </span>
                            <span className="text-[10px] opacity-60 font-kanji">
                              {persona.kanji}
                            </span>
                          </div>

                          <div className="text-xs font-sans-ui opacity-75 mt-0.5 leading-snug">
                            {persona.subtitle}
                          </div>

                          <p className="text-[11px] font-amiri opacity-65 leading-relaxed mt-1 line-clamp-2">
                            {persona.description}
                          </p>
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-[#C46868] animate-pulse mt-2 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Tools: History, New Chat, Clear Chat, Diagnostics, Settings */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* History Modal Trigger */}
            <button
              onClick={() => {
                audioManager.playPaperRustle();
                setIsHistoryModalOpen(true);
              }}
              className={`px-3 py-2 rounded-xl border text-xs font-amiri font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                theme === 'dark'
                  ? 'bg-[#22222D] hover:bg-[#2C2C3A] border-[#363647] text-[#FAF6EE]'
                  : 'bg-[#EFE5D5] hover:bg-[#E4D7C3] border-[#D6C4AD] text-[#3D3025]'
              }`}
              title={t.chat.chatHistory}
            >
              <History className="w-3.5 h-3.5 text-[#C46868]" />
              <span className="hidden sm:inline">{t.chat.chatHistory}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-inherit/20 text-[10px] font-sans-ui border border-inherit/20">
                {sessions.length}
              </span>
            </button>

            {/* New Conversation Button */}
            <button
              onClick={() => handleCreateNewChat(selectedPersona)}
              className={`px-3 py-2 rounded-xl border text-xs font-amiri font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                theme === 'dark'
                  ? 'border-[#8B3A3A]/50 bg-[#8B3A3A]/20 text-[#E89292] hover:bg-[#8B3A3A]/30'
                  : 'border-[#7A3838]/40 bg-[#7A3838]/15 text-[#7A3838] hover:bg-[#7A3838]/25'
              }`}
              title={t.chat.newChat}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.chat.newChat}</span>
            </button>

            {/* Clear Current Chat Button in Header */}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  audioManager.playInkDrop();
                  setIsConfirmingClearModal(true);
                }}
                className={`px-2.5 py-2 rounded-xl border text-xs font-amiri flex items-center gap-1.5 transition-all text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 ${
                  theme === 'dark'
                    ? 'border-rose-500/30 bg-rose-500/10'
                    : 'border-rose-400/40 bg-rose-500/10 text-rose-700'
                }`}
                title={t.chat.clearChat}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">{t.chat.clearChat}</span>
              </button>
            )}

            {/* Provider Live Status Pill */}
            <button
              onClick={handleQuickHealthCheck}
              disabled={liveProviderStatus === 'testing'}
              className={`px-2.5 py-2 rounded-xl text-xs font-amiri flex items-center gap-1.5 border transition-all ${
                liveProviderStatus === 'online'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : liveProviderStatus === 'offline'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                  : liveProviderStatus === 'testing'
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : theme === 'dark'
                  ? 'border-[#33333F] hover:bg-[#252532] text-[#A89E90]'
                  : 'border-[#DECDB7] hover:bg-[#EFE4D3] text-[#6B5A4B]'
              }`}
              title="فحص فوري للمزود"
            >
              {liveProviderStatus === 'testing' ? (
                <RefreshCw className="w-3 h-3 animate-spin text-amber-400" />
              ) : liveProviderStatus === 'online' ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ) : liveProviderStatus === 'offline' ? (
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              ) : (
                <Activity className="w-3 h-3 text-[#C46868]" />
              )}
              <span className="text-[11px] hidden sm:inline">
                {liveProviderStatus === 'testing'
                  ? 'فحص...'
                  : liveProviderStatus === 'online'
                  ? `متصل (${liveLatency || 120}ms)`
                  : liveProviderStatus === 'offline'
                  ? 'غير متصل'
                  : `فحص (${aiConfig.provider})`}
              </span>
            </button>

            {/* Settings Trigger */}
            <button
              onClick={onOpenSettings}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 font-amiri transition-colors ${
                theme === 'dark'
                  ? 'border-[#33333F] hover:bg-[#252532] text-[#C5BAA8]'
                  : 'border-[#DECDB7] hover:bg-[#EFE4D3] text-[#55473B]'
              }`}
              title={t.chat.settingsBtn}
            >
              <Sliders className="w-3.5 h-3.5 text-[#C46868]" />
              <span className="text-[11px] hidden md:inline">{t.chat.settingsBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Diagnostic Warning/Error Alert */}
      {errorMsg && (
        <div className="mb-2.5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-amiri flex items-center justify-between animate-ink shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleQuickHealthCheck}
              className="text-[11px] underline hover:text-rose-100"
            >
              فحص المزود
            </button>
            <button
              onClick={onOpenSettings}
              className="text-[11px] underline text-[#E89292] hover:text-white"
            >
              فتح الإعدادات
            </button>
            <button
              onClick={() => setErrorMsg(null)}
              className="opacity-70 hover:opacity-100 text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3. Rich, Atmospheric Messages Canvas */}
      <div
        className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 rounded-2xl border space-y-6 sm:space-y-7 transition-colors shadow-inner backdrop-blur-sm relative ${
          theme === 'dark'
            ? 'bg-[#131317]/90 border-[#262633] bg-ink-texture'
            : 'bg-[#F6EFE3]/90 border-[#E2D5C0] bg-parchment-texture'
        }`}
      >
        {messages.length === 0 ? (
          <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-6 sm:p-10 opacity-75">
            <div
              className={`w-16 h-16 rounded-2xl border flex items-center justify-center font-kanji text-2xl mb-4 shadow-lg ${
                theme === 'dark'
                  ? 'border-[#8B3A3A] bg-[#8B3A3A]/20 text-[#E89292]'
                  : 'border-[#7A3838] bg-[#7A3838]/15 text-[#7A3838]'
              }`}
            >
              {currentPersona.kanji.slice(0, 1)}
            </div>
            <h3 className="font-amiri text-xl sm:text-2xl font-bold tracking-wide">
              المجلس الأدبي هادئ الليلة مع {currentPersona.title}
            </h3>
            <p className="text-sm sm:text-base max-w-lg mt-2 leading-relaxed font-amiri opacity-80">
              اختر سؤالاً من الأسئلة المقترحة أدناه أو شارك {currentPersona.title} بما يشغل بالك لتبدأ هذه الجلسة.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-kanji opacity-60">
              <Sparkles className="w-3.5 h-3.5 text-[#C46868]" />
              <span>{currentPersona.kanji} · {currentPersona.subtitle}</span>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isPlaying = playingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-3 sm:gap-4 md:gap-5 ${
                  isUser ? 'justify-end' : 'justify-start'
                } animate-ink group/msg relative`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="flex flex-col items-center flex-shrink-0 select-none">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center font-kanji text-base shadow-md transition-transform group-hover/msg:scale-105 ${
                        theme === 'dark'
                          ? 'border-[#8B3A3A] bg-[#8B3A3A]/25 text-[#FAF6EE] shadow-[#8B3A3A]/10'
                          : 'border-[#7A3838] bg-[#7A3838]/20 text-[#7A3838] shadow-[#7A3838]/10'
                      }`}
                    >
                      {currentPersona.kanji.slice(0, 1)}
                    </div>
                    <span className="text-[10px] font-kanji opacity-50 mt-1">
                      {currentPersona.kanji.slice(0, 2)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`w-full max-w-[94%] sm:max-w-[88%] md:max-w-[82%] rounded-2xl p-4 sm:p-6 text-base border shadow-sm transition-all relative ${
                    isUser
                      ? theme === 'dark'
                        ? 'bg-[#8B3A3A]/20 border-[#8B3A3A]/40 text-[#FAF6EE] rounded-tl-sm shadow-md'
                        : 'bg-[#7A3838]/15 border-[#7A3838]/35 text-[#2C241D] rounded-tl-sm shadow-md'
                      : theme === 'dark'
                      ? 'bg-[#1C1C24] border-[#2D2D3D] text-[#FAF6EE] rounded-tr-sm hover:border-[#3D3D52] shadow-md'
                      : 'bg-[#FAF5ED] border-[#DDD0BC] text-[#2C241D] rounded-tr-sm hover:border-[#CFC0A8] shadow-md'
                  }`}
                >
                  {/* Message Content */}
                  <div className="font-amiri text-base sm:text-lg lg:text-[19px] leading-[1.9] sm:leading-[2.1] tracking-wide whitespace-pre-wrap select-text">
                    {msg.content}
                  </div>

                  {/* Message Action Bar */}
                  <div className="mt-3.5 pt-2.5 border-t border-inherit/15 flex items-center justify-between text-xs opacity-75 group-hover/msg:opacity-100 transition-opacity flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-kanji text-[11px] font-bold">
                        {isUser ? 'أنت' : msg.providerUsed ? `· ${msg.providerUsed}` : currentPersona.title}
                      </span>
                      <span className="text-[10px] opacity-60 font-sans-ui">
                        {new Date(msg.timestamp).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Read Aloud Button (Assistant only) */}
                      {!isUser && (
                        <button
                          onClick={() => handleSpeech(msg.id, msg.content)}
                          className="px-2 py-1 rounded-lg hover:bg-inherit/15 transition-colors flex items-center gap-1 text-[11px] font-amiri"
                          title="قراءة صوتية بصوت هادئ"
                        >
                          {isPlaying ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5 text-[#C46868]" />
                              <span className="text-[#C46868]">إيقاف</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>استماع</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Copy Message Button */}
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="px-2 py-1 rounded-lg hover:bg-inherit/15 transition-colors flex items-center gap-1 text-[11px] font-amiri"
                        title="نسخ نص هذه الرسالة"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-sans-ui">تم</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="font-sans-ui">نسخ</span>
                          </>
                        )}
                      </button>

                      {/* Clear Chat Button */}
                      <button
                        onClick={() => {
                          audioManager.playInkDrop();
                          setIsConfirmingClearModal(true);
                        }}
                        className="px-2 py-1 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/15 flex items-center gap-1 text-[11px] font-amiri transition-colors border border-transparent hover:border-rose-500/30"
                        title="مسح هذه المحادثة الحالية بالكامل"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span className="font-sans-ui">مسح المحادثة</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="flex flex-col items-center flex-shrink-0 select-none">
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center font-sans text-xs shadow-md opacity-85 transition-transform group-hover/msg:scale-105 ${
                        theme === 'dark'
                          ? 'border-[#333345] bg-[#22222E] text-[#C5BAA8]'
                          : 'border-[#DECDB7] bg-[#EBE0D0] text-[#55473B]'
                      }`}
                    >
                      <User className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-sans-ui opacity-50 mt-1">القارئ</span>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 text-sm opacity-85 animate-pulse font-amiri p-3.5 rounded-2xl bg-black/15 border border-inherit/15 max-w-sm">
            <span className="w-3 h-3 rounded-full bg-[#C46868] animate-ping" />
            <div className="flex items-center gap-1.5">
              <Feather className="w-4 h-4 text-[#C46868] animate-bounce" />
              <span>{currentPersona.title} يغمس ريشته في الحبر ويكتب تأمله...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Suggested Inquiries / Quick Prompts Ribbon */}
      <div className="py-2.5 overflow-x-auto flex items-center gap-2 no-scrollbar">
        {quickPrompts[selectedPersona].map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-amiri border transition-all shadow-sm flex items-center gap-1.5 ${
              theme === 'dark'
                ? 'bg-[#1C1C24] border-[#2C2C3A] text-[#C5BAA8] hover:border-[#8B3A3A] hover:text-[#FAF6EE] hover:bg-[#252532]'
                : 'bg-[#FAF4EB] border-[#DECDB7] text-[#55473B] hover:border-[#7A3838] hover:text-[#2C241D] hover:bg-[#F2E5D3]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C46868] opacity-70" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* 5. Spacious Input Bar */}
      <div
        className={`p-2 sm:p-3 rounded-2xl border transition-colors flex items-end gap-2.5 shadow-md backdrop-blur-sm ${
          theme === 'dark'
            ? 'bg-[#191920]/95 border-[#2E2E3E]'
            : 'bg-[#FAF4EB]/95 border-[#DECDB7]'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder={`${t.chat.inputPlaceholder} ${currentPersona.title}...`}
          rows={1}
          className="flex-1 bg-transparent resize-none border-0 outline-none text-base font-amiri placeholder:opacity-40 px-3 py-1.5 max-h-36 leading-relaxed"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputValue.trim() || isLoading}
          className={`p-3 rounded-xl transition-all flex items-center justify-center flex-shrink-0 ${
            inputValue.trim() && !isLoading
              ? theme === 'dark'
                ? 'bg-[#8B3A3A] text-white shadow-md hover:bg-[#9F4242]'
                : 'bg-[#7A3838] text-white shadow-md hover:bg-[#8F4343]'
              : 'opacity-40 cursor-not-allowed'
          }`}
          title={t.chat.sendBtn}
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>
      </div>

      {/* 6. Clear Conversation Confirmation Modal */}
      {isConfirmingClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-ink">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-5 sm:p-6 transition-all font-amiri ${
              theme === 'dark'
                ? 'bg-[#1B1B22] border-[#363645] text-[#FAF6EE]'
                : 'bg-[#FAF4EB] border-[#DECDB7] text-[#2C241D]'
            }`}
          >
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{t.chat.clearModalTitle}</h3>
                <span className="text-[11px] opacity-65 font-kanji">対話履歴の全消去</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed opacity-85 mb-5">
              {t.chat.clearModalDesc}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleClearCurrentConversation}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t.chat.clearModalConfirm}</span>
              </button>

              <button
                onClick={handleDeleteCurrentChatSession}
                className={`w-full py-2 px-4 rounded-xl border text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                  theme === 'dark'
                    ? 'border-[#3D3D4E] hover:bg-[#252530] text-[#D8CFBF]'
                    : 'border-[#DECDB7] hover:bg-[#EAE0D0] text-[#423429]'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.chat.clearModalResetSession}</span>
              </button>

              <button
                onClick={() => setIsConfirmingClearModal(false)}
                className="w-full py-2 px-4 rounded-xl border border-transparent hover:bg-inherit/10 text-xs opacity-75 hover:opacity-100 transition-colors mt-1"
              >
                {t.chat.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Chat History Modal */}
      <ChatHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleCreateNewChat}
        onDeleteSession={handleDeleteSession}
        onClearAllSessions={handleClearAllSessions}
        theme={theme}
      />
    </div>
  );
};
