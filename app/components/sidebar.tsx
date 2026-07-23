"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menu = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  // Temporarily hidden: Contractor user-management module for creating Supervisors and Accountants.
  // { id: "users", label: "Users", href: "/pages/contractorpages/users" },
  { id: "labours", label: "Labours", href: "/pages/contractorpages/labours" },
  { id: "skills", label: "Skills", href: "/pages/contractorpages/skills" },
  { id: "sites", label: "Sites", href: "/pages/contractorpages/sites" },
  { id: "attendance", label: "Attendance", href: "/pages/contractorpages/attendance" },
  { id: "salary", label: "Salary", href: "/pages/contractorpages/payroll" },
  { id: "invoices", label: "Invoices", href: "/pages/contractorpages/invoices" },
  { id: "quotations", label: "Quotations", href: "/pages/contractorpages/quotations" },
  { id: "reports", label: "Reports", href: "/pages/contractorpages/reports" },
  { id: "subscription", label: "Subscription", href: "/pages/subscription" },
  { id: "profile", label: "Profile", href: "/pages/profile" },
  { id: "settings", label: "Settings", href: "/pages/settings" },
]

const Icon = ({ name }: { name: string; active?: boolean }) => {
  const base = "h-7 w-7 shrink-0"
  switch (name) {
    case "dashboard": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><rect x="3" y="3" width="11" height="11" rx="3" fill="#6366e8"/><rect x="18" y="3" width="11" height="11" rx="3" fill="#5865df"/><rect x="3" y="18" width="11" height="11" rx="3" fill="#5147d9"/><rect x="18.5" y="18.5" width="9" height="9" rx="2" fill="none" stroke="#5147d9" strokeWidth="3"/></svg>
    case "users": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><circle cx="12" cy="10" r="6" fill="#3478db"/><circle cx="23" cy="12" r="5" fill="#38a7ed"/><path d="M2 28v-3c0-6 4.5-10 10-10s10 4 10 10v3z" fill="#3478db"/><path d="M20 28v-3c0-3.6-1.3-6.5-3.4-8.5 1.7-1 3.7-1.5 5.6-1.5 4.5 0 7.8 3.5 7.8 8.5V28z" fill="#38a7ed"/></svg>
    case "labours": return <span aria-hidden="true" className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden"><Image src="/assets/labours-reference.png" alt="" width={64} height={64} unoptimized className="absolute -left-5 -top-4 h-16 w-16 max-w-none" /></span>
    case "skills": return <span aria-hidden="true" className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden"><Image src="/assets/skills-reference.png" alt="" width={60} height={60} unoptimized className="absolute -left-[17px] -top-[15px] h-[60px] w-[60px] max-w-none" /></span>
    case "sites": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><path d="M3 29V13h10v16z" fill="#1768bd"/><path d="M12 29V5h11v24z" fill="#267dcc"/><g fill="#dbeafe"><path d="M6 17h4v3H6zM6 23h4v3H6zM15 9h3v3h-3zM15 15h3v3h-3zM15 21h3v3h-3z"/></g><path d="M2 29c8-3 18-3 28 0" fill="none" stroke="#159447" strokeWidth="3"/><path d="M28 15c0 5-6 10-6 10s-6-5-6-10a6 6 0 1 1 12 0z" fill="#22c55e" stroke="#fff" strokeWidth="1.5"/><circle cx="22" cy="15" r="2" fill="#fff"/></svg>
    case "attendance": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><rect x="4" y="6" width="24" height="23" rx="4" fill="#fff" stroke="#14a26a" strokeWidth="3"/><path d="M4 12h24" stroke="#14a26a" strokeWidth="3"/><path d="M10 3v6M22 3v6" stroke="#14a26a" strokeWidth="3" strokeLinecap="round"/><path d="m10 20 4 4 8-9" fill="none" stroke="#15986b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
    case "salary": case "payroll": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><path d="M4 8h20a4 4 0 0 1 4 4v15a3 3 0 0 1-3 3H7a4 4 0 0 1-4-4V9z" fill="#10966b"/><path d="m7 9 16-6 3 9z" fill="#fbbf24"/><path d="M20 16h10v8H20a4 4 0 0 1 0-8z" fill="#087f5b"/><circle cx="22" cy="20" r="1.6" fill="#fff"/></svg>
    case "invoices": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><path d="M6 2h14l7 7v21H6z" fill="#2871d2"/><path d="M20 2v8h7" fill="#8cc4ff"/><text x="10" y="20" fill="#fff" fontSize="13" fontWeight="700">$</text><path d="M10 24h13M10 27h9" stroke="#dbeafe" strokeWidth="2"/></svg>
    case "quotations": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><path d="M6 2h14l7 7v21H6z" fill="#6550c7"/><path d="M20 2v8h7" fill="#a99ce8"/><path d="M10 14c0-3 2-5 5-5v3c-1 0-2 1-2 2h2v5h-5zm8 0c0-3 2-5 5-5v3c-1 0-2 1-2 2h2v5h-5z" fill="#fff"/><path d="M10 24h13M10 27h9" stroke="#ddd6fe" strokeWidth="2"/></svg>
    case "reports": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><path d="M15 3v12H3A12 12 0 0 1 15 3z" fill="#ff9f0a"/><path d="M17 3a12 12 0 0 1 12 12H17z" fill="#2684e8"/><path d="M15 17v12A12 12 0 0 1 4 19z" fill="#20b96b"/><path d="M19 18h3v11h-3zm5-4h3v15h-3zm5 8h3v7h-3z" fill="#437fea" stroke="#fff" strokeWidth=".6"/></svg>
    case "subscription": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><rect x="3" y="6" width="26" height="21" rx="4" fill="#6559df"/><path d="M3 11h26" stroke="#b9b5ff" strokeWidth="3"/><path d="m11 15 1.6 3.3 3.7.5-2.7 2.6.7 3.6-3.3-1.8L7.7 25l.7-3.6-2.7-2.6 3.7-.5z" fill="#fde047"/><path d="M20 21h5" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
    case "profile": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#2874c9"/><circle cx="16" cy="11" r="5" fill="#fff"/><path d="M7 27c1-6 4-9 9-9s8 3 9 9" fill="#fff"/></svg>
    case "payroll-settings": case "settings": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><path d="m13 2 6 0 1 4 4 2 4-1 3 5-3 3v4l3 3-3 5-4-1-4 2-1 4h-6l-1-4-4-2-4 1-3-5 3-3v-4l-3-3 3-5 4 1 4-2z" fill="#475569"/><circle cx="16" cy="17" r="6" fill="#fff"/></svg>
    case "advance": return <svg aria-hidden="true" className={base} viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="#10b981"/><path d="M10 16h12m-6-6v12" stroke="#fff" strokeWidth="3" strokeLinecap="round"/></svg>
    default: return null
  }
}

