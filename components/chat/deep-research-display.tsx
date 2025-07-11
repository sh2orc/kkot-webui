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
  messageId?: string
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
    // 병렬 처리된 결과들을 위한 새로운 구조
    [key: string]: any
  }
}

export function DeepResearchDisplay({ 
  messageId,
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
  const [lastContentHash, setLastContentHash] = useState<string>('')
  const [lastMessageId, setLastMessageId] = useState<string>('')

  // 컴포넌트 마운트 시 로그
  useEffect(() => {
    console.log('🔷 DeepResearchDisplay MOUNTED:', {
      messageId,
      contentLength: content.length,
      contentPreview: content.substring(0, 100),
      plannedStepsFromInfo: deepResearchStepInfo?.plannedSteps?.map(s => s.title),
      stepType: deepResearchStepType,
      isComplete: isDeepResearchComplete,
      isStreaming
    })
  }, [])

  // 모든 props 변경사항 추적
  useEffect(() => {
    console.log('🔄 DeepResearchDisplay props changed:', {
      messageId,
      lastMessageId,
      contentLength: content.length,
      contentPreview: content.substring(0, 50),
      plannedStepsCount: deepResearchStepInfo?.plannedSteps?.length || 0,
      plannedStepsTitles: deepResearchStepInfo?.plannedSteps?.map(s => s.title.substring(0, 30)),
      currentStepsCount: steps.length,
      currentStepsTitles: steps.map(s => s.title.substring(0, 30)),
      stepType: deepResearchStepType,
      isComplete: isDeepResearchComplete,
      isStreaming
    })
  }, [messageId, content, deepResearchStepInfo, deepResearchStepType, isDeepResearchComplete, isStreaming, steps.length])

  // 메시지 ID 변경 감지 및 상태 완전 초기화
  useEffect(() => {
    console.log('DeepResearchDisplay - useEffect triggered:', { 
      messageId, 
      lastMessageId, 
      hasSteps: steps.length,
      plannedStepsLength: plannedSteps.length,
      contentPreview: content.substring(0, 50)
    })
    
    // 새로운 메시지가 시작될 때 완전 초기화
    if (messageId && messageId !== lastMessageId) {
      console.log('🔄 NEW MESSAGE DETECTED - Completely resetting all states:', { 
        newMessageId: messageId, 
        oldMessageId: lastMessageId,
        currentStepsCount: steps.length,
        currentPlannedStepsCount: plannedSteps.length
      })
      
      // 즉시 모든 상태 초기화
      setSteps([])
      setOpenSteps(new Set())
      setCurrentStepId(null)
      setPlannedSteps([])
      setLastContentHash('')
      setLastMessageId(messageId)
      return
    }
    
    // 같은 메시지 ID에서 새로운 딥리서치가 시작되는 경우 (plannedSteps가 새로 들어옴)
    if (messageId && messageId === lastMessageId && deepResearchStepInfo?.plannedSteps && deepResearchStepInfo.plannedSteps.length > 0) {
      const newPlannedStepsHash = deepResearchStepInfo.plannedSteps.map(s => s.title).join('|')
      const currentPlannedStepsHash = plannedSteps.map(s => s.title).join('|')
      
      if (newPlannedStepsHash !== currentPlannedStepsHash && newPlannedStepsHash.length > 0) {
        console.log('📋 NEW PLANNED STEPS DETECTED - Resetting for same message:', {
          messageId,
          newPlannedStepsHash: newPlannedStepsHash.substring(0, 100),
          currentPlannedStepsHash: currentPlannedStepsHash.substring(0, 100)
        })
        
        // 즉시 모든 상태 초기화
        setSteps([])
        setOpenSteps(new Set())
        setCurrentStepId(null)
        setPlannedSteps([])
        setLastContentHash('')
        
        // 새로운 plannedSteps 적용은 다음 useEffect에서 처리
        return
      }
    }
  }, [messageId, lastMessageId, deepResearchStepInfo?.plannedSteps])

  // messageId가 없는 경우 컨텐츠 기반 감지 (간소화)
  useEffect(() => {
    // messageId가 없으면 컨텐츠 해시 기반으로 새로운 딥리서치 감지
    if (!messageId) {
      console.log('⚠️ No messageId provided, using content-based detection')
      const contentHash = content.substring(0, 100) + (deepResearchStepInfo?.title || '')
      
      // 컨텐츠가 크게 변경되었으면 (새로운 질문) 상태 초기화
      if (lastContentHash && contentHash !== lastContentHash && content.length < 50) {
        console.log('📝 Content changed significantly (no messageId), resetting states')
        setSteps([])
        setOpenSteps(new Set())
        setCurrentStepId(null)
        setPlannedSteps([])
        setLastContentHash(contentHash)
        return
      }
      
      setLastContentHash(contentHash)
    }
  }, [content, deepResearchStepInfo?.title, lastContentHash, messageId])

  // 계획된 스탭들 처리 - 새로운 plannedSteps가 들어올 때마다 완전 초기화
  useEffect(() => {
    if (deepResearchStepInfo?.plannedSteps && deepResearchStepInfo.plannedSteps.length > 0) {
      const newPlannedSteps = deepResearchStepInfo.plannedSteps
      const newPlannedStepsHash = newPlannedSteps.map(s => s.title).join('|')
      const currentPlannedStepsHash = plannedSteps.map(s => s.title).join('|')
      
      console.log('🔍 Planned steps comparison:', {
        newCount: newPlannedSteps.length,
        currentCount: plannedSteps.length,
        newHash: newPlannedStepsHash.substring(0, 100),
        currentHash: currentPlannedStepsHash.substring(0, 100),
        areEqual: newPlannedStepsHash === currentPlannedStepsHash
      })
      
      // 새로운 plannedSteps가 들어오면 항상 완전 초기화
      if (newPlannedStepsHash !== currentPlannedStepsHash) {
        console.log('📋 NEW PLANNED STEPS - Complete reset and initialization:', {
          messageId,
          from: currentPlannedStepsHash.substring(0, 50),
          to: newPlannedStepsHash.substring(0, 50)
        })
        
        // 완전 상태 초기화 후 새로운 상태 설정
        setSteps([])
        setOpenSteps(new Set())
        setCurrentStepId(null)
        setLastContentHash('')
        setPlannedSteps(newPlannedSteps)
        
        // 새로운 plannedSteps를 기반으로 초기 스탭 구조 생성
        const initialSteps: DeepResearchStep[] = newPlannedSteps.map((plannedStep, index) => ({
          id: `planned-step-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 고유 ID 생성
          title: plannedStep.title,
          content: '',
          status: 'pending' as const,
          stepType: plannedStep.type as 'step' | 'synthesis' | 'final'
        }))
        
        console.log('🆕 Created fresh initial steps:', initialSteps.map(s => ({ id: s.id, title: s.title.substring(0, 30) })))
        setSteps(initialSteps)
        return
      }
    }
  }, [deepResearchStepInfo?.plannedSteps])

  // Parse content and extract steps using both content and stepInfo
  useEffect(() => {
    const parseSteps = () => {
      // 새로운 병렬 처리 데이터 구조 처리
      if (deepResearchStepInfo && Object.keys(deepResearchStepInfo).length > 0) {
        console.log('🔍 Processing parallel deep research data:', deepResearchStepInfo);
        
        const newSteps: DeepResearchStep[] = []
        
        // deepResearchStepInfo의 모든 키를 순회하면서 결과들을 수집
        Object.entries(deepResearchStepInfo).forEach(([key, value]) => {
          if (typeof value === 'object' && value !== null && 'content' in value) {
            const stepData = value as any
            
            // Sub-question 분석 결과 처리
            if (key.startsWith('subq_')) {
              newSteps.push({
                id: key,
                title: stepData.title || `Sub-question ${stepData.index + 1}`,
                content: stepData.content || '',
                status: stepData.isComplete ? 'completed' : (stepData.hasError ? 'pending' : 'in_progress'),
                stepType: 'step'
              })
            }
            // 종합 분석 결과 처리
            else if (key.startsWith('synthesis_') || stepData.isSynthesis) {
              newSteps.push({
                id: key,
                title: stepData.title || 'Synthesis Analysis',
                content: stepData.content || '',
                status: stepData.isComplete ? 'completed' : 'in_progress',
                stepType: 'synthesis'
              })
            }
            // 최종 답변 처리
            else if (key.startsWith('final_answer_') || stepData.isFinalAnswer) {
              newSteps.push({
                id: key,
                title: stepData.title || 'Final Answer',
                content: stepData.content || '',
                status: stepData.isComplete ? 'completed' : 'in_progress',
                stepType: 'final'
              })
            }
          }
        })
        
        // 단계들을 적절한 순서로 정렬
        const sortedSteps = newSteps.sort((a, b) => {
          // 순서: sub-questions -> synthesis -> final answer
          const getOrder = (step: DeepResearchStep) => {
            if (step.stepType === 'step') return 1
            if (step.stepType === 'synthesis') return 2
            if (step.stepType === 'final') return 3
            return 0
          }
          
          const orderA = getOrder(a)
          const orderB = getOrder(b)
          
          if (orderA !== orderB) {
            return orderA - orderB
          }
          
          // 같은 타입 내에서는 index 또는 ID로 정렬
          if (a.stepType === 'step' && b.stepType === 'step') {
            const aData = deepResearchStepInfo[a.id]
            const bData = deepResearchStepInfo[b.id]
            return (aData?.index || 0) - (bData?.index || 0)
          }
          
          return 0
        })
        
                 console.log('📊 Processed parallel steps:', sortedSteps.map(s => ({ 
           id: s.id, 
           title: s.title.substring(0, 30), 
           status: s.status, 
           type: s.stepType 
         })))
         
         console.log('📊 Steps by type:');
         console.log('- Sub-questions:', sortedSteps.filter(s => s.stepType === 'step').length);
         console.log('- Synthesis:', sortedSteps.filter(s => s.stepType === 'synthesis').length);
         console.log('- Final answers:', sortedSteps.filter(s => s.stepType === 'final').length);
         
         setSteps(sortedSteps)
        
        // 현재 진행 중인 단계 설정
        const currentStep = sortedSteps.find(s => s.status === 'in_progress')
        if (currentStep) {
          setCurrentStepId(currentStep.id)
        }
        
        return
      }
      
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
              
              // 개선된 파싱 로직 적용
              const parsedContent = parseStepContent(stepContent, stepTitle)
              
              updatedSteps[currentStepIndex] = {
                ...updatedSteps[currentStepIndex],
                content: parsedContent,
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
            
            // 개선된 파싱 로직 적용
            const parsedContent = parseStepContent(content, stepTitle)
            
            updatedSteps[existingStepIndex] = {
              ...updatedSteps[existingStepIndex],
              content: parsedContent,
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
            
            // 개선된 파싱 로직 적용
            const parsedContent = parseStepContent(content, stepTitle)
            
            const newStep: DeepResearchStep = {
              id: stepId,
              title: stepTitle,
              content: parsedContent,
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
    deepResearchStepInfo?.isComplete,
    // 병렬 처리된 결과들의 변경 감지를 위해 전체 stepInfo 객체 감지
    deepResearchStepInfo && Object.keys(deepResearchStepInfo).length,
    // 각 단계의 완료 상태 변경 감지
    deepResearchStepInfo && Object.values(deepResearchStepInfo).filter(v => 
      typeof v === 'object' && v !== null && 'isComplete' in v
    ).map(v => (v as any).isComplete).join(',')
  ])

  // 개선된 스탭 내용 파싱 함수 (마크다운 없는 구조에 맞게 수정)
  const parseStepContent = (content: string, stepTitle: string): string => {
    if (!content) return ''
    
    // 구분자 기반 파싱
    const sections = parseContentSections(content)
    
    if (sections.length > 0) {
      // 구분자가 있으면 섹션별로 정리해서 반환 (마크다운 없이)
      return sections.map(section => {
        const { title, content: sectionContent } = section
        return `${title}\n${sectionContent}`
      }).join('\n\n')
    }
    
    // 구분자가 없으면 원본 내용 반환
    return content
  }

  // 내용을 섹션별로 파싱하는 함수 (마크다운 없는 구조에 맞게 수정)
  const parseContentSections = (content: string): Array<{ title: string, content: string }> => {
    const sections: Array<{ title: string, content: string }> = []
    const lines = content.split('\n')
    
    let currentSection: { title: string, content: string } | null = null
    let currentSubSection: { title: string, content: string } | null = null
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // 주요 섹션 헤더 감지 ([Analysis Start] 형태)
      if (trimmedLine.startsWith('[Analysis Start]')) {
        // 이전 서브섹션과 섹션 저장
        if (currentSubSection && currentSubSection.content.trim()) {
          if (currentSection) {
            currentSection.content += `\n${currentSubSection.title}\n${currentSubSection.content}`
          }
          currentSubSection = null
        }
        if (currentSection && currentSection.content.trim()) {
          sections.push(currentSection)
        }
        
        // 새 섹션 시작
        const title = trimmedLine.replace(/^\[Analysis Start\]\s*/, '').trim()
        currentSection = { title: title || 'Analysis', content: '' }
      } 
      // 하위 섹션 헤더 감지 (콜론으로 끝나는 라인)
      else if (trimmedLine.endsWith(':') && trimmedLine.length > 1 && !trimmedLine.includes('http')) {
        // 이전 서브섹션 저장
        if (currentSubSection && currentSubSection.content.trim()) {
          if (currentSection) {
            currentSection.content += `\n${currentSubSection.title}\n${currentSubSection.content}`
          }
        }
        
        // 새 서브섹션 시작 (콜론 제거)
        const subTitle = trimmedLine.replace(/:$/, '').trim()
        currentSubSection = { title: subTitle, content: '' }
      }
      // 리스트 항목 처리
      else if (trimmedLine.startsWith('- ') && trimmedLine.length > 2) {
        const listItem = trimmedLine.replace(/^- /, '').trim()
        if (currentSubSection) {
          currentSubSection.content += `• ${listItem}\n`
        } else if (currentSection) {
          currentSection.content += `• ${listItem}\n`
        }
      }
      // 일반 텍스트 처리
      else if (trimmedLine && !trimmedLine.startsWith('[') && !trimmedLine.startsWith('#')) {
        if (currentSubSection) {
          currentSubSection.content += `${trimmedLine}\n`
        } else if (currentSection) {
          currentSection.content += `${trimmedLine}\n`
        }
      }
    }
    
    // 마지막 서브섹션과 섹션 저장
    if (currentSubSection && currentSubSection.content.trim()) {
      if (currentSection) {
        currentSection.content += `\n${currentSubSection.title}\n${currentSubSection.content}`
      }
    }
    if (currentSection && currentSection.content.trim()) {
      sections.push(currentSection)
    }
    
    return sections
  }

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