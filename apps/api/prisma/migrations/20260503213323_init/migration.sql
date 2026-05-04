-- CreateEnum
CREATE TYPE "ClassificationStatus" AS ENUM ('PENDING', 'FETCHING_TRACKS', 'ENRICHING', 'CLASSIFYING', 'AWAITING_APPROVAL', 'APPROVED', 'CREATING_PLAYLISTS', 'DONE', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "email" TEXT,
    "spotifyUsername" TEXT,
    "spotifyDisplayName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "llmProvider" TEXT NOT NULL DEFAULT 'claude',
    "ollamaBaseUrl" TEXT,
    "activeDimensions" TEXT[] DEFAULT ARRAY['genre', 'mood', 'language', 'occasion', 'era', 'energyLevel']::TEXT[],
    "customTaxonomy" JSONB,
    "autoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoSyncFrequencyMinutes" INTEGER NOT NULL DEFAULT 1440,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Track" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "album" TEXT NOT NULL,
    "releaseYear" INTEGER,
    "durationMs" INTEGER NOT NULL,
    "energy" DOUBLE PRECISION,
    "valence" DOUBLE PRECISION,
    "danceability" DOUBLE PRECISION,
    "tempo" DOUBLE PRECISION,
    "acousticness" DOUBLE PRECISION,
    "speechiness" DOUBLE PRECISION,
    "instrumentalness" DOUBLE PRECISION,
    "spotifyGenres" TEXT[],
    "spotifyUrl" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moods" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT NOT NULL DEFAULT 'Unknown',
    "occasions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "era" TEXT,
    "energyLevel" TEXT NOT NULL DEFAULT 'Medium',
    "customTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "llmModel" TEXT NOT NULL DEFAULT 'claude-3-5-sonnet',
    "promptVersion" TEXT NOT NULL DEFAULT 'v1.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassificationRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ClassificationStatus" NOT NULL DEFAULT 'PENDING',
    "scope" TEXT NOT NULL DEFAULT 'unclassified',
    "totalTracks" INTEGER NOT NULL DEFAULT 0,
    "processedTracks" INTEGER NOT NULL DEFAULT 0,
    "llmProvider" TEXT,
    "activeDimensions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customTaxonomy" JSONB,
    "jobId" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassificationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaylistProposal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dimension" TEXT NOT NULL,
    "taxonomyValue" TEXT NOT NULL,
    "trackIds" TEXT[],
    "trackCount" INTEGER NOT NULL DEFAULT 0,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "approvedAt" TIMESTAMP(3),
    "spotifyPlaylistId" TEXT,
    "spotifyUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaylistProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_spotifyId_key" ON "User"("spotifyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserConfig_userId_key" ON "UserConfig"("userId");

-- CreateIndex
CREATE INDEX "UserConfig_userId_idx" ON "UserConfig"("userId");

-- CreateIndex
CREATE INDEX "Track_userId_idx" ON "Track"("userId");

-- CreateIndex
CREATE INDEX "Track_createdAt_idx" ON "Track"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Track_userId_spotifyId_key" ON "Track"("userId", "spotifyId");

-- CreateIndex
CREATE INDEX "Classification_userId_idx" ON "Classification"("userId");

-- CreateIndex
CREATE INDEX "Classification_runId_idx" ON "Classification"("runId");

-- CreateIndex
CREATE INDEX "Classification_trackId_idx" ON "Classification"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_trackId_runId_key" ON "Classification"("trackId", "runId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassificationRun_jobId_key" ON "ClassificationRun"("jobId");

-- CreateIndex
CREATE INDEX "ClassificationRun_userId_idx" ON "ClassificationRun"("userId");

-- CreateIndex
CREATE INDEX "ClassificationRun_status_idx" ON "ClassificationRun"("status");

-- CreateIndex
CREATE INDEX "ClassificationRun_createdAt_idx" ON "ClassificationRun"("createdAt");

-- CreateIndex
CREATE INDEX "PlaylistProposal_userId_idx" ON "PlaylistProposal"("userId");

-- CreateIndex
CREATE INDEX "PlaylistProposal_runId_idx" ON "PlaylistProposal"("runId");

-- CreateIndex
CREATE INDEX "PlaylistProposal_approvedAt_idx" ON "PlaylistProposal"("approvedAt");

-- AddForeignKey
ALTER TABLE "UserConfig" ADD CONSTRAINT "UserConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Track" ADD CONSTRAINT "Track_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassificationRun" ADD CONSTRAINT "ClassificationRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistProposal" ADD CONSTRAINT "PlaylistProposal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaylistProposal" ADD CONSTRAINT "PlaylistProposal_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ClassificationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
