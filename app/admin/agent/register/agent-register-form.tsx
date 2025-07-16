"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/admin-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useTranslation } from "@/lib/i18n"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Save, Upload, Image as ImageIcon, X, ChevronDown, ChevronUp } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface AgentData {
  id?: string
  agentId?: string  // Agent ID field
  modelId: string
  name: string
  systemPrompt: string
  temperature: string
  topK: number
  topP: string
  maxTokens: number
  presencePenalty: string
  frequencyPenalty: string
  description: string
  enabled: boolean
  parameterEnabled: boolean
  imageData?: string
  supportsDeepResearch?: boolean
  supportsWebSearch?: boolean
}

interface AgentRegisterFormProps {
  editingId?: string
  initialAgentData: AgentData | null
  initialImageData: string | null
  enabledModels: any[]
}

export default function AgentRegisterForm({
  editingId,
  initialAgentData,
  initialImageData,
  enabledModels
}: AgentRegisterFormProps) {
  const router = useRouter()
  const { lang } = useTranslation('admin.agent')
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  // Agent ID validation state
  const [agentIdValidation, setAgentIdValidation] = useState<{
    isChecking: boolean
    isValid: boolean | null
    message: string
  }>({
    isChecking: false,
    isValid: null,
    message: ''
  })
  
  // Default form data setup
  const defaultFormData = {
    agentId: '',
    modelId: '',
    name: '',
    systemPrompt: '',
    temperature: '0.7',
    topK: 50,
    topP: '0.95',
    maxTokens: 2048,
    presencePenalty: '0.0',
    frequencyPenalty: '0.0',
    imageData: '',
    description: '',
    enabled: true,
    parameterEnabled: false,
    supportsDeepResearch: true,
    supportsWebSearch: true
  }
  
  // Form state
  const [formData, setFormData] = useState(initialAgentData || defaultFormData)
  
  // Image upload related state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewImage, setPreviewImage] = useState<string>('')
  
  // No API call needed as image is passed through SSR 
  // Initial data setup (including image)
  useEffect(() => {
    // If in edit mode but no initial agent data (non-existent ID)
    if (editingId && !initialAgentData) {
      console.log('No agent data found, redirecting to agent list:', editingId)
      router.push('/admin/agent')
      return
    }
    
    // If initial agent data exists
    if (initialAgentData) {
      setFormData({
        ...initialAgentData,
        agentId: initialAgentData.agentId || initialAgentData.id || '', // Use id if agentId doesn't exist in existing data
        parameterEnabled: (initialAgentData as any).parameterEnabled ?? false // Default to false if parameterEnabled doesn't exist
      })
    }
    
    // Process initial image data passed through SSR
    if (initialImageData) {
      try {
        console.log("🖼️ Processing SSR image data...", { length: initialImageData.length });
        
        // Validation
        if (typeof initialImageData !== 'string' || !initialImageData.trim()) {
          console.error("❌ Invalid image data");
          return;
        }
        
        // SSR image data is already in data URL format
        if (initialImageData.startsWith('data:')) {
          console.log(`✅ Setting SSR image (size: ${(initialImageData.length / 1024).toFixed(1)}KB)`);
          
          // Set preview
          setPreviewImage(initialImageData);
          
          // Store only base64 part in form data
          const base64Data = initialImageData.split(',')[1];
          setFormData(prev => ({ ...prev, imageData: base64Data }));
        } else {
          console.warn("SSR image data is not in expected format:", initialImageData.substring(0, 50));
        }
        
      } catch (error) {
        console.error("❌ SSR image processing error:", error);
      }
    }
  }, [initialAgentData, initialImageData, editingId])

  // Check Agent ID availability
  const checkAgentIdAvailability = async (agentId: string) => {
    if (!agentId || agentId.length < 3) {
      setAgentIdValidation({
        isChecking: false,
        isValid: false,
        message: 'Agent ID must be at least 3 characters long.'
      })
      return
    }

    setAgentIdValidation(prev => ({ ...prev, isChecking: true }))

    try {
      const params = new URLSearchParams({ 
        agentId,
        ...(editingId && { excludeId: editingId })
      })
      
      const response = await fetch(`/api/agents/check-id?${params}`)
      const result = await response.json()

      setAgentIdValidation({
        isChecking: false,
        isValid: result.available,
        message: result.message
      })
    } catch (error) {
      console.error('Agent ID check error:', error)
      setAgentIdValidation({
        isChecking: false,
        isValid: false,
        message: 'An error occurred while checking agent ID.'
      })
    }
  }

  // Agent ID blur handler
  const handleAgentIdBlur = (agentId: string) => {
    if (agentId.trim()) {
      checkAgentIdAvailability(agentId.trim())
    } else {
      setAgentIdValidation({
        isChecking: false,
        isValid: null,
        message: ''
      })
    }
  }

  // Save agent
  const handleSave = async () => {
    try {
      setIsLoading(true)
      
      // Validate model registration
      if (enabledModels.length === 0) {
        toast({
          title: lang('modelRequired'),
          description: lang('modelRequiredMessage'),
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
      
      // Validate required fields
      if (!formData.name || !formData.modelId || !(formData as any).agentId) {
        toast({
          title: lang('validationError'),
          description: lang('requiredFields'),
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Validate Agent ID
      if (agentIdValidation.isValid === false) {
        toast({
          title: lang('validationError'),
          description: agentIdValidation.message,
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
      
      console.log("=== Starting agent save ===")
      console.log("Agent name:", formData.name)
      console.log("Image data exists:", !!formData.imageData)
      if (formData.imageData) {
        console.log("Image data type:", typeof formData.imageData)
        console.log("Image data length:", formData.imageData.length)
        console.log("Image data start:", formData.imageData.substring(0, 50))
        console.log("Image data starts with data::", formData.imageData.startsWith('data:'))
        console.log("Image data contains base64,:", formData.imageData.includes('base64,'))
      }
      
      const url = '/api/agents'
      const method = editingId ? 'PUT' : 'POST'
      
      // Preprocess image data
      let processedFormData = { ...formData }
      if (processedFormData.imageData) {
        console.log("Starting image data preprocessing")
        console.log("Original image data:", processedFormData.imageData.substring(0, 50) + "...")
        
        // If image data starts with data:image/, extract only base64 part
        if (processedFormData.imageData.startsWith('data:image/')) {
          const base64Part = processedFormData.imageData.split(',')[1]
          console.log("Extracting base64 part from data URL")
          console.log("Extracted base64 length:", base64Part.length)
          console.log("Extracted base64 start:", base64Part.substring(0, 50) + "...")
          processedFormData.imageData = base64Part
        }
        
        console.log("Final image data length to send:", processedFormData.imageData.length)
        console.log("Final image data start:", processedFormData.imageData.substring(0, 50) + "...")
      }
      
      const body = editingId 
        ? { id: editingId, ...processedFormData }
        : processedFormData
      
      console.log("API request data:", {
        ...body,
        imageData: body.imageData ? `[${body.imageData.length} characters]` : null
      })
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      console.log("API response status:", response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API error response:", errorData)
        throw new Error(errorData.message || lang('saveError'))
      }
      
      const responseData = await response.json()
      console.log("API success response:", {
        ...responseData,
        imageData: responseData.imageData ? `[${responseData.imageData.length} characters]` : null
      })
      
      if (editingId) {
        toast({
          title: lang('updateSuccess'),
          description: lang('updateSuccessMessage')
        })
      } else {
        toast({
          title: lang('createSuccess'),
          description: lang('createSuccessMessage')
        })
      }
      
      console.log("=== Agent save completed ===")
      router.push('/admin/agent')
    } catch (error) {
      console.error('Save agent error:', error)
      toast({
        title: lang('saveFailure'),
        description: error instanceof Error ? error.message : lang('saveFailureMessage'),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("=== Starting image upload ===")
    console.log("File name:", file.name)
    console.log("File size:", (file.size / 1024).toFixed(1), "KB")
    console.log("File type:", file.type)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      console.error("Unsupported file type:", file.type)
      toast({
        title: lang('imageUploadError'),
        description: lang('imageFileOnlyMessage'),
        variant: "destructive"
      });
      return;
    }

    // File size limit (10MB - original file limit before resize)
    if (file.size > 10 * 1024 * 1024) {
      console.error("File size exceeded:", (file.size / 1024 / 1024).toFixed(1), "MB")
      toast({
        title: lang('imageUploadError'),
        description: lang('fileSizeExceededMessage'),
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("Starting image processing...");
      
      // Create image element to get dimensions
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      const processedDataUrl = await new Promise<string>((resolve, reject) => {
        img.onload = () => {
          try {
            // Get original dimensions
            const originalWidth = img.width;
            const originalHeight = img.height;
            console.log("Original dimensions:", originalWidth, "x", originalHeight);
            
            // Calculate new dimensions maintaining aspect ratio
            let newWidth = originalWidth;
            let newHeight = originalHeight;
            
            // If either dimension exceeds 80px, resize proportionally
            if (originalWidth > 80 || originalHeight > 80) {
              const ratio = originalWidth / originalHeight;
              if (ratio >= 1) {
                // Width is larger
                newWidth = 80;
                newHeight = 80 / ratio;
              } else {
                // Height is larger
                newHeight = 80;
                newWidth = 80 * ratio;
              }
            }
            
            // Create canvas for resizing
            const canvas = document.createElement('canvas');
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Draw resized image
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');
            
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Convert to data URL
            const dataUrl = canvas.toDataURL(file.type);
            console.log("Resized dimensions:", newWidth, "x", newHeight);
            
            // Cleanup
            URL.revokeObjectURL(imageUrl);
            
            resolve(dataUrl);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        
        img.src = imageUrl;
      });
      
      console.log("Image processing completed");
      console.log("Processed image size:", ((processedDataUrl.length * 3) / 4 / 1024).toFixed(1), "KB");
      
      // Set preview
      console.log("Setting preview image...");
      setPreviewImage(processedDataUrl);
      
      // Add image to form data (store only data part from base64 string)
      if (processedDataUrl.includes(',')) {
        const base64Data = processedDataUrl.split(',')[1];
        console.log("Base64 data extraction completed, length:", base64Data.length);
        setFormData(prev => ({ ...prev, imageData: base64Data }));
        
        toast({
          title: lang('imageUploadSuccess'),
          description: `${lang('imageUploadSuccessMessage')} (size: ${((processedDataUrl.length * 3) / 4 / 1024).toFixed(1)}KB)`
        });
      } else {
        throw new Error('Invalid data URL format');
      }
      
    } catch (error) {
      console.error("Error during image processing:", error);
      toast({
        title: lang('imageUploadError'),
        description: error instanceof Error ? error.message : lang('imageProcessingErrorMessage'),
        variant: "destructive"
      });
    }
    
    console.log("=== Image upload completed ===");
  };

  // Remove image
  const handleRemoveImage = () => {
    setPreviewImage('');
    setFormData(prev => ({ ...prev, imageData: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [isParametersOpen, setIsParametersOpen] = useState(false);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push('/admin/agent')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {editingId ? lang('editAgent') : lang('addAgent')}
            </h1>
            <p className="text-gray-600 mt-1">
              {editingId ? lang('editAgentDescription') : lang('addAgentDescription')}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{lang('form.basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{lang('form.name')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={lang('form.namePlaceholder')}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="agentId">{lang('form.agentId')}</Label>
                <Input
                  id="agentId"
                  value={formData.agentId || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData(prev => ({ ...prev, agentId: value }))
                    // Reset validation state during input
                    if (agentIdValidation.isValid !== null) {
                      setAgentIdValidation({ isChecking: false, isValid: null, message: '' })
                    }
                  }}
                  onBlur={(e) => handleAgentIdBlur(e.target.value)}
                  placeholder={lang('form.agentIdPlaceholder')}
                  className={
                    agentIdValidation.isValid === false ? 'border-red-500' :
                    agentIdValidation.isValid === true ? 'border-green-500' : ''
                  }
                />
                {agentIdValidation.isChecking && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {lang('form.checking')}
                  </p>
                )}
                {agentIdValidation.isValid === true && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    {agentIdValidation.message}
                  </p>
                )}
                {agentIdValidation.isValid === false && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                    {agentIdValidation.message}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {lang('form.agentIdHelp')}
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="model">{lang('form.model')}</Label>
                {enabledModels.length === 0 ? (
                  <div className="space-y-2">
                    <Select disabled>
                      <SelectTrigger className="bg-gray-50 text-gray-500">
                        <SelectValue placeholder={lang('noModelsAvailable')} />
                      </SelectTrigger>
                    </Select>
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      {lang('modelRegistrationNotice')} 
                      <button 
                        type="button"
                        onClick={() => router.push('/admin/model')}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        {lang('goToModelManagement')}
                      </button>
                    </p>
                  </div>
                ) : (
                  <Select
                    value={formData.modelId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, modelId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={lang('form.modelPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.provider} / {model.modelId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="agentImage">{lang('form.image')}</Label>
                <div className="flex items-start gap-4">
                  {/* Image preview */}
                  <div className="relative">
                    <div className="h-24 w-24 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                      {previewImage ? (
                        <div className="w-full h-full">
                          <img 
                            src={previewImage} 
                            alt="Agent" 
                            className="w-full h-full object-cover"
                            onLoad={() => {
                              console.log("Image load successful");
                              console.log("Image URL:", previewImage.substring(0, 50) + "...");
                            }}
                            onError={(e) => {
                              console.error("🚨 Image load failed");
                              console.error("Image URL length:", previewImage.length);
                              console.error("Image URL start:", previewImage.substring(0, 100) + "...");
                              
                              e.currentTarget.style.display = 'none';
                              const container = e.currentTarget.parentNode as HTMLElement;
                              if (container) {
                                container.innerHTML = '<div class="h-full w-full flex items-center justify-center text-red-500"><div class="text-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg><div class="text-xs">' + lang('form.imageLoadFailed') + '<br/>' + lang('form.imageSize').replace('{{size}}', (previewImage.length / 1024 / 1024).toFixed(1)) + '</div></div></div>';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <ImageIcon className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    {previewImage && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Image upload button */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="agentImage"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {lang('form.uploadImage')}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      {lang('form.imageHelp')}
                      <br />
                      {lang('form.imageFormats')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">{lang('form.description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={lang('form.descriptionPlaceholder')}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="systemPrompt">{lang('form.systemPrompt')}</Label>
                <Textarea
                  id="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                  placeholder={lang('form.systemPromptPlaceholder')}
                  rows={6}
                />
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                  />
                  <Label htmlFor="enabled" className="text-sm font-medium">
                    {lang('form.enableAgent')}
                  </Label>
                  <span className="text-xs text-gray-500 ml-2">
                    {lang('form.enableAgentHelp')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="supportsDeepResearch"
                    checked={formData.supportsDeepResearch ?? true}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, supportsDeepResearch: checked }))}
                  />
                  <Label htmlFor="supportsDeepResearch" className="text-sm font-medium">
                    Deep Research 지원
                  </Label>
                  <span className="text-xs text-gray-500 ml-2">
                    에이전트가 Deep Research 기능을 사용할 수 있습니다
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="supportsWebSearch"
                    checked={formData.supportsWebSearch ?? true}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, supportsWebSearch: checked }))}
                  />
                  <Label htmlFor="supportsWebSearch" className="text-sm font-medium">
                    Web Search 지원
                  </Label>
                  <span className="text-xs text-gray-500 ml-2">
                    에이전트가 Web Search 기능을 사용할 수 있습니다
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>{lang('form.parameters')}</CardTitle>
              <div className="flex items-center space-x-2">
                <Switch
                  id="parameterEnabled"
                  checked={(formData as any).parameterEnabled ?? false}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, parameterEnabled: checked } as any))
                    if (checked) {
                      setIsParametersOpen(true)
                    }
                  }}
                />
                <Label htmlFor="parameterEnabled" className="text-sm font-medium">
                  {lang('form.enableParameters')}
                </Label>
                <span className="text-xs text-gray-500 ml-2">
                  {lang('form.enableParametersHelp')}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Collapsible
              open={isParametersOpen}
              onOpenChange={setIsParametersOpen}
              className="space-y-2"
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full flex items-center justify-between p-1"
                  disabled={!(formData as any).parameterEnabled}
                >
                  <span className="text-sm">
                    {isParametersOpen ? lang('form.hideParameters') : lang('form.showParameters')}
                  </span>
                  {isParametersOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="temperature">
                      {lang('form.temperature')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="temperature"
                        min={0}
                        max={2}
                        step={0.1}
                        value={[parseFloat(formData.temperature)]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, temperature: value[0].toString() }))}
                        className="flex-1"
                        disabled={!(formData as any).parameterEnabled}
                      />
                      <Input
                        type="number"
                        value={formData.temperature}
                        onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                        min={0}
                        max={2}
                        step={0.1}
                        className="w-20"
                        disabled={!(formData as any).parameterEnabled}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="topP">
                      {lang('form.topP')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="topP"
                        min={0}
                        max={1}
                        step={0.05}
                        value={[parseFloat(formData.topP)]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, topP: value[0].toString() }))}
                        className="flex-1"
                        disabled={!(formData as any).parameterEnabled}
                      />
                      <Input
                        type="number"
                        value={formData.topP}
                        onChange={(e) => setFormData(prev => ({ ...prev, topP: e.target.value }))}
                        min={0}
                        max={1}
                        step={0.05}
                        className="w-20"
                        disabled={!(formData as any).parameterEnabled}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="topK">
                      {lang('form.topK')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="topK"
                        min={1}
                        max={100}
                        step={1}
                        value={[formData.topK]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, topK: value[0] }))}
                        className="flex-1"
                        disabled={!(formData as any).parameterEnabled}
                      />
                      <Input
                        type="number"
                        value={formData.topK}
                        onChange={(e) => setFormData(prev => ({ ...prev, topK: parseInt(e.target.value) || 50 }))}
                        min={1}
                        max={100}
                        step={1}
                        className="w-20"
                        disabled={!(formData as any).parameterEnabled}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="maxTokens">
                      {lang('form.maxTokens')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="maxTokens"
                        min={256}
                        max={32768}
                        step={256}
                        value={[formData.maxTokens]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, maxTokens: value[0] }))}
                        className="flex-1"
                        disabled={!(formData as any).parameterEnabled}
                      />
                      <Input
                        type="number"
                        value={formData.maxTokens}
                        onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
                        min={256}
                        max={32768}
                        step={256}
                        className="w-20"
                        disabled={!(formData as any).parameterEnabled}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="presencePenalty">
                      {lang('form.presencePenalty')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="presencePenalty"
                        min={-2}
                        max={2}
                        step={0.1}
                        value={[parseFloat(formData.presencePenalty)]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, presencePenalty: value[0].toString() }))}
                        className="flex-1"
                        disabled={!(formData as any).parameterEnabled}
                      />
                      <Input
                        type="number"
                        value={formData.presencePenalty}
                        onChange={(e) => setFormData(prev => ({ ...prev, presencePenalty: e.target.value }))}
                        min={-2}
                        max={2}
                        step={0.1}
                        className="w-20"
                        disabled={!(formData as any).parameterEnabled}
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="frequencyPenalty">
                      {lang('form.frequencyPenalty')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="frequencyPenalty"
                        min={-2}
                        max={2}
                        step={0.1}
                        value={[parseFloat(formData.frequencyPenalty)]}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, frequencyPenalty: value[0].toString() }))}
                        className="flex-1"
                        disabled={!(formData as any).parameterEnabled}
                      />
                      <Input
                        type="number"
                        value={formData.frequencyPenalty}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequencyPenalty: e.target.value }))}
                        min={-2}
                        max={2}
                        step={0.1}
                        className="w-20"
                        disabled={!(formData as any).parameterEnabled}
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/admin/agent')}
          >
            {lang('cancel')}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || enabledModels.length === 0}
            title={enabledModels.length === 0 ? lang('form.modelRegisterFirst') : ""}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? lang('saving') : lang('save')}
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
} 