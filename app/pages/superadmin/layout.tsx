import type { ReactNode } from "react"
import SuperAdminRoute from "@/app/components/super-admin-route"
import SuperAdminSidebar from "@/app/components/super-admin-sidebar"
import SuperAdminHeader from "@/app/components/super-admin-header"

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return <SuperAdminRoute><div className="super-admin-app flex h-screen overflow-hidden bg-slate-50"><SuperAdminSidebar /><div className="flex min-w-0 flex-1 flex-col"><SuperAdminHeader /><main className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-7">{children}</main></div></div></SuperAdminRoute>
}

