"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
import { useTimezone } from "@/components/providers/timezone-provider"
import UserDetailSkeleton from "@/components/admin/user-detail-skeleton"
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Shield, 
  Clock, 
  Activity,
  Mail,
  Phone,
  Building,
  Calendar,
  AlertCircle,
  CheckCircle
} from "lucide-react"

interface UserDetail {
  id: string
  email: string
  name: string
  role: string
  profile_image: string | null
  department: string | null
  phone_number: string | null
  status: 'active' | 'inactive' | 'suspended'
  last_login_at: string | null
  email_verified: boolean
  failed_login_attempts: number
  locked_until: string | null
  // OAuth information added
  oauth_provider?: string
  google_id?: string
  oauth_linked_at?: string
  oauth_profile_picture?: string
  created_at: string
  updated_at: string
  roles: Role[]
}

interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
}

interface ActivityLog {
  id: string
  action: string
  resourceType?: string
  resourceId?: string
  ipAddress?: string
  userAgent?: string
  createdAt: string | number
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { lang, language } = useTranslation('admin.users')
  const { formatDate, formatTime } = useTimezone()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState<Partial<UserDetail>>({})
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.users')
  }, [language])

  useEffect(() => {
    fetchUserDetail()
    fetchRoles()
    fetchPermissions()
    fetchActivityLogs()
  }, [userId])

  const fetchUserDetail = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`)
      if (!response.ok) throw new Error("Failed to fetch user")
      const data = await response.json()
      setUser(data)
      setEditedUser(data)
      setSelectedRoles(data.roles.map((r: Role) => r.id))
    } catch (error) {
      toast.error(lang('errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/users/roles")
      if (!response.ok) throw new Error("Failed to fetch roles")
      const data = await response.json()
      setAllRoles(data)
    } catch (error) {
      console.error("Failed to fetch roles:", error)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/users/permissions")
      if (!response.ok) throw new Error("Failed to fetch permissions")
      const data = await response.json()
      setAllPermissions(data)
    } catch (error) {
      console.error("Failed to fetch permissions:", error)
    }
  }

  const fetchActivityLogs = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/activities`)
      if (!response.ok) throw new Error("Failed to fetch activities")
      const data = await response.json()
      setActivities(data)
    } catch (error) {
      console.error("Failed to fetch activities:", error)
    }
  }

  const handleSave = async () => {
    try {
      const updateData = {
        ...editedUser,
        roles: selectedRoles
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) throw new Error("Failed to update user")
      
      toast.success(lang('updateSuccess'))
      setIsEditing(false)
      fetchUserDetail()
    } catch (error) {
      toast.error(lang('errors.updateFailed'))
    }
  }

  const handleResetPassword = async () => {
    if (!confirm(lang('confirmPasswordReset'))) return

    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: "POST"
      })
      if (!response.ok) throw new Error("Failed to reset password")
      
      toast.success(lang('passwordResetSuccess'))
    } catch (error) {
      toast.error(lang('errors.passwordResetFailed'))
    }
  }

  const handleUnlockAccount = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/unlock`, {
        method: "POST"
      })
      if (!response.ok) throw new Error("Failed to unlock account")
      
      toast.success(lang('accountUnlocked'))
      fetchUserDetail()
    } catch (error) {
      toast.error(lang('errors.unlockFailed'))
    }
  }

  const getUserPermissions = () => {
    const permissions = new Set<string>()
    selectedRoles.forEach(roleId => {
      const role = allRoles.find(r => r.id === roleId)
      role?.permissions.forEach(p => permissions.add(p.id))
    })
    return Array.from(permissions)
  }

  if (loading || !user) {
    return <UserDetailSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{lang('userDetail')}</h1>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false)
                setEditedUser(user)
                setSelectedRoles(user.roles.map(r => r.id))
              }}>
                <X className="h-4 w-4 mr-2" />
                {lang('cancel')}
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {lang('save')}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {lang('edit')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{lang('profile')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.oauth_profile_picture || user.profile_image || undefined} />
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            
            {user.oauth_provider && (
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  {user.oauth_provider === 'google' ? (
                    <span className="flex items-center gap-1">
                      🟡 Google
                    </span>
                  ) : (
                    user.oauth_provider
                  )}
                </Badge>
                {user.oauth_linked_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    연결: {new Date(user.oauth_linked_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label>{lang('fields.status')}</Label>
                <div className="mt-1">
                  {isEditing ? (
                    <Select
                      value={editedUser.status}
                      onValueChange={(value) => setEditedUser({...editedUser, status: value as any})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">{lang('status.active')}</SelectItem>
                        <SelectItem value="inactive">{lang('status.inactive')}</SelectItem>
                        <SelectItem value="suspended">{lang('status.suspended')}</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={
                      user.status === 'active' ? 'default' : 
                      user.status === 'suspended' ? 'destructive' : 'secondary'
                    }>
                      {lang(`status.${user.status}`)}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <Label>{lang('fields.emailVerified')}</Label>
                <div className="flex items-center gap-2 mt-1">
                  {user.email_verified ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="text-sm">
                    {user.email_verified ? lang('verified') : lang('unverified')}
                  </span>
                </div>
              </div>

              {user.locked_until && new Date(user.locked_until) > new Date() && (
                <div className="p-3 bg-red-50 rounded-md">
                  <p className="text-sm text-red-600">{lang('accountLocked')}</p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={handleUnlockAccount}
                  >
                    {lang('unlockAccount')}
                  </Button>
                </div>
              )}

              <div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleResetPassword}
                >
                  {lang('resetPassword')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <Tabs defaultValue="info">
            <CardHeader>
              <TabsList>
                <TabsTrigger value="info" className="text-sm">{lang('tabs.info')}</TabsTrigger>
                <TabsTrigger value="permissions" className="text-sm">{lang('tabs.permissions')}</TabsTrigger>
                <TabsTrigger value="activity" className="text-sm">{lang('tabs.activity')}</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="info" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">{lang('fields.name')}</Label>
                    <Input
                      id="name"
                      value={editedUser.name || ''}
                      onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">{lang('fields.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editedUser.email || ''}
                      onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">{lang('fields.department')}</Label>
                    <Input
                      id="department"
                      value={editedUser.department || ''}
                      onChange={(e) => setEditedUser({...editedUser, department: e.target.value})}
                      disabled={!isEditing}
                      placeholder={lang('placeholders.department')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">{lang('fields.phoneNumber')}</Label>
                    <Input
                      id="phone"
                      value={editedUser.phone_number || ''}
                      onChange={(e) => setEditedUser({...editedUser, phone_number: e.target.value})}
                      disabled={!isEditing}
                      placeholder={lang('placeholders.phoneNumber')}
                    />
                  </div>
                </div>

                {user.oauth_provider && (
                  <div className="space-y-2 pt-4 border-t">
                    <h4 className="font-medium text-sm mb-2">OAuth 연동 정보</h4>
                    <div className="bg-gray-50 p-3 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">제공업체</span>
                        <Badge variant="outline" className="text-xs">
                          {user.oauth_provider === 'google' ? '🟡 Google' : user.oauth_provider}
                        </Badge>
                      </div>
                      {user.google_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Google ID</span>
                          <span className="text-xs font-mono text-gray-700">{user.google_id}</span>
                        </div>
                      )}
                      {user.oauth_linked_at && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">연결일시</span>
                          <span className="text-xs text-gray-700">
                            {new Date(user.oauth_linked_at).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {lang('fields.lastLogin')}: {user.last_login_at ? (() => {
                        try {
                          let date: Date;
                          
                          if (typeof user.last_login_at === 'string') {
                            const numericValue = parseInt(user.last_login_at);
                            if (!isNaN(numericValue) && user.last_login_at === numericValue.toString()) {
                              // Validate timestamp range
                              if (numericValue > 1000000000000) {
                                // Millisecond timestamp (13 digits)
                                date = new Date(numericValue);
                              } else if (numericValue > 1000000000) {
                                // 초 단위 timestamp (10자리)
                                date = new Date(numericValue * 1000);
                              } else {
                                return lang('dateError') || '날짜 오류';
                              }
                            } else {
                              date = new Date(user.last_login_at);
                            }
                          } else {
                            // 숫자인 경우 timestamp 처리
                            if (user.last_login_at > 1000000000000) {
                              // 밀리초 단위 timestamp (13자리)
                              date = new Date(user.last_login_at);
                            } else if (user.last_login_at > 1000000000) {
                              // 초 단위 timestamp (10자리)
                              date = new Date(user.last_login_at * 1000);
                            } else {
                              return lang('dateError') || '날짜 오류';
                            }
                          }
                          
                          if (isNaN(date.getTime())) {
                            return lang('dateError') || '날짜 오류';
                          }
                          return formatDate(date, 'ko-KR', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch (error) {
                          return lang('dateError') || '날짜 오류';
                        }
                      })() : lang('never')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {lang('fields.createdAt')}: {(() => {
                        try {
                          let date: Date;
                          
                          if (typeof user.created_at === 'string') {
                            const numericValue = parseInt(user.created_at);
                            if (!isNaN(numericValue) && user.created_at === numericValue.toString()) {
                              // Validate timestamp range
                              if (numericValue > 1000000000000) {
                                // Millisecond timestamp (13 digits)
                                date = new Date(numericValue);
                              } else if (numericValue > 1000000000) {
                                // 초 단위 timestamp (10자리)
                                date = new Date(numericValue * 1000);
                              } else {
                                return lang('dateError') || '날짜 오류';
                              }
                            } else {
                              date = new Date(user.created_at);
                            }
                          } else {
                            // 숫자인 경우 timestamp 처리
                            if (user.created_at > 1000000000000) {
                              // 밀리초 단위 timestamp (13자리)
                              date = new Date(user.created_at);
                            } else if (user.created_at > 1000000000) {
                              // 초 단위 timestamp (10자리)
                              date = new Date(user.created_at * 1000);
                            } else {
                              return lang('dateError') || '날짜 오류';
                            }
                          }
                          
                          if (isNaN(date.getTime())) {
                            return lang('dateError') || '날짜 오류';
                          }
                          return formatDate(date, 'ko-KR', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          });
                        } catch (error) {
                          return lang('dateError') || '날짜 오류';
                        }
                      })()}
                    </span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="space-y-4">
                <div>
                  <Label>{lang('fields.roles')}</Label>
                  <div className="space-y-2 mt-2">
                    {allRoles.map((role) => (
                      <div key={role.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={role.id}
                          checked={selectedRoles.includes(role.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRoles([...selectedRoles, role.id])
                            } else {
                              setSelectedRoles(selectedRoles.filter(r => r !== role.id))
                            }
                          }}
                          disabled={!isEditing}
                        />
                        <Label htmlFor={role.id} className="font-normal">
                          <span className="font-medium">{role.name}</span>
                          <span className="text-sm text-gray-500 ml-2">{role.description}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label>{lang('effectivePermissions')}</Label>
                  <div className="mt-2 space-y-4">
                    {Object.entries(
                      allPermissions
                        .filter(p => getUserPermissions().includes(p.id))
                        .reduce((acc, perm) => {
                          if (!acc[perm.category]) acc[perm.category] = []
                          acc[perm.category].push(perm)
                          return acc
                        }, {} as Record<string, Permission[]>)
                    ).map(([category, perms]) => (
                      <div key={category}>
                        <h4 className="font-medium text-sm mb-2 capitalize">{category}</h4>
                        <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                          {perms.map((perm) => (
                            <div key={perm.id} className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{perm.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="activity">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang('activity.action')}</TableHead>
                      <TableHead>{lang('activity.resource')}</TableHead>
                      <TableHead>{lang('activity.ipAddress')}</TableHead>
                      <TableHead>{lang('activity.timestamp')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.length > 0 ? activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.action}</TableCell>
                        <TableCell>
                          {activity.resourceType && (
                            <span className="text-sm text-gray-600">
                              {activity.resourceType}
                              {activity.resourceId && ` #${activity.resourceId}`}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{activity.ipAddress || '-'}</TableCell>
                        <TableCell className="text-sm">
                          {(() => {
                            try {
                              let date: Date;
                              
                              if (typeof activity.createdAt === 'number') {
                                // Validate timestamp range
                                if (activity.createdAt > 1000000000000) {
                                  // Millisecond timestamp (13 digits)
                                  date = new Date(activity.createdAt);
                                } else if (activity.createdAt > 1000000000) {
                                  // 초 단위 timestamp (10자리)
                                  date = new Date(activity.createdAt * 1000);
                                } else {
                                  return lang('dateError') || '날짜 오류';
                                }
                              } else {
                                const numericValue = parseInt(activity.createdAt);
                                if (!isNaN(numericValue) && activity.createdAt === numericValue.toString()) {
                                  // Validate timestamp range
                                  if (numericValue > 1000000000000) {
                                    // Millisecond timestamp (13 digits)
                                    date = new Date(numericValue);
                                  } else if (numericValue > 1000000000) {
                                    // 초 단위 timestamp (10자리)
                                    date = new Date(numericValue * 1000);
                                  } else {
                                    return lang('dateError') || '날짜 오류';
                                  }
                                } else {
                                  date = new Date(activity.createdAt);
                                }
                              }
                              
                              if (isNaN(date.getTime())) {
                                return lang('dateError') || '날짜 오류';
                              }
                              
                              return formatDate(date, 'ko-KR', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            } catch (error) {
                              return lang('dateError') || '날짜 오류';
                            }
                          })()}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500">
                          {lang('noActivityLogs') || '활동 로그가 없습니다.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
