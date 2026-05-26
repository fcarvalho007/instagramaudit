/**
 * Tokenização simples para sinalizar tópicos recorrentes em comentários
 * livres no /admin/estudo-mercado. Heurística determinística (sem IA).
 */

const STOP = new Set([
  // PT
  "a","o","as","os","um","uma","uns","umas","de","do","da","dos","das",
  "e","ou","mas","se","que","qual","quais","com","sem","por","para","pra",
  "no","na","nos","nas","ao","aos","à","às","em","ser","estar","ter","há",
  "não","sim","muito","muita","muitos","muitas","mais","menos","já","ainda",
  "isso","isto","aquilo","esse","essa","este","esta","aquele","aquela",
  "eu","tu","ele","ela","nós","vós","eles","elas","meu","minha","seu","sua",
  "como","onde","quando","porque","então","só","também","tudo","nada",
  "bem","mal","aqui","ali","lá","cá","tipo","coisa","coisas","ficar",
  // EN
  "the","a","an","of","in","on","at","to","for","with","without","and",
  "or","but","if","is","are","was","were","be","been","being","have","has",
  "had","do","does","did","not","yes","no","this","that","these","those",
  "i","you","he","she","we","they","my","your","his","her","our","their",
  "what","when","where","why","how","very","much","more","less","just","so",
  "it","its","also","than","then","like","really",
]);

export function topTokens(
  texts: Array<string | null | undefined>,
  limit = 3,
  minCount = 2,
): Array<{ token: string; count: number }> {
  const counts = new Map<string, number>();
  for (const raw of texts) {
    if (!raw) continue;
    const toks = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[^a-z0-9]+/i)
      .filter((t) => t.length >= 4 && !STOP.has(t) && !/^\d+$/.test(t));
    const seen = new Set<string>();
    for (const t of toks) {
      if (seen.has(t)) continue;
      seen.add(t);
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .filter(([, c]) => c >= minCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([token, count]) => ({ token, count }));
}