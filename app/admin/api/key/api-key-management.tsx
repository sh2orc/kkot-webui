'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { useTranslation } from '@/lib/i18n'
import { Plus, Edit, Trash2, Copy, Eye, EyeOff, RefreshCw, Activity } from 'lucide-react'

// API Key Creation Schema
const apiKeySchema = z.object({
  name: z.string().min(1, 'Key name is required'),
  permissions: z.array(z.string()).min(1, 'At least one permission must be selected'),
  rateLimitTier: z.enum(['basic', 'premium', 'unlimited']),
  maxRequestsPerHour: z.number().min(1, 'Must allow at least 1 request per hour'),
  maxRequestsPerDay: z.number().min(1, 'Must allow at least 1 request per day'),
  allowedIps: z.string().optional(),
  expiresAt: z.string().optional()
})

type ApiKeyFormData = z.infer<typeof apiKeySchema>

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  permissions: string[]
  rateLimitTier: string
  maxRequestsPerHour: number
  maxRequestsPerDay: number
  allowedIps: string[] | null
  expiresAt: string | null
  lastUsedAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface NewApiKeyResponse extends ApiKey {
  key: string
}

const PERMISSION_OPTIONS = [
  { value: 'chat', label: 'Chat/Conversation' },
  { value: 'models', label: 'Model List' },
  { value: 'embeddings', label: 'Embeddings' },
  { value: 'files', label: 'File Management' },
  { value: 'admin', label: 'Admin Functions' }
]

const RATE_LIMIT_TIERS = [
  { value: 'basic', label: 'Basic (100/hour, 1000/day)' },
  { value: 'premium', label: 'Premium (1000/hour, 10000/day)' },
  { value: 'unlimited', label: 'Unlimited' }
]

