"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menu = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  { id: "users", label: "Users", href: "/pages/contractorpages/users" },
  { id: "labours", label: "Labours", href: "/pages/contractorpages/labours" },
  { id: "skills", label: "Skills", href: "/pages/contractorpages/skills" },
  { id: "sites", label: "Sites", href: "/pages/contractorpages/sites" },
  { id: "attendance", label: "Attendance", href: "/pages/contractorpages/attendance" },
  { id: "salary", label: "Salary", href: "/pages/contractorpages/payroll" },
  { id: "invoices", label: "Invoices", href: "/pages/contractorpages/invoices" },
  { id: "reports", label: "Reports", href: "/pages/contractorpages/reports" },
  { id: "subscription", label: "Subscription", href: "/pages/subscription" },
  { id: "profile", label: "Profile", href: "/pages/profile" },
  { id: "settings", label: "Settings", href: "/pages/settings" },
]

const Icon = ({ name, active = false }: { name: string; active?: boolean }) => {
  const iconStyle = active
    ? { filter: "brightness(0) saturate(100%) invert(22%) sepia(89%) saturate(3897%) hue-rotate(244deg) brightness(88%) contrast(101%)" }
    : name === "dashboard"
      ? { filter: "brightness(0) saturate(100%) invert(45%) sepia(8%) saturate(720%) hue-rotate(176deg) brightness(92%) contrast(85%)" }
      : undefined
  switch (name) {
    case "dashboard":
      return (
        <Image src="/assets/dashboard.png" alt="Dashboard" width={20} height={20} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "users":
      return (
        <Image src="/assets/users.png" alt="Users" width={22} height={16} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "labours":
      return (
        <Image src="/assets/labours.png" alt="Labours" width={20} height={19} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "skills":
      return (
        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><path d="m14.7 6.3 3-3a4.2 4.2 0 0 1-5.4 5.4l-6.8 6.8a2.1 2.1 0 1 0 3 3l6.8-6.8a4.2 4.2 0 0 1 5.4-5.4l-3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      )
    case "sites":
      return (
        <Image src="/assets/sites.png" alt="Sites" width={16} height={20} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "attendance":
      return (
        <Image src="/assets/attendance.png" alt="Attendance" width={18} height={20} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "salary":
    case "payroll":
      return (
        <Image src="/assets/payroll.png" alt="Payroll" width={22} height={16} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "invoices":
      return (
        <Image src="/assets/reports.png" alt="Invoices" width={20} height={20} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "advance":
      return (
        <Image src="/assets/advance.png" alt="Advance" width={22} height={16} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "reports":
      return (
        <Image src="/assets/reports.png" alt="Reports" width={20} height={20} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "subscription":
      return <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M3 9h18M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
    case "profile":
      return (
        <Image src="/assets/profile.png" alt="Profile" width={20} height={20} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    case "payroll-settings":
    case "settings":
      return (
        <Image src="/assets/setting.png" alt="Settings" width={21} height={20} className="h-5 w-5 object-contain" style={iconStyle} />
      )
    default:
      return null
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
                  { label: "Salary Report", href: "/pages/contractorpages/reports/salary", active: pathname.startsWith(m.href + "/salary") },
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






