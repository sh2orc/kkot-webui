// Chat message skeleton component
export const ChatMessageSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* First AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse"></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '0.1s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="h-4 w-[95%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.3s'}}></div>
            <div className="h-4 w-[85%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.4s'}}></div>
            <div className="h-4 w-[92%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.5s'}}></div>
            <div className="h-4 w-[78%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.6s'}}></div>
          </div>
        </div>
      </div>

      {/* Second AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse" style={{animationDelay: '0.7s'}}></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '0.8s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-[90%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '0.9s'}}></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.0s'}}></div>
            <div className="h-4 w-[87%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.1s'}}></div>
            <div className="h-4 w-[65%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.2s'}}></div>
          </div>
        </div>
      </div>

      {/* Third AI response skeleton */}
      <div className="flex justify-start mb-6">
        <div className="w-full max-w-[90%] space-y-2">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-gray-300 dark:bg-gray-600 rounded-full animate-skeleton-pulse" style={{animationDelay: '1.3s'}}></div>
            <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded animate-skeleton-pulse" style={{animationDelay: '1.4s'}}></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-[82%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.5s'}}></div>
            <div className="h-4 w-[96%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.6s'}}></div>
            <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.7s'}}></div>
            <div className="h-4 w-[89%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.8s'}}></div>
            <div className="h-4 w-[75%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '1.9s'}}></div>
            <div className="h-4 w-[91%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '2.0s'}}></div>
            <div className="h-4 w-[68%] bg-gray-200 dark:bg-gray-700 rounded animate-skeleton-pulse" style={{animationDelay: '2.1s'}}></div>
          </div>
        </div>
      </div>
    </div>
  )
} 