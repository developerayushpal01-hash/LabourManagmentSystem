"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { apiUrl } from "@/lib/api"
export default function SuperAdminHeader(){
 const router=useRouter(),[name,setName]=useState("Super Admin")
 useEffect(()=>{fetch(apiUrl("/auth/me"),{credentials:"include"}).then(response=>response.json()).then(result=>{if(result.user?.name)setName(result.user.name)}).catch(()=>undefined)},[])
 const logout=async()=>{await fetch(apiUrl("/auth/logout"),{method:"POST",credentials:"include"});router.replace("/pages/login");router.refresh()}
 return <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-600">Platform Administration</p><p className="text-sm text-slate-500">Manage every company and system record</p></div><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 text-sm font-bold text-white">{name.slice(0,1).toUpperCase()}</span><div className="hidden sm:block"><p className="text-sm font-bold text-slate-800">{name}</p><p className="text-[10px] text-slate-500">SUPER ADMIN</p></div><button onClick={logout} className="ml-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600">Logout</button></div></header>
}
