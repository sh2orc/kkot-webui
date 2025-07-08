"use client"

import React, { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, Check, Loader2, Brain } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"

interface DeepResearchStep {
  id: string
  title: string
  content: string
  status: 'pending' | 'in_progress' | 'completed'
  stepType: 'step' | 'synthesis' | 'final'
}

interface DeepResearchDisplayProps {
  content: string
  isStreaming?: boolean
  deepResearchStepType?: 'step' | 'synthesis' | 'final'
  isDeepResearchComplete?: boolean
  deepResearchStepInfo?: {
    title?: string
    isComplete?: boolean
    totalSteps?: number
    plannedSteps?: Array<{ title: string, type: string }>
    currentStepContent?: string
    currentStepType?: string
  }
}

export function DeepResearchDisplay({ 
  content, 
  isStreaming = false, 
  deepResearchStepType,
  isDeepResearchComplete = false,
  deepResearchStepInfo = {}
}: DeepResearchDisplayProps) {
  const [steps, setSteps] = useState<DeepResearchStep[]>([])
  const [openSteps, setOpenSteps] = useState<Set<string>>(new Set())
  const [currentStepId, setCurrentStepId] = useState<string | null>(null)
  const [plannedSteps, setPlannedSteps] = useState<Array<{ title: string, type: string }>>([])

  // 계획된 스탭들 처리
  useEffect(() => {
    if (deepResearchStepInfo?.plannedSteps && deepResearchStepInfo.plannedSteps.length > 0) {
      setPlannedSteps(deepResearchStepInfo.plannedSteps)
      
      // 계획된 스탭들을 기반으로 초기 스탭 구조 생성 (기존 스탭이 없을 때만)
      setSteps(prevSteps => {
        if (prevSteps.length === 0) {
          const initialSteps: DeepResearchStep[] = deepResearchStepInfo.plannedSteps!.map((plannedStep, index) => ({
            id: `planned-step-${index}`,
            title: plannedStep.title,
            content: '',
            status: 'pending' as const,
            stepType: plannedStep.type as 'step' | 'synthesis' | 'final'
          }))
          return initialSteps
        }
        return prevSteps
      })
    }
  }, [deepResearchStepInfo?.plannedSteps])

  // Parse content and extract steps using both content and stepInfo
  useEffect(() => {
    const parseSteps = () => {
      // 계획된 스탭들이 있으면 해당 스탭 업데이트
      if (plannedSteps.length > 0) {
        // 현재 스탭 내용 업데이트
        if (deepResearchStepInfo?.title && deepResearchStepInfo?.currentStepContent) {
          const stepTitle = deepResearchStepInfo.title
          let stepContent = deepResearchStepInfo.currentStepContent
          
          // <진행중> 태그 확인 및 제거
          const isInProgress = stepContent.includes('<진행중>') && stepContent.includes('</진행중>')
          const cleanContent = stepContent.replace(/<진행중>|<\/진행중>/g, '')
          
          const isComplete = deepResearchStepInfo.isComplete || false
          
          // 현재 스탭 찾기 - 함수형 업데이트 사용
          setSteps(prevSteps => {
            const currentStepIndex = prevSteps.findIndex(s => s.title === stepTitle)
            
            if (currentStepIndex >= 0) {
              const updatedSteps = [...prevSteps]
              updatedSteps[currentStepIndex] = {
                ...updatedSteps[currentStepIndex],
                content: cleanContent,
                status: isComplete ? 'completed' : (isInProgress ? 'in_progress' : 'pending')
              }
              setCurrentStepId(updatedSteps[currentStepIndex].id)
              return updatedSteps
            }
            return prevSteps
          })
          return
        }
        
        // 최종답변인 경우 메시지 내용에서 표시하므로 여기서는 상태만 업데이트
        if (deepResearchStepInfo?.currentStepType === 'final') {
          setSteps(prevSteps => {
            const finalStepIndex = prevSteps.findIndex(s => s.stepType === 'final')
            if (finalStepIndex >= 0) {
              const updatedSteps = [...prevSteps]
              updatedSteps[finalStepIndex] = {
                ...updatedSteps[finalStepIndex],
                status: deepResearchStepInfo.isComplete ? 'completed' : 'in_progress'
              }
              setCurrentStepId(updatedSteps[finalStepIndex].id)
              return updatedSteps
            }
            return prevSteps
          })
          return
        }
        
        return
      }
      
      // 계획된 스탭들이 없으면 기존 로직 사용
      const lines = content.split('\n').filter(line => line.trim())
      const newSteps: DeepResearchStep[] = []
      let currentStep: Partial<DeepResearchStep> | null = null
      let currentContent = ''
      let stepCounter = 0

      // If we have stepInfo, use it to create or update steps
      if (deepResearchStepInfo?.title) {
        const stepTitle = deepResearchStepInfo.title
        let stepContent = content
        
        // <진행중> 태그 확인 및 제거
        const isInProgress = stepContent.includes('<진행중>') && stepContent.includes('</진행중>')
        const cleanContent = stepContent.replace(/<진행중>|<\/진행중>/g, '')
        
        const isComplete = deepResearchStepInfo.isComplete || false
        const stepId = `${deepResearchStepType}-${stepTitle.replace(/\s+/g, '-').toLowerCase()}`
        
        // Find existing step or create new one - 함수형 업데이트 사용
        setSteps(prevSteps => {
          const existingStepIndex = prevSteps.findIndex(s => s.id === stepId)
          
          if (existingStepIndex >= 0) {
            // Update existing step
            const updatedSteps = [...prevSteps]
            updatedSteps[existingStepIndex] = {
              ...updatedSteps[existingStepIndex],
              content: cleanContent,
              status: isComplete ? 'completed' : (isInProgress ? 'in_progress' : 'pending')
            }
            setCurrentStepId(stepId)
            return updatedSteps
          } else {
            // Create new step
            const newStep: DeepResearchStep = {
              id: stepId,
              title: stepTitle,
              content: cleanContent,
              status: isComplete ? 'completed' : (isInProgress ? 'in_progress' : 'pending'),
              stepType: deepResearchStepType || 'step'
            }
            setCurrentStepId(stepId)
            return [...prevSteps, newStep]
          }
        })
        return
      }

      // Fallback to content-based parsing if no stepInfo
      for (const line of lines) {
        if (line.includes('분석 중...') || line.includes('진행 중...') || 
            line.includes('질문 분석 중...') || line.includes('" 분석 중...') ||
            line.includes('<진행중>') || line.includes('</진행중>')) {
          if (currentStep && currentContent.trim()) {
            currentStep.content = currentContent.trim()
            newSteps.push(currentStep as DeepResearchStep)
          }
          
          stepCounter++
          let stepTitle = line.replace(/[🔍🎯💡]/g, '').replace(/<진행중>|<\/진행중>/g, '').trim() || `단계 ${stepCounter}`
          const isInProgress = line.includes('<진행중>') && line.includes('</진행중>')
          
          currentStep = {
            id: `step-${stepCounter}-${Date.now()}`,
            title: stepTitle,
            content: '',
            status: isInProgress ? 'in_progress' : (isStreaming ? 'in_progress' : 'completed'),
            stepType: 'step'
          }
          currentContent = ''
        } else if (line.includes('종합 분석 중...') || line.includes('종합 분석') ||
                   line.includes('<진행중>종합 분석')) {
          if (currentStep && currentContent.trim()) {
            currentStep.content = currentContent.trim()
            newSteps.push(currentStep as DeepResearchStep)
          }
          
          const isInProgress = line.includes('<진행중>') && line.includes('</진행중>')
          
          currentStep = {
            id: `synthesis-${Date.now()}`,
            title: '종합 분석',
            content: '',
            status: isInProgress ? 'in_progress' : (isStreaming ? 'in_progress' : 'completed'),
            stepType: 'synthesis'
          }
          currentContent = ''
        } else if (line.includes('최종 답변 생성 중...') || line.includes('최종 답변') ||
                   line.includes('<진행중>최종 답변')) {
          if (currentStep && currentContent.trim()) {
            currentStep.content = currentContent.trim()
            newSteps.push(currentStep as DeepResearchStep)
          }
          
          const isInProgress = line.includes('<진행중>') && line.includes('</진행중>')
          
          currentStep = {
            id: `final-${Date.now()}`,
            title: '최종 답변',
            content: '',
            status: isInProgress ? 'in_progress' : (isStreaming ? 'in_progress' : 'completed'),
            stepType: 'final'
          }
          currentContent = ''
        } else if (line.trim() && !line.includes('딥리서치') && !line.includes('Deep Research')) {
          if (currentStep) {
            // <진행중> 태그 제거하여 내용 추가
            const cleanLine = line.replace(/<진행중>|<\/진행중>/g, '')
            currentContent += cleanLine + '\n'
          } else if (newSteps.length === 0) {
            const cleanLine = line.replace(/<진행중>|<\/진행중>/g, '')
            currentStep = {
              id: `step-1-${Date.now()}`,
              title: '딥리서치 분석',
              content: cleanLine + '\n',
              status: isStreaming ? 'in_progress' : 'completed',
              stepType: 'step'
            }
            currentContent = cleanLine + '\n'
          }
        }
      }

      // Add the last step
      if (currentStep && currentContent.trim()) {
        // <진행중> 태그 제거하여 저장
        const cleanContent = currentContent.replace(/<진행중>|<\/진행중>/g, '').trim()
        currentStep.content = cleanContent
        newSteps.push(currentStep as DeepResearchStep)
      }

      // Update steps status
      const updatedSteps = newSteps.map((step, index) => ({
        ...step,
        status: (isDeepResearchComplete ? 'completed' : 
                 (isStreaming && index === newSteps.length - 1) ? 'in_progress' : 'completed') as 'pending' | 'in_progress' | 'completed'
      }))

      setSteps(updatedSteps)
      
      // Keep current step ID for reference, but don't auto-open
      if (updatedSteps.length > 0) {
        const targetStep = isStreaming ? 
          updatedSteps[updatedSteps.length - 1] : 
          updatedSteps[0]
        setCurrentStepId(targetStep.id)
        // Don't auto-open - let user manually open steps
      }
    }

    parseSteps()
  }, [
    content, 
    isDeepResearchComplete, 
    isStreaming, 
    deepResearchStepType, 
    plannedSteps.length,
    deepResearchStepInfo?.title,
    deepResearchStepInfo?.currentStepContent,
    deepResearchStepInfo?.currentStepType,
    deepResearchStepInfo?.isComplete
  ])

  const toggleStep = (stepId: string) => {
    setOpenSteps(prev => {
      const newSet = new Set(prev)
      if (newSet.has(stepId)) {
        newSet.delete(stepId)
      } else {
        newSet.add(stepId)
      }
      return newSet
    })
  }

  const getStepIcon = (status: DeepResearchStep['status']) => {
    switch (status) {
      case 'completed':
        return <Check className="w-4 h-4 text-green-600" />
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
      case 'pending':
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    }
  }

  const getStepBadgeColor = (stepType: DeepResearchStep['stepType']) => {
    switch (stepType) {
      case 'step':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'synthesis':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'final':
        return 'bg-green-100 text-green-700 border-green-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (steps.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
        <Brain className="w-5 h-5 text-cyan-600" />
        <span className="text-sm text-cyan-700">딥리서치 분석 준비 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-cyan-600" />
        <span className="text-sm font-medium text-cyan-700">딥리서치 분석</span>
        <Badge variant="outline" className="text-xs">
          {steps.filter(s => s.status === 'completed').length}/{steps.length} 완료
        </Badge>
        {plannedSteps.length > 0 && (
          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-600">
            {plannedSteps.length}단계 계획
          </Badge>
        )}
      </div>

      {/* 계획된 스탭들이 있으면 전체 진행 상황 표시 */}
      {plannedSteps.length > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-700">분석 계획</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
                }}
              />
            </div>
            <span className="text-xs text-blue-600">
              {steps.filter(s => s.status === 'completed').length}/{steps.length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {plannedSteps.map((plannedStep, index) => {
              const stepStatus = steps[index]?.status || 'pending'
              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                    stepStatus === 'completed' 
                      ? 'bg-green-50 border border-green-200 text-green-700' 
                      : stepStatus === 'in_progress'
                      ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                      : 'bg-gray-50 border border-gray-200 text-gray-600'
                  }`}
                >
                  {getStepIcon(stepStatus)}
                  <span className="truncate">{plannedStep.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 각 스탭별 상세 내용 - 최종답변 제외 */}
      {steps.filter(step => step.stepType !== 'final').map((step) => (
        <Collapsible key={step.id} open={openSteps.has(step.id)}>
          <CollapsibleTrigger 
            className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => toggleStep(step.id)}
          >
            <div className="flex items-center gap-3">
              {getStepIcon(step.status)}
              <span className="text-sm font-medium text-gray-700">{step.title}</span>
              <Badge className={`text-xs ${getStepBadgeColor(step.stepType)}`}>
                {step.stepType === 'step' ? '분석' : step.stepType === 'synthesis' ? '종합' : '최종'}
              </Badge>
              {step.status === 'in_progress' && (
                <Badge className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700">
                  진행 중
                </Badge>
              )}
            </div>
            {openSteps.has(step.id) ? 
              <ChevronDown className="w-4 h-4 text-gray-500" /> : 
              <ChevronRight className="w-4 h-4 text-gray-500" />
            }
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200">
              {step.content ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  {step.content.split('\n').map((line, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  {step.status === 'pending' ? '대기 중...' : '분석 중...'}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* 최종답변 스탭 상태 표시 (내용은 메시지에서 표시) */}
      {steps.some(step => step.stepType === 'final') && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            {getStepIcon(steps.find(s => s.stepType === 'final')?.status || 'pending')}
            <span className="text-sm font-medium text-green-700">최종 답변</span>
            <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
              최종
            </Badge>
            {steps.find(s => s.stepType === 'final')?.status === 'in_progress' && (
              <Badge className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700">
                생성 중
              </Badge>
            )}
            {steps.find(s => s.stepType === 'final')?.status === 'completed' && (
              <Badge className="text-xs bg-green-50 border-green-200 text-green-700">
                완료
              </Badge>
            )}
          </div>
          <div className="mt-2 text-xs text-green-600">
            {steps.find(s => s.stepType === 'final')?.status === 'in_progress' 
              ? '최종 답변을 생성하고 있습니다...' 
              : '최종 답변이 아래에 표시됩니다.'}
          </div>
        </div>
      )}
    </div>
  )
} 