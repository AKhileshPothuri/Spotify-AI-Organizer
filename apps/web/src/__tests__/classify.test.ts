import { describe, it, expect } from 'vitest';
import { getDimValues, energyCls, type ClassifiedTrack } from '@/lib/classify';

const track: ClassifiedTrack = {
  id: 't1',
  genres:      ['Rock', 'Alternative'],
  moods:       ['Energetic', 'Happy'],
  language:    'English',
  occasions:   ['Workout', 'Party'],
  era:         '90s',
  energyLevel: 'High',
};

// ─── getDimValues ─────────────────────────────────────────────────────────────

describe('getDimValues', () => {
  it('returns genres array', () => {
    expect(getDimValues(track, 'genre')).toEqual(['Rock', 'Alternative']);
  });

  it('returns moods array', () => {
    expect(getDimValues(track, 'mood')).toEqual(['Energetic', 'Happy']);
  });

  it('returns occasions array', () => {
    expect(getDimValues(track, 'occasion')).toEqual(['Workout', 'Party']);
  });

  it('wraps language in array', () => {
    expect(getDimValues(track, 'language')).toEqual(['English']);
  });

  it('returns empty array when language is empty string', () => {
    expect(getDimValues({ ...track, language: '' }, 'language')).toEqual([]);
  });

  it('wraps era in array', () => {
    expect(getDimValues(track, 'era')).toEqual(['90s']);
  });

  it('returns empty array when era is null', () => {
    expect(getDimValues({ ...track, era: null }, 'era')).toEqual([]);
  });

  it('wraps energyLevel in array', () => {
    expect(getDimValues(track, 'energyLevel')).toEqual(['High']);
  });

  it('returns empty array when energyLevel is empty string', () => {
    expect(getDimValues({ ...track, energyLevel: '' }, 'energyLevel')).toEqual([]);
  });
});

// ─── energyCls ────────────────────────────────────────────────────────────────

describe('energyCls', () => {
  it('returns red classes for High', () => {
    expect(energyCls('High')).toContain('red');
  });

  it('returns green classes for Low', () => {
    expect(energyCls('Low')).toContain('green');
  });

  it('returns yellow classes for Medium', () => {
    expect(energyCls('Medium')).toContain('yellow');
  });

  it('falls back to yellow for unknown values', () => {
    expect(energyCls('Unknown')).toContain('yellow');
  });
});
