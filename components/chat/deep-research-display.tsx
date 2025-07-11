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
        if (deepResearchStepInfo?.title) {
          const stepTitle = deepResearchStepInfo.title
          const stepContent = deepResearchStepInfo.currentStepContent || ''
          const isComplete = deepResearchStepInfo.isComplete || false
          
          // 현재 스탭 찾기 - 함수형 업데이트 사용
          setSteps(prevSteps => {
            const currentStepIndex = prevSteps.findIndex(s => s.title === stepTitle)
            
            if (currentStepIndex >= 0) {
              const updatedSteps = [...prevSteps]
              
              // 새로운 단계가 시작될 때 이전 단계들을 완료 처리
              if (!isComplete) {
                for (let i = 0; i < currentStepIndex; i++) {
                  if (updatedSteps[i].status === 'in_progress') {
                    updatedSteps[i] = {
                      ...updatedSteps[i],
                      status: 'completed'
                    }
                  }
                }
              }
              
              updatedSteps[currentStepIndex] = {
                ...updatedSteps[currentStepIndex],
                content: stepContent,
                status: isComplete ? 'completed' : 'in_progress'
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
              
              // 최종답변이 시작될 때 이전 모든 단계들을 완료 처리
              if (!deepResearchStepInfo.isComplete) {
                for (let i = 0; i < finalStepIndex; i++) {
                  if (updatedSteps[i].status !== 'completed') {
                    updatedSteps[i] = {
                      ...updatedSteps[i],
                      status: 'completed'
                    }
                  }
                }
              }
              
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
              content: content,
              status: isComplete ? 'completed' : 'in_progress'
            }
            setCurrentStepId(stepId)
            return updatedSteps
          } else {
            // Create new step - 새로운 단계 생성 시 이전 단계들 완료 처리
            const updatedSteps = [...prevSteps]
            
            // 마지막 진행 중인 단계를 완료 처리
            for (let i = updatedSteps.length - 1; i >= 0; i--) {
              if (updatedSteps[i].status === 'in_progress') {
                updatedSteps[i] = {
                  ...updatedSteps[i],
                  status: 'completed'
                }
                break
              }
            }
            
            const newStep: DeepResearchStep = {
              id: stepId,
              title: stepTitle,
              content: content,
              status: isComplete ? 'completed' : 'in_progress',
              stepType: deepResearchStepType || 'step'
            }
            setCurrentStepId(stepId)
            return [...updatedSteps, newStep]
          }
        })
        return
      }

      // Fallback to content-based parsing if no stepInfo
      for (const line of lines) {
        if (line.includes('종합 분석') && !line.includes('중...')) {
          if (currentStep && currentContent.trim()) {
            currentStep.content = currentContent.trim()
            currentStep.status = 'completed'
            newSteps.push(currentStep as DeepResearchStep)
          }
          
          currentStep = {
            id: `synthesis-${Date.now()}`,
            title: '종합 분석',
            content: '',
            status: isStreaming ? 'in_progress' : 'completed',
            stepType: 'synthesis'
          }
          currentContent = ''
        } else if (line.includes('최종 답변') && !line.includes('중...')) {
          if (currentStep && currentContent.trim()) {
            currentStep.content = currentContent.trim()
            currentStep.status = 'completed'
            newSteps.push(currentStep as DeepResearchStep)
          }
          
          currentStep = {
            id: `final-${Date.now()}`,
            title: '최종 답변',
            content: '',
            status: isStreaming ? 'in_progress' : 'completed',
            stepType: 'final'
          }
          currentContent = ''
        } else if (line.trim() && !line.includes('딥리서치') && !line.includes('Deep Research')) {
          if (currentStep) {
            currentContent += line + '\n'
          } else if (newSteps.length === 0) {
            currentStep = {
              id: `step-1-${Date.now()}`,
              title: '딥리서치 분석',
              content: line + '\n',
              status: isStreaming ? 'in_progress' : 'completed',
              stepType: 'step'
            }
            currentContent = line + '\n'
          }
        }
      }

      // Add the last step
      if (currentStep && currentContent.trim()) {
        currentStep.content = currentContent.trim()
        newSteps.push(currentStep as DeepResearchStep)
      }

      // Update steps status
      const updatedSteps = newSteps.map((step, index) => {
        // 현재 스트리밍 중이고 마지막 단계인 경우만 in_progress, 나머지는 completed
        const isCurrentStep = isStreaming && index === newSteps.length - 1
        const isCompletedByDefault = isDeepResearchComplete || !isCurrentStep
        
        return {
          ...step,
          status: (isCompletedByDefault ? 'completed' : 'in_progress') as 'pending' | 'in_progress' | 'completed'
        }
      })

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
        return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-300 hover:text-blue-900'
      case 'synthesis':
        return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-300 hover:text-purple-900'
      case 'final':
        return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-300 hover:text-green-900'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-300 hover:text-gray-900'
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
                  <div className="flex-shrink-0">
                    {getStepIcon(stepStatus)}
                  </div>
                  <span className="truncate min-w-0">{plannedStep.title}</span>
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
            <div className="flex items-center gap-3 flex-wrap">
              {getStepIcon(step.status)}
              <span className="text-sm font-medium text-gray-700 truncate min-w-0 max-w-[50%]">{step.title}</span>
              <Badge className={`text-xs flex-shrink-0 ${getStepBadgeColor(step.stepType)}`}>
                {step.stepType === 'step' ? '분석' : step.stepType === 'synthesis' ? '종합' : '최종'}
              </Badge>
              {step.status === 'in_progress' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                  <Badge className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700 flex-shrink-0">
                    진행 중
                  </Badge>
                </div>
              )}
            </div>
            {openSteps.has(step.id) ? 
              <ChevronDown className="w-4 h-4 text-gray-500" /> : 
              <ChevronRight className="w-4 h-4 text-gray-500" />
            }
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border-l-4 border-blue-200">
              {step.status === 'in_progress' ? (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  </div>
                  <span>분석 중...</span>
                </div>
              ) : step.status === 'pending' ? (
                <div className="text-sm text-gray-500 italic">
                  대기 중...
                </div>
              ) : step.content ? (
                <div className="prose prose-sm max-w-none text-gray-700">
                  {step.content.split('\n').map((line, index) => (
                    <p key={index} className="mb-2 last:mb-0">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  내용이 없습니다.
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* 최종답변 스탭 상태 표시 (내용은 메시지에서 표시) */}
      {steps.some(step => step.stepType === 'final') && (
        <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-shrink-0">
              {getStepIcon(steps.find(s => s.stepType === 'final')?.status || 'pending')}
            </div>
            <span className="text-sm font-medium text-green-700">최종 답변</span>
            <Badge className="text-xs bg-green-100 text-green-700 border-green-200 flex-shrink-0 hover:bg-green-300 hover:text-green-900">
              최종
            </Badge>
            {steps.find(s => s.stepType === 'final')?.status === 'in_progress' && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
                <Badge className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700 flex-shrink-0">
                  생성 중
                </Badge>
              </div>
            )}
            {steps.find(s => s.stepType === 'final')?.status === 'completed' && (
              <Badge className="text-xs bg-green-50 border-green-200 text-green-700 flex-shrink-0 hover:bg-green-300 hover:text-green-900">
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