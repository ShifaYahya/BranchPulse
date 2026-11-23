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
}

export async function generateBrief(r: Report, key: string, model: string, businessName: string, known: Set<string>): Promise<AiResult> {
  const m = (model || 'gemini-flash-latest').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key.trim() },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(r, businessName) }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
      }),
    });
  } catch {
    throw new Error('Could not reach Google. Check your internet connection and try again.');
  }
  if (!res.ok) {
    let msg = `Google returned an error (${res.status}).`;
    try {
      const j = await res.json();
      if (j?.error?.message) msg = j.error.message;
    } catch {
      /* ignore */
    }
    if (res.status === 400 && /api key/i.test(msg)) msg = 'That API key was not accepted. Copy it again from Google AI Studio.';
    if (res.status === 403) msg = 'This key is not allowed to use the Gemini API. Create a new key in Google AI Studio.';
    if (res.status === 404) msg = `The model "${m}" was not found. Try "gemini-flash-latest" in Settings.`;
    if (res.status === 429) msg = 'The free quota is used up for now. Wait a minute and try again.';
    throw new Error(msg);
  }
  const json = await res.json();
  const text: string = (json?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim();
  if (!text) throw new Error('The model returned an empty answer. Try again.');
  const ids = [...new Set(text.match(/\b(?:SAL|STF|STK|HRS|FBK|EVT)-\d+\b/g) ?? [])];
  return { text, cited: ids.filter((i) => known.has(i)), unknown: ids.filter((i) => !known.has(i)) };
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
