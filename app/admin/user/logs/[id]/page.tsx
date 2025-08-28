"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

export default function UserLogsRedirect() {
  const router = useRouter()
  const params = useParams()
  
  useEffect(() => {
    router.replace(`/admin/users/${params.id}`)
  }, [router, params.id])
  
  return (
    <div className="flex items-center justify-center h-96">
      <p className="text-gray-500">Redirecting to user activity logs...</p>
    </div>
  )
}
