import React from 'react'
import Image from 'next/image'

type StatCardProps = {
  title: string
  value: string
  subtitle?: React.ReactNode
  topRight?: React.ReactNode
  icon?: React.ReactNode
  accent?: string
  progress?: number
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, topRight, icon, accent = 'bg-white', progress }) => {
  return (
    <div className="border border-gray-200 rounded-2xl p-6 bg-white shadow-sm relative">
      {topRight && <div className="absolute top-4 right-4">{topRight}</div>}

      <div className="items-start gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${accent}`}>{icon}</div>
        <div className="flex-1">
          <div className="text-xs uppercase pt-2 font-bold text-gray-500 tracking-wide">{title}</div>
          <div className="text-2xl font-semibold mt-2">{value}</div>
          {subtitle && <div className="text-sm text-gray-500 mt-2">{subtitle}</div>}
          {typeof progress === 'number' && (
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
}

const Header: React.FC = () => (
  <div className="mb-6 flex items-center justify-between">
    <div>
      <h3 className="text-xl font-semibold">Company Overview</h3>
      <p className="text-sm text-gray-500">Review workforce analytics and operational efficiency across all active sites.</p>
    </div>

    {/* <div className="flex items-center gap-3">
      <button className="flex items-center gap-2 px-3 py-2 bg-white border rounded-md text-sm">
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V11H3v8a2 2 0 002 2z"/></svg>
        <span>Last 30 Days</span>
      </button>

      <button className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm">Export Report</button>
    </div> */}
  </div>
)

const page = () => {
  return (
    <div className="py-1 px-4 sm:px-6 lg:px-8">
      <Header />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Labour"
          value="1,248"
          subtitle="Active personnel across 24 sites"
          topRight={<div className="px-2 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">+12%</div>}
          accent="bg-purple-50 text-purple-600"
          icon={(
            <Image src="/assets/users.png" alt="Labour Icon" width={24} height={24}/>
        )}
        />

        <StatCard
          title="Total Sites"
          value="24"
          subtitle="4 new projects in mobilization"
          topRight={<div className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">Stable</div>}
          accent="bg-blue-50 text-blue-600"
          icon={(
            <Image src="/assets/sites.png" alt="Sites Icon" width={24} height={24}/>
          )}
        />

        <StatCard
          title="Present Today"
          value="1,152"
          topRight={<div className="text-sm font-medium text-teal-600">92% Reach</div>}
          progress={92}
          accent="bg-sky-50 text-sky-600"
          icon={(
            <Image src="/assets/present_today.png" alt="Present Today Icon" width={24} height={24}/>
          )}
        />

        <StatCard
          title="Pending Salary"
          value="₹4.2M"
          subtitle={<span className="text-sm text-red-600">Due in 3 days: ₹1.8M</span>}
          topRight={<a className="text-sm text-indigo-600 font-medium">Pay Now</a>}
          accent="bg-pink-50 text-pink-600"
          icon={(
            <Image src="/assets/payroll.png" alt="Pending Salary Icon" width={24} height={24}/>
            
          )}
        />
      </div>
    </div>
  )
}

export default page