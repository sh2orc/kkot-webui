"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
import { UserMinus, UserPlus, Users, Loader2 } from "lucide-react"

interface Group {
  id: string
  name: string
}

interface User {
  id: string
  username: string
  email: string
  role: string
  assignedAt?: string
}

interface GroupUsersDialogProps {
  isOpen: boolean
  onClose: () => void
  group: Group
  onUpdate: () => void
}

export function GroupUsersDialog({ isOpen, onClose, group, onUpdate }: GroupUsersDialogProps) {
  const { lang, language } = useTranslation('admin.groups')
  const [loading, setLoading] = useState(true)
  const [groupUsers, setGroupUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [adding, setAdding] = useState(false)

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.groups')
  }, [language])

  useEffect(() => {
    if (isOpen) {
      fetchGroupUsers()
      fetchAllUsers()
    }
  }, [isOpen, group.id])

  const fetchGroupUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/groups/${group.id}/users`)
      if (response.ok) {
        const data = await response.json()
        setGroupUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch group users:', error)
      toast.error(lang('errors.fetchUsersFailed'))
    } finally {
      setLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data)
      }
    } catch (error) {
      console.error('Failed to fetch all users:', error)
    }
  }

  const availableUsers = allUsers.filter(
    user => !groupUsers.some(gu => gu.id === user.id)
  )

  const handleAddUser = async () => {
    if (!selectedUserId) return

    setAdding(true)
    try {
      const response = await fetch(`/api/groups/${group.id}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: selectedUserId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add user')
      }
      
      toast.success(lang('addUserSuccess'))
      setSelectedUserId("")
      fetchGroupUsers()
      onUpdate()
    } catch (error: any) {
      toast.error(error.message || lang('errors.addUserFailed'))
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm(lang('confirmRemoveUser'))) return

    try {
      const response = await fetch(`/api/groups/${group.id}/users?userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove user')
      
      toast.success(lang('removeUserSuccess'))
      fetchGroupUsers()
      onUpdate()
    } catch (error) {
      toast.error(lang('errors.removeUserFailed'))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {lang('usersDialog.title')}: {group.name}
          </DialogTitle>
          <DialogDescription>
            {lang('usersDialog.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Add user section */}
          <div className="flex gap-2">
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={availableUsers.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={lang('selectUser')} />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddUser} 
              disabled={!selectedUserId || adding}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span className="ml-2">{lang('addUser')}</span>
            </Button>
          </div>

          {/* Users list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{lang('fields.username')}</TableHead>
                    <TableHead>{lang('fields.email')}</TableHead>
                    <TableHead>{lang('fields.role')}</TableHead>
                    <TableHead>{lang('fields.assignedAt')}</TableHead>
                    <TableHead className="text-right">{lang('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        {lang('noUsers')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    groupUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.assignedAt ? new Date(user.assignedAt).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUser(user.id)}
                            title={lang('removeUser')}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {lang('dialog.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
