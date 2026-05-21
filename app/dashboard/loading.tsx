export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
          <div className="h-9 w-32 bg-zinc-800 rounded animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-72 bg-zinc-800 rounded animate-pulse" />
        </div>

        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-700/20 rounded-2xl p-6 h-40 animate-pulse" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 h-24 animate-pulse"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded p-4 h-80 animate-pulse" />
          <div className="bg-zinc-900 rounded p-4 h-80 animate-pulse" />
        </div>
      </div>
    </main>
  )
}
