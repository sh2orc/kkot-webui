"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"

interface User {
  id: string
  email: string
  name: string
  role: string
  department?: string
  phone_number?: string
  status?: 'active' | 'inactive' | 'suspended'
  roles?: Role[]
  groups?: Group[]
}

interface Role {
  id: string
  name: string
  description: string
}

interface Group {
  id: string
  name: string
  description?: string
}

interface UserManagementDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: any) => void
  user: User | null
  isCreating: boolean
}

export function UserManagementDialog({
  isOpen,
  onClose,
  onSave,
  user,
  isCreating
}: UserManagementDialogProps) {
  const { lang, language } = useTranslation('admin.users')
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "user",
    department: "",
    phone_number: "",
    status: "active" as "active" | "inactive" | "suspended",
    roles: [] as string[],
    groups: [] as string[]
  })
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [activeTab, setActiveTab] = useState("basic")

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.users')
  }, [language])

  useEffect(() => {
    fetchRoles()
    fetchGroups()
  }, [])

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name,
        password: "",
        role: user.role,
        department: user.department || "",
        phone_number: user.phone_number || "",
        status: user.status || "active",
        roles: user.roles?.map(r => r.id) || [user.role],
        groups: user.groups?.map(g => g.id) || []
      })
      // Fetch user's groups
      if (user.id) {
        fetchUserGroups(user.id)
      }
    } else {
      setFormData({
        email: "",
        name: "",
        password: "",
        role: "user",
        department: "",
        phone_number: "",
        status: "active",
        roles: ["user"],
        groups: ["default"]
      })
    }
  }, [user])

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/users/roles")
      if (response.ok) {
        const data = await response.json()
        setAllRoles(data)
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error)
    }
  }

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups")
      if (response.ok) {
        const data = await response.json()
        setAllGroups(data)
      }
    } catch (error) {
      console.error("Failed to fetch groups:", error)
    }
  }

  const fetchUserGroups = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/groups`)
      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({
          ...prev,
          groups: data.map((g: Group) => g.id)
        }))
      }
    } catch (error) {
      console.error("Failed to fetch user groups:", error)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const dataToSave: any = {
      email: formData.email,
      name: formData.name,
      role: formData.role,
      department: formData.department,
      phone_number: formData.phone_number,
      status: formData.status,
      roles: formData.roles,
      groups: formData.groups
    }

    // Only include password if it's set (for creation or password change)
    if (formData.password) {
      dataToSave.password = formData.password
    } else if (isCreating) {
      // Password is required for new users
      alert(lang('errors.passwordRequired'))
      return
    }

    onSave(dataToSave)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? lang('createUser') : lang('editUser')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">{lang('tabs.basicInfo')}</TabsTrigger>
              <TabsTrigger value="permissions">{lang('tabs.permissions')}</TabsTrigger>
              <TabsTrigger value="groups">{lang('tabs.groups') || "Groups"}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid gap-4 grid-cols-2">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="name">{lang('fields.name')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="email">{lang('fields.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="password">
                    {isCreating ? lang('fields.password') : lang('fields.newPassword')}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={isCreating ? "" : lang('passwordPlaceholder')}
                    required={isCreating}
                  />
                  {!isCreating && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{lang('passwordHint')}</p>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="department">{lang('fields.department')}</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder={lang('placeholders.department')}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="phone">{lang('fields.phoneNumber')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder={lang('placeholders.phoneNumber')}
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="status">{lang('fields.status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive' | 'suspended') => 
                      setFormData({ ...formData, status: value })
                    }
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
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="role">{lang('fields.role')}</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{lang('roles.admin')}</SelectItem>
                      <SelectItem value="user">{lang('roles.user')}</SelectItem>
                      <SelectItem value="guest">{lang('roles.guest')}</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.role === 'guest' && (
                    <p className="text-xs text-red-500 mt-1">
                      게스트 계정은 로그인할 수 없습니다.
                    </p>
                  )}
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
                        id={`role-${role.id}`}
                        checked={formData.roles.includes(role.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, roles: [...formData.roles, role.id] })
                          } else {
                            setFormData({ ...formData, roles: formData.roles.filter(r => r !== role.id) })
                          }
                        }}
                      />
                      <Label htmlFor={`role-${role.id}`} className="font-normal">
                        <span className="font-medium">{role.name}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{role.description}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="groups" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">{lang('tabs.groupsDescription') || "Select groups for this user"}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {lang('tabs.groupsHint') || "Resource access permissions are determined by group membership"}
                  </p>
                </div>
                <div className="space-y-2">
                  {allGroups.map((group) => (
                    <div key={group.id} className="flex items-start space-x-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={formData.groups.includes(group.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, groups: [...formData.groups, group.id] })
                          } else {
                            setFormData({ ...formData, groups: formData.groups.filter(g => g !== group.id) })
                          }
                        }}
                      />
                      <Label htmlFor={`group-${group.id}`} className="font-normal">
                        <span className="font-medium">{group.name}</span>
                        {group.description && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">{group.description}</span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {lang('cancel')}
            </Button>
            <Button type="submit">
              {isCreating ? lang('create') : lang('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
