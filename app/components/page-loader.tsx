type PageLoaderProps = {
  label?: string
  fullScreen?: boolean
  compact?: boolean
}

const PageLoader = ({ label = "Loading your workspace", fullScreen = false, compact = false }: PageLoaderProps) => (
  <main
    className={`flex items-center justify-center bg-[#f7f8fc] px-6 ${fullScreen ? "min-h-screen" : compact ? "min-h-[180px] w-full" : "min-h-[420px] w-full"}`}
    aria-busy="true"
    aria-live="polite"
  >
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-indigo-200/50 [animation-duration:1.8s]" />
        <span className="absolute inset-2 animate-spin rounded-full border-[3px] border-indigo-100 border-t-indigo-600 [animation-duration:0.85s]" />
        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-200">K</span>
      </div>
      <p className="mt-5 text-sm font-semibold text-slate-700">{label}</p>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {[0, 1, 2].map((dot) => (
          <span key={dot} className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-500" style={{ animationDelay: `${dot * 140}ms` }} />
        ))}
      </div>
      <span className="sr-only">Please wait while the data loads.</span>
    </div>
  </main>
)

export default PageLoader