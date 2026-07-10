"use client"

import React from "react"
import Image from "next/image"

const Navbar: React.FC = () => {
  return (
    <header className="w-full bg-white border-b-2 border-gray-400 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4 w-1/2">
        <div className="w-full max-w-md">
          <div className="relative w-full ms-50">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"/></svg>
            </span>
            <input
              type="text"
              placeholder="Search data, workers, or sites..."
              className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
       
        <button aria-label="notifications" className="p-2 rounded-full hover:bg-gray-100 relative">
          <Image src="/assets/notification.png" alt="Notifications" width={20} height={20} />
          <span className="absolute -top-0.5 -right-0.5 inline-block w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="h-6 w-px bg-gray-400" />

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-medium">JD</div>
          <div className="text-sm">
            <div className="font-medium">John Doe</div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Navbar