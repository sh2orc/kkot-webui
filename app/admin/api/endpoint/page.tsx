import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loadTranslationModule, getTranslationKey } from '@/lib/i18n-server'
import { headers } from 'next/headers'

export default async function ApiEndpointPage() {
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
        <CardTitle>{getTranslationKey(translations, 'endpoints.title')}</CardTitle>
        <CardDescription>
          {getTranslationKey(translations, 'endpoints.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 w-full">
          <div className="bg-gray-50 p-4 rounded-lg w-full">
            <h4 className="font-medium mb-2">{getTranslationKey(translations, 'endpoints.baseUrl')}</h4>
            <input
              type="text"
              readOnly
              value={`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/v1`}
              className="w-full p-3 text-sm font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <h4 className="font-medium text-sm">{getTranslationKey(translations, 'endpoints.chatCompletions.title')}</h4>
              <p className="text-sm text-gray-600">{getTranslationKey(translations, 'endpoints.chatCompletions.description')}</p>
            </div>
            
            <div className="border rounded-lg p-3">
              <h4 className="font-medium text-sm">{getTranslationKey(translations, 'endpoints.models.title')}</h4>
              <p className="text-sm text-gray-600">{getTranslationKey(translations, 'endpoints.models.description')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 