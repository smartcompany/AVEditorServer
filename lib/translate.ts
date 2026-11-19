/** Lightweight batch translate for dashboard copy (ko → en/ja/zh). */

export type TranslateLocale = "en" | "ko" | "ja" | "zh";

const PLACEHOLDER_RE = /\{[a-zA-Z0-9_]+\}/g;

function protectPlaceholders(text: string): {
  masked: string;
  tokens: string[];
} {
  const tokens: string[] = [];
  const masked = text.replace(PLACEHOLDER_RE, (match) => {
    const i = tokens.length;
    tokens.push(match);
    return `⟦${i}⟧`;
  });
  return { masked, tokens };
}

function restorePlaceholders(text: string, tokens: string[]): string {
  return text.replace(/⟦(\d+)⟧/g, (_, raw: string) => {
    const i = Number(raw);
    return tokens[i] ?? "";
  });
}

/**
 * Google public translate endpoint (no API key). Fine for dashboard volumes.
 */
async function translateOnce(
  text: string,
  from: TranslateLocale,
  to: TranslateLocale,
): Promise<string> {
  if (!text.trim() || from === to) return text;
  const { masked, tokens } = protectPlaceholders(text);
  const url =
    "https://translate.googleapis.com/translate_a/single" +
    `?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(masked)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`translate_failed_${to}:${res.status}`);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error(`translate_bad_response_${to}`);
  }
  const chunks = data[0] as unknown[];
  const translated = chunks
    .map((row) => (Array.isArray(row) && typeof row[0] === "string" ? row[0] : ""))
    .join("");
  return restorePlaceholders(translated, tokens);
}

export async function translateTexts(opts: {
  texts: string[];
  from: TranslateLocale;
  to: TranslateLocale[];
}): Promise<Record<TranslateLocale, string[]>> {
  const { texts, from, to } = opts;
  const out = {} as Record<TranslateLocale, string[]>;
  for (const locale of to) {
    if (locale === from) {
      out[locale] = [...texts];
      continue;
    }
    const translated: string[] = [];
    for (const text of texts) {
      translated.push(await translateOnce(text, from, locale));
    }
    out[locale] = translated;
  }
  return out;
}
