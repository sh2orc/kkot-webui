"use client"

import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, LogIn, Mail } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function PendingAccessPage() {
  const router = useRouter()
  const { lang } = useTranslation('auth')

  const handleGoToLogin = () => {
    router.push('/auth')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
            <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {lang('pendingAccess.title')}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {lang('pendingAccess.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {lang('pendingAccess.info')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {lang('pendingAccess.processingTime')}
            </p>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex items-start space-x-3">
            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {lang('pendingAccess.emailNotice.title')}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {lang('pendingAccess.emailNotice.checkSpam')}
              </p>
            </div>
          </div>

          <div className="pt-4 space-y-3">
            <Button 
              onClick={handleGoToLogin}
              className="w-full"
              variant="outline"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {lang('pendingAccess.goToLogin')}
            </Button>
            
            <p className="text-xs text-center text-gray-500 dark:text-gray-400">
              {lang('pendingAccess.contact')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}