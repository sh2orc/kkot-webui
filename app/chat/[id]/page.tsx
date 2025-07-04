"use client"

import ChatPage from "@/components/contents/chat-page"
import { useParams } from "next/navigation"

export default function Page() {
  const params = useParams()
  const chatId = params.id as string
  
  return <ChatPage chatId={chatId} />
}
