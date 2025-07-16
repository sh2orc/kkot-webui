import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ApiUsagePage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>API 사용량 통계</CardTitle>
        <CardDescription>
          API 키별 사용량 및 통계 정보
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-gray-500">
          사용량 통계 기능이 곧 추가될 예정입니다.
        </div>
      </CardContent>
    </Card>
  )
} 