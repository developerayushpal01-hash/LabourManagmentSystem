"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { apiUrl } from "@/lib/api"
import { useToast } from "@/app/components/toast-provider"

type DashboardData = {
  totalLabour: number
  activeLabour: number
  activeSites: number
  todayPresent: number
  todayAbsent: number
  todayHalfDay: number
  monthlyPayable: number
  advance: number
  bonus: number
  incentive: number
  deduction: number
  salaryPaid: number
  pendingSalary: number
}

type DashboardResponse = {
  success: boolean
  data?: DashboardData
  message?: string
}

type StatCardProps = {
  title: string
  value: string
  subtitle?: React.ReactNode
  topRight?: React.ReactNode
  icon: React.ReactNode
  accent?: string
  progress?: number
}

const numberFormatter = new Intl.NumberFormat("en-IN")
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  topRight,
  icon,
  accent = "bg-white",
  progress,
}) => (
  <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm relative">
    {topRight && <div className="absolute top-4 right-4">{topRight}</div>}

    <div className="items-start gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
      <div className="flex-1">
        <div className="text-xs uppercase pt-2 font-bold text-gray-500 tracking-wide">{title}</div>
        <div className="text-2xl font-semibold mt-2">{value}</div>
        {subtitle && <div className="text-sm text-gray-500 mt-2">{subtitle}</div>}
        {typeof progress === "number" && (
          <div className="mt-4">
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-teal-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)

const Header = () => (
  <div className="mb-6">
    <h3 className="text-xl font-semibold">Company Overview</h3>
    <p className="text-sm text-gray-500">
      Review workforce analytics and operational efficiency across all active sites.
    </p>
  </div>
)

const ContractorDashboard = () => {
  const { showToast } = useToast()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const controller = new AbortController()

    const loadDashboard = async () => {
      try {
        const response = await fetch(apiUrl("/dashboard/contractor"), {
          credentials: "include",
          signal: controller.signal,
        })
        const result = (await response.json()) as DashboardResponse

        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.message ?? "Dashboard data load nahi ho saka.")
        }

        setDashboard(result.data)
      } catch (requestError) {
        if (requestError instanceof Error && requestError.name !== "AbortError") {
          setError(requestError.message)
          showToast(requestError.message, "error")
        }
      }
    }

    loadDashboard()

    return () => controller.abort()
  }, [showToast])

  if (error) {
    return (
      <div className="py-1 px-4 sm:px-6 lg:px-8">
        <Header />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="py-1 px-4 sm:px-6 lg:px-8">
        <Header />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((card) => (
            <div key={card} className="h-48 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  const attendanceTotal = dashboard.todayPresent + dashboard.todayAbsent + dashboard.todayHalfDay
  const attendanceRate = attendanceTotal
    ? Math.round((dashboard.todayPresent / attendanceTotal) * 100)
    : 0

  return (
    <div className="py-1 px-4 sm:px-6 lg:px-8">
      <Header />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Labour"
          value={numberFormatter.format(dashboard.totalLabour)}
          subtitle={`${numberFormatter.format(dashboard.activeLabour)} active personnel`}
          accent="bg-purple-50 text-purple-600"
          icon={<Image src="/assets/users.png" alt="Labour Icon" width={24} height={24} style={{ height: "auto" }} />}
        />

        <StatCard
          title="Active Sites"
          value={numberFormatter.format(dashboard.activeSites)}
          subtitle="Currently active project sites"
          topRight={<div className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs">Active</div>}
          accent="bg-blue-50 text-blue-600"
          icon={<Image src="/assets/sites.png" alt="Sites Icon" width={24} height={24} style={{ height: "auto" }} />}
        />

        <StatCard
          title="Present Today"
          value={numberFormatter.format(dashboard.todayPresent)}
          subtitle={`${dashboard.todayAbsent} absent · ${dashboard.todayHalfDay} half day`}
          topRight={<div className="text-sm font-medium text-teal-600">{attendanceRate}% Reach</div>}
          progress={attendanceRate}
          accent="bg-sky-50 text-sky-600"
          icon={<Image src="/assets/present_today.png" alt="Present Today Icon" width={24} height={24} style={{ height: "auto" }} />}
        />

        <StatCard
          title="Pending Salary"
          value={currencyFormatter.format(dashboard.pendingSalary)}
          subtitle={`Paid this month: ${currencyFormatter.format(dashboard.salaryPaid)}`}
          accent="bg-pink-50 text-pink-600"
          icon={<Image src="/assets/payroll.png" alt="Pending Salary Icon" width={24} height={24} style={{ height: "auto" }} />}
        />
      </div>
    </div>
  )
}

export default ContractorDashboard