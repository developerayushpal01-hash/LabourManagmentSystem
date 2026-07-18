"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

type LoginSplashProps = { onComplete: () => void }
const DURATION = 8000

const Icon = ({ type }: { type: "labours" | "attendance" | "payroll" | "sites" }) => {
  if (type === "labours") return <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3.5 19c.3-4 2.1-6 5.5-6s5.2 2 5.5 6M14 14c3.8-.5 5.8 1.2 6.2 4.5"/></svg>
  if (type === "attendance") return <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5 2.5 2.5L16 13"/></svg>
  if (type === "payroll") return <svg viewBox="0 0 24 24" fill="none"><path d="M6 2h9l4 4v16H6zM15 2v5h4M9 12h7m-7 4h7"/><path d="M12 10v8"/></svg>
  return <svg viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V9h6v12m2 0V3h6v18M7 12h2m-2 3h2m6-8h2m-2 4h2m-2 4h2"/></svg>
}

export default function LoginSplash({ onComplete }: LoginSplashProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const startedAt = performance.now()
    let frame = 0
    const update = (now: number) => {
      const next = Math.min(((now - startedAt) / DURATION) * 100, 100)
      setProgress(next)
      if (next >= 100) onComplete()
      else frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [onComplete])

  const nodes = [
    { type: "labours" as const, label: "LABOURS", position: "left-1/2 top-0 -translate-x-1/2" },
    { type: "attendance" as const, label: "ATTENDANCE", position: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2" },
    { type: "payroll" as const, label: "PAYROLL", position: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2" },
    { type: "sites" as const, label: "SITES", position: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2" },
  ]

  return <main className="relative flex min-h-screen overflow-hidden bg-[#080d1d] text-white" aria-busy="true" aria-label="Kinetic LMS is loading">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(91,61,190,.22),transparent_45%)]" />
    <div className="m-auto flex w-full max-w-3xl flex-col items-center px-6 py-10">
      <div className="relative h-[min(64vw,520px)] w-[min(64vw,520px)] min-h-[310px] min-w-[310px]">
        <div className="absolute inset-[8%] rounded-full border border-violet-500/20" />
        <div className="absolute inset-[15%] rounded-full border-[10px] border-indigo-300/10 shadow-[0_0_35px_rgba(124,58,237,.25)]" />
        <div className="absolute inset-[1%] animate-[spin_7s_linear_infinite] rounded-full border-4 border-transparent border-r-violet-500 border-t-violet-500 shadow-[0_0_18px_rgba(139,92,246,.7)]" />
        <div className="absolute inset-[10%] animate-[spin_12s_linear_infinite_reverse] rounded-full border-2 border-dashed border-violet-500/80" />
        <span className="absolute right-[5%] top-[25%] h-5 w-5 animate-pulse rounded-full bg-white shadow-[0_0_20px_7px_rgba(139,92,246,.9)]" />
        {nodes.map((node) => <div key={node.type} className={`absolute z-20 flex flex-col items-center ${node.position}`}><div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-violet-400 bg-[#242054] shadow-[0_0_20px_rgba(139,92,246,.65)] sm:h-20 sm:w-20"><span className="h-9 w-9 text-white sm:h-11 sm:w-11 [&_svg]:h-full [&_svg]:w-full [&_svg]:stroke-current [&_svg]:stroke-[1.6]"><Icon type={node.type}/></span></div><span className="mt-3 text-[10px] tracking-wide sm:text-sm">{node.label}</span></div>)}
        <div className="absolute inset-[25%] z-10 flex flex-col items-center justify-center rounded-full border border-indigo-300/20 bg-[#12172b]/95 shadow-[inset_0_0_45px_rgba(99,102,241,.16),0_0_50px_rgba(124,58,237,.22)]">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-violet-400/80 bg-white shadow-[0_0_25px_rgba(139,92,246,.6)] sm:h-28 sm:w-28"><Image src="/assets/logo.png?v=splash-brand-2" alt="Kinetic LMS" width={104} height={104} priority unoptimized className="h-24 w-24 object-contain sm:h-28 sm:w-28" /></div>
          <h1 className="mt-3 text-lg font-bold sm:text-3xl">Kinetic <span className="text-violet-400">LMS</span></h1>
          <p className="mt-1 text-[7px] tracking-[.18em] text-slate-300 sm:text-[10px]">LABOR MANAGEMENT SYSTEM</p>
        </div>
      </div>
      <p className="mt-12 text-xl font-light tracking-wide sm:text-3xl">Loading, please wait...</p>
      <div className="mt-7 h-7 w-full max-w-xl overflow-hidden rounded-full border border-slate-500/60 bg-slate-700/60 p-0.5 shadow-[0_0_18px_rgba(124,58,237,.25)]"><div className="h-full w-full origin-left rounded-full bg-[repeating-linear-gradient(135deg,#7c3aed_0,#7c3aed_10px,#9f67ff_10px,#9f67ff_20px)] shadow-[0_0_18px_rgba(139,92,246,.85)] will-change-transform" style={{ transform: `scaleX(${progress / 100})`, backgroundPositionX: `${progress * 2}px` }} /></div>
      <p className="mt-4 text-2xl font-semibold text-violet-400">{Math.round(progress)}%</p>
    </div>
  </main>
}