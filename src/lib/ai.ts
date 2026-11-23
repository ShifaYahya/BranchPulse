import { rangeLabel } from './dates';
import { money, pct } from './format';
import type { Report } from './engine';

/**
 * Optional write-up using Google's Gemini API (free tier, key from Google AI Studio).
 * The model only sees the findings BranchPulse already computed — never your raw files —
 * and is told to cite the same record ids. Every id it returns is checked afterwards.
 */

export function factsFor(r: Report): string {
  const c = (n: number) => money(n, r.currency);
  const lines: string[] = [];
  lines.push(`Branch: ${r.branch}`);
  lines.push(`Period: ${rangeLabel(r.period.start, r.period.end)}`);
  lines.push(`Revenue: ${c(r.stats.actual)} vs usual ${c(r.stats.expected)} (${pct(r.stats.change)}). Other branches: ${pct(r.stats.peerChange)}.`);
  lines.push(`Orders vs basket: ${r.changeBreakdown.text}`);
  lines.push(`Market context: ${r.market.text}${r.market.evidence.length ? ` [${r.market.evidence.join(', ')}]` : ''}`);
  lines.push('Drivers (estimated effect, confidence):');
  for (const d of r.drivers) {
    lines.push(`- ${d.title} (${c(d.impact)}, ${d.confidence}): ${d.summary}`);
    for (const x of d.details) lines.push(`  • ${x.text} [${x.evidence.join(', ')}]`);
  }
  if (r.ruledOut.length) {
    lines.push('Checked and ruled out:');
    for (const x of r.ruledOut) lines.push(`- ${x.text}`);
  }
  lines.push('Suggested actions:');
  for (const a of r.actions) lines.push(`- ${a.title}: ${a.detail} [${a.evidence.slice(0, 6).join(', ')}]`);
  if (r.dataNotes.length) lines.push(`Data gaps: ${r.dataNotes.join(' ')}`);
  return lines.join('\n');
}

export function buildPrompt(r: Report, businessName: string): string {
  return `You are an operations analyst writing a short daily brief for the owner of ${businessName || 'a multi-branch business'}.

Write in plain, friendly English that a busy owner reads in under a minute. Use this structure:
1. One sentence: what happened at the branch.
2. "Why" — 2 to 4 bullet points, biggest reason first. Each bullet MUST end with the record ids that support it in square brackets, exactly as given, like [STF-14, STF-18].
3. "What to do this week" — 2 to 4 short bullet points.
4. One sentence on what the data could not explain, if anything.

Rules:
- Use ONLY the facts below. Do not invent numbers, causes, names or record ids.
- Say "about" for estimates. Keep it under 220 words. No headings other than "Why" and "What to do this week".

FACTS
${factsFor(r)}`;
}

export interface AiResult {
  text: string;
  cited: string[];
  unknown: string[];
  model: string;
}

/** Free models tried in order when one is busy or unavailable. */
export const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest', 'gemini-2.5-flash-lite'];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

class StopError extends Error {}

async function callModel(model: string, key: string, prompt: string): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
      }),
    });
  } catch {
    throw new StopError('Could not reach Google. Check your internet connection and try again.');
  }
  if (!res.ok) {
    let message = '';
    try {
      message = (await res.json())?.error?.message ?? '';
    } catch {
      /* ignore */
    }
    return { ok: false, status: res.status, message };
  }
  const json = await res.json();
  const text: string = (json?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim();
  if (!text) return { ok: false, status: 503, message: 'empty answer' };
  return { ok: true, text };
}

/**
 * Calls Gemini. If a model is busy (503/500), rate-limited (429) or missing (404),
 * it waits briefly, retries, then moves on to the next free model automatically.
 */
export async function generateBrief(
  r: Report,
  key: string,
  model: string,
  businessName: string,
  known: Set<string>,
  onStatus?: (msg: string) => void,
): Promise<AiResult> {
  const prompt = buildPrompt(r, businessName);
  const models = [...new Set([(model || '').trim(), ...FALLBACK_MODELS].filter(Boolean))];
  let sawLimit = false;

  try {
    for (const m of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        onStatus?.(attempt === 0 ? `Writing with ${m}…` : `${m} is busy, trying again…`);
        const out = await callModel(m, key, prompt);
        if (out.ok) {
          const ids = [...new Set(out.text.match(/\b(?:SAL|STF|STK|HRS|FBK|EVT)-\d+\b/g) ?? [])];
          return { text: out.text, cited: ids.filter((i) => known.has(i)), unknown: ids.filter((i) => !known.has(i)), model: m };
        }
        if (out.status === 400 && /api key/i.test(out.message)) throw new StopError('That API key was not accepted. Copy it again from Google AI Studio and paste it in Settings.');
        if (out.status === 401 || out.status === 403) throw new StopError('This key is not allowed to use the Gemini API. Create a new key in Google AI Studio.');
        if (out.status === 404 || out.status === 400) break; // model not available, try the next one
        if (out.status === 429) sawLimit = true;
        await wait(attempt === 0 ? 1500 : 0);
      }
    }
  } catch (e) {
    if (e instanceof StopError) throw new Error(e.message);
    throw e;
  }
  throw new Error(
    sawLimit
      ? 'The free limit for your key is used up for now. Wait a minute and try again. Everything else on this page still works.'
      : "Google's free AI servers are very busy right now. This is temporary. Please try again in a few minutes. Everything else on this page still works.",
  );
}

/** Plain-text version of a report, for copy/paste into WhatsApp, email or Slack. */
export function reportToText(r: Report, businessName: string): string {
  const c = (n: number) => money(n, r.currency);
  const out: string[] = [];
  out.push(`${businessName ? businessName + ' · ' : ''}BranchPulse brief: ${r.branch}`);
  out.push(rangeLabel(r.period.start, r.period.end));
  out.push('');
  out.push(r.headline);
  out.push('');
  out.push('Why:');
  for (const d of r.drivers) {
    out.push(`• ${d.title}${d.impact > 0 ? ` (about ${c(d.impact)})` : ''}: ${d.summary} [${d.evidence.slice(0, 6).join(', ')}${d.evidence.length > 6 ? ', …' : ''}]`);
  }
  out.push('');
  out.push(`Context: ${r.market.text}`);
  if (r.ruledOut.length) {
    out.push('');
    out.push('Ruled out:');
    for (const x of r.ruledOut) out.push(`• ${x.text}`);
  }
  out.push('');
  out.push('What to do:');
  r.actions.forEach((a, i) => out.push(`${i + 1}. ${a.title}. ${a.detail}`));
  return out.join('\n');
}
