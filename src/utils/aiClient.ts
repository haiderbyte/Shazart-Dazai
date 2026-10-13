import { AIProvider, AIProviderConfig, ChatMessage, Quote } from '../types';

function keyFor(c: AIProviderConfig) {
  return c.provider === 'gemini' ? c.geminiKey : c.provider === 'openai' ? c.openAiKey : c.provider === 'anthropic' ? c.anthropicKey : c.provider === 'groq' ? (c.groqKey || c.customKey) : c.customKey;
}
function baseFor(c: AIProviderConfig) { return c.provider === 'groq' ? 'https://api.groq.com/openai/v1' : c.provider === 'openai' ? 'https://api.openai.com/v1' : c.customBaseUrl.replace(/\/$/, ''); }
function systemPrompt(persona: string) {
  const style = persona === 'النرجسي المتأمل'
    ? 'كن نرجسيًا أدبيًا: واثقًا ومغرورًا بذكاء، يرى نفسه استثنائيًا، مع كشف هشاشة داخلية ولمسة سخرية؛ لا تكن مهينًا أو مؤذيًا.'
    : persona === 'فيلسوف الرماد'
    ? 'كن حزينًا وفلسفيًا بنبرة هادئة وتأملية مختلفة عن دازاي: استخدم صور الرماد والوقت والفقد، وابحث عن معنى صغير دون وعظ أو يأس مطلق.'
    : `اكتب بنبرة ${persona}`;
  return `أنت شخصية أدبية مستوحاة من عالم أوسامو دازاي، ولست دازاي الحقيقي. ${style} أجب بالعربية الفصيحة بأسلوب مكثف وإنساني، دون إطالة غير لازمة.`;
}

export async function directChat(config: AIProviderConfig, message: string, persona: string, history: ChatMessage[]) {
  const key = keyFor(config)?.trim();
  if (!key && config.provider !== 'custom') throw new Error('أدخل مفتاح API أولاً من الإعدادات.');
  const model = config.selectedModel;
  if (config.provider === 'gemini') {
    const contents = [...history.slice(-8), { role: 'user', content: message }].map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key || '')}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt(persona) }] }, contents, generationConfig: { temperature: config.temperature, maxOutputTokens: 900 } }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d?.error?.message || `فشل Gemini (${r.status})`);
    return { reply: d?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '', provider: 'gemini', model };
  }
  if (config.provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key || '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'Content-Type': 'application/json' }, body: JSON.stringify({ model, system: systemPrompt(persona), max_tokens: 900, temperature: config.temperature, messages: [...history.slice(-8), { role: 'user', content: message }].map((m: any) => ({ role: m.role, content: m.content })) }) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d?.error?.message || `فشل Claude (${r.status})`);
    return { reply: d?.content?.map((p: any) => p.text || '').join('') || '', provider: 'anthropic', model };
  }
  const r = await fetch(`${baseFor(config)}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${key || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: config.temperature, max_tokens: 900, messages: [{ role: 'system', content: systemPrompt(persona) }, ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: message }] }) });
  const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d?.error?.message || `فشل الاتصال بالمزود (${r.status})`);
  return { reply: d?.choices?.[0]?.message?.content || '', provider: config.provider, model };
}

export async function directGenerateQuote(config: AIProviderConfig, topic: string, persona = 'روح أوسامو دازاي'): Promise<Partial<Quote>> {
  const personaRule = persona === 'النرجسي المتأمل'
    ? 'اكتب بصوت نرجسي أدبي لامع: غرور هادئ وسخرية ذكية، مع لمحة تكشف هشاشة خلف الغرور.'
    : persona === 'فيلسوف الرماد'
    ? 'اكتب بصوت حزين وفلسفي هادئ، مختلف عن دازاي، يتأمل الفقد والزمن والذاكرة ويترك نافذة صغيرة للمعنى.'
    : `اكتب بصوت ${persona}.`;
  const prompt = `اكتب عبارة أدبية أصلية قصيرة وذات معنى، مستوحاة من موضوع: ${topic}. ${personaRule}
شروط إلزامية: textAr يجب أن يكون حكمة أو شذرة من جملة واحدة أو جملتين فقط، بين 12 و180 حرفًا عربيًا، وليس قصة أو حوارًا أو وصفًا لمشهد. لا تبدأ بمقدمة مثل "إليك" ولا تشرح العبارة ولا تكرر الموضوع. اجعلها مكثفة وقابلة للاقتباس.
أعد JSON فقط بهذا الشكل: {"textAr":"العبارة القصيرة","textJp":"","source":"شذرة أصلية مستوحاة من أدب دازاي","chapter":"شذرة","reflection":"تأمل من جملة قصيرة"}. لا تنسب نصًا مختلقًا إلى دازاي الحقيقي.`;
  const r = await directChat(config, prompt, 'دازاي', []);
  const raw = r.reply.replace(/```json|```/g, '').trim();
  let parsed: Partial<Quote>;
  try { parsed = JSON.parse(raw); } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('رد المزود ليس JSON صالحًا.'); }

  // Defensive cleanup: some models ignore the length instruction. Keep the
  // first meaningful one or two sentences instead of displaying a story.
  const clean = String(parsed.textAr || '')
    .replace(/^(إليك|هذه هي|بالطبع|العبارة هي)[:：،,\s-]*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentences = clean.match(/[^.!؟؛。]+[.!؟؛。]?/g)?.map((x) => x.trim()).filter(Boolean) || [];
  const compact = sentences.slice(0, 2).join(' ').trim();
  parsed.textAr = (compact || clean).slice(0, 180).trim();
  parsed.reflection = String(parsed.reflection || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  parsed.source = parsed.source || 'شذرة أصلية مستوحاة من أدب دازاي';
  parsed.chapter = parsed.chapter || 'شذرة';
  return parsed;
}
