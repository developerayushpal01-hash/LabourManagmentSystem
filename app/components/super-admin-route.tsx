"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"
import PageLoader from "./page-loader"

export default function SuperAdminRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(apiUrl("/auth/me"), { credentials: "include", signal: controller.signal })
      .then(async (response) => ({ response, result: await response.json().catch(() => null) }))
      .then(({ response, result }) => {
        if (!response.ok || !result?.success || !result.user) return router.replace(`/pages/login?next=${encodeURIComponent(pathname)}`)
        if (result.user.role !== "SUPER_ADMIN") return router.replace("/pages/unauthorized")
        setAllowed(true)
      })
      .catch((error) => { if (error?.name !== "AbortError") router.replace("/pages/login") })
    return () => controller.abort()
  }, [pathname, router])

  return allowed ? children : <PageLoader label="Checking Super Admin access" fullScreen />
}
