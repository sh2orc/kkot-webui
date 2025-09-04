"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Mail, Clock, Settings } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

export default function PendingAccessPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { t } = useTranslation('auth')

  // 로그인되지 않은 사용자는 인증 페이지로 리다이렉트
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth")
    }
  }, [status, router])

  const handleSignOut = async () => {
    await signOut({ 
      callbackUrl: "/auth",
      redirect: true 
    })
  }

  const handleContactAdmin = () => {
    // 관리자 이메일이나 연락처 정보가 있다면 여기에 추가
    window.location.href = "mailto:admin@example.com?subject=계정 권한 요청&body=안녕하세요. 계정 권한 활성화를 요청드립니다."
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return null // 리다이렉트 중
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">계정 승인 대기 중</CardTitle>
          <CardDescription>
            계정이 생성되었지만 아직 승인되지 않았습니다
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* 사용자 정보 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  현재 상태
                </h4>
                <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                  새 회원 가입이 현재 비활성화되어 있어, 귀하의 계정은 게스트 권한으로 생성되었습니다. 
                  모든 기능을 사용하려면 관리자의 승인이 필요합니다.
                </p>
              </div>
            </div>
          </div>

          {/* 계정 정보 */}
          {session?.user && (
            <div className="border dark:border-gray-700 p-4 rounded-lg">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                계정 정보
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">이메일:</span>
                  <span className="font-medium">{session.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">이름:</span>
                  <span className="font-medium">{session.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">권한:</span>
                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                    {session.user.role}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="space-y-4">
            <h4 className="font-medium">다음 단계:</h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></span>
                관리자에게 계정 활성화를 요청하세요
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></span>
                승인 완료 후 다시 로그인하시면 모든 기능을 사용할 수 있습니다
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></span>
                승인까지 일정 시간이 소요될 수 있습니다
              </li>
            </ul>
          </div>

          {/* 액션 버튼 */}
          <div className="space-y-3">
       
            <Button 
              onClick={handleSignOut}
              variant="default" 
              className="w-full"
            >
              로그아웃
            </Button>
          </div>

          {/* 추가 안내 */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400">
            문의사항이 있으시면 관리자에게 연락해주세요.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
