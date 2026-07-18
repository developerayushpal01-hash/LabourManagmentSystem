"use client"

import Image from "next/image"
import Link from "next/link"
import { ChangeEvent, FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"
import { useToast } from "@/app/components/toast-provider"

type RegisterForm = {
  companyName: string
  ownerName: string
  email: string
  mobile: string
  password: string
  gstNumber: string
  street: string
  city: string
  district: string
  state: string
  pincode: string
  country: string
}
type RegisterResponse = { success: boolean; message?: string }

const initialForm: RegisterForm = {
  companyName: "", ownerName: "", email: "", mobile: "", password: "",
  gstNumber: "", street: "", city: "", district: "", state: "", pincode: "", country: "India",
}

const inputClass = "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
const labelClass = "mb-2 block text-[11px] font-bold uppercase tracking-wide text-slate-600"

export default function RegisterPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [form, setForm] = useState<RegisterForm>(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    const payload = {
      companyName: form.companyName.trim(),
      ownerName: form.ownerName.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      password: form.password,
      gstNumber: form.gstNumber.trim(),
      address: {
        street: form.street.trim(), city: form.city.trim(), district: form.district.trim(), state: form.state.trim(),
        pincode: form.pincode.trim(), country: form.country.trim() || "India",
      },
    }
    try {
      const response = await fetch(apiUrl("/auth/register"), {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as RegisterResponse
      if (!response.ok || !result.success) throw new Error(result.message ?? "Registration failed. Please try again.")
      showToast(result.message ?? "Registration successful.", "success")
      router.push("/")
      router.refresh()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Registration failed. Please try again."
      setError(message)
      showToast(message, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const benefits = [
    ["01", "One connected workspace", "Manage labour, sites and attendance from a single dashboard."],
    ["02", "Accurate payroll", "Turn verified attendance into reliable salary calculations."],
    ["03", "Ready for growth", "Add teams and project sites as your business expands."],
  ]

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080d1d] lg:grid lg:grid-cols-[.82fr_1.18fr]">
      <div className="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 animate-pulse rounded-full bg-violet-600/20 blur-3xl [animation-duration:6s]" />

      <aside className="relative hidden min-h-screen overflow-hidden px-10 py-9 text-white lg:flex lg:flex-col xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(139,92,246,.25),transparent_34%),linear-gradient(145deg,#080d1d_0%,#121735_65%,#0a1021_100%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="pointer-events-none absolute -right-32 top-1/3 h-80 w-80 animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-violet-400/30" />
        <div className="pointer-events-none absolute -right-20 top-[40%] h-56 w-56 animate-[spin_12s_linear_infinite_reverse] rounded-full border border-indigo-400/20" />

        <Link href="/pages/login" className="relative z-10 flex w-fit items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-violet-400/30 bg-white shadow-[0_0_24px_rgba(139,92,246,.3)]">
            <Image src="/assets/logo.png?v=register-2" alt="Kinetic LMS" width={46} height={46} unoptimized className="h-11 w-11 object-contain" />
          </span>
          <span><strong className="block text-xl">Kinetic <i className="not-italic text-violet-400">LMS</i></strong><small className="text-[9px] font-semibold uppercase tracking-[.2em] text-slate-400">Labor Management System</small></span>
        </Link>

        <div className="relative z-10 my-auto max-w-md py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-violet-300"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />Get started today</span>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight xl:text-5xl">Build a smarter workforce operation.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">Create your organization workspace and bring every part of labour management together.</p>

          <div className="mt-9 space-y-3">
            {benefits.map(([number, title, text], index) => (
              <div key={number} className={`group flex gap-4 rounded-2xl border border-white/10 bg-white/[.055] p-4 backdrop-blur-sm transition duration-300 hover:translate-x-1 hover:border-violet-400/30 hover:bg-violet-500/10 ${index === 1 ? "ml-5" : ""}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-xs font-black text-violet-300">{number}</span>
                <span><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs leading-5 text-slate-400">{text}</span></span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[10px] text-slate-500">&copy; 2026 Kinetic LMS &bull; Secure organization onboarding</p>
      </aside>

      <section className="relative min-h-screen overflow-y-auto bg-[#f7f8fc] px-4 py-8 sm:px-8 lg:h-screen xl:px-14">
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-indigo-100/80 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-violet-100/60 blur-3xl" />

        <div className="relative mx-auto w-full max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/pages/login" className="flex items-center gap-2.5 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-sm"><Image src="/assets/logo.png?v=register-mobile-2" alt="Kinetic LMS" width={38} height={38} unoptimized className="h-9 w-9 object-contain" /></span>
              <strong className="text-slate-900">Kinetic <span className="text-indigo-600">LMS</span></strong>
            </Link>
            <p className="ml-auto text-xs text-slate-500">Already registered? <Link href="/pages/login" className="font-bold text-indigo-600 hover:text-indigo-800">Sign in</Link></p>
          </div>

          <div className="rounded-[2rem] border border-white bg-white/90 p-5 shadow-[0_28px_80px_rgba(30,41,59,.13)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div><span className="text-[10px] font-bold uppercase tracking-[.2em] text-indigo-600">Organization setup</span><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Create your workspace</h2><p className="mt-2 text-sm text-slate-500">Tell us about your company and primary administrator.</p></div>
              <span className="flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Secure form</span>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <fieldset>
                <legend className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-[10px] text-indigo-700">01</span>Company details</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className={labelClass}>Company name</span><input name="companyName" required value={form.companyName} onChange={updateField} placeholder="Kinetic Enterprises Ltd" className={inputClass} /></label>
                  <label><span className={labelClass}>Owner name</span><input name="ownerName" required value={form.ownerName} onChange={updateField} placeholder="Organization head" className={inputClass} /></label>
                  <label><span className={labelClass}>Email address</span><input name="email" type="email" autoComplete="email" required value={form.email} onChange={updateField} placeholder="admin@company.com" className={inputClass} /></label>
                  <label><span className={labelClass}>Mobile number</span><input name="mobile" type="tel" inputMode="numeric" pattern="[0-9]{10}" maxLength={10} required value={form.mobile} onChange={updateField} placeholder="9876543210" className={inputClass} /></label>
                  <label className="sm:col-span-2"><span className={labelClass}>GST / Tax identification number <i className="font-normal normal-case text-slate-400">(optional)</i></span><input name="gstNumber" value={form.gstNumber} onChange={updateField} placeholder="Enter tax registration ID" className={inputClass} /></label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-[10px] text-indigo-700">02</span>Registered address</legend>
                <div className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
                  <label className="sm:col-span-2"><span className={labelClass}>Street / Area</span><input name="street" required value={form.street} onChange={updateField} placeholder="Building, street or area" className={inputClass} /></label>
                  <label><span className={labelClass}>City</span><input name="city" required value={form.city} onChange={updateField} placeholder="City" className={inputClass} /></label>
                  <label><span className={labelClass}>District</span><input name="district" required value={form.district} onChange={updateField} placeholder="District" className={inputClass} /></label>
                  <label><span className={labelClass}>State</span><input name="state" required value={form.state} onChange={updateField} placeholder="State" className={inputClass} /></label>
                  <label><span className={labelClass}>Pincode</span><input name="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={form.pincode} onChange={updateField} placeholder="6-digit pincode" className={inputClass} /></label>
                  <label><span className={labelClass}>Country</span><input name="country" required value={form.country} onChange={updateField} className={inputClass} /></label>
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-4 flex items-center gap-2 text-sm font-black text-slate-800"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-100 text-[10px] text-indigo-700">03</span>Secure your account</legend>
                <label className="block"><span className={labelClass}>Password</span><span className="relative block"><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required value={form.password} onChange={updateField} placeholder="Minimum 8 characters" className={`${inputClass} pr-12`} /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-indigo-600">{showPassword ? "Hide" : "Show"}</button></span></label>
              </fieldset>

              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row">
                <Link href="/pages/login" className="flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Back to login</Link>
                <button type="submit" disabled={isSubmitting} className="group flex h-12 flex-[1.5] items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Creating workspace...</> : <>Register company <span className="transition-transform group-hover:translate-x-1">&rarr;</span></>}</button>
              </div>
            </form>
          </div>

          <p className="mt-5 text-center text-[10px] text-slate-400">By registering, you confirm that the provided organization information is accurate.</p>
        </div>
      </section>
    </main>
  )
}


