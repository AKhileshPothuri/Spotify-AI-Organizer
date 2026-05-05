import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module mocks (hoisted) ───────────────────────────────────────────────────

vi.mock('../config/index.js', () => ({
  config: { ANTHROPIC_API_KEY: 'test-key' },
}));

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => ({ messages: { create: mockCreate } })),
}));

// Import after mocks are set up
const { buildSystemPrompt, classifyBatch } = await import('../services/llm.js');

// ─── buildSystemPrompt ────────────────────────────────────────────────────────

describe('buildSystemPrompt', () => {
  it('returns the base prompt when no taxonomy is provided', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('music classification expert');
    expect(prompt).not.toContain('Constraints');
  });

  it('returns the base prompt when taxonomy is undefined', () => {
    expect(buildSystemPrompt(undefined)).toEqual(buildSystemPrompt());
  });

  it('returns the base prompt when all taxonomy arrays are empty', () => {
    const prompt = buildSystemPrompt({ genres: [], moods: [], occasions: [] });
    expect(prompt).not.toContain('Constraints');
  });

  it('adds a genres constraint when genres are specified', () => {
    const prompt = buildSystemPrompt({ genres: ['Rock', 'Pop', 'Tamil'] });
    expect(prompt).toContain('Constraints');
    expect(prompt).toContain('genres: pick ONLY from [Rock, Pop, Tamil]');
  });

  it('adds a language constraint', () => {
    const prompt = buildSystemPrompt({ languages: ['English', 'Tamil', 'Hindi'] });
    expect(prompt).toContain('language: pick ONLY from [English, Tamil, Hindi]');
  });

  it('adds an energyLevel constraint', () => {
    const prompt = buildSystemPrompt({ energyLevels: ['Low', 'High'] });
    expect(prompt).toContain('energyLevel: pick ONLY from [Low, High]');
  });

  it('includes only the dimensions that have values', () => {
    const prompt = buildSystemPrompt({ genres: ['Rock'], moods: [], occasions: ['Workout'] });
    expect(prompt).toContain('genres: pick ONLY from [Rock]');
    expect(prompt).toContain('occasions: pick ONLY from [Workout]');
    expect(prompt).not.toContain('moods:');
  });

  it('includes all six dimensions when all are specified', () => {
    const prompt = buildSystemPrompt({
      genres:       ['Rock'],
      moods:        ['Happy'],
      occasions:    ['Workout'],
      languages:    ['English'],
      eras:         ['90s'],
      energyLevels: ['High'],
    });
    expect(prompt).toContain('genres:');
    expect(prompt).toContain('moods:');
    expect(prompt).toContain('occasions:');
    expect(prompt).toContain('language:');
    expect(prompt).toContain('era:');
    expect(prompt).toContain('energyLevel:');
  });
});

// ─── classifyBatch ────────────────────────────────────────────────────────────

const tracks = [
  { id: 'a', name: 'Song A', artist: 'Artist A', album: 'Album A', releaseYear: 2020 },
  { id: 'b', name: 'Song B', artist: 'Artist B', album: 'Album B', releaseYear: 2015 },
];

const validResponse = (n: number) => ({
  content: [{
    type: 'text',
    text: JSON.stringify(
      Array.from({ length: n }, (_, i) => ({
        genres: ['Pop'],
        moods: ['Happy'],
        language: 'English',
        occasions: ['Party'],
        era: '2020s',
        energyLevel: 'High',
      }))
    ),
  }],
});

describe('classifyBatch', () => {
  beforeEach(() => { mockCreate.mockReset(); });

  it('returns classifications with trackIds attached', async () => {
    mockCreate.mockResolvedValueOnce(validResponse(2));
    const results = await classifyBatch(tracks);
    expect(results).toHaveLength(2);
    expect(results[0].trackId).toBe('a');
    expect(results[1].trackId).toBe('b');
    expect(results[0].genres).toEqual(['Pop']);
  });

  it('strips markdown fences from LLM output', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '```json\n' + JSON.stringify([{
        genres: ['Rock'], moods: ['Energetic'], language: 'English',
        occasions: [], era: '90s', energyLevel: 'High',
      }]) + '\n```' }],
    });
    const results = await classifyBatch([tracks[0]]);
    expect(results[0].genres).toEqual(['Rock']);
  });

  it('throws when LLM returns invalid JSON', async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'not json at all' }] });
    await expect(classifyBatch(tracks)).rejects.toThrow('LLM returned invalid JSON');
  });

  it('throws when result count does not match track count', async () => {
    mockCreate.mockResolvedValueOnce(validResponse(1)); // 1 result for 2 tracks
    await expect(classifyBatch(tracks)).rejects.toThrow('Expected 2 results, got 1');
  });

  it('passes the taxonomy to the system prompt', async () => {
    mockCreate.mockResolvedValueOnce(validResponse(1));
    await classifyBatch([tracks[0]], { genres: ['Rock', 'Pop'] });
    const call = mockCreate.mock.calls[0][0] as { system: string };
    expect(call.system).toContain('genres: pick ONLY from [Rock, Pop]');
  });

  it('uses the base prompt when no taxonomy is given', async () => {
    mockCreate.mockResolvedValueOnce(validResponse(1));
    await classifyBatch([tracks[0]]);
    const call = mockCreate.mock.calls[0][0] as { system: string };
    expect(call.system).not.toContain('Constraints');
  });
});
