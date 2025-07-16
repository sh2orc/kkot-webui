"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface DisabledFeatureProps {
  title: string
  description: string
}

export default function DisabledFeature({ title, description }: DisabledFeatureProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>

      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Feature in Development</AlertTitle>
        <AlertDescription>
          This feature is currently under development and not yet available.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-16 w-16 text-yellow-500 mb-4" />
            <h3 className="text-xl font-medium mb-2">Feature Coming Soon</h3>
            <p className="text-gray-500 text-center">
              This feature is currently in development and will be available soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 