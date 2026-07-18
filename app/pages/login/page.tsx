"use client"

import Image from "next/image"
import Link from "next/link"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"
import { useToast } from "@/app/components/toast-provider"

type LoginResponse = { success: boolean; message?: string; user?: { role: string } }

const MiniIcon = ({ type }: { type: "people" | "attendance" | "payroll" }) => {
  if (type === "people") return <path d="M7 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7-1a2.5 2.5 0 1 0 0-5M2 18c.4-3.2 2-4.8 5-4.8s4.6 1.6 5 4.8m1-5c2.8-.3 4.3 1.4 4.6 4" />
  if (type === "attendance") return <><rect x="2.5" y="4" width="15" height="14" rx="2" /><path d="M6 2v4m8-4v4M3 8h14m-10 5 2 2 4-4" /></>
  return <><rect x="3" y="3" width="14" height="16" rx="2" /><path d="M7 7h6m-6 4h6m-6 4h3" /></>
}

export default function LoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [loginId, setLoginId] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId, password, rememberMe }),
      })
      const result = (await response.json()) as LoginResponse
      if (!response.ok || !result.success) throw new Error(result.message ?? "Login failed. Please try again.")
      sessionStorage.setItem("kinetic-login-splash", "1")
      showToast(result.message ?? "Login successful.", "success")
      router.push(result.user?.role === "SUPER_ADMIN" ? "/pages/superadmin" : "/")
      router.refresh()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Login failed. Please try again."
      setError(message)
      showToast(message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const features = [
    { type: "people" as const, label: "Workforce", value: "Manage teams" },
    { type: "attendance" as const, label: "Attendance", value: "Live tracking" },
    { type: "payroll" as const, label: "Payroll", value: "Smart payouts" },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d1d] text-slate-900 lg:grid lg:grid-cols-[1.08fr_.92fr]">
      <div className="pointer-events-none absolute -left-32 -top-36 h-96 w-96 animate-pulse rounded-full bg-violet-600/25 blur-3xl [animation-duration:5s]" />
      <div className="pointer-events-none absolute -bottom-48 left-[40%] h-[30rem] w-[30rem] animate-pulse rounded-full bg-indigo-500/20 blur-3xl [animation-delay:1.5s] [animation-duration:6s]" />

      <section className="relative hidden min-h-screen overflow-hidden px-12 py-10 text-white lg:flex lg:flex-col xl:px-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_35%,rgba(139,92,246,.23),transparent_32%),linear-gradient(145deg,#080d1d_0%,#111735_58%,#0a1021_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:54px_54px]" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-violet-400/40 bg-white shadow-[0_0_25px_rgba(139,92,246,.3)]">
            <Image src="/assets/logo.png?v=login-2" alt="Kinetic LMS" width={48} height={48} unoptimized className="h-11 w-11 object-contain" />
          </div>
          <div>
            <p className="text-xl font-extrabold tracking-tight">Kinetic <span className="text-violet-400">LMS</span></p>
            <p className="text-[9px] font-semibold uppercase tracking-[.22em] text-slate-400">Labor Management System</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-2xl py-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-violet-300">
            <i className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 shadow-[0_0_10px_#a78bfa]" />
            Workforce intelligence
          </span>
          <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.08] tracking-tight xl:text-6xl">
            Your workforce,
            <span className="block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-indigo-300 bg-clip-text text-transparent">perfectly in motion.</span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Attendance, payroll, sites and peopleall connected in one intelligent workspace built for modern contractors.
          </p>

          <div className="relative mt-12 h-52 max-w-xl">
            <div className="absolute left-10 top-2 h-44 w-44 animate-[spin_16s_linear_infinite] rounded-full border border-dashed border-violet-400/35" />
            <div className="absolute left-[5.25rem] top-[3.25rem] flex h-20 w-20 items-center justify-center rounded-full border border-violet-300/30 bg-[#181d3c] shadow-[0_0_40px_rgba(124,58,237,.35)]">
              <Image src="/assets/logo.png?v=login-orbit-2" alt="" width={64} height={64} unoptimized className="h-16 w-16 object-contain" />
            </div>
            {features.map((feature, index) => (
              <div key={feature.label} className={`absolute flex w-48 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.07] p-3 shadow-2xl backdrop-blur-md transition hover:-translate-y-1 hover:border-violet-400/35 ${index === 0 ? "left-64 top-0 animate-[bounce_4s_ease-in-out_infinite]" : index === 1 ? "left-72 top-[4.8rem] animate-[bounce_4.6s_ease-in-out_infinite] [animation-delay:.6s]" : "left-60 top-[9.6rem] animate-[bounce_5s_ease-in-out_infinite] [animation-delay:1.1s]"}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                  <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current stroke-[1.5]" fill="none"><MiniIcon type={feature.type} /></svg>
                </span>
                <span><strong className="block text-xs text-white">{feature.label}</strong><span className="text-[10px] text-slate-400">{feature.value}</span></span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-500">
          <span>Secure access &bull; Smart management</span>
          <span>&copy; 2026 Kinetic LMS</span>
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-12 sm:px-10">
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-violet-100/60 blur-3xl" />

        <div className="relative w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm">
              <Image src="/assets/logo.png?v=login-mobile-2" alt="Kinetic LMS" width={42} height={42} unoptimized className="h-10 w-10 object-contain" />
            </div>
            <div><strong className="block text-lg text-slate-900">Kinetic <span className="text-indigo-600">LMS</span></strong><span className="text-[9px] uppercase tracking-[.16em] text-slate-500">Labor Management System</span></div>
          </div>

          <div className="rounded-[2rem] border border-white bg-white/90 p-6 shadow-[0_28px_80px_rgba(30,41,59,.14)] backdrop-blur-xl sm:p-9">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[.2em] text-indigo-600">Welcome back</span>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Sign in to continue</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Enter your account details to access your workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-xs font-bold text-slate-700">Email or mobile number</span>
                <span className="group relative block">
                  <svg aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-600" viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4zM4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  <input id="loginId" name="loginId" type="text" autoComplete="username" required value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="name@company.com" className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Password</span><Link href="/pages/forgot-password" aria-label="Open forgot password page" className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-600 transition hover:bg-indigo-100 hover:text-indigo-800">Forgot Password?</Link></span>
                <span className="group relative block">
                  <svg aria-hidden="true" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition group-focus-within:text-indigo-600" viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                  <input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600">
                    {showPassword ? <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="m4 4 16 16M10.5 7.2A10.8 10.8 0 0 1 12 7c6 0 9.5 5 9.5 5a15 15 0 0 1-2.1 2.5M14 14a2.8 2.8 0 0 1-4-4M6.2 8.2A15.5 15.5 0 0 0 2.5 12s3.5 5 9.5 5c1 0 2-.1 2.8-.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg> : <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" stroke="currentColor" strokeWidth="1.7" /><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" /></svg>}
                  </button>
                </span>
              </label>

              <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-slate-600">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-indigo-600" />
                Keep me logged in
              </label>

              {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span className="mt-0.5">!</span><span>{error}</span></div>}

              <button type="submit" disabled={isSubmitting} className="group flex h-13 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-200 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Signing in...</> : <>Sign in securely <span className="transition-transform group-hover:translate-x-1">&rarr;</span></>}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-slate-500">New to Kinetic LMS? <Link href="/pages/register" className="font-bold text-indigo-600 hover:text-indigo-800">Create an account</Link></p>
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-slate-400"><svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none"><path d="M5 9V6a5 5 0 0 1 10 0v3m-11 0h12v9H4z" stroke="currentColor" strokeWidth="1.5" /></svg>Protected with secure authentication</div>
        </div>
      </section>
    </main>
  )
}

