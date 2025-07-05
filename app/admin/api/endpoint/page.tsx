import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function ApiEndpointPage() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    redirect('/auth')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>사용 가능한 엔드포인트</CardTitle>
        <CardDescription>
          OpenAI compatible API 엔드포인트 목록
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 w-full">
          <div className="bg-gray-50 p-4 rounded-lg w-full">
            <h4 className="font-medium mb-2">기본 URL</h4>
            <input
              type="text"
              readOnly
              value={`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/v1`}
              className="w-full p-3 text-sm font-mono bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
          </div>
          
          <div className="space-y-3">
            <div className="border rounded-lg p-3">
              <h4 className="font-medium text-sm">POST /v1/chat/completions</h4>
              <p className="text-sm text-gray-600">OpenAI 호환 채팅 완성 API</p>
            </div>
            
            <div className="border rounded-lg p-3">
              <h4 className="font-medium text-sm">GET /v1/models</h4>
              <p className="text-sm text-gray-600">사용 가능한 모델 목록</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 