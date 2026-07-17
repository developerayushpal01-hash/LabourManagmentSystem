"use client"

import { ReactNode, useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"
import PageLoader from "./page-loader"
import LoginSplash from "./login-splash"

type AuthResponse = {
  success: boolean
  user?: {
    role: string
  }
}

type ContractorRouteProps = {
  children: ReactNode
}

const ContractorRoute = ({ children }: ContractorRouteProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [splashState, setSplashState] = useState<"checking" | "show" | "skip">("checking")

  useEffect(() => {
    const controller = new AbortController()

    const verifyAccess = async () => {
      try {
        const response = await fetch(apiUrl("/auth/me"), {
          credentials: "include",
          signal: controller.signal,
        })
        const result = (await response.json()) as AuthResponse

        if (!response.ok || !result.success || !result.user) {
          router.replace(`/pages/login?next=${encodeURIComponent(pathname)}`)
          return
        }

        if (result.user.role !== "CONTRACTOR") {
          router.replace("/pages/unauthorized")
          return
        }

        const shouldShowSplash = sessionStorage.getItem("kinetic-login-splash") === "1"
        if (shouldShowSplash) sessionStorage.removeItem("kinetic-login-splash")
        setSplashState(shouldShowSplash ? "show" : "skip")
        setIsAuthorized(true)
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          router.replace(`/pages/login?next=${encodeURIComponent(pathname)}`)
        }
      }
    }

    verifyAccess()

    return () => controller.abort()
  }, [pathname, router])

  const finishSplash = useCallback(() => setSplashState("skip"), [])

  if (!isAuthorized) {
    return <PageLoader label="Checking secure access" fullScreen />
  }

  if (splashState === "show") return <LoginSplash onComplete={finishSplash} />
  if (splashState === "checking") return <PageLoader label="Preparing your workspace" fullScreen />

  return children
}

export default ContractorRoute