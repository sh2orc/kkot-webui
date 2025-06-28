"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslation } from "@/lib/i18n"
import { Database, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react"

export default function DatabaseSettingsPage() {
  const { lang } = useTranslation('admin.database')
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // DB 상태 테스트 함수
  const testDbConnection = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/db-test')
      const data = await response.json()
      
      if (data.success) {
        setDbStatus(data.results)
      } else {
        setError(data.message || '알 수 없는 오류가 발생했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '데이터베이스 연결 테스트 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  // 페이지 로드 시 DB 상태 테스트
  useEffect(() => {
    testDbConnection()
  }, [])

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 mt-1">{lang('description')}</p>
        </div>

        {/* 데이터베이스 상태 카드 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <CardTitle>{lang('status.title')}</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testDbConnection}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? lang('status.testing') : lang('status.test')}
              </Button>
            </div>
            <CardDescription>{lang('status.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{lang('status.error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : dbStatus ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{lang('status.connected')}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">{lang('status.type')}</h3>
                    <p className="font-medium">{dbStatus.dbType || 'sqlite'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">{lang('status.url')}</h3>
                    <p className="font-medium">{dbStatus.dbUrl || '기본값'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">{lang('status.users')}</h3>
                    <p className="font-medium">{dbStatus.existingUsers?.length || 0}명</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">{lang('status.lastChecked')}</h3>
                    <p className="font-medium">{new Date(dbStatus.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 데이터베이스 설정 카드 */}
        <Card>
          <CardHeader>
            <CardTitle>{lang('settings.title')}</CardTitle>
            <CardDescription>{lang('settings.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">데이터베이스 설정 기능은 개발 중입니다.</p>
            <p className="text-sm text-gray-400 mt-2">
              현재 데이터베이스 타입을 변경하려면 환경 변수를 수정하세요:
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">DB_TYPE=sqlite|postgresql</code>
              <br />
              <code className="bg-gray-100 px-2 py-1 rounded text-sm">DATABASE_URL=your-connection-string</code>
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 
