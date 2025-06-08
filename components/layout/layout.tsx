"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Sidebar from "./sidebar"
import Navbar from "./navbar"

interface LayoutProps {
  children: ReactNode
  currentPage?: "chat" | "content"
}

export default function Layout({ children, currentPage = "chat" }: LayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        currentPage={currentPage}
        mobileSidebarOpen={mobileSidebarOpen}
        setMobileSidebarOpen={setMobileSidebarOpen}
      />
      <div className="flex-1 flex flex-col">
        <Navbar
          title={currentPage === "chat" ? "Empty Chat" : "Book"}
          onMobileMenuClick={() => setMobileSidebarOpen(true)}
        />
        {children}
      </div>
    </div>
  )
}
