import AdminLayout from "@/components/admin/admin-layout"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ToolsSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">도구 설정</h1>
          <p className="text-gray-600 mt-1">외부 도구 및 플러그인 설정을 관리합니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>도구 설정</CardTitle>
            <CardDescription>외부 도구 및 플러그인 설정을 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Code Execution</Label>
                <p className="text-sm text-gray-500">코드 실행 기능을 활성화합니다.</p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-black text-white hover:bg-gray-800">저장</Button>
        </div>
      </div>
    </AdminLayout>
  )
} 