"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, UserMinus, UserPlus, Users, Loader2 } from "lucide-react"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"

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

export default function GroupUsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { lang, language } = useTranslation('admin.groups')
  
  const groupId = searchParams.get('id')
  
  const [group, setGroup] = useState<Group | null>(null)
  const [loading, setLoading] = useState(true)
  const [groupUsers, setGroupUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [adding, setAdding] = useState(false)
  const [optimisticUsers, setOptimisticUsers] = useState<string[]>([])

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.groups')
  }, [language])

  useEffect(() => {
    if (groupId) {
      fetchGroup()
      fetchGroupUsers()
      fetchAllUsers()
    } else {
      router.push('/admin/groups')
    }
  }, [groupId])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}`)
      if (!response.ok) throw new Error("Failed to fetch group")
      const data = await response.json()
      setGroup(data)
    } catch (error) {
      toast.error(lang('errors.fetchFailed'))
      router.push('/admin/groups')
    }
  }

  const fetchGroupUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/groups/${groupId}/users`)
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
    user => !groupUsers.some(gu => gu.id === user.id) && !optimisticUsers.includes(user.id)
  )

  const handleAddUser = async () => {
    if (!selectedUserId) return

    const currentUserId = selectedUserId
    setAdding(true)
    setOptimisticUsers(prev => [...prev, currentUserId])
    
    try {
      const response = await fetch(`/api/groups/${groupId}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: currentUserId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add user')
      }
      
      // Get the added user data from allUsers
      const addedUser = allUsers.find(user => user.id === currentUserId)
      if (addedUser) {
        // Add user to groupUsers with current timestamp
        const newGroupUser = {
          ...addedUser,
          assignedAt: new Date().toISOString()
        }
        setGroupUsers(prev => [...prev, newGroupUser])
      }
      
      toast.success(lang('addUserSuccess'))
      setSelectedUserId("")
    } catch (error: any) {
      // Remove from optimistic users on error
      setOptimisticUsers(prev => prev.filter(id => id !== currentUserId))
      toast.error(error.message || lang('errors.addUserFailed'))
    } finally {
      // Remove from optimistic users on success
      setOptimisticUsers(prev => prev.filter(id => id !== currentUserId))
      setAdding(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!confirm(lang('confirmRemoveUser'))) return

    try {
      const response = await fetch(`/api/groups/${groupId}/users?userId=${userId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove user')
      
      // Remove user from groupUsers state
      setGroupUsers(prev => prev.filter(user => user.id !== userId))
      
      toast.success(lang('removeUserSuccess'))
    } catch (error) {
      toast.error(lang('errors.removeUserFailed'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/admin/groups')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </div>

        {/* Add user card skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-6 w-32" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-20" />
            </div>
          </CardContent>
        </Card>

        {/* Current members card skeleton */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-36" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* Table header skeleton */}
              <div className="border-b pb-2">
                <div className="grid grid-cols-5 gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
              </div>
              {/* Table rows skeleton */}
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="grid grid-cols-5 gap-4 py-3 border-b">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-8 ml-auto rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/groups')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{lang('manageGroupUsers')}</h1>
            <p className="text-muted-foreground mt-1">
              {group?.name} {lang('groupUserManagementDesc')}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {lang('addNewMember')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={availableUsers.length === 0}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={availableUsers.length === 0 ? lang('noAvailableUsers') : lang('selectUserToAdd')} />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{user.username}</span>
                      <span className="text-sm text-muted-foreground ml-2">{user.email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleAddUser} 
              disabled={!selectedUserId || adding}
              variant="default"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              <span className="ml-2">{lang('add')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {lang('currentMembers')}
            </span>
            <Badge variant="secondary" className="ml-2">
              {groupUsers.length} {lang('members')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
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
        </CardContent>
      </Card>

      {/* Back button is already at the top, no need for another one at the bottom */}
    </div>
  )
}
