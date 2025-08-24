import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import SettingsPage from './settings-page'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsRoute() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth')
  }

  return <SettingsPage />
}