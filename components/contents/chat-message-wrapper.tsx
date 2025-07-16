import { memo } from "react"
import { LlmResponse } from "@/components/chat/llm-response"
import { UserRequest } from "@/components/chat/user-request"
import { Message } from "./chat-types"

interface ChatMessageWrapperProps {
  message: Message
  isNewMessage: boolean
  copiedMessageId: string | null
  likedMessages: Set<string>
  dislikedMessages: Set<string>
  isStreaming: boolean
  editingMessageId: string | null
  editingContent: string
  regeneratingMessageId: string | null
  streamingMessageId: string | null
  onCopy: (content: string, messageId: string) => void
  onLike: (messageId: string) => void
  onDislike: (messageId: string) => void
  onRegenerate: (messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onSave: (messageId: string) => void
  onCancel: () => void
  onRegenerateFromUser: (messageId: string) => void
  setEditingContent: (content: string) => void
}

// Memoized chat message wrapper component
export const ChatMessageWrapper = memo(({ 
  message, 
  isNewMessage, 
  copiedMessageId, 
  likedMessages, 
  dislikedMessages, 
  isStreaming, 
  editingMessageId, 
  editingContent, 
  regeneratingMessageId,
  streamingMessageId,
  onCopy, 
  onLike, 
  onDislike, 
  onRegenerate, 
  onEdit, 
  onSave, 
  onCancel, 
  onRegenerateFromUser, 
  setEditingContent 
}: ChatMessageWrapperProps) => {
  return (
    <div 
      className={`message-item mb-6 ${isNewMessage ? 'message-enter' : ''} ${message.role === "user" ? "flex justify-end" : ""}`}
    >
      {message.role === "assistant" && (
        <LlmResponse
          id={message.id}
          content={message.content}
          timestamp={message.timestamp}
          onCopy={onCopy}
          onLike={onLike}
          onDislike={onDislike}
          onRegenerate={onRegenerate}
          copiedMessageId={copiedMessageId}
          likedMessages={likedMessages}
          dislikedMessages={dislikedMessages}
          isStreaming={isStreaming && streamingMessageId === message.id}
          isDeepResearch={message.isDeepResearch}
          deepResearchStepType={message.deepResearchStepType}
          isDeepResearchComplete={message.isDeepResearchComplete}
          hasDeepResearchError={message.hasDeepResearchError}
          deepResearchStepInfo={message.deepResearchStepInfo}
        />
      )}

      {message.role === "user" && (
        <UserRequest
          id={message.id}
          content={message.content}
          timestamp={message.timestamp}
          onCopy={onCopy}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
          onRegenerate={onRegenerateFromUser}
          editingMessageId={editingMessageId}
          editingContent={editingContent}
          setEditingContent={setEditingContent}
          copiedMessageId={copiedMessageId}
          isStreaming={isStreaming}
          regeneratingMessageId={regeneratingMessageId}
        />
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Only rerender if message content hasn't changed and only state related to this message has changed
  const message = prevProps.message
  const nextMessage = nextProps.message
  
  // Message content has changed, rerender
  if (message.id !== nextMessage.id || message.content !== nextMessage.content) {
    return false
  }
  
  // Deep research related changes - rerender if any deep research field changed
  if (message.isDeepResearch !== nextMessage.isDeepResearch ||
      message.deepResearchStepType !== nextMessage.deepResearchStepType ||
      message.isDeepResearchComplete !== nextMessage.isDeepResearchComplete ||
      message.hasDeepResearchError !== nextMessage.hasDeepResearchError) {
    return false
  }
  
  // Deep research step info changed (use JSON comparison for objects)
  const prevStepInfo = message.deepResearchStepInfo
  const nextStepInfo = nextMessage.deepResearchStepInfo
  
  if (prevStepInfo !== nextStepInfo) {
    // Handle null/undefined cases
    if (!prevStepInfo && nextStepInfo) return false
    if (prevStepInfo && !nextStepInfo) return false
    
    // Deep comparison for objects
    if (prevStepInfo && nextStepInfo) {
      const prevKeys = Object.keys(prevStepInfo)
      const nextKeys = Object.keys(nextStepInfo)
      
      // Different number of keys
      if (prevKeys.length !== nextKeys.length) return false
      
      // Check each key for changes
      for (const key of nextKeys) {
        if (!prevKeys.includes(key)) return false
        
        const prevValue = prevStepInfo[key]
        const nextValue = nextStepInfo[key]
        
        // Deep comparison for step info objects
        if (typeof prevValue === 'object' && typeof nextValue === 'object') {
          if (JSON.stringify(prevValue) !== JSON.stringify(nextValue)) {
            return false
          }
        } else if (prevValue !== nextValue) {
          return false
        }
      }
    }
  }
  
  // Current message is streaming, rerender
  if (nextProps.streamingMessageId === message.id) {
    return false
  }
  
  // Current message is being edited, rerender
  if (nextProps.editingMessageId === message.id) {
    return false
  }
  
  // Current message is being regenerated or regeneration state changed, rerender
  if (nextProps.regeneratingMessageId === message.id || 
      prevProps.regeneratingMessageId === message.id) {
    return false
  }
  
  // Current message has been copied, rerender
  if (nextProps.copiedMessageId === message.id) {
    return false
  }
  
  // Current message is new, rerender
  if (nextProps.isNewMessage !== prevProps.isNewMessage) {
    return false
  }
  
  // Like/dislike state has changed, rerender
  if (nextProps.likedMessages.has(message.id) !== prevProps.likedMessages.has(message.id) ||
      nextProps.dislikedMessages.has(message.id) !== prevProps.dislikedMessages.has(message.id)) {
    return false
  }
  
  // Don't rerender in other cases
  return true
}) 