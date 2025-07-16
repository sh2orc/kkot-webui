import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { getDb } from '@/lib/db/config'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import SettingsPage from "@/components/contents/settings-page"

interface UserProfile {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
}

export default async function Page() {
  const session = await getServerSession()
  
  // Redirect to auth page if not logged in
  if (!session?.user?.email) {
    redirect('/auth')
  }

  let userProfile: UserProfile | null = null

  try {
    const db = getDb()
    const user = await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt
    }).from(users).where(eq(users.email, session.user.email)).limit(1)

    if (user.length > 0) {
      userProfile = {
        ...user[0],
        createdAt: user[0].createdAt?.toISOString() || new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
  }

  return <SettingsPage initialUserProfile={userProfile} />
}
