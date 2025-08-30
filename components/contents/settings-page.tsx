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
import { User, Bell, Shield, Settings, Upload, Moon, Sun, Monitor, Type, Zap, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import Loading from "@/components/ui/loading"
import { useTheme } from "next-themes"

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
  const { theme, setTheme, systemTheme } = useTheme()
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

  // Preferences state - initialize with current theme
  const [preferences, setPreferences] = useState({
    theme: theme || 'system',
    fontSize: 'medium',
    enterToSend: true,
    streamingResponse: true,
    showTypingIndicator: true,
    responseStyle: 'balanced',
    codeTheme: 'github'
  })

  // Load preferences from localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('userPreferences')
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences)
        setPreferences(prev => ({ ...prev, ...parsed, theme: theme || 'system' }))
        
        // Apply saved font size
        if (parsed.fontSize) {
          document.documentElement.classList.remove('font-small', 'font-medium', 'font-large')
          document.documentElement.classList.add(`font-${parsed.fontSize}`)
        }
      } catch (error) {
        console.error('Failed to parse preferences:', error)
      }
    } else {
      // If no saved preferences, sync with current theme
      setPreferences(prev => ({ ...prev, theme: theme || 'system' }))
    }
  }, [theme])

  // Save preferences to localStorage and apply theme
  const savePreferences = (newPreferences: typeof preferences) => {
    setPreferences(newPreferences)
    localStorage.setItem('userPreferences', JSON.stringify(newPreferences))
    
    // Apply theme change immediately
    if (newPreferences.theme !== preferences.theme) {
      setTheme(newPreferences.theme)
    }
    
    // Apply font size change
    if (newPreferences.fontSize !== preferences.fontSize) {
      document.documentElement.classList.remove('font-small', 'font-medium', 'font-large')
      document.documentElement.classList.add(`font-${newPreferences.fontSize}`)
    }
    
    toast.success(lang('success.preferencesUpdated') || 'Preferences updated successfully.')
  }

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
      toast.error(lang('errors.enterUsername'))
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
          toast.error(lang('errors.enterCurrentPassword'))
          setIsLoading(false)
          return
        }

        if (!formData.newPassword) {
          toast.error(lang('errors.enterNewPassword'))
          setIsLoading(false)
          return
        }

        if (formData.newPassword !== formData.confirmPassword) {
          toast.error(lang('errors.passwordMismatch'))
          setIsLoading(false)
          return
        }

        if (formData.newPassword.length < 6) {
          toast.error(lang('errors.passwordTooShort'))
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
        toast.success(lang('success.profileUpdated'))
        setUserProfile(result.user)
        // Reset password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }))
      } else {
        toast.error(result.error || lang('errors.updateFailed'))
      }
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error(lang('errors.genericError'))
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
        <p className="text-gray-500 dark:text-gray-400">{lang('errors.loadFailed')}</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">{lang('title') || 'Settings'}</h1>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-4 mb-8 rounded-lg">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.profile') || 'Profile'}</span>
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.account') || 'Account'}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.notifications') || 'Notifications'}</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.preferences') || 'Preferences'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{lang('profile.title') || 'Profile Information'}</CardTitle>
                <CardDescription>
                  {lang('profile.description') || 'Manage your profile image and basic information.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profileImage || ''} alt="Profile" />
                    <AvatarFallback className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {userProfile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label htmlFor="profile-image" className="cursor-pointer">
                      <div className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
                        <Upload className="h-4 w-4" />
                        {lang('profile.changePhoto') || 'Change Profile Photo'}
                      </div>
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {lang('profile.photoInfo') || 'Only PNG and JPG files can be uploaded.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">{lang('profile.username') || 'Username'}</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      placeholder={lang('profile.usernamePlaceholder') || 'Enter your username'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">{lang('profile.email') || 'Email'}</Label>
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
                  <Label htmlFor="role">{lang('profile.role') || 'Role'}</Label>
                  <Input
                    id="role"
                    value={userProfile.role}
                    disabled
                    className="bg-gray-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-since">{lang('profile.memberSince') || 'Member Since'}</Label>
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
                <CardTitle>{lang('account.title') || 'Account Security'}</CardTitle>
                <CardDescription>
                  {lang('account.description') || 'Manage your password and account security.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">{lang('account.currentPassword') || 'Current Password'}</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    placeholder={lang('account.currentPasswordPlaceholder') || 'Enter your current password'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">{lang('account.newPassword') || 'New Password'}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange('newPassword', e.target.value)}
                    placeholder={lang('account.newPasswordPlaceholder') || 'Enter new password'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{lang('account.confirmPassword') || 'Confirm New Password'}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder={lang('account.confirmPasswordPlaceholder') || 'Re-enter new password'}
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang('notifications.marketingDescription') || '새로운 기능과 업데이트에 대한 알림을 받습니다.'}
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{lang('notifications.security') || '보안 알림'}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang('notifications.securityDescription') || '계정 보안에 관련된 중요한 알림을 받습니다.'}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{lang('notifications.chat') || '채팅 알림'}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang('notifications.chatDescription') || '새로운 메시지와 응답에 대한 알림을 받습니다.'}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Tab */}
          <TabsContent value="preferences" className="space-y-6">
            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{lang('preferences.theme.title') || '테마 설정'}</CardTitle>
                <CardDescription>
                  {lang('preferences.theme.description') || '앱의 외관을 사용자 정의하세요.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>{lang('preferences.theme.mode') || '테마 모드'}</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div 
                      className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${preferences.theme === 'light' ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => savePreferences({ ...preferences, theme: 'light' })}
                    >
                      <Sun className="h-5 w-5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{lang('preferences.theme.light') || '라이트'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{lang('preferences.theme.lightDesc') || '밝은 테마'}</p>
                      </div>
                    </div>
                    <div 
                      className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${preferences.theme === 'dark' ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => savePreferences({ ...preferences, theme: 'dark' })}
                    >
                      <Moon className="h-5 w-5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{lang('preferences.theme.dark') || '다크'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{lang('preferences.theme.darkDesc') || '어두운 테마'}</p>
                      </div>
                    </div>
                    <div 
                      className={`flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${preferences.theme === 'system' ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => savePreferences({ ...preferences, theme: 'system' })}
                    >
                      <Monitor className="h-5 w-5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{lang('preferences.theme.system') || '시스템'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{lang('preferences.theme.systemDesc') || '시스템 설정 따르기'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="font-size">{lang('preferences.theme.fontSize') || '글꼴 크기'}</Label>
                  <Select value={preferences.fontSize} onValueChange={(value) => savePreferences({ ...preferences, fontSize: value })}>
                    <SelectTrigger id="font-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">{lang('preferences.theme.fontSmall') || '작게'}</SelectItem>
                      <SelectItem value="medium">{lang('preferences.theme.fontMedium') || '보통'}</SelectItem>
                      <SelectItem value="large">{lang('preferences.theme.fontLarge') || '크게'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Chat Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{lang('preferences.chat.title') || '채팅 설정'}</CardTitle>
                <CardDescription>
                  {lang('preferences.chat.description') || '채팅 인터페이스를 사용자 정의하세요.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{lang('preferences.chat.enterToSend') || 'Enter로 전송'}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang('preferences.chat.enterToSendDesc') || 'Enter 키를 눌러 메시지를 전송합니다.'}
                    </p>
                  </div>
                  <Switch checked={preferences.enterToSend} onCheckedChange={(checked) => savePreferences({ ...preferences, enterToSend: checked })} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{lang('preferences.chat.streamingResponse') || '실시간 응답'}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang('preferences.chat.streamingResponseDesc') || 'AI 응답을 실시간으로 표시합니다.'}
                    </p>
                  </div>
                  <Switch checked={preferences.streamingResponse} onCheckedChange={(checked) => savePreferences({ ...preferences, streamingResponse: checked })} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{lang('preferences.chat.showTypingIndicator') || '타이핑 표시'}</Label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lang('preferences.chat.showTypingIndicatorDesc') || 'AI가 응답 중일 때 애니메이션을 표시합니다.'}
                    </p>
                  </div>
                  <Switch checked={preferences.showTypingIndicator} onCheckedChange={(checked) => savePreferences({ ...preferences, showTypingIndicator: checked })} />
                </div>
              </CardContent>
            </Card>

            {/* AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{lang('preferences.ai.title') || 'AI 응답 설정'}</CardTitle>
                <CardDescription>
                  {lang('preferences.ai.description') || 'AI 응답 방식을 설정하세요.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="response-style">{lang('preferences.ai.responseStyle') || '응답 스타일'}</Label>
                  <Select value={preferences.responseStyle} onValueChange={(value) => savePreferences({ ...preferences, responseStyle: value })}>
                    <SelectTrigger id="response-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="concise">{lang('preferences.ai.concise') || '간결함'}</SelectItem>
                      <SelectItem value="balanced">{lang('preferences.ai.balanced') || '균형'}</SelectItem>
                      <SelectItem value="detailed">{lang('preferences.ai.detailed') || '상세함'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code-style">{lang('preferences.ai.codeTheme') || '코드 블록 테마'}</Label>
                  <Select value={preferences.codeTheme} onValueChange={(value) => savePreferences({ ...preferences, codeTheme: value })}>
                    <SelectTrigger id="code-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="monokai">Monokai</SelectItem>
                      <SelectItem value="dracula">Dracula</SelectItem>
                      <SelectItem value="vscode">VS Code</SelectItem>
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
            {isLoading ? lang('common.saving') || 'Saving...' : lang('common.save') || 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
