// Spotify API Related Types
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    release_date?: string;
  };
  duration_ms: number;
  uri: string;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyAudioFeatures {
  energy: number;
  valence: number;
  danceability: number;
  tempo: number;
  acousticness: number;
  speechiness: number;
  instrumentalness: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  public: boolean;
  external_urls: {
    spotify: string;
  };
}

// User Types
export interface User {
  id: string;
  spotifyId: string;
  email?: string;
  spotifyUsername?: string;
  spotifyDisplayName?: string;
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserConfig {
  id: string;
  userId: string;
  llmProvider: 'claude' | 'openai' | 'gemini' | 'ollama';
  ollamaBaseUrl?: string;
  activeDimensions: string[];
  customTaxonomy?: Record<string, string[]>;
  autoSyncEnabled: boolean;
  autoSyncFrequencyMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

// Track Types
export interface Track {
  id: string;
  userId: string;
  spotifyId: string;
  name: string;
  artist: string;
  album: string;
  releaseYear?: number;
  durationMs: number;
  energy?: number;
  valence?: number;
  danceability?: number;
  tempo?: number;
  acousticness?: number;
  speechiness?: number;
  instrumentalness?: number;
  spotifyGenres: string[];
  spotifyUrl?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Classification Types
export interface Classification {
  id: string;
  userId: string;
  trackId: string;
  runId: string;
  genres: string[];
  moods: string[];
  language: string;
  occasions: string[];
  era?: string;
  energyLevel: string;
  customTags: string[];
  confidence: number;
  llmModel: string;
  promptVersion: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassificationResult {
  spotifyId: string;
  genre: string[];
  mood: string[];
  language: string;
  occasion: string[];
  era: string;
  energyLevel: 'Low' | 'Medium' | 'High';
  confidence: number;
}

export interface TrackBatch {
  spotifyId: string;
  name: string;
  artist: string;
  album: string;
  releaseYear?: number;
  spotifyGenres: string[];
  audioSummary: {
    energy?: number;
    valence?: number;
    danceability?: number;
    tempo?: number;
    acousticness?: number;
    speechiness?: number;
    instrumentalness?: number;
  };
}

// Classification Run Types
export enum ClassificationStatus {
  PENDING = 'PENDING',
  FETCHING_TRACKS = 'FETCHING_TRACKS',
  ENRICHING = 'ENRICHING',
  CLASSIFYING = 'CLASSIFYING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  APPROVED = 'APPROVED',
  CREATING_PLAYLISTS = 'CREATING_PLAYLISTS',
  DONE = 'DONE',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

export interface ClassificationRun {
  id: string;
  userId: string;
  status: ClassificationStatus;
  scope: 'unclassified' | 'all';
  totalTracks: number;
  processedTracks: number;
  llmProvider?: string;
  activeDimensions: string[];
  customTaxonomy?: Record<string, string[]>;
  jobId?: string;
  startedAt?: Date;
  completedAt?: Date;
  approvedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassificationRunWithResults extends ClassificationRun {
  classifications: Classification[];
}

// Playlist Proposal Types
export interface PlaylistProposal {
  id: string;
  userId: string;
  runId: string;
  name: string;
  description?: string;
  dimension: string;
  taxonomyValue: string;
  trackIds: string[];
  trackCount: number;
  visibility: 'public' | 'private';
  approvedAt?: Date;
  spotifyPlaylistId?: string;
  spotifyUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposedPlaylistWithTracks extends PlaylistProposal {
  tracks: Array<Track & { classification: Classification; confidence: number }>;
}

// API Request/Response Types
export interface ClassifyRunRequest {
  scope?: 'unclassified' | 'all';
  llmProvider?: string;
  dimensions?: string[];
  customTaxonomy?: Record<string, string[]>;
}

export interface ClassifyRunResponse {
  runId: string;
  estimatedMinutes: number;
}

export interface ClassificationResultsResponse {
  runId: string;
  proposedPlaylists: ProposedPlaylistWithTracks[];
}

export interface ClassificationRunStatusResponse {
  status: ClassificationStatus;
  progress: {
    classified: number;
    total: number;
  };
  currentBatch?: number;
  totalBatches?: number;
  error?: string;
}

export interface ApproveClassificationRequest {
  playlistIds: string[];
  visibility: 'public' | 'private';
  namePrefix?: string;
  addDescriptions: boolean;
}

export interface ApproveClassificationResponse {
  approvalJobId: string;
}

export interface PlaylistCreationResult {
  proposedPlaylistId: string;
  spotifyPlaylistId: string;
  spotifyUrl: string;
  trackCount: number;
}

export interface PlaylistCreationStatusResponse {
  status: 'creating' | 'done' | 'partial' | 'failed';
  created: PlaylistCreationResult[];
  failed: Array<{
    proposedPlaylistId: string;
    error: string;
  }>;
}

// LLM Provider Types
export interface LLMProvider {
  classify(tracks: TrackBatch[]): Promise<ClassificationResult[]>;
  model: string;
  promptVersion: string;
}

export interface LLMConfig {
  provider: 'claude' | 'openai' | 'gemini' | 'ollama';
  apiKey?: string;
  baseUrl?: string;
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// Auth Types
export interface AuthToken {
  token: string;
  user: {
    id: string;
    email?: string;
    spotifyDisplayName?: string;
  };
}

// Pagination Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
