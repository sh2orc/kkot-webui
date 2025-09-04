"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import Loading from "@/components/ui/loading"

export default function Page() {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === "loading") {
      // Do nothing while session is loading
      return
    }

    if (status === "authenticated" && session?.user) {
      // Check if user is guest, redirect to pending page
      if (session.user.role === "guest") {
        router.replace("/auth/pending")
      } else {
        // If authenticated successfully, smoothly navigate to chat page
        router.replace("/chat")
      }
    } else if (status === "unauthenticated") {
      // If not authenticated, redirect to auth page
      router.replace("/auth")
    }
  }, [status, session?.user]) // Remove router from dependencies and only track session.user

  // Display loading state
  if (status === "loading") {
    return <Loading />
  }

  // Empty screen until session state processing is complete
  return null
}
