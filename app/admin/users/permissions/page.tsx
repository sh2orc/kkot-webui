"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
import { Plus, Edit, Trash2, Shield, Users } from "lucide-react"

interface Permission {
  id: string
  name: string
  description: string
  category: string
}

interface Role {
  id: string
  name: string
  description: string
  is_system: boolean
  permissions: Permission[]
}

export default function PermissionsPage() {
  const { lang, language } = useTranslation('admin.users')
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [roleFormData, setRoleFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[]
  })

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.users')
  }, [language])

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [])

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/users/roles")
      if (!response.ok) throw new Error("Failed to fetch roles")
      const data = await response.json()
      setRoles(data)
    } catch (error) {
      toast.error(lang('errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/users/permissions")
      if (!response.ok) throw new Error("Failed to fetch permissions")
      const data = await response.json()
      setPermissions(data)
    } catch (error) {
      console.error("Failed to fetch permissions:", error)
    }
  }

  const handleCreateRole = () => {
    setSelectedRole(null)
    setRoleFormData({
      name: "",
      description: "",
      permissions: []
    })
    setIsRoleDialogOpen(true)
  }

  const handleEditRole = (role: Role) => {
    setSelectedRole(role)
    setRoleFormData({
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.id)
    })
    setIsRoleDialogOpen(true)
  }

  const handleSaveRole = async () => {
    try {
      const url = selectedRole 
        ? `/api/users/roles/${selectedRole.id}`
        : "/api/users/roles"
      const method = selectedRole ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(roleFormData)
      })

      if (!response.ok) throw new Error("Failed to save role")

      toast.success(selectedRole ? lang('updateSuccess') : lang('createSuccess'))
      setIsRoleDialogOpen(false)
      fetchRoles()
    } catch (error) {
      toast.error(lang('errors.saveFailed'))
    }
  }

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm(lang('confirmDeleteRole'))) return

    try {
      const response = await fetch(`/api/users/roles/${roleId}`, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to delete role")
      
      toast.success(lang('deleteSuccess'))
      fetchRoles()
    } catch (error) {
      toast.error(lang('errors.deleteFailed'))
    }
  }

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = []
    acc[perm.category].push(perm)
    return acc
  }, {} as Record<string, Permission[]>)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{lang('permissionManagement')}</h1>
      </div>

      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">{lang('rolesManagement.title')}</TabsTrigger>
          <TabsTrigger value="permissions">{lang('permissions.title')}</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{lang('rolesManagement.list')}</CardTitle>
              <Button onClick={handleCreateRole}>
                <Plus className="h-4 w-4 mr-2" />
                {lang('rolesManagement.create')}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">{lang('loading')}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{lang('fields.name')}</TableHead>
                      <TableHead>{lang('fields.description')}</TableHead>
                      <TableHead>{lang('permissions.count')}</TableHead>
                      <TableHead>{lang('fields.type')}</TableHead>
                      <TableHead className="text-right">{lang('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {role.permissions.length} {lang('permissions.permissions')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {role.is_system ? (
                            <Badge>{lang('system')}</Badge>
                          ) : (
                            <Badge variant="outline">{lang('custom')}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditRole(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!role.is_system && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRole(role.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{lang('permissions.list')}</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="mb-6">
                  <h3 className="font-semibold text-lg mb-3 capitalize flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    {category}
                  </h3>
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {perms.map((perm) => (
                      <div key={perm.id} className="p-3 border rounded-lg">
                        <div className="font-medium">{perm.name}</div>
                        <div className="text-sm text-gray-600">{perm.description}</div>
                        <div className="text-xs text-gray-400 mt-1">ID: {perm.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? lang('roles.edit') : lang('roles.create')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="role-name">{lang('fields.name')}</Label>
              <Input
                id="role-name"
                value={roleFormData.name}
                onChange={(e) => setRoleFormData({...roleFormData, name: e.target.value})}
                disabled={selectedRole?.is_system}
              />
            </div>

            <div>
              <Label htmlFor="role-description">{lang('fields.description')}</Label>
              <Input
                id="role-description"
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({...roleFormData, description: e.target.value})}
              />
            </div>

            <div>
              <Label>{lang('permissions.select')}</Label>
              <div className="space-y-4 mt-2 max-h-96 overflow-y-auto">
                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                  <div key={category}>
                    <h4 className="font-medium mb-2 capitalize">{category}</h4>
                    <div className="space-y-2">
                      {perms.map((perm) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={perm.id}
                            checked={roleFormData.permissions.includes(perm.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRoleFormData({
                                  ...roleFormData,
                                  permissions: [...roleFormData.permissions, perm.id]
                                })
                              } else {
                                setRoleFormData({
                                  ...roleFormData,
                                  permissions: roleFormData.permissions.filter(p => p !== perm.id)
                                })
                              }
                            }}
                          />
                          <Label htmlFor={perm.id} className="font-normal">
                            {perm.name}
                            <span className="text-sm text-gray-500 ml-2">{perm.description}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              {lang('cancel')}
            </Button>
            <Button onClick={handleSaveRole}>
              {lang('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