const Sidebar: React.FC = () => {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto border-r-2 border-gray-400 bg-white shadow-sm">
      <div className="px-6 py-6">
        <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-3 shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-indigo-200 bg-white shadow-md shadow-indigo-100">
            <Image
              src="/assets/logo.png?v=worker-management-2"
              alt="Kinetic LMS logo"
              width={44}
              height={38}
              unoptimized
              className="h-10 w-10 object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-extrabold tracking-tight text-slate-900">Kinetic</span>
              <span className="text-lg font-extrabold tracking-tight text-indigo-600">LMS</span>
            </div>
            <p className="mt-0.5 whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Labor Management</p>
          </div>
        </div>

        <nav className="mt-6">
          <ul className="space-y-1">
            {menu.map((m) => {
              const active = m.href === "/" ? pathname === "/" : pathname.startsWith(m.href)
              if (m.id === "invoices") {
                const invoiceItems = [
                  { label: "Invoice Details", href: "/pages/contractorpages/invoices", active: pathname === m.href },
                  { label: "Generate Invoice", href: "/pages/contractorpages/invoices/generate", active: pathname.startsWith(m.href + "/generate") },
                ]
                return (
                  <li key={m.id}>
                    <Link href={m.href} className={`flex items-center gap-3 rounded-md px-3 py-1 transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100"}`}><span className={`rounded p-2 ${active ? "bg-indigo-100" : "bg-transparent"}`}><Icon name={m.id} active={active} /></span><span className="font-medium">{m.label}</span><svg aria-hidden="true" className={`ml-auto h-4 w-4 transition-transform ${active ? "rotate-90 text-indigo-500" : "text-slate-400"}`} viewBox="0 0 20 20" fill="none"><path d="m7 5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
                    {active && <ul className="ml-7 mt-1.5 space-y-1 border-l border-indigo-200 pl-3">{invoiceItems.map((item) => <li key={item.href}><Link href={item.href} className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${item.active ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>{item.active && <span className="absolute -left-[13px] h-5 w-0.5 rounded-full bg-indigo-600" />}<span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-indigo-600" : "bg-slate-300"}`} />{item.label}</Link></li>)}</ul>}
                  </li>
                )
              }              if (m.id === "reports") {
                const reportItems = [
                  { label: "Reports Overview", href: "/pages/contractorpages/reports", active: pathname === m.href },
                  { label: "Attendance Report", href: "/pages/contractorpages/reports/attendance", active: pathname.startsWith(m.href + "/attendance") },
                  { label: "Salary Report", href: "/pages/contractorpages/reports/salary", active: pathname.startsWith(m.href + "/salary") && !pathname.startsWith(m.href + "/salary-slips") },
                  { label: "Salary Slips", href: "/pages/contractorpages/reports/salary-slips", active: pathname.startsWith(m.href + "/salary-slips") },
                  { label: "PF & ESIC Report", href: "/pages/contractorpages/reports/pf-esic", active: pathname.startsWith(m.href + "/pf-esic") },
                  { label: "Payment Report", href: "/pages/contractorpages/reports/payments", active: pathname.startsWith(m.href + "/payments") },
                  { label: "Workforce Report", href: "/pages/contractorpages/reports/workforce", active: pathname.startsWith(m.href + "/workforce") },
                  { label: "GST Details", href: "/pages/contractorpages/reports/gst", active: pathname.startsWith(m.href + "/gst") },
                ]
                return (
                  <li key={m.id}>
                    <Link href={m.href} className={`flex items-center gap-3 rounded-md px-3 py-1 transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100"}`}>
                      <span className={`rounded p-2 ${active ? "bg-indigo-100" : "bg-transparent"}`}><Icon name={m.id} active={active} /></span>
                      <span className="font-medium">{m.label}</span>
                      <svg aria-hidden="true" className={`ml-auto h-4 w-4 transition-transform ${active ? "rotate-90 text-indigo-500" : "text-slate-400"}`} viewBox="0 0 20 20" fill="none"><path d="m7 5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Link>
                    {active && <ul className="ml-7 mt-1.5 space-y-1 border-l border-indigo-200 pl-3">{reportItems.map((item) => <li key={item.href}><Link href={item.href} className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${item.active ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>{item.active && <span className="absolute -left-[13px] h-5 w-0.5 rounded-full bg-indigo-600" />}<span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-indigo-600" : "bg-slate-300"}`} />{item.label}</Link></li>)}</ul>}
                  </li>
                )
              }
              if (m.id === "salary") {
                const salaryItems = [
                  { label: "Payroll Overview", href: "/pages/contractorpages/payroll", active: pathname === m.href },
                  { label: "Pay Salary", href: "/pages/contractorpages/payroll/payments", active: pathname.startsWith(m.href + "/payments") },
                  { label: "Payroll Settings", href: "/pages/contractorpages/payroll/settings", active: pathname.startsWith(m.href + "/settings") },
                ]
                return (
                  <li key={m.id}>
                    <Link href={m.href} className={`flex items-center gap-3 rounded-md px-3 py-1 transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100"}`}>
                      <span className={`rounded p-2 ${active ? "bg-indigo-100" : "bg-transparent"}`}><Icon name={m.id} active={active} /></span>
                      <span className="font-medium">{m.label}</span>
                      <svg aria-hidden="true" className={`ml-auto h-4 w-4 transition-transform ${active ? "rotate-90 text-indigo-500" : "text-slate-400"}`} viewBox="0 0 20 20" fill="none"><path d="m7 5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Link>
                    {active && (
                      <ul className="ml-7 mt-1.5 space-y-1 border-l border-indigo-200 pl-3">
                        {salaryItems.map((item) => (
                          <li key={item.href}>
                            <Link href={item.href} className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${item.active ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                              {item.active && <span className="absolute -left-[13px] h-5 w-0.5 rounded-full bg-indigo-600" />}
                              <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-indigo-600" : "bg-slate-300"}`} />
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              }
              if (m.id === "attendance") {
                const attendanceItems = [
                  { label: "Attendance History", href: "/pages/contractorpages/attendance", active: pathname === m.href },
                  { label: "Mark Attendance", href: "/pages/contractorpages/attendance/mark", active: pathname.startsWith(m.href + "/mark") },
                ]
                return (
                  <li key={m.id}>
                    <Link href={m.href} className={`flex items-center gap-3 rounded-md px-3 py-1 transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100"}`}>
                      <span className={`rounded p-2 ${active ? "bg-indigo-100" : "bg-transparent"}`}><Icon name={m.id} active={active} /></span>
                      <span className="font-medium">{m.label}</span>
                      <svg aria-hidden="true" className={`ml-auto h-4 w-4 transition-transform ${active ? "rotate-90 text-indigo-500" : "text-slate-400"}`} viewBox="0 0 20 20" fill="none"><path d="m7 5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </Link>
                    {active && (
                      <ul className="ml-7 mt-1.5 space-y-1 border-l border-indigo-200 pl-3">
                        {attendanceItems.map((item) => (
                          <li key={item.href}>
                            <Link href={item.href} className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${item.active ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                              {item.active && <span className="absolute -left-[13px] h-5 w-0.5 rounded-full bg-indigo-600" />}
                              <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-indigo-600" : "bg-slate-300"}`} />
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              }
              return (
                <li key={m.id}>
                  <Link href={m.href} className={`flex items-center gap-3 px-3 py-1 rounded-md transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-gray-700 hover:bg-gray-100"}`}>
                    <span className={`p-2 rounded ${active ? "bg-indigo-100" : "bg-transparent"}`}><Icon name={m.id} active={active} /></span>
                    <span className="font-medium">{m.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </aside>
  )
}

export default Sidebar






