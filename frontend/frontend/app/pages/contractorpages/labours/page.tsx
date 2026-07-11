"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Navbar from "@/app/components/navbar"
import Sidebar from "@/app/components/sidebar"
import { useToast } from "@/app/components/toast-provider"
import { apiUrl } from "@/lib/api"

type Skill = {
  _id: string
  skillName: string
  defaultDailyWage?: number
}

type Labour = {
  _id: string
  labourCode: string
  name: string
  mobile: string
  gender: "MALE" | "FEMALE" | "OTHER"
  address?: string
  dailyWage?: number | null
  finalDailyWage: number
  status: "ACTIVE" | "INACTIVE" | "BLOCKED"
  skillId: Skill | null
  createdAt: string
}

type LabourResponse = {
  success: boolean
  data?: Labour[] | Labour
  message?: string
}

type SkillResponse = {
  success: boolean
  data?: Skill[]
}

type LabourForm = {
  name: string
  mobile: string
  gender: Labour["gender"]
  skillId: string
  address: string
  dailyWage: string
}

const PAGE_SIZE = 10
const emptyForm: LabourForm = { name: "", mobile: "", gender: "MALE", skillId: "", address: "", dailyWage: "" }
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")

const LaboursPage = () => {
  const { showToast } = useToast()
  const [labours, setLabours] = useState<Labour[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<"ALL" | Labour["status"]>("ALL")
  const [query, setQuery] = useState("")
  const [showFilter, setShowFilter] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedLabour, setSelectedLabour] = useState<Labour | null>(null)
  const [editingLabour, setEditingLabour] = useState<Labour | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState<LabourForm>(emptyForm)

  useEffect(() => {
    const controller = new AbortController()

    const loadData = async () => {
      try {
        const [labourResponse, skillResponse] = await Promise.all([
          fetch(apiUrl("/labours/get-labours"), { credentials: "include", signal: controller.signal }),
          fetch(apiUrl("/skills/get-skilles"), { credentials: "include", signal: controller.signal }),
        ])
        const labourResult = (await labourResponse.json()) as LabourResponse
        const skillResult = (await skillResponse.json()) as SkillResponse

        if (!labourResponse.ok || !labourResult.success || !Array.isArray(labourResult.data)) {
          throw new Error(labourResult.message ?? "Labours could not be loaded.")
        }

        setLabours(labourResult.data)
        if (skillResponse.ok && skillResult.success && skillResult.data) setSkills(skillResult.data)
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") showToast(error.message, "error")
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
    return () => controller.abort()
  }, [showToast])

  const filteredLabours = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return labours.filter((labour) => {
      const matchesStatus = activeFilter === "ALL" || labour.status === activeFilter
      const matchesQuery = !normalizedQuery || [labour.name, labour.mobile, labour.labourCode, labour.skillId?.skillName, labour.address]
        .some((value) => value?.toLowerCase().includes(normalizedQuery))
      return matchesStatus && matchesQuery
    })
  }, [activeFilter, labours, query])

  const pageCount = Math.max(1, Math.ceil(filteredLabours.length / PAGE_SIZE))
  const visibleLabours = filteredLabours.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const paginationItems = useMemo<(number | string)[]>(() => {
    if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1)
    if (currentPage <= 3) return [1, 2, 3, "right-gap", pageCount]
    if (currentPage >= pageCount - 2) return [1, "left-gap", pageCount - 2, pageCount - 1, pageCount]
    return [1, "left-gap", currentPage, "right-gap", pageCount]
  }, [currentPage, pageCount])

  const activeCount = labours.filter((labour) => labour.status === "ACTIVE").length
  const inactiveCount = labours.filter((labour) => labour.status === "INACTIVE").length
  const blockedCount = labours.filter((labour) => labour.status === "BLOCKED").length
  const totalDailyWage = labours.reduce((total, labour) => total + (labour.finalDailyWage || 0), 0)

  const changeFilter = (filter: "ALL" | Labour["status"]) => {
    setActiveFilter(filter)
    setCurrentPage(1)
  }

  const openCreate = () => {
    setEditingLabour(null)
    setForm(emptyForm)
    setIsFormOpen(true)
  }

  const openEdit = (labour: Labour) => {
    setEditingLabour(labour)
    setForm({
      name: labour.name,
      mobile: labour.mobile,
      gender: labour.gender,
      skillId: labour.skillId?._id ?? "",
      address: labour.address ?? "",
      dailyWage: labour.dailyWage?.toString() ?? "",
    })
    setIsFormOpen(true)
  }

  const closeForm = () => {
    if (isSubmitting) return
    setIsFormOpen(false)
    setEditingLabour(null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      const endpoint = editingLabour ? `/labours/update/${editingLabour._id}` : "/labours/create"
      const response = await fetch(apiUrl(endpoint), {
        method: editingLabour ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dailyWage: form.dailyWage ? Number(form.dailyWage) : null }),
      })
      const result = (await response.json()) as LabourResponse
      if (!response.ok || !result.success || !result.data || Array.isArray(result.data)) {
        throw new Error(result.message ?? "Labour could not be saved.")
      }

      const savedLabour = result.data as Labour
      setLabours((current) => editingLabour
        ? current.map((item) => item._id === savedLabour._id ? savedLabour : item)
        : [savedLabour, ...current])
      showToast(result.message ?? `Labour ${editingLabour ? "updated" : "added"} successfully.`, "success")
      setIsFormOpen(false)
      setEditingLabour(null)
      setForm(emptyForm)
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Labour could not be saved.", "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (labour: Labour) => {
    if (!window.confirm(`Delete ${labour.name}?`)) return
    setDeletingId(labour._id)
    try {
      const response = await fetch(apiUrl(`/labours/delete/${labour._id}`), { method: "DELETE", credentials: "include" })
      const result = (await response.json()) as LabourResponse
      if (!response.ok || !result.success) throw new Error(result.message ?? "Labour could not be deleted.")
      setLabours((current) => current.filter((item) => item._id !== labour._id))
      showToast(result.message ?? "Labour deleted successfully.", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Delete failed.", "error")
    } finally {
      setDeletingId(null)
    }
  }

  const exportCsv = () => {
    const rows = [
      ["Labour Code", "Name", "Mobile", "Skill", "Gender", "Status", "Daily Wage"],
      ...filteredLabours.map((labour) => [labour.labourCode, labour.name, labour.mobile, labour.skillId?.skillName ?? "", labour.gender, labour.status, labour.finalDailyWage]),
    ]
    const csv = rows.map((row) => row.map((cell) => JSON.stringify(cell)).join(",")).join("\n")
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "labours.csv"
    anchor.click()
    URL.revokeObjectURL(url)
    showToast("Labour list exported.", "success")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fc]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-7">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs text-slate-500">Dashboard / Workforce / <strong className="text-slate-700">Labours</strong></p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">Labours Management</h1>
              <p className="mt-1 text-sm text-slate-500">Manage, track and verify your workforce across active sites.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowFilter((current) => !current)} className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <span className="text-base">&#8801;</span> Filter
              </button>
              <button type="button" onClick={exportCsv} className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <span aria-hidden="true">&#8681;</span> Export
              </button>
              <button type="button" onClick={openCreate} className="h-10 rounded-md bg-indigo-700 px-4 text-sm font-semibold text-white hover:bg-indigo-800">+ Add Labour</button>
            </div>
          </header>

          {showFilter && (
            <div className="mt-4 border-y border-slate-200 bg-white px-4 py-3">
              <label htmlFor="labour-search" className="sr-only">Search labours</label>
              <input id="labour-search" value={query} onChange={(event) => { setQuery(event.target.value); setCurrentPage(1) }} placeholder="Search by name, mobile, code, skill or address" className="h-10 w-full max-w-lg rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
            </div>
          )}

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Labours", value: labours.length, note: `${activeCount} currently active`, color: "bg-indigo-100 text-indigo-700", icon: "L" },
              { label: "Active Workforce", value: activeCount, note: `${labours.length ? Math.round((activeCount / labours.length) * 100) : 0}% of total`, color: "bg-emerald-100 text-emerald-700", icon: "A" },
              { label: "Daily Wage Total", value: money.format(totalDailyWage), note: "Across all labours", color: "bg-sky-100 text-sky-700", icon: "INR" },
              { label: "Action Needed", value: inactiveCount + blockedCount, note: `${blockedCount} blocked accounts`, color: "bg-red-100 text-red-700", icon: "!" },
            ].map((card) => (
              <article key={card.label} className="min-h-36 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`flex h-9 min-w-9 w-fit items-center justify-center rounded px-2 text-xs font-bold ${card.color}`}>{card.icon}</div>
                <p className="mt-4 text-xs font-semibold uppercase text-slate-500">{card.label}</p>
                <strong className="mt-1 block text-xl text-slate-900">{isLoading ? "--" : card.value}</strong>
                <p className="mt-1 text-xs text-slate-400">{card.note}</p>
              </article>
            ))}
          </section>

          <section className="mt-7 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5 overflow-x-auto">
                {(["ALL", "ACTIVE", "INACTIVE", "BLOCKED"] as const).map((filter) => (
                  <button key={filter} type="button" onClick={() => changeFilter(filter)} className={`h-10 whitespace-nowrap border-b-2 px-1 text-xs font-semibold ${activeFilter === filter ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                    {filter === "ALL" ? "All Labours" : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500">Showing {filteredLabours.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-{Math.min(currentPage * PAGE_SIZE, filteredLabours.length)} of {filteredLabours.length}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr><th className="px-5 py-3">#</th><th className="px-5 py-3">Name</th><th className="px-5 py-3">Mobile / Code</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Daily Wage</th><th className="px-5 py-3 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleLabours.map((labour, index) => (
                    <tr key={labour._id} className="text-sm hover:bg-slate-50">
                      <td className="px-5 py-4 text-xs text-slate-500">{String((currentPage - 1) * PAGE_SIZE + index + 1).padStart(3, "0")}</td>
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-100 text-xs font-bold text-indigo-700">{initials(labour.name)}</span><div><p className="font-semibold text-slate-800">{labour.name}</p><p className="text-xs text-slate-500">{labour.skillId?.skillName ?? "Skill not assigned"}</p></div></div></td>
                      <td className="px-5 py-4"><p className="text-xs text-slate-700">{labour.mobile}</p><p className="mt-1 text-xs font-medium text-indigo-600">{labour.labourCode}</p></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${labour.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : labour.status === "INACTIVE" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{labour.status}</span></td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{money.format(labour.finalDailyWage || 0)}</td>
                      <td className="px-5 py-4"><div className="flex items-center justify-end gap-1">
                        <button type="button" aria-label="View labour" title="View labour" onClick={() => setSelectedLabour(labour)} className="flex h-9 w-9 items-center justify-center rounded text-indigo-600 hover:bg-indigo-50"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg></button>
                        <button type="button" aria-label="Edit labour" title="Edit labour" onClick={() => openEdit(labour)} className="flex h-9 w-9 items-center justify-center rounded text-slate-600 hover:bg-slate-100"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M14.5 5.5l4 4M4 20l3.8-.8L19 8a1.8 1.8 0 000-2.5l-.5-.5A1.8 1.8 0 0016 5L4.8 16.2 4 20Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                        <button type="button" aria-label="Delete labour" title="Delete labour" disabled={deletingId === labour._id} onClick={() => handleDelete(labour)} className="flex h-9 w-9 items-center justify-center rounded text-red-600 hover:bg-red-50 disabled:opacity-40"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isLoading && !visibleLabours.length && <div className="px-5 py-14 text-center text-sm text-slate-500">No labours found.</div>}
              {isLoading && <div className="px-5 py-14 text-center text-sm text-slate-500">Loading labours...</div>}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500">Rows per page: {PAGE_SIZE}</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 disabled:opacity-40">&lt;</button>
                {paginationItems.map((item) => typeof item === "number" ? <button key={item} type="button" onClick={() => setCurrentPage(item)} aria-current={currentPage === item ? "page" : undefined} className={`flex h-8 min-w-8 items-center justify-center rounded px-2 text-xs ${currentPage === item ? "bg-indigo-700 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{item}</button> : <span key={item} className="px-1 text-slate-500">...</span>)}
                <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => setCurrentPage((page) => page + 1)} className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 disabled:opacity-40">&gt;</button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="labour-form-title">
          <div className="w-full max-w-xl rounded-md bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4"><div><h2 id="labour-form-title" className="text-lg font-bold text-slate-900">{editingLabour ? "Edit Labour" : "Add Labour"}</h2><p className="text-xs text-slate-500">Enter workforce and wage details.</p></div><button type="button" aria-label="Close" onClick={closeForm} className="text-2xl text-slate-400 hover:text-slate-700">&times;</button></div>
            <form onSubmit={handleSubmit} className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-indigo-500" /></label>
              <label className="text-xs font-semibold text-slate-600">Mobile<input required value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-indigo-500" /></label>
              <label className="text-xs font-semibold text-slate-600">Skill<select required value={form.skillId} onChange={(event) => setForm({ ...form, skillId: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-indigo-500"><option value="">Select skill</option>{skills.map((skill) => <option key={skill._id} value={skill._id}>{skill.skillName}</option>)}</select></label>
              <label className="text-xs font-semibold text-slate-600">Gender<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Labour["gender"] })} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-normal outline-none focus:border-indigo-500"><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></label>
              <label className="text-xs font-semibold text-slate-600">Custom daily wage<input type="number" min="0" value={form.dailyWage} onChange={(event) => setForm({ ...form, dailyWage: event.target.value })} placeholder="Use skill default" className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-indigo-500" /></label>
              <label className="text-xs font-semibold text-slate-600">Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm font-normal outline-none focus:border-indigo-500" /></label>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 sm:col-span-2"><button type="button" onClick={closeForm} className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-600">Cancel</button><button type="submit" disabled={isSubmitting} className="h-10 rounded-md bg-indigo-700 px-5 text-sm font-semibold text-white disabled:opacity-50">{isSubmitting ? "Saving..." : editingLabour ? "Update Labour" : "Add Labour"}</button></div>
            </form>
          </div>
        </div>
      )}

      {selectedLabour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="labour-details-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLabour(null) }}>
          <div className="w-full max-w-md rounded-md bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-md bg-indigo-100 font-bold text-indigo-700">{initials(selectedLabour.name)}</span><div><h2 id="labour-details-title" className="font-bold text-slate-900">{selectedLabour.name}</h2><p className="text-xs text-indigo-600">{selectedLabour.labourCode}</p></div></div><button type="button" aria-label="Close" onClick={() => setSelectedLabour(null)} className="text-2xl text-slate-400">&times;</button></div><dl className="mt-6 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-slate-400">Mobile</dt><dd className="mt-1 font-medium text-slate-700">{selectedLabour.mobile}</dd></div><div><dt className="text-xs text-slate-400">Skill</dt><dd className="mt-1 font-medium text-slate-700">{selectedLabour.skillId?.skillName ?? "-"}</dd></div><div><dt className="text-xs text-slate-400">Gender</dt><dd className="mt-1 font-medium text-slate-700">{selectedLabour.gender}</dd></div><div><dt className="text-xs text-slate-400">Status</dt><dd className="mt-1 font-medium text-slate-700">{selectedLabour.status}</dd></div><div><dt className="text-xs text-slate-400">Daily wage</dt><dd className="mt-1 font-medium text-slate-700">{money.format(selectedLabour.finalDailyWage || 0)}</dd></div><div><dt className="text-xs text-slate-400">Address</dt><dd className="mt-1 font-medium text-slate-700">{selectedLabour.address || "-"}</dd></div></dl></div>
        </div>
      )}
    </div>
  )
}

export default LaboursPage