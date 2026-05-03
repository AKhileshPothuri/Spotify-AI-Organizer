export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold">🎵 Spotify AI Organizer</h1>
        <p className="mb-8 text-xl text-gray-600">
          AI-powered, human-in-the-loop playlist organization
        </p>

        <div className="space-y-4">
          <button className="rounded-lg bg-spotify px-6 py-3 text-white font-semibold hover:bg-opacity-90">
            Login with Spotify
          </button>

          <div className="text-sm text-gray-500">
            <p>Coming soon...</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-8">
          <div>
            <h3 className="mb-2 font-semibold">🎯 Classify</h3>
            <p className="text-sm text-gray-600">AI-powered classification</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">👀 Review</h3>
            <p className="text-sm text-gray-600">Human-in-the-loop approval</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">✅ Create</h3>
            <p className="text-sm text-gray-600">Auto-create playlists</p>
          </div>
        </div>
      </div>
    </main>
  );
}
