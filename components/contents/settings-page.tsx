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
import Layout from "@/components/layout/layout"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"

export default function SettingsPage() {
  const { lang, language } = useTranslation('settings')
  const [isLoaded, setIsLoaded] = useState(false)
  const [profileImage, setProfileImage] = useState<string | null>(null)

  // 번역 모듈 프리로드
  useEffect(() => {
    async function loadTranslations() {
      await preloadTranslationModule(language, 'settings')
      setIsLoaded(true)
    }
    loadTranslations()
  }, [language])

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

  if (!isLoaded) {
    return (
      <Layout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">{lang('title')}</h1>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid grid-cols-4 mb-8 rounded-lg">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{lang('tabs.profile')}</span>
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">{lang('tabs.account')}</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">{lang('tabs.notifications')}</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{lang('tabs.preferences')}</span>
              </TabsTrigger>
            </TabsList>

            {/* 프로필 탭 */}
            <TabsContent value="profile">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>{lang('profile.title')}</CardTitle>
                  <CardDescription>{lang('profile.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-4 p-2 mr-2">
                      <Avatar className="h-12 w-12">
                        {profileImage ? (
                          <AvatarImage src={profileImage || "/placeholder.svg"} alt={lang('altTexts.profileImage')} />
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
                          {lang('profile.uploadImage')}
                        </Label>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4 w-full max-w-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">{lang('profile.name')}</Label>
                          <Input id="name" placeholder={lang('placeholders.name')} defaultValue={lang('placeholders.defaultName')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">{lang('profile.username')}</Label>
                          <Input id="username" placeholder={lang('placeholders.username')} defaultValue={lang('placeholders.defaultUsername')} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">{lang('profile.email')}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder={lang('placeholders.email')}
                          defaultValue={lang('placeholders.defaultEmail')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">{lang('profile.bio')}</Label>
                        <Input id="bio" placeholder={lang('profile.bioPlaceholder')} />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>{lang('profile.saveButton')}</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 계정 탭 */}
            <TabsContent value="account">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>{lang('account.title')}</CardTitle>
                  <CardDescription>{lang('account.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('account.passwordChange')}</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">{lang('account.currentPassword')}</Label>
                        <Input id="current-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">{lang('account.newPassword')}</Label>
                        <Input id="new-password" type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">{lang('account.confirmPassword')}</Label>
                        <Input id="confirm-password" type="password" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('account.accountSecurity')}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lang('account.twoFactor.title')}</p>
                        <p className="text-sm text-gray-500">{lang('account.twoFactor.description')}</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>{lang('account.saveButton')}</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 알림 탭 */}
            <TabsContent value="notifications">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>{lang('notifications.title')}</CardTitle>
                  <CardDescription>{lang('notifications.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('notifications.emailNotifications')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{lang('notifications.newMessage.title')}</p>
                          <p className="text-sm text-gray-500">{lang('notifications.newMessage.description')}</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{lang('notifications.systemUpdates.title')}</p>
                          <p className="text-sm text-gray-500">{lang('notifications.systemUpdates.description')}</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{lang('notifications.marketing.title')}</p>
                          <p className="text-sm text-gray-500">{lang('notifications.marketing.description')}</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('notifications.pushNotifications')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{lang('notifications.chatNotifications.title')}</p>
                          <p className="text-sm text-gray-500">{lang('notifications.chatNotifications.description')}</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>{lang('notifications.saveButton')}</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* 환경설정 탭 */}
            <TabsContent value="preferences">
              <Card className="border-0">
                <CardHeader>
                  <CardTitle>{lang('preferences.title')}</CardTitle>
                  <CardDescription>{lang('preferences.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('preferences.appearance')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{lang('preferences.theme.title')}</p>
                        </div>
                        <Select defaultValue="system">
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">{lang('preferences.theme.light')}</SelectItem>
                            <SelectItem value="dark">{lang('preferences.theme.dark')}</SelectItem>
                            <SelectItem value="system">{lang('preferences.theme.system')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('preferences.language.title')}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lang('preferences.language.title')}</p>
                        <p className="text-sm text-gray-500">{lang('preferences.language.description')}</p>
                      </div>
                      <Select defaultValue="ko">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ko">한국어</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">{lang('preferences.accessibility')}</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{lang('preferences.fontSize.title')}</p>
                      </div>
                      <Select defaultValue="medium">
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">{lang('preferences.fontSize.small')}</SelectItem>
                          <SelectItem value="medium">{lang('preferences.fontSize.medium')}</SelectItem>
                          <SelectItem value="large">{lang('preferences.fontSize.large')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button>{lang('preferences.saveButton')}</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  )
}
