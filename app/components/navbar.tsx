"use client"

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
type Notice={_id:string;title:string;message:string;type:string;actionLabel?:string;actionUrl?:string;scheduledAt:string;isRead:boolean}
type NoticeResponse={success:boolean;data?:Notice[];unread?:number}

const Navbar = () => {
  const router = useRouter()
  const { showToast } = useToast()
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [notices,setNotices]=useState<Notice[]>([])
  const [unread,setUnread]=useState(0)
  const [notificationsOpen,setNotificationsOpen]=useState(false)

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setNotificationsOpen(false)
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
  const loadNotifications=async()=>{try{const response=await fetch(apiUrl("/notifications"),{credentials:"include",cache:"no-store"});const result=await response.json() as NoticeResponse;if(!response.ok||!result.success)throw new Error("Notifications load failed");setNotices(result.data||[]);setUnread(result.unread||0)}catch(requestError){if(requestError instanceof Error)console.error(requestError.message)}}
  useEffect(()=>{void loadNotifications();const refresh=()=>void loadNotifications();const id=window.setInterval(refresh,5000);window.addEventListener("focus",refresh);return()=>{window.clearInterval(id);window.removeEventListener("focus",refresh)}},[])
  const markRead=async(notice:Notice)=>{if(!notice.isRead){await fetch(apiUrl(`/notifications/${notice._id}/read`),{method:"PATCH",credentials:"include"});setNotices(current=>current.map(item=>item._id===notice._id?{...item,isRead:true}:item));setUnread(value=>Math.max(0,value-1))}if(notice.actionUrl){setNotificationsOpen(false);router.push(notice.actionUrl)}}
  const markAllRead=async()=>{await fetch(apiUrl("/notifications/read-all"),{method:"PATCH",credentials:"include"});setNotices(current=>current.map(item=>({...item,isRead:true})));setUnread(0)}
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
        <div ref={notificationRef} className="relative"><button type="button" aria-label={`${unread} unread notifications`} onClick={()=>{setNotificationsOpen(value=>!value);void loadNotifications()}} className="relative rounded-full p-2 hover:bg-gray-100"><svg aria-hidden="true" className="h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none"><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>{unread>0&&<span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{unread>99?"99+":unread}</span>}</button>{notificationsOpen&&<div className="absolute right-0 top-full mt-3 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"><div className="flex items-center justify-between border-b px-4 py-3"><div><h2 className="text-sm font-bold">Notifications</h2><p className="text-[10px] text-slate-500">{unread} unread</p></div>{unread>0&&<button onClick={()=>void markAllRead()} className="text-xs font-semibold text-indigo-600">Mark all read</button>}</div><div className="max-h-96 overflow-y-auto">{notices.map(notice=><button key={notice._id} onClick={()=>void markRead(notice)} className={`block w-full border-b px-4 py-3 text-left hover:bg-slate-50 ${notice.isRead?"bg-white":"bg-indigo-50/60"}`}><div className="flex items-start gap-3"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notice.isRead?"bg-slate-300":"bg-indigo-600"}`}/><div><p className="text-sm font-bold text-slate-800">{notice.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{notice.message}</p><p className="mt-1 text-[9px] text-slate-400">{new Date(notice.scheduledAt).toLocaleString("en-IN")}</p></div></div></button>)}{!notices.length&&<p className="p-8 text-center text-sm text-slate-500">No notifications.</p>}</div></div>}</div>

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
