export default function Loading() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-900 rounded p-4 h-96 animate-pulse" />

          <div className="space-y-4">
            <div className="bg-zinc-900 rounded p-4 h-80 animate-pulse" />
            <div className="bg-zinc-900 rounded p-4 h-40 animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  )
}
