import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateBrief } from '../src/lib/ai';
import { analyze } from '../src/lib/engine';
import { buildSampleDataset } from '../src/lib/sample';

const res = analyze(buildSampleDataset().data);
if (!res.ok) throw new Error('sample failed');
const report = res.report;
const known = new Set(report.drivers.flatMap((d) => d.evidence));
const id = [...known][0];

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const good = () => reply(200, { candidates: [{ content: { parts: [{ text: `Staff were short [${id}, STF-999999]` }] } }] });

afterEach(() => vi.unstubAllGlobals());

describe('AI write-up', () => {
  it('retries and falls back to another model when Google is busy', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(url);
      return calls.length <= 2 ? reply(503, { error: { message: 'This model is currently experiencing high demand.' } }) : good();
    }));
    const out = await generateBrief(report, 'k', 'gemini-flash-latest', 'Test', known);
    expect(out.model).toBe('gemini-2.5-flash');
    expect(out.cited).toContain(id);
    expect(out.unknown).toEqual(['STF-999999']);
  }, 15000);

  it('skips models that do not exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('old-model') ? reply(404, {}) : good())));
    const out = await generateBrief(report, 'k', 'old-model', 'Test', known);
    expect(out.model).toBe('gemini-flash-latest');
  });

  it('stops right away on a bad key', async () => {
    const f = vi.fn(async () => reply(400, { error: { message: 'API key not valid' } }));
    vi.stubGlobal('fetch', f);
    await expect(generateBrief(report, 'bad', '', 'Test', known)).rejects.toThrow(/key was not accepted/);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('gives a friendly message when every model is busy', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(503, {})));
    await expect(generateBrief(report, 'k', '', 'Test', known)).rejects.toThrow(/busy right now/);
  }, 20000);
});
