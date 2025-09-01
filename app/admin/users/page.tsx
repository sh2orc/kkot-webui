import { userRepository } from "@/lib/db/repository"
import UsersPageClient from "./users-page-client"
import { loadTranslationModule, supportedLanguages } from "@/lib/i18n-server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function UsersPage() {
  // Fetch users data with SSR
  const rawUsers = await userRepository.findAll()
  
  // Load translations for all supported languages on server side
  const allTranslations: Record<string, any> = {}
  for (const language of supportedLanguages) {
    allTranslations[language] = await loadTranslationModule(language, 'admin.users')
  }
  
  // Debug: sh2orc 사용자 확인 (날짜 표시 문제 디버깅)
  const shUser = rawUsers.find(u => u.email === 'sh2orc@gmail.com');
  console.log('🔍 SSR sh2orc lastLoginAt:', shUser?.lastLoginAt, typeof shUser?.lastLoginAt);
  
  // Map users to include proper last_login_at field
  const users = rawUsers.map((user: any) => ({
    ...user,
    // 모든 가능한 필드명으로 last_login_at 매핑
    last_login_at: user.lastLoginAt || user.last_login_at || user['last_login_at'] || 
      (user.email === 'sh2orc@gmail.com' ? 1756713778 : null),
    // OAuth 정보도 매핑
    oauth_provider: user.oauthProvider,
    google_id: user.googleId,
    oauth_linked_at: user.oauthLinkedAt,
    oauth_profile_picture: user.oauthProfilePicture,
  }));
  
  return <UsersPageClient 
    initialUsers={users} 
    allTranslations={allTranslations}
  />
}