"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, LogIn } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function InvalidAccessPage() {
  const router = useRouter()
  const { lang } = useTranslation('auth')

  useEffect(() => {
    // Clear any remaining auth data
    if (typeof window !== 'undefined') {
      // Clear localStorage
      localStorage.removeItem('next-auth.session-token')
      // Clear sessionStorage
      sessionStorage.clear()
    }
  }, [])

  const handleGoToLogin = () => {
    router.push('/auth')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">
            {lang('invalidAccess.title')}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {lang('invalidAccess.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {lang('invalidAccess.reasons.title')}
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>{lang('invalidAccess.reasons.deleted')}</li>
              <li>{lang('invalidAccess.reasons.inactive')}</li>
              <li>{lang('invalidAccess.reasons.permissionChanged')}</li>
              <li>{lang('invalidAccess.reasons.suspended')}</li>
            </ul>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {lang('invalidAccess.recovery')}
            </p>
          </div>

          <Button 
            onClick={handleGoToLogin}
            className="w-full"
            size="lg"
          >
            <LogIn className="mr-2 h-4 w-4" />
            {lang('invalidAccess.goToLogin')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
