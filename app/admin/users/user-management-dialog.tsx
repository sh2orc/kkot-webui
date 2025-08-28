"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useTranslation } from "@/lib/i18n"

interface User {
  id: string
  email: string
  name: string
  role: string
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
  const { lang } = useTranslation('admin.users')
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: "user"
  })

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        name: user.name,
        password: "",
        role: user.role
      })
    } else {
      setFormData({
        email: "",
        name: "",
        password: "",
        role: "user"
      })
    }
  }, [user])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const dataToSave: any = {
      email: formData.email,
      name: formData.name,
      role: formData.role
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? lang('createUser') : lang('editUser')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{lang('fields.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="email">{lang('fields.email')}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
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
                <p className="text-sm text-gray-500 mt-1">{lang('passwordHint')}</p>
              )}
            </div>

            <div>
              <Label htmlFor="role">{lang('fields.role')}</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{lang('roles.user')}</SelectItem>
                  <SelectItem value="admin">{lang('roles.admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>


          </div>

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
