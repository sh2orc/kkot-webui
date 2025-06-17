import AdminLayout from "../../../components/admin/admin-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function ModelSettingsPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">모델 설정</h1>
          <p className="text-gray-600 mt-1">AI 모델 설정 및 관리를 수행합니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>모델 관리</CardTitle>
            <CardDescription>AI 모델 설정 및 관리를 수행합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="default-model">기본 모델</Label>
              <Select defaultValue="gemma3">
                <SelectTrigger>
                  <SelectValue placeholder="모델 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemma3">gemma3:27b-it-qat</SelectItem>
                  <SelectItem value="gpt4o">gpt-4o</SelectItem>
                  <SelectItem value="claude">claude-3-sonnet</SelectItem>
                  <SelectItem value="llama">llama-3.1-70b</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">최대 토큰 수</Label>
              <Input id="max-tokens" type="number" defaultValue="4096" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input id="temperature" type="number" step="0.1" min="0" max="2" defaultValue="0.7" />
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