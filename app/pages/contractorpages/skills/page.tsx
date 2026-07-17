"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import Navbar from "@/app/components/navbar"
import PageLoader from "@/app/components/page-loader"
import Sidebar from "@/app/components/sidebar"
import { useToast } from "@/app/components/toast-provider"
import { apiUrl } from "@/lib/api"

type Skill = {
  _id: string
  skillName: string
  skillCode?: string
  defaultDailyWage: number
  otRatePerHour: number
  status: "ACTIVE" | "INACTIVE"
}
type Api<T> = { success: boolean; data?: T; message?: string }
type Form = { skillName: string; skillCode: string; defaultDailyWage: string; otRatePerHour: string; status: Skill["status"] }
const emptyForm: Form = { skillName: "", skillCode: "", defaultDailyWage: "", otRatePerHour: "0", status: "ACTIVE" }
const input = "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"

export default function SkillsPage() {
  const { showToast } = useToast()
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [editing, setEditing] = useState<Skill | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)

  const loadSkills = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    try {
      const response = await fetch(apiUrl("/skills/get-skilles"), { credentials: "include", signal })
      const result = await response.json() as Api<Skill[]>
      if (!response.ok || !result.success) throw new Error(result.message || "Skills could not be loaded.")
      setSkills(result.data || [])
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") showToast(error.message, "error")
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => void loadSkills(controller.signal), 0)
    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [loadSkills])

  const startEdit = (skill: Skill) => {
    setEditing(skill)
    setForm({ skillName: skill.skillName, skillCode: skill.skillCode || "", defaultDailyWage: String(skill.defaultDailyWage), otRatePerHour: String(skill.otRatePerHour || 0), status: skill.status })
  }
  const reset = () => { setEditing(null); setForm(emptyForm) }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const endpoint = editing ? `/skills/update/${editing._id}` : "/skills/create"
      const response = await fetch(apiUrl(endpoint), {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, skillName: form.skillName.trim(), skillCode: form.skillCode.trim(), defaultDailyWage: Number(form.defaultDailyWage), otRatePerHour: Number(form.otRatePerHour || 0) }),
      })
      const result = await response.json() as Api<Skill>
      if (!response.ok || !result.success) throw new Error(result.message || "Skill could not be saved.")
      showToast(result.message || `Skill ${editing ? "updated" : "created"} successfully.`, "success")
      reset()
      await loadSkills()
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Skill could not be saved.", "error")
    } finally { setSaving(false) }
  }

  const remove = async (skill: Skill) => {
    if (!window.confirm(`Delete ${skill.skillName}?`)) return
    setDeletingId(skill._id)
    try {
      const response = await fetch(apiUrl(`/skills/delete/${skill._id}`), { method: "DELETE", credentials: "include" })
      const result = await response.json() as Api<never>
      if (!response.ok || !result.success) throw new Error(result.message || "Skill could not be deleted.")
      setSkills((current) => current.filter((item) => item._id !== skill._id))
      showToast(result.message || "Skill deleted successfully.", "success")
      if (editing?._id === skill._id) reset()
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Skill could not be deleted.", "error")
    } finally { setDeletingId("") }
  }

  return <div className="flex h-screen overflow-hidden bg-[#f7f8fc]"><Sidebar /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Navbar />
    <main className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-7">
      <header><p className="text-xs text-slate-500">Dashboard / <span className="font-semibold text-indigo-600">Skills</span></p><h1 className="mt-2 text-2xl font-bold text-slate-950">Skills &amp; Wage Rates</h1><p className="mt-1 text-sm text-slate-500">Manage labour skills, default daily wages and overtime rates.</p></header>
      {loading ? <PageLoader label="Loading skills" /> : <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form onSubmit={submit} className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="border-b border-slate-200 pb-3 text-sm font-bold">{editing ? "Edit Skill" : "Add New Skill"}</h2>
          <div className="mt-4 space-y-4">
            <label className="block text-xs font-semibold text-slate-600">Skill Name *<input required value={form.skillName} onChange={(e)=>setForm({...form,skillName:e.target.value})} className={input} placeholder="e.g. Electrician" /></label>
            <label className="block text-xs font-semibold text-slate-600">Skill Code<input value={form.skillCode} onChange={(e)=>setForm({...form,skillCode:e.target.value.toUpperCase()})} className={input} placeholder="e.g. ELEC" /></label>
            <label className="block text-xs font-semibold text-slate-600">Default Daily Wage *<input required type="number" min="1" value={form.defaultDailyWage} onChange={(e)=>setForm({...form,defaultDailyWage:e.target.value})} className={input} /></label>
            <label className="block text-xs font-semibold text-slate-600">OT Rate / Hour<input type="number" min="0" value={form.otRatePerHour} onChange={(e)=>setForm({...form,otRatePerHour:e.target.value})} className={input} /></label>
            {editing && <label className="block text-xs font-semibold text-slate-600">Status<select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value as Skill["status"]})} className={input}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>}
          </div>
          <div className="mt-5 flex gap-2">{editing && <button type="button" onClick={reset} className="h-10 flex-1 rounded-md border border-slate-300 text-sm font-semibold text-slate-600">Cancel</button>}<button disabled={saving} className="h-10 flex-1 rounded-md bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : editing ? "Update Skill" : "Add Skill"}</button></div>
        </form>
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-bold">All Skills</h2><p className="mt-1 text-xs text-slate-500">{skills.length} skill{skills.length === 1 ? "" : "s"} configured</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase text-slate-500"><tr>{["Skill","Code","Daily Wage","OT / Hour","Status","Actions"].map((h)=><th key={h} className="border-b px-5 py-3">{h}</th>)}</tr></thead><tbody>{skills.map((skill)=><tr key={skill._id} className="border-b border-slate-100 hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-900">{skill.skillName}</td><td className="px-5 py-4 text-slate-500">{skill.skillCode || "-"}</td><td className="px-5 py-4 font-semibold">₹{Number(skill.defaultDailyWage).toLocaleString("en-IN")}</td><td className="px-5 py-4">₹{Number(skill.otRatePerHour || 0).toLocaleString("en-IN")}</td><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${skill.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{skill.status}</span></td><td className="px-5 py-4"><div className="flex gap-2"><button onClick={()=>startEdit(skill)} className="rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700">Edit</button><button onClick={()=>void remove(skill)} disabled={deletingId===skill._id} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-50">{deletingId===skill._id?"Deleting...":"Delete"}</button></div></td></tr>)}</tbody></table></div>
          {!skills.length && <p className="p-12 text-center text-sm text-slate-500">No skills configured yet.</p>}
        </section>
      </div>}
    </main>
  </div></div>
}