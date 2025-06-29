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
import { ArrowLeft, Save, Upload, Image as ImageIcon, X } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

interface AgentData {
  id?: string
  agentId?: string  // 에이전트 ID 필드 추가
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
  
  // Agent ID 검증 상태
  const [agentIdValidation, setAgentIdValidation] = useState<{
    isChecking: boolean
    isValid: boolean | null
    message: string
  }>({
    isChecking: false,
    isValid: null,
    message: ''
  })
  
  // 기본 폼 데이터 설정
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
    parameterEnabled: true
  }
  
  // Form state
  const [formData, setFormData] = useState(initialAgentData || defaultFormData)
  
  // 이미지 업로드 관련 상태
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewImage, setPreviewImage] = useState<string>('')
  
  // SSR로 이미지가 전달되므로 API 호출 불필요 
  // 초기 데이터 설정 (이미지 포함)
  useEffect(() => {
    // 수정 모드인데 초기 에이전트 데이터가 없는 경우 (존재하지 않는 ID)
    if (editingId && !initialAgentData) {
      console.log('에이전트 데이터가 없음, 등록 페이지로 리다이렉트:', editingId)
      router.push('/admin/agent')
      return
    }
    
    // 초기 에이전트 데이터가 있는 경우
    if (initialAgentData) {
      setFormData({
        ...initialAgentData,
        agentId: initialAgentData.agentId || initialAgentData.id || '', // 기존 데이터에 agentId가 없으면 id 사용
        parameterEnabled: (initialAgentData as any).parameterEnabled ?? true // 기존 데이터에 parameterEnabled가 없으면 기본값 true
      })
    }
    
    // SSR로 전달된 초기 이미지 데이터 처리
    if (initialImageData) {
      try {
        console.log("🖼️ SSR 이미지 데이터 처리 중...", { length: initialImageData.length });
        
        // 유효성 검사
        if (typeof initialImageData !== 'string' || !initialImageData.trim()) {
          console.error("❌ 유효하지 않은 이미지 데이터");
          return;
        }
        
        // SSR로 전달된 이미지 데이터는 이미 data URL 형태
        if (initialImageData.startsWith('data:')) {
          console.log(`✅ SSR 이미지 설정 (크기: ${(initialImageData.length / 1024).toFixed(1)}KB)`);
          
          // 미리보기 설정
          setPreviewImage(initialImageData);
          
          // 폼 데이터에 base64 부분만 저장
          const base64Data = initialImageData.split(',')[1];
          setFormData(prev => ({ ...prev, imageData: base64Data }));
        } else {
          console.warn("SSR 이미지 데이터가 예상 형식이 아님:", initialImageData.substring(0, 50));
        }
        
      } catch (error) {
        console.error("❌ SSR 이미지 처리 오류:", error);
      }
    }
  }, [initialAgentData, initialImageData, editingId])

  // Agent ID 중복 확인
  const checkAgentIdAvailability = async (agentId: string) => {
    if (!agentId || agentId.length < 3) {
      setAgentIdValidation({
        isChecking: false,
        isValid: false,
        message: '에이전트 ID는 3자 이상이어야 합니다.'
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
      console.error('Agent ID 확인 오류:', error)
      setAgentIdValidation({
        isChecking: false,
        isValid: false,
        message: '에이전트 ID 확인 중 오류가 발생했습니다.'
      })
    }
  }

  // Agent ID 포커스아웃 핸들러
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
      
      // 모델 등록 여부 검증
      if (enabledModels.length === 0) {
        toast({
          title: lang('modelRequired'),
          description: lang('modelRequiredMessage'),
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
      
      // 필수 필드 검증
      if (!formData.name || !formData.modelId || !(formData as any).agentId) {
        toast({
          title: lang('validationError'),
          description: lang('requiredFields'),
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      // Agent ID 유효성 검증
      if (agentIdValidation.isValid === false) {
        toast({
          title: lang('validationError'),
          description: agentIdValidation.message,
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }
      
      console.log("=== 에이전트 저장 시작 ===")
      console.log("에이전트 이름:", formData.name)
      console.log("이미지 데이터 존재 여부:", !!formData.imageData)
      if (formData.imageData) {
        console.log("이미지 데이터 타입:", typeof formData.imageData)
        console.log("이미지 데이터 길이:", formData.imageData.length)
        console.log("이미지 데이터 시작 부분:", formData.imageData.substring(0, 50))
        console.log("이미지 데이터가 data:로 시작하는지:", formData.imageData.startsWith('data:'))
        console.log("이미지 데이터가 base64,를 포함하는지:", formData.imageData.includes('base64,'))
      }
      
      const url = '/api/agents'
      const method = editingId ? 'PUT' : 'POST'
      
      // 이미지 데이터 전처리
      let processedFormData = { ...formData }
      if (processedFormData.imageData) {
        console.log("이미지 데이터 전처리 시작")
        console.log("원본 이미지 데이터:", processedFormData.imageData.substring(0, 50) + "...")
        
        // 이미지 데이터가 data:image/ 형식으로 시작하면 base64 부분만 추출
        if (processedFormData.imageData.startsWith('data:image/')) {
          const base64Part = processedFormData.imageData.split(',')[1]
          console.log("data URL에서 base64 부분 추출")
          console.log("추출된 base64 길이:", base64Part.length)
          console.log("추출된 base64 시작 부분:", base64Part.substring(0, 50) + "...")
          processedFormData.imageData = base64Part
        }
        
        console.log("최종 전송할 이미지 데이터 길이:", processedFormData.imageData.length)
        console.log("최종 전송할 이미지 데이터 시작 부분:", processedFormData.imageData.substring(0, 50) + "...")
      }
      
      const body = editingId 
        ? { id: editingId, ...processedFormData }
        : processedFormData
      
      console.log("API 요청 데이터:", {
        ...body,
        imageData: body.imageData ? `[${body.imageData.length} characters]` : null
      })
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      console.log("API 응답 상태:", response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("API 오류 응답:", errorData)
        throw new Error(errorData.message || lang('saveError'))
      }
      
      const responseData = await response.json()
      console.log("API 성공 응답:", {
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
      
      console.log("=== 에이전트 저장 완료 ===")
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



  // 이미지 업로드 처리
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("=== 이미지 업로드 시작 ===")
    console.log("파일 이름:", file.name)
    console.log("파일 크기:", (file.size / 1024).toFixed(1), "KB")
    console.log("파일 타입:", file.type)

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      console.error("지원하지 않는 파일 타입:", file.type)
      toast({
        title: lang('imageUploadError'),
        description: lang('imageFileOnlyMessage'),
        variant: "destructive"
      });
      return;
    }

    // 파일 크기 제한 (10MB - 리사이즈 전 원본 제한)
    if (file.size > 10 * 1024 * 1024) {
      console.error("파일 크기 초과:", (file.size / 1024 / 1024).toFixed(1), "MB")
      toast({
        title: lang('imageUploadError'),
        description: lang('fileSizeExceededMessage'),
        variant: "destructive"
      });
      return;
    }

    try {
      console.log("이미지 처리 시작...");
      
      // 간단한 FileReader 사용 (리사이즈 로직 제거)
      const processedDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result;
          if (result && typeof result === 'string') {
            console.log("파일 읽기 성공");
            console.log("data URL 길이:", result.length);
            console.log("data URL 시작:", result.substring(0, 50) + "...");
            resolve(result);
          } else {
            reject(new Error('파일 읽기 결과가 올바르지 않습니다'));
          }
        };
        reader.onerror = (error) => {
          console.error("FileReader 오류:", error);
          reject(new Error('파일 읽기 실패'));
        };
        reader.readAsDataURL(file);
      });
      
      console.log("이미지 처리 완료");
      console.log("처리된 이미지 크기:", ((processedDataUrl.length * 3) / 4 / 1024).toFixed(1), "KB");
      
      // 미리보기 설정
      console.log("미리보기 이미지 설정 중...");
      setPreviewImage(processedDataUrl);
      
      // 폼 데이터에 이미지 추가 (base64 문자열에서 데이터 부분만 저장)
      if (processedDataUrl.includes(',')) {
        const base64Data = processedDataUrl.split(',')[1];
        console.log("base64 데이터 추출 완료, 길이:", base64Data.length);
        setFormData(prev => ({ ...prev, imageData: base64Data }));
        
        toast({
          title: lang('imageUploadSuccess'),
          description: `${lang('imageUploadSuccessMessage')} (크기: ${((processedDataUrl.length * 3) / 4 / 1024).toFixed(1)}KB)`
        });
      } else {
        throw new Error('올바르지 않은 data URL 형식입니다');
      }
      
    } catch (error) {
      console.error("이미지 처리 중 오류:", error);
      toast({
        title: lang('imageUploadError'),
        description: error instanceof Error ? error.message : lang('imageProcessingErrorMessage'),
        variant: "destructive"
      });
    }
    
    console.log("=== 이미지 업로드 완료 ===");
  };

  // 이미지 제거
  const handleRemoveImage = () => {
    setPreviewImage('');
    setFormData(prev => ({ ...prev, imageData: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
                <Label htmlFor="agentId">에이전트 ID</Label>
                <Input
                  id="agentId"
                  value={formData.agentId || ''}
                  onChange={(e) => {
                    const value = e.target.value
                    setFormData(prev => ({ ...prev, agentId: value }))
                    // 입력 중에는 검증 상태 초기화
                    if (agentIdValidation.isValid !== null) {
                      setAgentIdValidation({ isChecking: false, isValid: null, message: '' })
                    }
                  }}
                  onBlur={(e) => handleAgentIdBlur(e.target.value)}
                  placeholder="API 호출 시 사용할 고유한 ID를 입력하세요"
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
                    확인 중...
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
                  영문, 숫자, 하이픈(-), 언더스코어(_)만 사용 가능 (3-50자)
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
                  {/* 이미지 미리보기 */}
                  <div className="relative">
                    <div className="h-24 w-24 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                      {previewImage ? (
                        <div className="w-full h-full">
                          <img 
                            src={previewImage} 
                            alt="Agent" 
                            className="w-full h-full object-cover"
                            onLoad={() => {
                              console.log("이미지 로드 성공");
                              console.log("이미지 URL:", previewImage.substring(0, 50) + "...");
                            }}
                            onError={(e) => {
                              console.error("🚨 이미지 로드 실패");
                              console.error("이미지 URL 길이:", previewImage.length);
                              console.error("이미지 URL 시작 부분:", previewImage.substring(0, 100) + "...");
                              
                              if (previewImage.includes('base64,')) {
                                const base64Part = previewImage.split('base64,')[1];
                                console.error("base64 부분 길이:", base64Part.length);
                                console.error("base64 시작 부분:", base64Part.substring(0, 50) + "...");
                                console.error("base64 끝 부분:", "..." + base64Part.substring(base64Part.length - 50));
                                
                                // base64 유효성 검사 - 더 많은 데이터로 테스트
                                try {
                                  const testDecode = atob(base64Part.substring(0, 1000));
                                  console.log("base64 디코딩 테스트 성공 (1000자)");
                                  
                                  // 전체 base64 디코딩 테스트
                                  const fullDecode = atob(base64Part);
                                  console.log("전체 base64 디코딩 성공, 크기:", fullDecode.length, "바이트");
                                  
                                  // PNG 헤더 확인
                                  const pngHeader = fullDecode.substring(0, 8);
                                  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10]; // PNG 시그니처
                                  let isPng = true;
                                  for (let i = 0; i < 8; i++) {
                                    if (pngHeader.charCodeAt(i) !== pngSignature[i]) {
                                      isPng = false;
                                      break;
                                    }
                                  }
                                  console.log("PNG 헤더 유효성:", isPng);
                                  if (!isPng) {
                                    console.error("PNG 헤더가 올바르지 않음");
                                    console.error("실제 헤더:", Array.from(pngHeader).map(c => c.charCodeAt(0)));
                                  }
                                  
                                } catch (decodeError) {
                                  console.error("base64 디코딩 실패:", decodeError);
                                }
                                
                                // base64 문자 유효성 검사
                                const validBase64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
                                const isValidBase64 = validBase64Regex.test(base64Part);
                                console.error("base64 문자 유효성:", isValidBase64);
                                
                                if (!isValidBase64) {
                                  console.error("유효하지 않은 base64 문자 발견");
                                  // 첫 100자에서 유효하지 않은 문자 찾기
                                  const sample = base64Part.substring(0, 100);
                                  for (let i = 0; i < sample.length; i++) {
                                    const char = sample[i];
                                    if (!/[A-Za-z0-9+/=]/.test(char)) {
                                      console.error(`위치 ${i}에서 유효하지 않은 문자 발견: '${char}' (코드: ${char.charCodeAt(0)})`);
                                    }
                                  }
                                }
                              }
                              
                              // 이미지 데이터 타입 검사
                              if (previewImage.startsWith('data:image/')) {
                                const mimeType = previewImage.split(';')[0].split(':')[1];
                                console.error("MIME 타입:", mimeType);
                              }
                              
                              // 브라우저 제한 확인
                              console.error("브라우저 data URL 길이 제한 (Chrome: ~2MB, Firefox: ~2MB)");
                              console.error("현재 이미지 크기:", (previewImage.length / 1024 / 1024).toFixed(2), "MB");
                              
                              e.currentTarget.style.display = 'none';
                              const container = e.currentTarget.parentNode as HTMLElement;
                              if (container) {
                                container.innerHTML = '<div class="h-full w-full flex items-center justify-center text-red-500"><div class="text-center"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg><div class="text-xs">로드 실패<br/>크기: ' + (previewImage.length / 1024 / 1024).toFixed(1) + 'MB</div></div></div>';
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
                  
                  {/* 이미지 업로드 버튼 */}
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
                      이미지 파일을 업로드하면 base64로 인코딩되어 저장됩니다.
                      <br />
                      지원 형식: JPG, PNG, GIF (최대 10MB)
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
              
              <div className="flex items-center space-x-2 pt-4 border-t">
                <Switch
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
                />
                <Label htmlFor="enabled" className="text-sm font-medium">
                  에이전트 활성화
                </Label>
                <span className="text-xs text-gray-500 ml-2">
                  비활성화하면 API 호출 시 이 에이전트를 사용할 수 없습니다
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lang('form.parameters')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  />
                  <Input
                    type="number"
                    value={formData.temperature}
                    onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
                    min={0}
                    max={2}
                    step={0.1}
                    className="w-20"
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
                  />
                  <Input
                    type="number"
                    value={formData.topP}
                    onChange={(e) => setFormData(prev => ({ ...prev, topP: e.target.value }))}
                    min={0}
                    max={1}
                    step={0.05}
                    className="w-20"
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
                  />
                  <Input
                    type="number"
                    value={formData.topK}
                    onChange={(e) => setFormData(prev => ({ ...prev, topK: parseInt(e.target.value) || 50 }))}
                    min={1}
                    max={100}
                    step={1}
                    className="w-20"
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
                  />
                  <Input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2048 }))}
                    min={256}
                    max={32768}
                    step={256}
                    className="w-20"
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
                  />
                  <Input
                    type="number"
                    value={formData.presencePenalty}
                    onChange={(e) => setFormData(prev => ({ ...prev, presencePenalty: e.target.value }))}
                    min={-2}
                    max={2}
                    step={0.1}
                    className="w-20"
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
                  />
                  <Input
                    type="number"
                    value={formData.frequencyPenalty}
                    onChange={(e) => setFormData(prev => ({ ...prev, frequencyPenalty: e.target.value }))}
                    min={-2}
                    max={2}
                    step={0.1}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-4 border-t">
              <Switch
                id="parameterEnabled"
                checked={(formData as any).parameterEnabled ?? true}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, parameterEnabled: checked } as any))}
              />
              <Label htmlFor="parameterEnabled" className="text-sm font-medium">
                파라미터 활성화
              </Label>
              <span className="text-xs text-gray-500 ml-2">
                비활성화하면 기본 파라미터 값을 사용합니다
              </span>
            </div>
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
            className="bg-black text-white hover:bg-blue-700 hover:text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            title={enabledModels.length === 0 ? "Foundation 모델을 먼저 등록해주세요" : ""}
          >
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? lang('saving') : lang('save')}
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
} 