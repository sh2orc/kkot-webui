"use client"

import { useState } from "react"
import Sidebar from "@/components/layout/sidebar"
import Navbar from "@/components/layout/navbar"

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        currentPage="chat"
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />
      <div className="flex-1 flex flex-col">
        <Navbar
          title="Chat"
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
        />
        {children}
      </div>
    </div>
  )
} 