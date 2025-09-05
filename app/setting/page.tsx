import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/config'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import SettingsPage from "@/components/contents/settings-page"
import { getAuthOptions } from '@/app/api/auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

interface UserProfile {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
}

export default async function Page() {
  const authOptions = await getAuthOptions()
  const session = await getServerSession(authOptions)
  
  // 미들웨어에서 이미 인증 및 권한 검증을 완료했으므로
  // 여기서는 session이 존재한다고 가정할 수 있음
  if (!session?.user?.email) {
    console.error('[Settings Page] Unexpected: session is null after middleware')
    redirect('/auth')
  }

  let userProfile: UserProfile | null = null

  try {
    const db = getDb()
    const userDetails = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    }).from(users).where(eq(users.email, session.user.email)).limit(1)

    if (userDetails.length > 0) {
      userProfile = {
        ...userDetails[0],
        createdAt: userDetails[0].createdAt?.toISOString() || new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
  }

  return <SettingsPage initialUserProfile={userProfile} />
}
