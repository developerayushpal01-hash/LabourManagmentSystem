import React from 'react'
import Sidebar from './components/sidebar'
import Navbar from './components/navbar'
import Contractordashboard from './contractorpages/dashboard/page'

const page = () => {
  return (
    <div className="flex">
        <Sidebar />
        <div className="flex-1">
            <Navbar />
            <div className="p-6">
                <Contractordashboard />
            </div>
        </div>
    </div>
  )
}
       
export default page