export default function ApiKeyManagement() {
  const { t } = useTranslation('admin.api')
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newGeneratedKey, setNewGeneratedKey] = useState<NewApiKeyResponse | null>(null)
  const [showKeyValue, setShowKeyValue] = useState<string | null>(null)

  const form = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      name: '',
      permissions: ['chat', 'models'],
      rateLimitTier: 'basic',
      maxRequestsPerHour: 100,
      maxRequestsPerDay: 1000,
      allowedIps: '',
      expiresAt: ''
    }
  })

  // Fetch API key list
  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/api-keys')
      if (!response.ok) {
        throw new Error('Failed to fetch API keys')
      }
      const data = await response.json()
      setApiKeys(data)
    } catch (error) {
      console.error('Error fetching API keys:', error)
      toast.error('Failed to load API key list.')
    } finally {
      setLoading(false)
    }
  }

  // Create API key
  const handleCreateApiKey = async (data: ApiKeyFormData) => {
    setCreating(true)
    try {
      const allowedIps = data.allowedIps?.split(',').map(ip => ip.trim()).filter(ip => ip) || []
      
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          allowedIps: allowedIps.length > 0 ? allowedIps : null
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create API key')
      }

      const newKey = await response.json()
      setNewGeneratedKey(newKey)
      setShowCreateDialog(false)
      setShowNewKeyDialog(true)
      form.reset()
      await fetchApiKeys()
      toast.success('API key has been created successfully.')
    } catch (error) {
      console.error('Error creating API key:', error)
      toast.error(error instanceof Error ? error.message : 'An error occurred while creating the API key.')
    } finally {
      setCreating(false)
    }
  }

  // Delete API key
  const handleDeleteApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete API key')
      }

      await fetchApiKeys()
      toast.success('API key has been deleted.')
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error('An error occurred while deleting the API key.')
    }
  }

  // Toggle API key
  const handleToggleApiKey = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })

      if (!response.ok) {
        throw new Error('Failed to update API key')
      }

      await fetchApiKeys()
      toast.success(`API key has been ${isActive ? 'activated' : 'deactivated'}.`)
    } catch (error) {
      console.error('Error updating API key:', error)
      toast.error('An error occurred while changing the API key status.')
    }
  }

  // Regenerate API key
  const handleRegenerateApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ regenerate: true }),
      })

      if (!response.ok) {
        throw new Error('Failed to regenerate API key')
      }

      const updatedKey = await response.json()
      setNewGeneratedKey(updatedKey)
      setShowNewKeyDialog(true)
      await fetchApiKeys()
      toast.success('API key has been regenerated.')
    } catch (error) {
      console.error('Error regenerating API key:', error)
      toast.error('An error occurred while regenerating the API key.')
    }
  }

  // Copy key
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Key has been copied to clipboard.')
  }

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'None'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Status badge
  const getStatusBadge = (apiKey: ApiKey) => {
    if (!apiKey.isActive) {
      return <Badge variant="secondary">Inactive</Badge>
    }
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  // Display rate limit tier
  const getRateLimitText = (tier: string, hourly: number, daily: number) => {
    if (tier === 'unlimited') return 'Unlimited'
    return `${hourly}/hour, ${daily}/day`
  }

  useEffect(() => {
    fetchApiKeys()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Key Management</h2>
          <p className="text-muted-foreground">Create and manage keys for API access</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Create a new key for API access.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateApiKey)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Name describing the key's purpose" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permissions</FormLabel>
                      <FormDescription>
                        Select API features this key can access.
                      </FormDescription>
                      <div className="grid grid-cols-2 gap-2">
                        {PERMISSION_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={option.value}
                              checked={field.value.includes(option.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  field.onChange([...field.value, option.value])
                                } else {
                                  field.onChange(field.value.filter(v => v !== option.value))
                                }
                              }}
                            />
                            <Label htmlFor={option.value} className="text-sm">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rateLimitTier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate Limit Tier</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select tier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {RATE_LIMIT_TIERS.map((tier) => (
                              <SelectItem key={tier.value} value={tier.value}>
                                {tier.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiresAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxRequestsPerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Requests Per Hour</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxRequestsPerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Requests Per Day</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="allowedIps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allowed IP Addresses (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="192.168.1.1, 10.0.0.0/8 (comma separated)"
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Leave empty to allow access from all IPs.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? 'Creating...' : 'Create Key'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* New Key Created Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              This key will not be shown again, so store it in a secure place.
            </DialogDescription>
          </DialogHeader>
          
          {newGeneratedKey && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{newGeneratedKey.name}</p>
                    <p className="text-sm text-muted-foreground font-mono break-all">
                      {showKeyValue === newGeneratedKey.id ? newGeneratedKey.key : '••••••••••••••••••••••••••••••••'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKeyValue(showKeyValue === newGeneratedKey.id ? null : newGeneratedKey.id)}
                    >
                      {showKeyValue === newGeneratedKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyKey(newGeneratedKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Permissions:</p>
                  <p className="text-muted-foreground">{newGeneratedKey.permissions.join(', ')}</p>
                </div>
                <div>
                  <p className="font-medium">Rate Limit:</p>
                  <p className="text-muted-foreground">
                    {getRateLimitText(newGeneratedKey.rateLimitTier, newGeneratedKey.maxRequestsPerHour, newGeneratedKey.maxRequestsPerDay)}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button onClick={() => setShowNewKeyDialog(false)}>
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* API Key List */}
      <Card>
        <CardHeader>
          <CardTitle>API Key List</CardTitle>
          <CardDescription>
            Manage and monitor your created API keys.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No API keys have been created.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Rate Limit</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id}>
                      <TableCell className="font-medium">{apiKey.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-sm">{apiKey.keyPrefix}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyKey(apiKey.keyPrefix)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {apiKey.permissions.map((permission) => (
                            <Badge key={permission} variant="secondary" className="text-xs">
                              {permission}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {getRateLimitText(apiKey.rateLimitTier, apiKey.maxRequestsPerHour, apiKey.maxRequestsPerDay)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(apiKey.lastUsedAt)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(apiKey)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleApiKey(apiKey.id, !apiKey.isActive)}
                          >
                            <Activity className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Regenerate API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Do you want to regenerate this key? The existing key will no longer be usable.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRegenerateApiKey(apiKey.id)}>
                                  Regenerate
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Do you want to delete this API key? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteApiKey(apiKey.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 