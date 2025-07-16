import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import ApiManagementForm from './api-management-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ApiManagementPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API 설정</CardTitle>
        <CardDescription>
          OpenAI Compatible API 서비스 설정을 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div>Loading...</div>}>
          <ApiManagementForm />
        </Suspense>
      </CardContent>
    </Card>
  )
} 