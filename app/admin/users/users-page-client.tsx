"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, UserPlus, Search, Filter, Eye, MoreHorizontal, Download, Upload, Shield, ExternalLink } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
import { useTimezone } from "@/components/providers/timezone-provider"


interface User {
  id: string
  email: string
  name: string
  username: string
  role: string
  department?: string
  status?: 'active' | 'inactive' | 'suspended'
  email_verified: boolean
  last_login_at?: string
  // OAuth information added
  oauth_provider?: string
  google_id?: string
  oauth_linked_at?: string
  oauth_profile_picture?: string
  createdAt: string
  updatedAt: string
}

interface UsersPageClientProps {
  initialUsers: User[]
  allTranslations?: Record<string, any>
  emailVerificationEnabled?: boolean
  initialLanguage?: string
}

export default function UsersPageClient({ 
  initialUsers, 
  allTranslations, 
  emailVerificationEnabled = false,
  initialLanguage = 'kor'
}: UsersPageClientProps) {
  // Create initial translation function that works immediately with SSR data
  const getInitialTranslation = (key: string): string => {
    if (allTranslations && allTranslations[initialLanguage]) {
      const keys = key.split('.')
      let result = allTranslations[initialLanguage]
      
      for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
          result = result[k]
        } else {
          return key // Return original key if key doesn't exist
        }
      }
      
      return typeof result === 'string' ? result : key
    }
    return key
  }

  const { lang, language } = useTranslation('admin.users')
  const router = useRouter()
  const { formatDate, formatTime } = useTimezone()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)
  const [isTranslationReady, setIsTranslationReady] = useState(false)

  // Cache all translations when component mounts
  useEffect(() => {
    if (allTranslations) {
      import('@/lib/i18n').then(({ cacheAllLanguageTranslations }) => {
        cacheAllLanguageTranslations('admin.users', allTranslations)
        setIsTranslationReady(true)
      })
    } else {
      setIsTranslationReady(true)
    }
  }, [allTranslations])

  // Use hybrid translation function - SSR first, then CSR
  const t = (key: string): string => {
    if (isTranslationReady) {
      return lang(key) // Use CSR translation when ready
    }
    return getInitialTranslation(key) // Use SSR translation initially
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users")
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      toast.error(t('errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(t('confirmDelete'))) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to delete user")
      
      // Update local state instead of refetching
      setUsers(prev => prev.filter(user => user.id !== userId))
      toast.success(t('deleteSuccess'))
    } catch (error) {
      toast.error(t('errors.deleteFailed'))
    }
  }

  const handleEditUser = (user: User) => {
    router.push(`/admin/users/${user.id}`)
  }

  const handleCreateUser = () => {
    router.push('/admin/users/new')
  }



  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user.id))
    } else {
      setSelectedUsers([])
    }
  }

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId])
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) {
      toast.error(t('errors.noUsersSelected'))
      return
    }

    if (!confirm(t(`confirmBulk.${action}`))) return

    try {
      const response = await fetch("/api/users/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userIds: selectedUsers,
          action
        })
      })

      if (!response.ok) throw new Error("Failed to perform bulk action")
      
      toast.success(t(`bulkSuccess.${action}`))
      setSelectedUsers([])
      fetchUsers()
    } catch (error) {
      toast.error(t('errors.bulkActionFailed'))
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    // Optimistic update - immediate UI update
    const previousUsers = [...users]
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      )
    )

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) throw new Error('Failed to update role')
      
      toast.success(t('roleChangeSuccess'))
    } catch (error) {
      // Rollback on failure
      setUsers(previousUsers)
      toast.error(t('roleChangeFailed'))
    }
  }

  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      (user.name?.toLowerCase().includes(searchLower) ?? false) ||
      (user.username?.toLowerCase().includes(searchLower) ?? false) ||
      user.email.toLowerCase().includes(searchLower)
    
    // Status filter
    const matchesStatus = statusFilter === "all" || (user.status || 'active') === statusFilter
    
    // Role filter
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    
    return matchesSearch && matchesStatus && matchesRole
  })

  const getStatusBadgeVariant = (status: string | undefined) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'inactive':
        return 'secondary'
      case 'suspended':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          {selectedUsers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  {t('bulkActionsTitle')} ({selectedUsers.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{t('bulkActionsTitle')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                  {t('bulkActions.activate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                  {t('bulkActions.deactivate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('suspend')}>
                  {t('bulkActions.suspend')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600"
                >
                  {t('bulkActions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/users/permissions')}
          >
            <Shield className="h-4 w-4 mr-2" />
            {t('permissionManagement')}
          </Button>
          <Button onClick={handleCreateUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('addUser')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('userList')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {t('filters')}
            </Button>
          </div>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            {showFilters && (
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatuses')}</SelectItem>
                    <SelectItem value="active">{t('status.active')}</SelectItem>
                    <SelectItem value="inactive">{t('status.inactive')}</SelectItem>
                    <SelectItem value="suspended">{t('status.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('filterByRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allRoles')}</SelectItem>
                    <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                    <SelectItem value="user">{t('roles.user')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">{t('loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t('fields.name')}</TableHead>
                  <TableHead>{t('fields.email')}</TableHead>
                  <TableHead>{t('fields.role')}</TableHead>
                  <TableHead>{t('fields.status')}</TableHead>
                  <TableHead>OAuth</TableHead>
                  <TableHead>{t('fields.lastLogin')}</TableHead>
                  <TableHead className="text-right">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.oauth_profile_picture && (
                          <img 
                            src={user.oauth_profile_picture} 
                            alt="Profile" 
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        )}
                        <div>
                          <div className="text-sm">{user.name || user.username}</div>
                          {emailVerificationEnabled && !user.email_verified && (
                            <span className="text-xs text-yellow-600">{t('unverified')}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(newRole) => handleRoleChange(user.id, newRole)}
                      >
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <span className="text-sm text-gray-900">{t('roles.admin')}</span>
                          </SelectItem>
                          <SelectItem value="user">
                            <span className="text-sm text-gray-700">{t('roles.user')}</span>
                          </SelectItem>
                          <SelectItem value="guest">
                            <span className="flex items-center gap-2">
                              <span className="text-sm text-gray-600">{t('roles.guest')}</span>
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status || 'active')}>
                        {t(`status.${user.status || 'active'}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.oauth_provider ? (
                        <div className="space-y-1">
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
                            <div className="text-xs text-gray-500">
                              {t('connected')}: {(() => {
                                try {
                                  const date = new Date(user.oauth_linked_at);
                                  if (isNaN(date.getTime())) {
                                    return t('dateError');
                                  }
                                  return formatDate(date, 'ko-KR', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit' 
                                  });
                                } catch (error) {
                                  return t('dateError');
                                }
                              })()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </TableCell>
                                    <TableCell className="text-sm text-gray-600 dark:text-gray-300">
                  {user.last_login_at ? (() => {
                    try {

                      let date: Date;
                      
                      // Create Date object based on type
                      if (typeof user.last_login_at === 'string') {
                        // Can be ISO string or numeric string
                        const numericValue = parseInt(user.last_login_at);
                        if (!isNaN(numericValue) && user.last_login_at === numericValue.toString()) {
                          // Process as Unix timestamp if numeric string
                          // Validate timestamp range
                          if (numericValue > 1000000000000) {
                            // Millisecond timestamp (13 digits)
                            date = new Date(numericValue);
                          } else if (numericValue > 1000000000) {
                            // Second timestamp (10 digits)
                            date = new Date(numericValue * 1000);
                          } else {
                            console.error('Invalid timestamp range:', numericValue);
                            return t('dateError');
                          }
                        } else {
                          // Process as ISO string
                          date = new Date(user.last_login_at);
                        }
                      } else {
                        // Process as timestamp if numeric
                        if (user.last_login_at > 1000000000000) {
                          // Millisecond timestamp (13 digits)
                          date = new Date(user.last_login_at);
                        } else if (user.last_login_at > 1000000000) {
                          // Second timestamp (10 digits)
                          date = new Date(user.last_login_at * 1000);
                        } else {
                          console.error('Invalid timestamp range:', user.last_login_at);
                          return t('dateError');
                        }
                      }
                      
                      if (isNaN(date.getTime())) {
                        return t('dateError');
                      }
                      
                      // Format date based on UTC settings
                      return formatDate(date, 'ko-KR', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    } catch (error) {
                      console.error('Date parsing error:', error);
                      return t('dateError');
                    }
                  })() : t('never')}
                </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('viewDetails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {t('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>


    </div>
  )
}
