"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Edit, Trash2, UserPlus, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/lib/i18n"
import { toast } from "sonner"
import { UserManagementDialog } from "./user-management-dialog"

interface User {
  id: string
  email: string
  name: string
  role: string
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const { lang } = useTranslation('admin.users')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
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

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{lang('title')}</h1>
        <Button onClick={handleCreateUser}>
          <UserPlus className="h-4 w-4 mr-2" />
          {lang('addUser')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{lang('userList')}</CardTitle>
          <div className="flex items-center gap-2 mt-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder={lang('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
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
                  <TableHead>{lang('fields.email')}</TableHead>
                  <TableHead>{lang('fields.role')}</TableHead>

                  <TableHead className="text-right">{lang('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {lang(`roles.${user.role}`)}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
