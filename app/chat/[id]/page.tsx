import ChatPage from "../../../components/contents/chat-page"

export default function Page({ params }: { params: { id: string } }) {
  return <ChatPage chatId={params.id} />
}
