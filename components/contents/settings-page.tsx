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
    return <Loading className="flex-1" fullScreen={false} />
  }

  if (!userProfile) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Unable to load user information.</p>
      </div>
    )
  }

  return (
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
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.language') || '언어'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{lang('profile.title') || '프로필 정보'}</CardTitle>
                <CardDescription>
                  {lang('profile.description') || '프로필 이미지와 기본 정보를 관리합니다.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileImage || ''} alt="Profile" />
                    <AvatarFallback className="bg-gray-100 text-gray-600">
                      {userProfile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="profile-image" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                        <Upload className="h-4 w-4" />
                        {lang('profile.changePhoto') || '프로필 사진 변경'}
                      </div>
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      {lang('profile.photoInfo') || 'PNG, JPG 파일만 업로드 가능합니다.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{lang('profile.username') || '사용자명'}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder={lang('profile.usernamePlaceholder') || '사용자명을 입력하세요'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{lang('profile.email') || '이메일'}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userProfile.email}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">{lang('profile.role') || '역할'}</Label>
                  <Input
                    id="role"
                    value={userProfile.role}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-since">{lang('profile.memberSince') || '가입일'}</Label>
                  <Input
                    id="member-since"
                    value={new Date(userProfile.createdAt).toLocaleDateString()}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{lang('account.title') || '계정 보안'}</CardTitle>
                <CardDescription>
                  {lang('account.description') || '비밀번호와 계정 보안을 관리합니다.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{lang('account.currentPassword') || '현재 비밀번호'}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder={lang('account.currentPasswordPlaceholder') || '현재 비밀번호를 입력하세요'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{lang('account.newPassword') || '새 비밀번호'}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder={lang('account.newPasswordPlaceholder') || '새 비밀번호를 입력하세요'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{lang('account.confirmPassword') || '새 비밀번호 확인'}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder={lang('account.confirmPasswordPlaceholder') || '새 비밀번호를 다시 입력하세요'}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{lang('notifications.title') || '알림 설정'}</CardTitle>
                <CardDescription>
                  {lang('notifications.description') || '받고 싶은 알림 유형을 선택하세요.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{lang('notifications.marketing') || '마케팅 알림'}</Label>
                    <p className="text-sm text-gray-500">
                      {lang('notifications.marketingDescription') || '새로운 기능과 업데이트에 대한 알림을 받습니다.'}
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{lang('notifications.security') || '보안 알림'}</Label>
                    <p className="text-sm text-gray-500">
                      {lang('notifications.securityDescription') || '계정 보안에 관련된 중요한 알림을 받습니다.'}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{lang('notifications.chat') || '채팅 알림'}</Label>
                    <p className="text-sm text-gray-500">
                      {lang('notifications.chatDescription') || '새로운 메시지와 응답에 대한 알림을 받습니다.'}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Language Tab */}
          <TabsContent value="language" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{lang('language.title') || '언어 설정'}</CardTitle>
                <CardDescription>
                  {lang('language.description') || '인터페이스에서 사용할 언어를 선택하세요.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="language-select">{lang('language.interface') || '인터페이스 언어'}</Label>
                  <Select defaultValue="ko">
                    <SelectTrigger id="language-select">
                      <SelectValue placeholder={lang('language.selectLanguage') || '언어를 선택하세요'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleProfileUpdate}
            disabled={isLoading}
            className="min-w-24"
          >
            {isLoading ? lang('common.saving') || '저장 중...' : lang('common.save') || '저장'}
          </Button>
        </div>
      </div>
    </div>
  )
}
