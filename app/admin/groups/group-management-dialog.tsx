"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useTranslation, preloadTranslationModule } from "@/lib/i18n"

interface Group {
  id: string
  name: string
  description?: string
  isSystem: boolean
  isActive: boolean
}

interface GroupManagementDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  group: Group | null
  isCreating: boolean
}

export function GroupManagementDialog({ isOpen, onClose, onSave, group, isCreating }: GroupManagementDialogProps) {
  const { lang, language } = useTranslation('admin.groups')
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  // Preload translation module
  useEffect(() => {
    preloadTranslationModule(language, 'admin.groups')
  }, [language])

  useEffect(() => {
    if (group) {
      setName(group.name)
      setDescription(group.description || "")
      setIsActive(group.isActive)
    } else {
      setName("")
      setDescription("")
      setIsActive(true)
    }
    setErrors({})
  }, [group])

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    
    if (!name.trim()) {
      newErrors.name = lang('errors.nameRequired')
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    onSave({
      name: name.trim(),
      description: description.trim(),
      isActive
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isCreating ? lang('dialog.createTitle') : lang('dialog.editTitle')}
          </DialogTitle>
          <DialogDescription>
            {isCreating ? lang('dialog.createDescription') : lang('dialog.editDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{lang('fields.name')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang('fields.namePlaceholder')}
              disabled={group?.isSystem}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name}</p>
            )}
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">{lang('fields.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={lang('fields.descriptionPlaceholder')}
              rows={3}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{lang('fields.isActive')}</Label>
              <p className="text-sm text-muted-foreground">
                {lang('fields.isActiveDescription')}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={group?.isSystem}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {lang('dialog.cancel')}
          </Button>
          <Button onClick={handleSubmit}>
            {isCreating ? lang('dialog.create') : lang('dialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
