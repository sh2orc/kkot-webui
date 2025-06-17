import AdminLayout from "../../../components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DocumentsSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">문서 설정</h1>
          <p className="text-gray-600 mt-1">문서 관리 및 인덱싱 설정입니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>문서 설정</CardTitle>
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