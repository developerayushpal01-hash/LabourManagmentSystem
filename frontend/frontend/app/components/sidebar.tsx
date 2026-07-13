"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menu = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  { id: "users", label: "Users", href: "/pages/contractorpages/users" },
  { id: "labours", label: "Labours", href: "/pages/contractorpages/labours" },
  { id: "sites", label: "Sites", href: "/pages/contractorpages/sites" },
  { id: "attendance", label: "Attendance", href: "#" },
  { id: "payroll", label: "Payroll", href: "#" },
  { id: "advance", label: "Advance", href: "#" },
  { id: "reports", label: "Reports", href: "#" },
  { id: "profile", label: "Profile", href: "/pages/profile" },
  { id: "settings", label: "Settings", href: "#" },
]

const Icon = ({ name }: { name: string }) => {
  switch (name) {
    case "dashboard":
      return (
        <Image src="/assets/dashboard.png" alt="Dashboard" width={20} height={20} />
      )
    case "users":
      return (
        <Image src="/assets/users.png" alt="Users" width={20} height={20} style={{ height: "auto" }} />
      )
    case "labours":
      return (
        <Image src="/assets/labours.png" alt="Labours" width={20} height={20} style={{ height: "auto" }} />
      )
    case "sites":
      return (
        <Image src="/assets/sites.png" alt="Sites" width={20} height={20} style={{ height: "auto" }} />
      )
    case "attendance":
      return (
        <Image src="/assets/attendance.png" alt="Attendance" width={20} height={20} style={{ height: "auto" }} />
      )
    case "payroll":
      return (
        <Image src="/assets/payroll.png" alt="Payroll" width={20} height={20} style={{ height: "auto" }} />
      )
    case "advance":
      return (
        <Image src="/assets/advance.png" alt="Advance" width={20} height={20} style={{ height: "auto" }} />
      )
    case "reports":
      return (
        <Image src="/assets/reports.png" alt="Reports" width={20} height={20} />
      )
    case "profile":
      return (
        <Image src="/assets/profile.png" alt="Profile" width={20} height={20} />
      )
    case "settings":
      return (
        <Image src="/assets/setting.png" alt="Settings" width={20} height={20} style={{ height: "auto" }} />
      )
    default:
      return null
  }
}

const Sidebar: React.FC = () => {
  const pathname = usePathname()

  return (
    <aside className="h-screen w-64 shrink-0 overflow-hidden border-r-2 border-gray-400 bg-white shadow-sm">
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded flex items-center justify-center">
            <Image src="/assets/logo.svg" alt="Logo" width={28} height={28} style={{ height: "auto" }} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-indigo-700">Kinetic LMS</h1>
            <p className="text-xs font-medium text-gray-500">LABOR MANAGEMENT</p>
          </div>
        </div>

        <nav className="mt-6">
          <ul className="space-y-1">
            {menu.map((m) => {
              const active = m.href === "/" ? pathname === "/" : pathname.startsWith(m.href)
              return (
                <li key={m.id}>
                  <Link href={m.href} className={`flex items-center gap-3 px-3 py-1 rounded-md transition-colors ${active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                    <span className={`p-2 rounded ${active ? 'bg-indigo-100' : 'bg-transparent'}`}>
                      <Icon name={m.id} />
                    </span>
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
