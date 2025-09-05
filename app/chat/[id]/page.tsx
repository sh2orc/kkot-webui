import ChatPage from "@/components/contents/chat-page"
import { getServerSession } from "next-auth"
import { getAuthOptions } from "@/app/api/auth/[...nextauth]/route"
import { chatSessionRepository } from "@/lib/db/server"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Get session information from server
  const authOptions = await getAuthOptions()
  const session = await getServerSession(authOptions)
  
  // 미들웨어에서 이미 인증 및 권한 검증을 완료했으므로
  // 여기서는 session이 존재한다고 가정할 수 있음
  if (!session || !session.user?.email) {
    console.error('[Chat ID Page] Unexpected: session is null after middleware')
    redirect('/auth')
  }
  
  // 채팅 세션 소유권 확인
  const resolvedParams = await params
  const chatId = resolvedParams.id
  
  const chatSession = await chatSessionRepository.findById(chatId)
  if (!chatSession || chatSession.length === 0) {
    console.error('[Chat ID Page] Chat session not found:', chatId)
    redirect('/chat')
  }
  
  if (chatSession[0].userEmail !== session.user.email) {
    console.error('[Chat ID Page] Access denied - session owner mismatch')
    redirect('/chat')
  }
  
  return <ChatPage chatId={chatId} />
}
