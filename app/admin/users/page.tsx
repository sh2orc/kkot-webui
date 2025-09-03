import { userRepository, adminSettingsRepository } from "@/lib/db/repository"
import UsersPageClient from "./users-page-client"
import { loadTranslationModule, supportedLanguages, defaultLanguage } from "@/lib/i18n-server"
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UsersPage() {
  // Get current language from cookies or use default
  const cookieStore = await cookies()
  const currentLanguage = cookieStore.get('language')?.value || defaultLanguage
  
  // Fetch users data and admin settings with SSR
  const [rawUsers, emailVerificationSetting] = await Promise.all([
    userRepository.findAll(),
    adminSettingsRepository.findByKey('auth.emailVerificationEnabled')
  ])
  
  // Check if email verification is enabled
  const emailVerificationEnabled = emailVerificationSetting?.[0]?.value === 'true'
  
  // Load translations for all supported languages on server side
  const allTranslations: Record<string, any> = {}
  for (const language of supportedLanguages) {
    allTranslations[language] = await loadTranslationModule(language, 'admin.users')
  }
  

  
  // Map users to include proper last_login_at field
  const users = rawUsers.map((user: any) => ({
    ...user,
    // 모든 가능한 필드명으로 last_login_at 매핑
    last_login_at: user.lastLoginAt || user.last_login_at || user['last_login_at'] || null,
    // OAuth 정보도 매핑
    oauth_provider: user.oauthProvider,
    google_id: user.googleId,
    oauth_linked_at: user.oauthLinkedAt,
    oauth_profile_picture: user.oauthProfilePicture,
  }));
  
  return <UsersPageClient 
    initialUsers={users} 
    allTranslations={allTranslations}
    emailVerificationEnabled={emailVerificationEnabled}
    initialLanguage={currentLanguage}
  />
}