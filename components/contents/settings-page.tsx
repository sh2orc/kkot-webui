"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { User, Bell, Shield, Globe, Upload } from "lucide-react"
import Layout from "@/components/layout/layout"

export default function SettingsPage() {
  const [profileImage, setProfileImage] = useState<string | null>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setProfileImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">설정</h1>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid grid-cols-4 mb-8 rounded-lg">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">프로필</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">계정</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">알림</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">환경설정</span>
              </TabsTrigger>
            </TabsList>

            {/* 프로필 탭 */}
            <TabsContent value="profile">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>프로필 정보</CardTitle>
                  <CardDescription>프로필 정보를 수정하고 관리하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-4 p-2 mr-2">
                      <Avatar className="h-12 w-12">
                        {profileImage ? (
                          <AvatarImage src={profileImage || "/placeholder.svg"} alt="프로필 이미지" />
                        ) : (
                          <AvatarFallback className="bg-orange-500 text-white text-xl">A</AvatarFallback>
                        )}
                      </Avatar>
                      <div className="relative">
                        <Input
                          type="file"
                          id="picture"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                        <Label
                          htmlFor="picture"
                          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md cursor-pointer text-sm"
                        >
                          <Upload className="h-4 w-4" />
                          이미지 업로드
                        </Label>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 w-full max-w-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">이름</Label>
                          <Input id="name" placeholder="홍길동" defaultValue="관리자" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">사용자 이름</Label>
                          <Input id="username" placeholder="username" defaultValue="admin" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">이메일</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@company.com"
                          defaultValue="admin@bccard.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">자기소개</Label>
                        <Input id="bio" placeholder="간단한 자기소개를 입력하세요" />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>저장하기</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 계정 탭 */}
            <TabsContent value="account">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>계정 설정</CardTitle>
                  <CardDescription>계정 보안 및 접근 설정을 관리하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">비밀번호 변경</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">현재 비밀번호</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">새 비밀번호</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">비밀번호 확인</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">계정 보안</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">2단계 인증</p>
                        <p className="text-sm text-gray-500">로그인 시 추가 보안 코드가 필요합니다.</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>저장하기</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 알림 탭 */}
            <TabsContent value="notifications">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>알림 설정</CardTitle>
                  <CardDescription>알림 수신 방법을 설정하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">이메일 알림</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">새로운 메시지</p>
                          <p className="text-sm text-gray-500">새 메시지가 도착하면 알림을 받습니다.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">시스템 업데이트</p>
                          <p className="text-sm text-gray-500">시스템 업데이트 및 변경사항을 알립니다.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">마케팅 정보</p>
                          <p className="text-sm text-gray-500">새로운 기능 및 프로모션 정보를 받습니다.</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">푸시 알림</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">모든 알림</p>
                          <p className="text-sm text-gray-500">모든 활동에 대한 푸시 알림을 받습니다.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">멘션 및 댓글</p>
                          <p className="text-sm text-gray-500">멘션되거나 댓글이 달릴 때 알림을 받습니다.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>저장하기</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 환경설정 탭 */}
            <TabsContent value="preferences">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>환경설정</CardTitle>
                  <CardDescription>언어 및 표시 설정을 관리하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="language">언어</Label>
                      <Select defaultValue="ko">
                        <SelectTrigger>
                          <SelectValue placeholder="언어 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ko">한국어</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="ja">日本語</SelectItem>
                          <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="timezone">시간대</Label>
                      <Select defaultValue="asia-seoul">
                        <SelectTrigger>
                          <SelectValue placeholder="시간대 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asia-seoul">(GMT+9) 서울, 도쿄</SelectItem>
                          <SelectItem value="america-la">(GMT-7) 로스앤젤레스</SelectItem>
                          <SelectItem value="america-ny">(GMT-4) 뉴욕</SelectItem>
                          <SelectItem value="europe-london">(GMT+1) 런던</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">테마 설정</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">다크 모드</p>
                        <p className="text-sm text-gray-500">어두운 테마로 전환합니다.</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">고대비 모드</p>
                        <p className="text-sm text-gray-500">가독성을 높이기 위한 고대비 모드입니다.</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>저장하기</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
