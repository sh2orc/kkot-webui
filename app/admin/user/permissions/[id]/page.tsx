"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function UserPermissionsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/admin/users/permissions')
  }, [router])
  
  return (
    <div className="flex items-center justify-center h-96">
      <p className="text-gray-500">Redirecting to permissions management...</p>
    </div>
  )
}
