import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ApiEndpointLoading() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Base URL section skeleton */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-12 w-full" />
          </div>
          
          {/* Endpoints skeleton */}
          <div className="space-y-3">
            <div className="border rounded-lg p-3 space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-72" />
            </div>
            
            <div className="border rounded-lg p-3 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 