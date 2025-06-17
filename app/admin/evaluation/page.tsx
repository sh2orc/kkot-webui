import AdminLayout from "../../../components/admin/admin-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function EvaluationSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">평가 설정</h1>
          <p className="text-gray-600 mt-1">모델 성능 평가 및 모니터링 설정입니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>평가 설정</CardTitle>
            <CardDescription>모델 성능 평가 및 모니터링 설정입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">자동 평가 활성화</Label>
                <p className="text-sm text-gray-500">모델 응답에 대한 자동 평가를 수행합니다.</p>
              </div>
              <Switch />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eval-interval">평가 주기 (시간)</Label>
              <Input id="eval-interval" type="number" defaultValue="24" />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
} 