export function ChatHistorySkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* First group (Today) */}
      <div className="space-y-2">
        <div className="h-3 w-16 bg-gray-300 rounded animate-skeleton-pulse"></div>
        <div className="space-y-1">
          <div className="flex items-center p-2 rounded">
            <div className="h-4 flex-1 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '0.1s'}}></div>
          </div>
          <div className="flex items-center p-2 rounded">
            <div className="h-4 flex-1 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '0.2s'}}></div>
          </div>
          <div className="flex items-center p-2 rounded">
            <div className="h-4 w-3/4 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '0.3s'}}></div>
          </div>
        </div>
      </div>

      {/* Second group (Last 30 days) */}
      <div className="space-y-2">
        <div className="h-3 w-20 bg-gray-300 rounded animate-skeleton-pulse" style={{animationDelay: '0.4s'}}></div>
        <div className="space-y-1">
          <div className="flex items-center p-2 rounded">
            <div className="h-4 w-5/6 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '0.5s'}}></div>
          </div>
          <div className="flex items-center p-2 rounded">
            <div className="h-4 flex-1 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '0.6s'}}></div>
          </div>
          <div className="flex items-center p-2 rounded">
            <div className="h-4 w-4/5 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '0.7s'}}></div>
          </div>
          <div className="flex items-center p-2 rounded">
            <div className="h-4 w-2/3 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '0.8s'}}></div>
          </div>
        </div>
      </div>

      {/* Third group (Previous months) */}
      <div className="space-y-2">
        <div className="h-3 w-24 bg-gray-300 rounded animate-skeleton-pulse" style={{animationDelay: '0.9s'}}></div>
        <div className="space-y-1">
          <div className="flex items-center p-2 rounded">
            <div className="h-4 w-4/5 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '1.0s'}}></div>
          </div>
          <div className="flex items-center p-2 rounded">
            <div className="h-4 w-3/4 mr-2 bg-gray-200 rounded animate-skeleton-pulse" style={{animationDelay: '1.1s'}}></div>
          </div>
        </div>
      </div>
    </div>
  )
} 