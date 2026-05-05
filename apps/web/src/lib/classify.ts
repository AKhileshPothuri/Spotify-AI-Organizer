export type DimKey = 'genre' | 'mood' | 'language' | 'occasion' | 'era' | 'energyLevel';

export interface ClassifiedTrack {
  id: string;
  genres: string[];
  moods: string[];
  language: string;
  occasions: string[];
  era: string | null;
  energyLevel: string;
}

export function getDimValues(ct: ClassifiedTrack, dim: DimKey): string[] {
  if (dim === 'genre')       return ct.genres;
  if (dim === 'mood')        return ct.moods;
  if (dim === 'occasion')    return ct.occasions;
  if (dim === 'language')    return ct.language ? [ct.language] : [];
  if (dim === 'era')         return ct.era ? [ct.era] : [];
  if (dim === 'energyLevel') return ct.energyLevel ? [ct.energyLevel] : [];
  return [];
}

export function energyCls(level: string): string {
  if (level === 'High') return 'bg-red-500/15 text-red-300';
  if (level === 'Low')  return 'bg-green-500/15 text-green-300';
  return 'bg-yellow-500/15 text-yellow-300';
}
