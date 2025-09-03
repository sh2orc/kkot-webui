"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, UserPlus } from "lucide-react"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"

interface Role {
  id: string
  name: string
  description: string
  is_system: boolean
  permissions: string[]
}

interface Group {
  id: string
  name: string
  description: string
  isSystem: boolean
  isActive: boolean
}

export default function NewUserPage() {
  const router = useRouter()
  const { lang, language } = useTranslation('admin.users')

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "user",
    phone_number: "",
    status: "active" as "active" | "inactive" | "suspended",
    roles: ["user"] as string[],
    groups: [] as string[]
  })
  const [allRoles, setAllRoles] = useState<Role[]>([])
  const [allGroups, setAllGroups] = useState<Group[]>([])
  const [activeTab, setActiveTab] = useState("basic")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.users')
  }, [language])

  useEffect(() => {
    fetchRoles()
    fetchGroups()
  }, [])

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

  const handleSubmit = async () => {
    if (!formData.email || !formData.name || !formData.password) {
      toast.error(lang('errors.requiredFields'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create user")
      }
      
      toast.success(lang('createSuccess'))
      router.push('/admin/users')
    } catch (error: any) {
      toast.error(error.message || lang('errors.saveFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleToggle = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(roleId)
        ? prev.roles.filter(r => r !== roleId)
        : [...prev.roles, roleId]
    }))
  }

  const handleGroupToggle = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      groups: prev.groups.includes(groupId)
        ? prev.groups.filter(g => g !== groupId)
        : [...prev.groups, groupId]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{lang('createUser')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{lang('createUserDescription')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {lang('newUser')}
          </CardTitle>
          <CardDescription>
            {lang('createUserSubDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="basic">{lang('tabs.basic')}</TabsTrigger>
              <TabsTrigger value="permissions">{lang('tabs.permissions')}</TabsTrigger>
              <TabsTrigger value="groups">{lang('tabs.groups')}</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="email">{lang('fields.email')} *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={lang('placeholders.email')}
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="name">{lang('fields.name')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={lang('placeholders.name')}
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="password">{lang('fields.password')} *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={lang('placeholders.password')}
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <Label htmlFor="phone">{lang('fields.phone')}</Label>
                  <Input
                    id="phone"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder={lang('placeholders.phone')}
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
                      {lang('warnings.guestAccount')}
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <div>
                <Label>{lang('fields.roles')}</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {lang('descriptions.selectRoles')}
                </p>
                <div className="space-y-2">
                  {allRoles.map((role) => (
                    <div key={role.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={role.id}
                        checked={formData.roles.includes(role.id)}
                        onCheckedChange={() => handleRoleToggle(role.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={role.id} className="font-medium">
                          {role.name}
                        </Label>
                        {role.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <div>
                <Label>{lang('fields.groups')}</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {lang('descriptions.selectGroups')}
                </p>
                <div className="space-y-2">
                  {allGroups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={group.id}
                        checked={formData.groups.includes(group.id)}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={group.id} className="font-medium">
                          {group.name}
                          {group.isSystem && (
                            <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-1 rounded">
                              System
                            </span>
                          )}
                        </Label>
                        {group.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {group.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              {lang('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? lang('creating') : lang('createUser')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
