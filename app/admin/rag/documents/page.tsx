import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import DocumentsPage from './documents-page'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DocumentsRoute() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth')
  }

  return <DocumentsPage />
}
