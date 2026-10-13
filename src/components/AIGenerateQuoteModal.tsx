import { directGenerateQuote } from '../utils/aiClient';
import React, { useState } from 'react';
import { Quote, AIProviderConfig, PersonaType } from '../types';
import {
  X,
  Sparkles,
  Feather,
  Dices,
  BookOpen,
  Info,
  HardDriveDownload,
  Check,
  Copy,
  Share2,
  RotateCcw,
} from 'lucide-react';
import { audioManager } from '../utils/sound';
import {
  DAZAI_BOOKS_CATALOG,
  ALL_DAZAI_THEMES,
  getRandomDazaiTheme,
  getRandomCuratedSpark,
} from '../data/dazaiLiteraryUniverse';
import { PERSONAS } from '../data/quotesData';
import { cleanQuoteText } from '../utils/dailyQuoteManager';
import {
  isQuotePermanentlySaved,
  togglePermanentlySavedQuote,
  saveCustomQuote,
} from '../utils/storage';

interface AIGenerateQuoteModalProps {
  onClose: () => void;
  onQuoteGenerated: (quote: Quote) => void;
  aiConfig: AIProviderConfig;
  theme: 'dark' | 'sepia';
}

export const AIGenerateQuoteModal: React.FC<AIGenerateQuoteModalProps> = ({
  onClose,
  onQuoteGenerated,
  aiConfig,
  theme,
}) => {
  const [topic, setTopic] = useState('');
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('dazai');
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [currentBookName, setCurrentBookName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuote, setGeneratedQuote] = useState<Quote | null>(null);
  const [isPermanentlySaved, setIsPermanentlySaved] = useState(false);
  const [justSavedNotification, setJustSavedNotification] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter themes according to the selected book
  const activeThemes =
    selectedBookId === 'all'
      ? ALL_DAZAI_THEMES
      : DAZAI_BOOKS_CATALOG.find((b) => b.id === selectedBookId)?.themes.map((t) => ({
          topic: t.topic,
          book: DAZAI_BOOKS_CATALOG.find((b) => b.id === selectedBookId)!.titleAr,
          category: t.category,
        })) || ALL_DAZAI_THEMES;

  // Roll a random topic from Dazai's rich universe
  const handleRandomizeTopic = () => {
    audioManager.playPaperRustle();
    const randomItem = getRandomDazaiTheme(topic);
    setTopic(randomItem.topic);
    setCurrentBookName(randomItem.book);
  };

  const handleSelectTheme = (themeTopic: string, bookTitle: string) => {
    audioManager.playPaperRustle();
    setTopic(themeTopic);
    setCurrentBookName(bookTitle);
  };

  const handleTogglePermanentSave = (quoteToSave: Quote) => {
    audioManager.playSingingBowl();
    const result = togglePermanentlySavedQuote(quoteToSave);
    setIsPermanentlySaved(result.isSaved);
    if (result.isSaved) {
      setJustSavedNotification(true);
      setTimeout(() => setJustSavedNotification(false), 3500);
    }
  };

  const handleCopyQuote = async (text: string, source: string, chapter: string) => {
    try {
      const shareText = `« ${text} »\n\n— ${source} (${chapter})\nأوسامو دازاي · 太宰治`;
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      audioManager.playPaperRustle();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleGenerate = async (explicitTopic?: string) => {
    const rawTopic = explicitTopic || topic;
    const finalTopic = cleanQuoteText(rawTopic).trim();
    if (!finalTopic || isGenerating) return;

    audioManager.playInkDrop();
    setIsGenerating(true);
    setGeneratedQuote(null);
    setIsPermanentlySaved(false);

    try {
      const personaName = PERSONAS.find((p) => p.id === selectedPersona)?.title || 'روح أوسامو دازاي';
      const data = { quote: await directGenerateQuote(aiConfig, finalTopic, personaName) };
      if (data.quote) {
        audioManager.playSingingBowl();
        const cleanedQuote: Quote = {
          ...data.quote,
          id: data.quote.id || `ai-${Date.now()}`,
          textJp: data.quote.textJp || '',
          source: data.quote.source || 'مستوحى من أدب دازاي',
          chapter: data.quote.chapter || 'شذرة أصلية',
          category: data.quote.category || 'solitude',
          year: data.quote.year || new Date().getFullYear(),
          readingTimeSec: data.quote.readingTimeSec || 15,
          textAr: cleanQuoteText(data.quote.textAr || ''),
          reflection: cleanQuoteText(data.quote.reflection || ''),
          tags: ['توليد أدبي', data.quote.source || 'أوسامو دازاي', 'أدب ياباني'],
        };
        // Auto-persist in custom quotes
        saveCustomQuote(cleanedQuote);
        setGeneratedQuote(cleanedQuote);
        setIsPermanentlySaved(isQuotePermanentlySaved(cleanedQuote.id, cleanedQuote.textAr));
        onQuoteGenerated(cleanedQuote);
      }
    } catch {
      // Offline / Quota Fallback: Real authentic curated Dazai spark from his book collection
      const spark = getRandomCuratedSpark();
      const fallbackQuote: Quote = {
        id: `gen-local-${Date.now()}`,
        textAr: cleanQuoteText(spark.textAr),
        textJp: spark.textJp,
        source: spark.bookTitleAr,
        chapter: spark.chapter,
        category: spark.category,
        reflection: cleanQuoteText(spark.reflection),
        tags: ['شذرة أدبية', spark.bookTitleAr, 'أوسامو دازاي'],
        year: spark.year || 1948,
        readingTimeSec: 15,
      };

      audioManager.playSingingBowl();
      saveCustomQuote(fallbackQuote);
      setGeneratedQuote(fallbackQuote);
      setIsPermanentlySaved(isQuotePermanentlySaved(fallbackQuote.id, fallbackQuote.textAr));
      onQuoteGenerated(fallbackQuote);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-ink overflow-y-auto">
      <div
        className={`relative w-full max-w-xl rounded-2xl border shadow-2xl p-5 sm:p-6 my-auto transition-colors ${
          theme === 'dark'
            ? 'bg-[#18181C] border-[#2D2D38] text-[#E2D9C8]'
            : 'bg-[#FAF4EB] border-[#DECDB7] text-[#2C241D]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-inherit/20">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-kanji text-sm border ${
                theme === 'dark'
                  ? 'bg-[#8B3A3A]/20 border-[#8B3A3A]/40 text-[#E89292]'
                  : 'bg-[#7A3838]/15 border-[#7A3838]/30 text-[#7A3838]'
              }`}
            >
              太宰
            </div>
            <div>
              <h3 className="font-amiri text-lg font-bold leading-tight">
                مولّد الشذرات الأدبية من كتب دازاي
              </h3>
              <p className="text-[11px] opacity-60 font-kanji">
                太宰治の文学世界・断片生成
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 transition-opacity"
            aria-label="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Generated Result Preview State */}
        {generatedQuote ? (
          <div className="space-y-4 animate-fadeIn">
            <div
              className={`p-4 sm:p-5 rounded-2xl border ${
                theme === 'dark'
                  ? 'bg-gradient-to-b from-[#212128] to-[#151518] border-[#363642]'
                  : 'bg-gradient-to-b from-[#FFFDF9] to-[#F5EAD9] border-[#DECDB7]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-3 text-xs">
                <span className="font-amiri font-bold text-[#C46868] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تم التوليد الأدبي بنجاح</span>
                </span>

                <span className="font-amiri text-[11px] opacity-60">
                  {generatedQuote.source} · {generatedQuote.chapter}
                </span>
              </div>

              {/* Quote text */}
              <blockquote className="font-amiri text-lg sm:text-xl font-bold leading-relaxed mb-2.5">
                « {generatedQuote.textAr} »
              </blockquote>

              {generatedQuote.textJp && (
                <p dir="ltr" className="font-kanji text-xs opacity-60 mb-3">
                  {generatedQuote.textJp}
                </p>
              )}

              {generatedQuote.reflection && (
                <div
                  className={`p-3 rounded-xl text-xs font-amiri leading-relaxed mb-4 border ${
                    theme === 'dark'
                      ? 'bg-black/25 border-[#2D2D38] text-[#C5BAA8]'
                      : 'bg-black/5 border-[#DECDB7] text-[#4A3D31]'
                  }`}
                >
                  <span className="font-bold text-[#C46868] ml-1">تأمل دازاي:</span>
                  {generatedQuote.reflection}
                </div>
              )}

              {/* Small Permanent Lifetime Save Button & Quick Actions */}
              <div className="pt-3 border-t border-inherit/15 flex flex-wrap items-center justify-between gap-2">
                {/* Dedicated Permanent Local Save Button */}
                <button
                  type="button"
                  onClick={() => handleTogglePermanentSave(generatedQuote)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-amiri transition-all ${
                    isPermanentlySaved
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-bold shadow-sm'
                      : theme === 'dark'
                      ? 'border-[#383848] hover:bg-[#25252D] text-[#E2D9C8] hover:border-emerald-500/50'
                      : 'border-[#DECDB7] hover:bg-[#EFE4D3] text-[#4A3D31] hover:border-emerald-600/50'
                  }`}
                  title={
                    isPermanentlySaved
                      ? 'محفوظة في جهازك مدى الحياة (انقر للإلغاء)'
                      : 'حفظ هذه الشذرة في الذاكرة المحلية لجهازك مدى الحياة'
                  }
                >
                  <HardDriveDownload
                    className={`w-4 h-4 ${
                      isPermanentlySaved ? 'text-emerald-400' : 'text-[#C46868]'
                    }`}
                  />
                  <span>
                    {justSavedNotification
                      ? '✓ تم الحفظ محلياً مدى الحياة!'
                      : isPermanentlySaved
                      ? 'محفوظة محلياً مدى الحياة ✓'
                      : 'حفظ محلي مدى الحياة (في جهازك)'}
                  </span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopyQuote(
                        generatedQuote.textAr,
                        generatedQuote.source,
                        generatedQuote.chapter
                      )
                    }
                    className="p-2 rounded-lg border border-inherit/20 hover:bg-inherit/10 text-xs font-amiri flex items-center gap-1"
                    title="نسخ الشذرة"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#C46868]" />
                    )}
                    <span className="text-[11px]">{copied ? 'تم النسخ' : 'نسخ'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notification message */}
            {justSavedNotification && (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-amiri text-center flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>تم حفظ الشذرة بنجاح في جهازك ولن تُحذف حتى عند تجديد اليوم!</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setGeneratedQuote(null);
                  handleRandomizeTopic();
                }}
                className="text-xs font-amiri flex items-center gap-1.5 opacity-80 hover:opacity-100 text-[#C46868]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>توليد شذرة أخرى بموضوع مختلف</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2 rounded-xl text-xs font-amiri font-bold text-white shadow-md ${
                  theme === 'dark' ? 'bg-[#8B3A3A] hover:bg-[#9F4242]' : 'bg-[#7A3838] hover:bg-[#8F4343]'
                }`}
              >
                تم والعودة
              </button>
            </div>
          </div>
        ) : (
          /* 2. Topic Selection & Generation Form */
          <>
            {/* Persona Selector */}
            <div className="mb-3.5">
              <label className="block text-[11px] font-amiri font-bold mb-1.5 opacity-80">
                اختر الشخصية التي ستكتب العبارة:
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                {PERSONAS.map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => setSelectedPersona(persona.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-amiri whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
                      selectedPersona === persona.id
                        ? theme === 'dark'
                          ? 'bg-[#8B3A3A] border-[#8B3A3A] text-white'
                          : 'bg-[#7A3838] border-[#7A3838] text-white'
                        : 'border-inherit/20 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>{persona.kanji.slice(0, 1)}</span>
                    <span>{persona.title}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] font-amiri opacity-55">
                {PERSONAS.find((p) => p.id === selectedPersona)?.description}
              </p>
            </div>

            {/* Book Selector Tabs */}
            <div className="mb-3.5">
              <label className="block text-[11px] font-amiri font-bold mb-1.5 opacity-80 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#C46868]" />
                <span>اختر مصدر الإلهام من كتب دازاي وحياته:</span>
              </label>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedBookId('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-amiri whitespace-nowrap transition-colors border ${
                    selectedBookId === 'all'
                      ? theme === 'dark'
                        ? 'bg-[#8B3A3A] border-[#8B3A3A] text-white'
                        : 'bg-[#7A3838] border-[#7A3838] text-white'
                      : 'border-inherit/20 opacity-70 hover:opacity-100'
                  }`}
                >
                  📚 جميع الكتب
                </button>
                {DAZAI_BOOKS_CATALOG.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedBookId(b.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-amiri whitespace-nowrap transition-colors border flex items-center gap-1 ${
                      selectedBookId === b.id
                        ? theme === 'dark'
                          ? 'bg-[#8B3A3A] border-[#8B3A3A] text-white'
                          : 'bg-[#7A3838] border-[#7A3838] text-white'
                        : 'border-inherit/20 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>{b.icon}</span>
                    <span>{b.titleAr}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Randomize Action */}
            <div className="space-y-3 mb-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-amiri font-bold opacity-90 flex items-center gap-1.5">
                    <Feather className="w-3.5 h-3.5 text-[#C46868]" />
                    <span>موضوع أو فكرة الشذرة:</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleRandomizeTopic}
                    className="text-[11px] font-amiri font-bold text-[#C46868] hover:underline flex items-center gap-1 bg-[#C46868]/10 px-2 py-0.5 rounded-md transition-colors"
                    title="تغيير واختيار فكرة عشوائية جديدة من أعمال دازاي"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>فكرة عشوائية من كتب دازاي</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setCurrentBookName(null);
                    }}
                    placeholder="اكتب فكرة أو اختر من المواضيع المقترحة أدناه..."
                    className="w-full text-sm font-amiri px-3.5 py-2.5 rounded-xl border border-inherit/30 bg-black/10 outline-none focus:border-[#C46868] transition-colors"
                  />
                </div>

                {currentBookName && (
                  <div className="mt-1 text-[11px] text-[#C46868] font-amiri flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>مستوحى من عوالم: {currentBookName}</span>
                  </div>
                )}
              </div>

              {/* Curated Book Themes Pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-amiri opacity-70">
                    مواضيع متنوعة من هذا الباب (انقر لاختيار الفكرة):
                  </span>
                  <span className="text-[10px] opacity-50 font-sans-ui">
                    {activeThemes.length} موضوع
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl bg-black/5 border border-inherit/10">
                  {activeThemes.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectTheme(item.topic, item.book)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border text-right transition-all font-amiri flex items-center gap-1.5 ${
                        topic === item.topic
                          ? 'border-[#C46868] bg-[#C46868]/20 font-bold'
                          : theme === 'dark'
                          ? 'bg-[#212128] border-[#31313E] text-[#C5BAA8] hover:border-[#8B3A3A]'
                          : 'bg-[#EAE0D0] border-[#D0C1AD] text-[#4A3D31] hover:border-[#7A3838]'
                      }`}
                    >
                      <span className="opacity-75 text-[10px] px-1 py-0.2 rounded bg-black/15 font-sans-ui">
                        {item.book}
                      </span>
                      <span>{item.topic}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-inherit/20 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRandomizeTopic}
                className="text-xs font-amiri flex items-center gap-1.5 opacity-70 hover:opacity-100 transition-opacity"
              >
                <Dices className="w-4 h-4 text-[#C46868]" />
                <span>تبديل الموضوع</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-amiri opacity-70 hover:opacity-100"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={!topic.trim() || isGenerating}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-amiri font-bold shadow-md transition-all ${
                    topic.trim() && !isGenerating
                      ? theme === 'dark'
                        ? 'bg-[#8B3A3A] hover:bg-[#9F4242] text-white'
                        : 'bg-[#7A3838] hover:bg-[#8F4343] text-white'
                      : 'opacity-40 cursor-not-allowed'
                  }`}
                >
                  <Sparkles
                    className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`}
                  />
                  <span>
                    {isGenerating ? 'دازاي يدوّن الشذرة...' : 'توليد الشذرة الآن'}
                  </span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
