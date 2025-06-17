"use client"

import { useState } from "react"
import AdminLayout from "../../../components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff } from "lucide-react"

export default function ImageSettingsPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showAppPassword, setShowAppPassword] = useState(false)

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">이미지 설정</h1>
          <p className="text-gray-600 mt-1">이미지 생성을 위한 외부 서비스를 설정합니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>이미지 생성 서비스</CardTitle>
            <CardDescription>이미지 생성을 위한 외부 서비스를 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">ComfyUI</Label>
                <Switch />
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="comfyui-url">ComfyUI 서버 URL</Label>
                  <Input id="comfyui-url" placeholder="http://localhost:8188" defaultValue="http://localhost:8188" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comfyui-api-key">API 키 (선택사항)</Label>
                  <div className="relative">
                    <Input
                      id="comfyui-api-key"
                      type={showPassword ? "text" : "password"}
                      placeholder="ComfyUI API 키 (필요한 경우)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comfyui-workflow">기본 워크플로우</Label>
                  <Select defaultValue="text2img">
                    <SelectTrigger>
                      <SelectValue placeholder="워크플로우 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text2img">Text to Image</SelectItem>
                      <SelectItem value="img2img">Image to Image</SelectItem>
                      <SelectItem value="inpainting">Inpainting</SelectItem>
                      <SelectItem value="upscaling">Upscaling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Midjourney</Label>
                <Switch />
              </div>

              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="midjourney-api-url">Midjourney API URL</Label>
                  <Input id="midjourney-api-url" placeholder="https://api.midjourney.com/v1" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="midjourney-api-key">API 키</Label>
                  <div className="relative">
                    <Input
                      id="midjourney-api-key"
                      type={showAppPassword ? "text" : "password"}
                      placeholder="Midjourney API 키를 입력하세요"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowAppPassword(!showAppPassword)}
                    >
                      {showAppPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="midjourney-version">모델 버전</Label>
                  <Select defaultValue="v6">
                    <SelectTrigger>
                      <SelectValue placeholder="모델 버전 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="v5.2">Midjourney v5.2</SelectItem>
                      <SelectItem value="v6">Midjourney v6</SelectItem>
                      <SelectItem value="niji5">Niji v5</SelectItem>
                      <SelectItem value="niji6">Niji v6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="midjourney-quality">기본 품질</Label>
                  <Select defaultValue="1">
                    <SelectTrigger>
                      <SelectValue placeholder="품질 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.25">낮음 (0.25)</SelectItem>
                      <SelectItem value="0.5">보통 (0.5)</SelectItem>
                      <SelectItem value="1">높음 (1.0)</SelectItem>
                      <SelectItem value="2">최고 (2.0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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