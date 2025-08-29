"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, UserPlus, Search, Shield, Users, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
import { GroupManagementDialog } from "./group-management-dialog"
import { GroupPermissionsDialog } from "./group-permissions-dialog"
import { GroupUsersDialog } from "./group-users-dialog"

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
  const { lang, language } = useTranslation('admin.groups')
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false)
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false)
  const [isUsersDialogOpen, setIsUsersDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

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
    setSelectedGroup(group)
    setIsCreating(false)
    setIsManageDialogOpen(true)
  }

  const handleCreateGroup = () => {
    setSelectedGroup(null)
    setIsCreating(true)
    setIsManageDialogOpen(true)
  }

  const handleSaveGroup = async (groupData: any) => {
    try {
      const url = isCreating ? "/api/groups" : `/api/groups/${selectedGroup?.id}`
      const method = isCreating ? "POST" : "PUT"
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(groupData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save group")
      }
      
      toast.success(isCreating ? lang('createSuccess') : lang('updateSuccess'))
      setIsManageDialogOpen(false)
      fetchGroups()
    } catch (error: any) {
      toast.error(error.message || lang('errors.saveFailed'))
    }
  }

  const handleManagePermissions = (group: Group) => {
    setSelectedGroup(group)
    setIsPermissionsDialogOpen(true)
  }

  const handleManageUsers = (group: Group) => {
    setSelectedGroup(group)
    setIsUsersDialogOpen(true)
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
                className="max-w-sm"
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
                      <Badge variant={group.isActive ? 'default' : 'secondary'}>
                        {group.isActive ? lang('status.active') : lang('status.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={group.isSystem ? 'outline' : 'secondary'}>
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

      {isManageDialogOpen && (
        <GroupManagementDialog
          isOpen={isManageDialogOpen}
          onClose={() => setIsManageDialogOpen(false)}
          onSave={handleSaveGroup}
          group={selectedGroup}
          isCreating={isCreating}
        />
      )}

      {isPermissionsDialogOpen && selectedGroup && (
        <GroupPermissionsDialog
          isOpen={isPermissionsDialogOpen}
          onClose={() => setIsPermissionsDialogOpen(false)}
          group={selectedGroup}
          onUpdate={fetchGroups}
        />
      )}

      {isUsersDialogOpen && selectedGroup && (
        <GroupUsersDialog
          isOpen={isUsersDialogOpen}
          onClose={() => setIsUsersDialogOpen(false)}
          group={selectedGroup}
          onUpdate={fetchGroups}
        />
      )}
    </div>
  )
}
