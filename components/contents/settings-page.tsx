"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { toast } from "sonner"
import Layout from "@/components/layout/layout"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import Loading from "@/components/ui/loading"

interface UserProfile {
  id: string
  username: string
  email: string
  role: string
  createdAt: string
}

interface SettingsPageProps {
  initialUserProfile?: UserProfile | null
}

export default function SettingsPage({ initialUserProfile }: SettingsPageProps) {
  const { lang, language } = useTranslation('settings')
  const [isLoaded, setIsLoaded] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialUserProfile || null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Form state - set initial values from server data
  const [formData, setFormData] = useState({
    username: initialUserProfile?.username || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Preload translation modules
  useEffect(() => {
    async function loadTranslations() {
      await preloadTranslationModule(language, 'settings')
      setIsLoaded(true)
    }
    loadTranslations()
  }, [language])

  // Update form data when initial profile data changes
  useEffect(() => {
    if (initialUserProfile) {
      setUserProfile(initialUserProfile)
      setFormData(prev => ({
        ...prev,
        username: initialUserProfile.username
      }))
    }
  }, [initialUserProfile])

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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleProfileUpdate = async () => {
    if (!userProfile) return

    // Validation
    if (!formData.username.trim()) {
      toast.error('Please enter username.')
      return
    }

    setIsLoading(true)

    try {
      const updateData: any = {
        username: formData.username.trim()
      }

      // If password change is requested
      if (formData.currentPassword || formData.newPassword) {
        if (!formData.currentPassword) {
          toast.error('Please enter current password.')
          setIsLoading(false)
          return
        }

        if (!formData.newPassword) {
          toast.error('Please enter new password.')
          setIsLoading(false)
          return
        }

        if (formData.newPassword !== formData.confirmPassword) {
          toast.error('New password and confirmation password do not match.')
          setIsLoading(false)
          return
        }

        if (formData.newPassword.length < 6) {
          toast.error('New password must be at least 6 characters.')
          setIsLoading(false)
          return
        }

        updateData.currentPassword = formData.currentPassword
        updateData.newPassword = formData.newPassword
      }

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success('Profile updated successfully.')
        setUserProfile(result.user)
        // Reset password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
      } else {
        toast.error(result.error || 'Failed to update profile.')
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('An error occurred while updating profile.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <Layout>
        <Loading className="flex-1" fullScreen={false} />
      </Layout>
    )
  }

  if (!userProfile) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Unable to load user information.</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{lang('title') || '설정'}</h1>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid grid-cols-4 mb-8 rounded-lg">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{lang('tabs.profile') || '프로필'}</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{lang('tabs.account') || '계정'}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">{lang('tabs.notifications') || '알림'}</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{lang('tabs.preferences') || '환경설정'}</span>
              </TabsTrigger>
            </TabsList>

            {/* 프로필 탭 */}
            <TabsContent value="profile">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>{lang('profile.title') || '프로필 설정'}</CardTitle>
                  <CardDescription>{lang('profile.description') || '프로필 정보를 수정할 수 있습니다.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-4 p-2 mr-2">
                      <Avatar className="h-12 w-12">
                        {profileImage ? (
                          <AvatarImage src={profileImage || "/placeholder.svg"} alt="프로필 이미지" />
                        ) : (
                          <AvatarFallback className="bg-orange-500 text-white text-xl">
                            {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
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
                          {lang('profile.uploadImage') || '이미지 업로드'}
                        </Label>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 w-full max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="username">{lang('profile.username') || '사용자명'}</Label>
                        <Input 
                          id="username" 
                          value={formData.username}
                          onChange={(e) => handleInputChange('username', e.target.value)}
                          placeholder="사용자명을 입력하세요"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{lang('profile.email') || '이메일'}</Label>
                        <Input
                          id="email"
                          type="email"
                          value={userProfile?.email || ''}
                          disabled
                          className="bg-gray-50 text-gray-500"
                        />
                        <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">역할</Label>
                        <Input
                          id="role"
                          value={userProfile?.role === 'admin' ? '관리자' : '사용자'}
                          disabled
                          className="bg-gray-50 text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleProfileUpdate} disabled={isLoading}>
                    {isLoading ? '저장 중...' : '저장'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 계정 탭 */}
            <TabsContent value="account">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>{lang('account.title') || '계정 보안'}</CardTitle>
                  <CardDescription>{lang('account.description') || '비밀번호 및 보안 설정을 관리합니다.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('account.passwordChange') || '비밀번호 변경'}</h3>
                    <div className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">{lang('account.currentPassword') || '현재 비밀번호'}</Label>
                        <Input 
                          id="current-password" 
                          type="password"
                          value={formData.currentPassword}
                          onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">{lang('account.newPassword') || '새 비밀번호'}</Label>
                        <Input 
                          id="new-password" 
                          type="password"
                          value={formData.newPassword}
                          onChange={(e) => handleInputChange('newPassword', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">{lang('account.confirmPassword') || '새 비밀번호 확인'}</Label>
                        <Input 
                          id="confirm-password" 
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('account.accountSecurity') || '계정 보안'}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lang('account.twoFactor.title') || '2단계 인증'}</p>
                        <p className="text-sm text-gray-500">{lang('account.twoFactor.description') || '계정 보안을 강화합니다.'}</p>
                      </div>
                      <Switch disabled />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleProfileUpdate} disabled={isLoading}>
                    {isLoading ? '저장 중...' : '저장'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 알림 탭 */}
            <TabsContent value="notifications">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>{lang('notifications.title') || '알림 설정'}</CardTitle>
                  <CardDescription>{lang('notifications.description') || '알림 기본 설정을 관리합니다.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">이메일 알림</p>
                        <p className="text-sm text-gray-500">중요한 업데이트를 이메일로 받습니다.</p>
                      </div>
                      <Switch />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">브라우저 알림</p>
                        <p className="text-sm text-gray-500">브라우저 푸시 알림을 받습니다.</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button disabled>저장</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 환경설정 탭 */}
            <TabsContent value="preferences">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>{lang('preferences.title') || '환경설정'}</CardTitle>
                  <CardDescription>{lang('preferences.description') || '언어 및 테마 설정을 관리합니다.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>언어</Label>
                      <Select defaultValue={language}>
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kor">한국어</SelectItem>
                          <SelectItem value="eng">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>테마</Label>
                      <Select defaultValue="system">
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">라이트</SelectItem>
                          <SelectItem value="dark">다크</SelectItem>
                          <SelectItem value="system">시스템 설정</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button disabled>저장</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
