import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-20" />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card Skeleton */}
        <Card className="md:col-span-1">
          <CardHeader>
            <Skeleton className="h-6 w-20" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar */}
            <div className="flex justify-center">
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>
            
            {/* Status and info */}
            <div className="space-y-3">
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-8 w-24" />
              </div>

              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <div className="flex items-center gap-2 mt-1">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>

              {/* Reset Password Button */}
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Info Tabs Skeleton */}
        <Card className="md:col-span-2">
          <Tabs defaultValue="info">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="info" className="text-sm">
                  <Skeleton className="h-4 w-12" />
                </TabsTrigger>
                <TabsTrigger value="permissions" className="text-sm">
                  <Skeleton className="h-4 w-16" />
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-sm">
                  <Skeleton className="h-4 w-14" />
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="info" className="space-y-4">
                {/* Form fields skeleton */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Skeleton className="h-4 w-12 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                {/* Additional info skeleton */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
