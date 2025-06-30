"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"

export default function Page() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") {
      // Do nothing while session is loading
      return
    }

    if (status === "authenticated" && session?.user) {
      // If authenticated successfully, smoothly navigate to chat page
      router.replace("/chat")
    } else if (status === "unauthenticated") {
      // If not authenticated, handle logout and redirect to auth page
      signOut({ redirect: false }).then(() => {
        router.replace("/auth")
      })
    }
  }, [status, session, router])

  // Display loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Empty screen until session state processing is complete
  return null
}
