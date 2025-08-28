"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function UserPageRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/users')
  }, [router])
  
  return (
    <div className="flex items-center justify-center h-96">
      <p className="text-gray-500">Redirecting to user management...</p>
    </div>
  )
}
