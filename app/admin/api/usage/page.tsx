import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loadTranslationModule, getTranslationKey } from '@/lib/i18n-server'
import { headers } from 'next/headers'

export default async function ApiUsagePage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth')
  }

  // Extract language information from Accept-Language header (default: 'kor')
  const headersList = await headers()
  const acceptLanguage = headersList.get('accept-language') || ''
  const preferredLanguage = acceptLanguage.includes('en') ? 'eng' : 'kor'
  
  // Load translations
  const translations = await loadTranslationModule(preferredLanguage, 'admin.api')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{getTranslationKey(translations, 'usage.title')}</CardTitle>
        <CardDescription>
          {getTranslationKey(translations, 'usage.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          {getTranslationKey(translations, 'comingSoon')}
        </div>
      </CardContent>
    </Card>
  )
} 