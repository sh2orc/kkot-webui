"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, UserPlus, Search, Shield, Users, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
// Removed dialog imports - now using separate pages

interface Group {
  id: string
  name: string
  description?: string
  isSystem: boolean
  isActive: boolean
  userCount?: number
  createdAt: string
  updatedAt: string
}

export default function GroupsPage() {
  const router = useRouter()
  const { lang, language } = useTranslation('admin.groups')
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.groups')
  }, [language])

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups")
      if (!response.ok) throw new Error("Failed to fetch groups")
      const data = await response.json()
      setGroups(data)
    } catch (error) {
      toast.error(lang('errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm(lang('confirmDelete'))) return

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE"
      })
      if (!response.ok) throw new Error("Failed to delete group")
      
      toast.success(lang('deleteSuccess'))
      fetchGroups()
    } catch (error) {
      toast.error(lang('errors.deleteFailed'))
    }
  }

  const handleEditGroup = (group: Group) => {
    router.push(`/admin/groups/manage?id=${group.id}`)
  }

  const handleCreateGroup = () => {
    router.push('/admin/groups/manage')
  }

  const handleManagePermissions = (group: Group) => {
    router.push(`/admin/groups/permissions?id=${group.id}`)
  }

  const handleManageUsers = (group: Group) => {
    router.push(`/admin/groups/users?id=${group.id}`)
  }

  const handleToggleActive = async (groupId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ isActive })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update group status")
      }
      
      toast.success(lang('statusUpdateSuccess'))
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message || lang('errors.statusUpdateFailed'))
    }
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{lang('title')}</h1>
        <Button onClick={handleCreateGroup}>
          <UserPlus className="h-4 w-4 mr-2" />
          {lang('addGroup')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{lang('groupList')}</CardTitle>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder={lang('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80"
              />
            </div>
          </div>
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
                  <TableHead>{lang('fields.userCount')}</TableHead>
                  <TableHead>{lang('fields.status')}</TableHead>
                  <TableHead>{lang('fields.type')}</TableHead>
                  <TableHead className="text-right">{lang('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.description || '-'}</TableCell>
                    <TableCell>{group.userCount || 0}</TableCell>
                    <TableCell>
                      <Switch
                        checked={group.isActive}
                        onCheckedChange={(checked) => handleToggleActive(group.id, checked)}
                        disabled={group.isSystem}
                        aria-label={lang('toggleStatus')}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.isSystem ? 'transparent' : 'secondary'}>
                        {group.isSystem ? lang('type.system') : lang('type.custom')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageUsers(group)}
                          title={lang('manageUsers')}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManagePermissions(group)}
                          title={lang('managePermissions')}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditGroup(group)}
                          disabled={group.isSystem}
                          title={lang('edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id)}
                          disabled={group.isSystem}
                          title={lang('delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs removed - now using separate pages */}
    </div>
  )
}
