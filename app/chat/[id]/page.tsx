import ChatPage from "@/components/contents/chat-page"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  return <ChatPage chatId={resolvedParams.id} />
}
