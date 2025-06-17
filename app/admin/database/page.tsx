import AdminLayout from "../../../components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DatabaseSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">데이터베이스 설정</h1>
          <p className="text-gray-600 mt-1">데이터베이스 구성 설정입니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>데이터베이스 설정</CardTitle>
            <CardDescription>이 섹션의 설정은 개발 중입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500">곧 추가될 예정입니다.</p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 