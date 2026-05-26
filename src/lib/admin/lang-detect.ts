/**
 * Heurística leve PT vs EN para classificar texto livre no admin.
 * Não é um detector estatístico — basta para filtrar comentários
 * curtos no /admin/estudo-mercado.
 */

const PT_WORDS = new Set([
  "não","sim","muito","mais","menos","quero","gostaria","seria","fazer",
  "bom","boa","ótimo","ótima","mau","má","melhor","pior","com","sem",
  "para","pra","por","que","como","onde","quando","aqui","ali","isto",
  "isso","aquilo","quando","tudo","nada","alguma","algum","preciso",
  "obrigado","obrigada","ajuda","dúvida","relatório","relatorio","conteúdo",
  "conteudo","sugestão","sugestao","interessante","gostei","gostou",
  "está","esta","estou","então","entao","ainda","também","tambem","só",
  "uma","uns","umas","dos","das","aos","mas","porque","muitos","muitas",
]);
const EN_WORDS = new Set([
  "the","and","you","your","this","that","with","without","very","much",
  "more","less","good","bad","better","worse","like","would","could",
  "should","need","want","help","report","feedback","love","loved","great",
  "awesome","missing","please","thanks","thank","because","really","just",
  "from","what","when","where","how","why","not","yes","but","they","their",
]);

export type Lang = "pt" | "en" | "other";

export function detectLanguage(text: string | null | undefined): Lang {
  if (!text) return "other";
  const t = text.toLowerCase();
  // Diacríticos típicos PT
  if (/[ãõçáàâéêíóôú]/.test(t)) return "pt";
  const tokens = t.split(/[^a-zà-ÿ]+/i).filter(Boolean);
  let pt = 0;
  let en = 0;
  for (const tok of tokens) {
    if (PT_WORDS.has(tok)) pt++;
    if (EN_WORDS.has(tok)) en++;
  }
  if (pt === 0 && en === 0) return "other";
  if (pt >= en) return "pt";
  return "en";
}