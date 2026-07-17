"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"
import { useToast } from "@/app/components/toast-provider"

type AuthenticatedUser = {
  id: string
  name: string
  email: string
  role: string
  company: {
    companyName: string
  } | null
}

type MeResponse = {
  success: boolean
  user?: AuthenticatedUser
  message?: string
}

const Navbar = () => {
  const router = useRouter()
  const { showToast } = useToast()
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const [user, setUser] = useState<AuthenticatedUser | null>(null)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsProfileMenuOpen(false)
    }

    document.addEventListener("mousedown", closeMenu)
    document.addEventListener("keydown", closeOnEscape)

    return () => {
      document.removeEventListener("mousedown", closeMenu)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])


  useEffect(() => {
    const controller = new AbortController()

    const loadCurrentUser = async () => {
      try {
        const response = await fetch(apiUrl("/auth/me"), {
          credentials: "include",
          signal: controller.signal,
        })
        const result = (await response.json()) as MeResponse

        if (response.status === 401) {
      router.replace("/pages/login")
          return
        }

        if (!response.ok || !result.success || !result.user) {
          throw new Error(result.message ?? "Profile load failed.")
        }

        setUser(result.user)
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setUser(null)
        }
      }
    }

    loadCurrentUser()

    return () => controller.abort()
  }, [router])
  const handleLogout = async () => {
    setLogoutError("")
    setIsLoggingOut(true)

    try {
      const response = await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        const result = (await response.json()) as { message?: string }
        throw new Error(result.message ?? "Logout failed. Please try again.")
      }

      showToast("Logout successful.", "success")
      router.replace("/pages/login")
      router.refresh()
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Logout failed."
      setLogoutError(message)
      showToast(message, "error")
      setIsLoggingOut(false)
    }
  }


  const displayName =
    user?.role === "CONTRACTOR"
      ? user.company?.companyName || user.name
      : user?.name || "Loading..."

  const displayRole = user?.role
    ? user.role
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    : "Account"

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("") || "U"
  return (
    <header className="sticky top-0 z-30 flex w-full shrink-0 items-center justify-between border-b-2 border-gray-400 bg-white px-6 py-3">
      <div className="flex w-1/2 items-center gap-4">
        <div className="w-full max-w-md">
          <div className="relative ms-50 w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search data, workers, or sites..."
              className="w-full rounded-md bg-gray-100 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button type="button" aria-label="Notifications" className="relative rounded-full p-2 hover:bg-gray-100">
          <Image src="/assets/notification.png" alt="" width={16} height={20} className="h-5 w-5 object-contain" />
          <span className="absolute -right-0.5 -top-0.5 inline-block h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="h-6 w-px bg-gray-300" />

        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            onClick={() => setIsProfileMenuOpen((current) => !current)}
            className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-gray-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-medium text-white">
              {initials}
            </div>
            <div className="hidden text-sm sm:block">
              <div className="max-w-44 truncate font-medium text-gray-900">{displayName}</div>
              <div className="text-xs text-gray-500">{displayRole}</div>
            </div>
            <svg
              aria-hidden="true"
              className={`h-4 w-4 text-gray-500 transition-transform ${isProfileMenuOpen ? "rotate-180" : ""}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.22 7.72a.75.75 0 011.06 0L10 11.44l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 8.78a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {isProfileMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-2 shadow-xl"
            >
              <div className="border-b border-gray-100 px-4 pb-2 pt-1 sm:hidden">
                <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">{displayRole}</p>
              </div>

              <Link
                href="/pages/profile"
                role="menuitem"
                onClick={() => setIsProfileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-indigo-50 hover:text-indigo-700"
              >
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M12 12a4 4 0 100-8 4 4 0 000 8ZM4 21a8 8 0 0116 0M16.5 5.5l2 2M18 4l2 2-7.5 7.5-3 .5.5-3L18 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Edit Profile
              </Link>

              <button
                type="button"
                role="menuitem"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {isLoggingOut ? "Logging out..." : "Logout"}
              </button>

              {logoutError && <p className="px-4 py-2 text-xs text-red-600">{logoutError}</p>}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar