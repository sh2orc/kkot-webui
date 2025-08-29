"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, UserPlus, Search, Filter, Eye, MoreHorizontal, Download, Upload, Shield } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
import { UserManagementDialog } from "./user-management-dialog"

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
  createdAt: string
  updatedAt: string
}

interface UsersPageClientProps {
  initialUsers: User[]
}

export default function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  const { lang, language } = useTranslation('admin.users')
  const router = useRouter()
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [showFilters, setShowFilters] = useState(false)

  // Preload translations when language changes
  useEffect(() => {
    import('@/lib/i18n').then(({ preloadTranslationModule }) => {
      preloadTranslationModule(language, 'admin.users')
    })
  }, [language])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/users")
      if (!response.ok) throw new Error("Failed to fetch users")
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      toast.error(lang('errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm(lang('confirmDelete'))) return

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to delete user")
      
      toast.success(lang('deleteSuccess'))
      fetchUsers()
    } catch (error) {
      toast.error(lang('errors.deleteFailed'))
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsCreating(false)
    setIsDialogOpen(true)
  }

  const handleCreateUser = () => {
    setSelectedUser(null)
    setIsCreating(true)
    setIsDialogOpen(true)
  }

  const handleSaveUser = async (userData: any) => {
    try {
      const url = isCreating ? "/api/users" : `/api/users/${selectedUser?.id}`
      const method = isCreating ? "POST" : "PUT"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(userData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save user")
      }
      
      toast.success(isCreating ? lang('createSuccess') : lang('updateSuccess'))
      setIsDialogOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || lang('errors.saveFailed'))
    }
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
      toast.error(lang('errors.noUsersSelected'))
      return
    }

    if (!confirm(lang(`confirmBulk.${action}`))) return

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
      
      toast.success(lang(`bulkSuccess.${action}`))
      setSelectedUsers([])
      fetchUsers()
    } catch (error) {
      toast.error(lang('errors.bulkActionFailed'))
    }
  }

  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = 
      (user.name?.toLowerCase().includes(searchLower) ?? false) ||
      (user.username?.toLowerCase().includes(searchLower) ?? false) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.department?.toLowerCase().includes(searchLower) ?? false)
    
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
        <h1 className="text-3xl font-bold">{lang('title')}</h1>
        <div className="flex gap-2">
          {selectedUsers.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  {lang('bulkActionsTitle')} ({selectedUsers.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{lang('bulkActionsTitle')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleBulkAction('activate')}>
                  {lang('bulkActions.activate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('deactivate')}>
                  {lang('bulkActions.deactivate')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulkAction('suspend')}>
                  {lang('bulkActions.suspend')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleBulkAction('delete')}
                  className="text-red-600"
                >
                  {lang('bulkActions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/users/permissions')}
          >
            <Shield className="h-4 w-4 mr-2" />
            {lang('permissionManagement')}
          </Button>
          <Button onClick={handleCreateUser}>
            <UserPlus className="h-4 w-4 mr-2" />
            {lang('addUser')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{lang('userList')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {lang('filters')}
            </Button>
          </div>
          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder={lang('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            {showFilters && (
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={lang('filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{lang('allStatuses')}</SelectItem>
                    <SelectItem value="active">{lang('status.active')}</SelectItem>
                    <SelectItem value="inactive">{lang('status.inactive')}</SelectItem>
                    <SelectItem value="suspended">{lang('status.suspended')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={lang('filterByRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{lang('allRoles')}</SelectItem>
                    <SelectItem value="admin">{lang('roles.admin')}</SelectItem>
                    <SelectItem value="user">{lang('roles.user')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">{lang('loading')}</div>
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
                  <TableHead>{lang('fields.name')}</TableHead>
                  <TableHead>{lang('fields.email')}</TableHead>
                  <TableHead>{lang('fields.department')}</TableHead>
                  <TableHead>{lang('fields.role')}</TableHead>
                  <TableHead>{lang('fields.status')}</TableHead>
                  <TableHead>{lang('fields.lastLogin')}</TableHead>
                  <TableHead className="text-right">{lang('actions')}</TableHead>
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
                      <div>
                        <div className="font-medium">{user.name || user.username}</div>
                        {!user.email_verified && (
                          <span className="text-xs text-yellow-600">{lang('unverified')}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {lang(`roles.${user.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status || 'active')}>
                        {lang(`status.${user.status || 'active'}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : lang('never')}
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
                            {lang('viewDetails')}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            {lang('edit')}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {lang('delete')}
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

      <UserManagementDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
        isCreating={isCreating}
      />
    </div>
  )
}
