import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config/index.js';

export interface TrackInput {
  id: string;
  name: string;
  artist: string;
  album: string;
  releaseYear: number | null;
}

export interface Classification {
  trackId: string;
  genres: string[];
  moods: string[];
  language: string;
  occasions: string[];
  era: string;
  energyLevel: 'Low' | 'Medium' | 'High';
}

const SYSTEM_PROMPT = `You are a music classification expert. Given a list of tracks, classify each one.
Return ONLY a valid JSON array — no explanation, no markdown, no code fences.
Each element must follow this exact schema:
{
  "genres": string[],      // e.g. ["Pop", "Indie", "K-pop", "Bollywood", "Carnatic"]
  "moods": string[],       // e.g. ["Happy", "Melancholic", "Energetic", "Chill", "Romantic"]
  "language": string,      // primary lyric language: "English", "Tamil", "Hindi", "Korean", "Spanish", "Instrumental", etc.
  "occasions": string[],   // e.g. ["Workout", "Party", "Study", "Sleep", "Morning", "Road Trip", "Dinner"]
  "era": string,           // one of: "Pre-80s" | "80s" | "90s" | "2000s" | "2010s" | "2020s"
  "energyLevel": string    // one of: "Low" | "Medium" | "High"
}
The array must have exactly as many elements as tracks given, in the same order.`;

function buildUserPrompt(tracks: TrackInput[]): string {
  const list = tracks
    .map((t, i) =>
      `${i + 1}. "${t.name}" by ${t.artist} — Album: ${t.album}${t.releaseYear ? `, Year: ${t.releaseYear}` : ''}`,
    )
    .join('\n');
  return `Classify these ${tracks.length} tracks:\n\n${list}`;
}

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

export async function classifyBatch(tracks: TrackInput[]): Promise<Classification[]> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(tracks) }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';

  let parsed: Omit<Classification, 'trackId'>[];
  try {
    // Strip any accidental markdown fences
    const clean = raw.replace(/```(?:json)?/g, '').trim();
    parsed = JSON.parse(clean) as Omit<Classification, 'trackId'>[];
  } catch {
    throw new Error(`LLM returned invalid JSON: ${raw.slice(0, 200)}`);
  }

  if (!Array.isArray(parsed) || parsed.length !== tracks.length) {
    throw new Error(`Expected ${tracks.length} results, got ${parsed.length}`);
  }

  return parsed.map((c, i) => ({ ...c, trackId: tracks[i].id }));
}
