"use client"

import React, { useState, useEffect } from "react"
import { ChevronDown, ChevronRight, Check, Loader2, Brain } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { marked } from 'marked'
import { useTranslation } from "@/lib/i18n"

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
    // New structure for parallel processed results
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
  const { lang } = useTranslation("chat")
  const [steps, setSteps] = useState<DeepResearchStep[]>([])
  const [openSteps, setOpenSteps] = useState<Set<string>>(new Set())
  const [currentStepId, setCurrentStepId] = useState<string | null>(null)
  const [plannedSteps, setPlannedSteps] = useState<Array<{ title: string, type: string }>>([])
  const [lastContentHash, setLastContentHash] = useState<string>('')
  const [lastMessageId, setLastMessageId] = useState<string>('')
  const [processedStepInfoHash, setProcessedStepInfoHash] = useState<string>('')

  // Component mount log
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

  // Track all props changes
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
      isStreaming,
      // More detailed stepInfo debugging
      stepInfoKeys: deepResearchStepInfo ? Object.keys(deepResearchStepInfo) : [],
      hasPlannedSteps: !!(deepResearchStepInfo?.plannedSteps),
      rawPlannedSteps: deepResearchStepInfo?.plannedSteps
    })
  }, [messageId, content, deepResearchStepInfo, deepResearchStepType, isDeepResearchComplete, isStreaming, steps.length])

  // Message ID change detection and complete state initialization
  useEffect(() => {
    console.log('DeepResearchDisplay - useEffect triggered:', { 
      messageId, 
      lastMessageId, 
      hasSteps: steps.length,
      plannedStepsLength: plannedSteps.length,
      contentPreview: content.substring(0, 50)
    })
    
    // Complete initialization when a new message starts
    if (messageId && messageId !== lastMessageId) {
      console.log('🔄 NEW MESSAGE DETECTED - Completely resetting all states:', { 
        newMessageId: messageId, 
        oldMessageId: lastMessageId,
        currentStepsCount: steps.length,
        currentPlannedStepsCount: plannedSteps.length
      })
      
              // Immediately reset all states
        setSteps([])
        setOpenSteps(new Set())
        setCurrentStepId(null)
        setPlannedSteps([])
        setLastContentHash('')
        setProcessedStepInfoHash('')
        setLastMessageId(messageId)
      return
    }
    
    // When a new deep research starts with the same message ID (new plannedSteps arrived)
    if (messageId && messageId === lastMessageId && deepResearchStepInfo?.plannedSteps && deepResearchStepInfo.plannedSteps.length > 0) {
      const newPlannedStepsHash = deepResearchStepInfo.plannedSteps.map(s => s.title).join('|')
      const currentPlannedStepsHash = plannedSteps.map(s => s.title).join('|')
      
      if (newPlannedStepsHash !== currentPlannedStepsHash && newPlannedStepsHash.length > 0) {
        console.log('📋 NEW PLANNED STEPS DETECTED - Resetting for same message:', {
          messageId,
          newPlannedStepsHash: newPlannedStepsHash.substring(0, 100),
          currentPlannedStepsHash: currentPlannedStepsHash.substring(0, 100)
        })
        
        // Immediately reset all states
        setSteps([])
        setOpenSteps(new Set())
        setCurrentStepId(null)
        setPlannedSteps([])
        setLastContentHash('')
        
        // New plannedSteps will be applied in the next useEffect
        return
      }
    }
  }, [messageId, lastMessageId, deepResearchStepInfo?.plannedSteps])

  // Content-based detection when messageId is not available (simplified)
  useEffect(() => {
    // Use content hash based detection for new deep research when messageId is not available
    if (!messageId) {
      console.log('⚠️ No messageId provided, using content-based detection')
      const contentHash = content.substring(0, 100) + (deepResearchStepInfo?.title || '')
      
              // Reset states if content has changed significantly (new question)
        if (lastContentHash && contentHash !== lastContentHash && content.length < 50) {
          console.log('📝 Content changed significantly (no messageId), resetting states')
          setSteps([])
          setOpenSteps(new Set())
          setCurrentStepId(null)
          setPlannedSteps([])
          setProcessedStepInfoHash('')
          setLastContentHash(contentHash)
          return
        }
      
      setLastContentHash(contentHash)
    }
  }, [content, deepResearchStepInfo?.title, lastContentHash, messageId])

  // Process planned steps - complete reset whenever new plannedSteps arrive
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
      
      // Always complete reset when new plannedSteps arrive
      if (newPlannedStepsHash !== currentPlannedStepsHash) {
        console.log('📋 NEW PLANNED STEPS - Complete reset and initialization:', {
          messageId,
          from: currentPlannedStepsHash.substring(0, 50),
          to: newPlannedStepsHash.substring(0, 50)
        })
        
        // Complete state reset and new state initialization
        setSteps([])
        setOpenSteps(new Set())
        setCurrentStepId(null)
        setLastContentHash('')
        setProcessedStepInfoHash('')
        setPlannedSteps(newPlannedSteps)
        
        // Create initial step structure based on new plannedSteps
        const initialSteps: DeepResearchStep[] = newPlannedSteps.map((plannedStep, index) => ({
          id: `planned-step-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
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

  // Process new parallel processing data structure
  useEffect(() => {
    const parseSteps = () => {
      // New parallel processing data structure handling
      if (deepResearchStepInfo && Object.keys(deepResearchStepInfo).length > 0) {
        // Create hash to detect changes in stepInfo
        const stepInfoHash = JSON.stringify(
          Object.fromEntries(
            Object.entries(deepResearchStepInfo)
              .filter(([key, value]) => typeof value === 'object' && value !== null && 'content' in value)
              .map(([key, value]) => [key, { 
                title: (value as any).title, 
                isComplete: (value as any).isComplete,
                hasError: (value as any).hasError 
              }])
          )
        )
        
        // Skip processing if stepInfo hasn't changed
        if (stepInfoHash === processedStepInfoHash) {
          console.log('🔍 Step info unchanged, skipping processing');
          return
        }
        
        console.log('🔍 Processing parallel deep research data:');
        console.log('🔍 Keys in stepInfo:', Object.keys(deepResearchStepInfo));
        console.log('🔍 Current steps before processing:', steps.map(s => ({ id: s.id, title: s.title.substring(0, 30), type: s.stepType })));
        
        setProcessedStepInfoHash(stepInfoHash)
        const newSteps: DeepResearchStep[] = []
        
        // Iterate through all keys in deepResearchStepInfo to collect results
        console.log('🔍 deepResearchStepInfo keys:', Object.keys(deepResearchStepInfo));
        console.log('🔍 deepResearchStepInfo entries:', Object.entries(deepResearchStepInfo));
        
        // Force display final answer if it exists in deepResearchStepInfo
        const finalAnswerKeys = Object.keys(deepResearchStepInfo).filter(key => 
          key.startsWith('final_answer_') || 
          (deepResearchStepInfo[key] && typeof deepResearchStepInfo[key] === 'object' && 
           ((deepResearchStepInfo[key] as any).isFinalAnswer || (deepResearchStepInfo[key] as any).title === 'Final Answer'))
        );
        
        console.log('🔍 Final answer keys found:', finalAnswerKeys);
        
        // If we have final answer keys, force add them to steps
        finalAnswerKeys.forEach(key => {
          const stepData = deepResearchStepInfo[key] as any;
          console.log('🎯 Force adding final answer step:', key, stepData);
          
          newSteps.push({
            id: key,
            title: 'Final Answer',
            content: stepData.content || '',
            status: 'completed',
            stepType: 'final'
          });
        });
        
        Object.entries(deepResearchStepInfo).forEach(([key, value]) => {
          console.log('🔍 Processing key:', key, 'value type:', typeof value, 'value:', value);
          
          if (typeof value === 'object' && value !== null && 'content' in value) {
            const stepData = value as any
            console.log('🔍 Valid stepData for key:', key, 'stepData:', stepData);
            
            // Sub-question analysis result processing
            if (key.startsWith('subq_')) {
              newSteps.push({
                id: key,
                title: stepData.title || `Sub-question ${stepData.index + 1}`,
                content: stepData.content || '',
                status: stepData.isComplete ? 'completed' : (stepData.hasError ? 'pending' : 'in_progress'),
                stepType: 'step'
              })
            }
            // Synthesis analysis result processing
            else if (key.startsWith('synthesis_') || stepData.isSynthesis) {
              newSteps.push({
                id: key,
                title: stepData.title || 'Synthesis Analysis',
                content: stepData.content || '',
                status: stepData.isComplete ? 'completed' : 'in_progress',
                stepType: 'synthesis'
              })
            }
            // Final answer processing
            else if (key.startsWith('final_answer_') || stepData.isFinalAnswer) {
              console.log('🎯 Processing final answer:', {
                key,
                title: stepData.title,
                contentLength: stepData.content?.length || 0,
                contentPreview: stepData.content?.substring(0, 100) || '',
                isComplete: stepData.isComplete,
                isFinalAnswer: stepData.isFinalAnswer
              })
              newSteps.push({
                id: key,
                title: stepData.title || 'Final Answer',
                content: stepData.content || '',
                status: stepData.isComplete ? 'completed' : 'in_progress',
                stepType: 'final'
              })
            }
            // Additional catch-all for final answer (in case key doesn't match expected patterns)
            else if (stepData.title === 'Final Answer' || stepData.isFinalAnswer === true) {
              console.log('🎯 Processing final answer (catch-all):', {
                key,
                title: stepData.title,
                contentLength: stepData.content?.length || 0,
                contentPreview: stepData.content?.substring(0, 100) || '',
                isComplete: stepData.isComplete,
                isFinalAnswer: stepData.isFinalAnswer
              })
              newSteps.push({
                id: key,
                title: stepData.title || 'Final Answer',
                content: stepData.content || '',
                status: stepData.isComplete ? 'completed' : 'in_progress',
                stepType: 'final'
              })
            }
            // Log unmatched keys for debugging
            else if (typeof value === 'object' && value !== null) {
              console.log('🔍 Unmatched stepInfo key:', key, 'value:', value)
            }
          }
        })
        
        // Remove duplicates based on title, stepType, and ID
        const uniqueSteps = newSteps.filter((step, index, array) => {
          return !array.slice(0, index).some(existingStep => 
            (existingStep.id === step.id) ||
            (existingStep.title === step.title && existingStep.stepType === step.stepType)
          )
        })
        
        console.log('🔄 Removed duplicates:', newSteps.length, '->', uniqueSteps.length)
        if (newSteps.length !== uniqueSteps.length) {
          console.log('🔄 Duplicates found:', newSteps.filter((step, index, array) => 
            array.slice(0, index).some(existingStep => 
              (existingStep.id === step.id) ||
              (existingStep.title === step.title && existingStep.stepType === step.stepType)
            )
          ).map(s => ({ id: s.id, title: s.title.substring(0, 30), type: s.stepType })))
        }
        
        // Sort steps in appropriate order
        const sortedSteps = uniqueSteps.sort((a, b) => {
          // Order: sub-questions -> synthesis -> final answer
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
          
          // Sort within the same type by index or ID
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
         
         // Replace with new steps (already deduplicated)
         setSteps(sortedSteps)
        
        // Set current step
        const currentStep = sortedSteps.find(s => s.status === 'in_progress')
        if (currentStep) {
          setCurrentStepId(currentStep.id)
        }
        
        // Auto-open final answer when completed
        const finalStep = sortedSteps.find(s => s.stepType === 'final')
        if (finalStep && finalStep.status === 'completed' && finalStep.content) {
          setOpenSteps(prev => new Set(prev).add(finalStep.id))
        }
        
        return
      }
      
      // If there are planned steps, update them
      if (plannedSteps.length > 0) {
        // Update current step content
        if (deepResearchStepInfo?.title) {
          const stepTitle = deepResearchStepInfo.title
          const stepContent = deepResearchStepInfo.currentStepContent || ''
          const isComplete = deepResearchStepInfo.isComplete || false
          
          // Find current step - use functional update
          setSteps(prevSteps => {
            const currentStepIndex = prevSteps.findIndex(s => s.title === stepTitle)
            
            if (currentStepIndex >= 0) {
              const updatedSteps = [...prevSteps]
              
              // Complete previous steps when a new step starts
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
              
              // Apply improved parsing logic
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
        
        // If it's a final answer, display in message content, so update status only
        if (deepResearchStepInfo?.currentStepType === 'final') {
          setSteps(prevSteps => {
            const finalStepIndex = prevSteps.findIndex(s => s.stepType === 'final')
            if (finalStepIndex >= 0) {
              const updatedSteps = [...prevSteps]
              
              // Complete all previous steps when a final answer starts
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
      
      // If no planned steps, use original logic
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
        
        // Find existing step or create new one - use functional update
        setSteps(prevSteps => {
          const existingStepIndex = prevSteps.findIndex(s => s.id === stepId)
          
          if (existingStepIndex >= 0) {
            // Update existing step
            const updatedSteps = [...prevSteps]
            
            // Apply improved parsing logic
            const parsedContent = parseStepContent(content, stepTitle)
            
            updatedSteps[existingStepIndex] = {
              ...updatedSteps[existingStepIndex],
              content: parsedContent,
              status: isComplete ? 'completed' : 'in_progress'
            }
            setCurrentStepId(stepId)
            return updatedSteps
          } else {
            // Create new step - complete previous steps when creating a new step
            const updatedSteps = [...prevSteps]
            
            // Complete the last in-progress step
            for (let i = updatedSteps.length - 1; i >= 0; i--) {
              if (updatedSteps[i].status === 'in_progress') {
                updatedSteps[i] = {
                  ...updatedSteps[i],
                  status: 'completed'
                }
                break
              }
            }
            
            // Apply improved parsing logic
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
        if (line.includes('Synthesis Analysis') && !line.includes('...')) {
          if (currentStep && currentContent.trim()) {
            currentStep.content = currentContent.trim()
            currentStep.status = 'completed'
            newSteps.push(currentStep as DeepResearchStep)
          }
          
          currentStep = {
            id: `synthesis-${Date.now()}`,
            title: 'Synthesis Analysis',
            content: '',
            status: isStreaming ? 'in_progress' : 'completed',
            stepType: 'synthesis'
          }
          currentContent = ''
        } else if (line.includes('Final Answer') && !line.includes('...')) {
          if (currentStep && currentContent.trim()) {
            currentStep.content = currentContent.trim()
            currentStep.status = 'completed'
            newSteps.push(currentStep as DeepResearchStep)
          }
          
          currentStep = {
            id: `final-${Date.now()}`,
            title: 'Final Answer',
            content: '',
            status: isStreaming ? 'in_progress' : 'completed',
            stepType: 'final'
          }
          currentContent = ''
        } else if (line.trim() && !line.includes('Deep Research') && !line.includes('Deep Research')) {
          if (currentStep) {
            currentContent += line + '\n'
          } else if (newSteps.length === 0) {
            currentStep = {
              id: `step-1-${Date.now()}`,
              title: 'Deep Research Analysis',
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
        // Only in_progress if streaming and last step, otherwise completed
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
    // Detect changes in parallel processing results to monitor the entire stepInfo object
    deepResearchStepInfo && Object.keys(deepResearchStepInfo).length,
    // Detect changes in completion status of each step
    deepResearchStepInfo && Object.values(deepResearchStepInfo).filter(v => 
      typeof v === 'object' && v !== null && 'isComplete' in v
    ).map(v => (v as any).isComplete).join(',')
  ])

  // Improved step content parsing function (modified for structure without markdown)
  const parseStepContent = (content: string, stepTitle: string): string => {
    if (!content) return ''
    
    // Parse based on separators
    const sections = parseContentSections(content)
    
    if (sections.length > 0) {
      // If separators exist, return organized sections (without markdown)
      return sections.map(section => {
        const { title, content: sectionContent } = section
        return `${title}\n${sectionContent}`
      }).join('\n\n')
    }
    
    // Return original content if no separators found
    return content
  }

  // Function to parse content into sections (modified for structure without markdown)
  const parseContentSections = (content: string): Array<{ title: string, content: string }> => {
    const sections: Array<{ title: string, content: string }> = []
    const lines = content.split('\n')
    
    let currentSection: { title: string, content: string } | null = null
    let currentSubSection: { title: string, content: string } | null = null
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Detect main section header ([Analysis Start] type)
      if (trimmedLine.startsWith('[Analysis Start]')) {
        // Save previous sub-section and section
        if (currentSubSection && currentSubSection.content.trim()) {
          if (currentSection) {
            currentSection.content += `\n${currentSubSection.title}\n${currentSubSection.content}`
          }
          currentSubSection = null
        }
        if (currentSection && currentSection.content.trim()) {
          sections.push(currentSection)
        }
        
        // Start new section
        const title = trimmedLine.replace(/^\[Analysis Start\]\s*/, '').trim()
        currentSection = { title: title || 'Analysis', content: '' }
      } 
      // Detect sub-section header (line ending with colon)
      else if (trimmedLine.endsWith(':') && trimmedLine.length > 1 && !trimmedLine.includes('http')) {
        // Save previous sub-section
        if (currentSubSection && currentSubSection.content.trim()) {
          if (currentSection) {
            currentSection.content += `\n${currentSubSection.title}\n${currentSubSection.content}`
          }
        }
        
        // Start new sub-section (remove colon)
        const subTitle = trimmedLine.replace(/:$/, '').trim()
        currentSubSection = { title: subTitle, content: '' }
      }
      // Handle list items
      else if (trimmedLine.startsWith('- ') && trimmedLine.length > 2) {
        const listItem = trimmedLine.replace(/^- /, '').trim()
        if (currentSubSection) {
          currentSubSection.content += `• ${listItem}\n`
        } else if (currentSection) {
          currentSection.content += `• ${listItem}\n`
        }
      }
      // Handle general text
      else if (trimmedLine && !trimmedLine.startsWith('[') && !trimmedLine.startsWith('#')) {
        if (currentSubSection) {
          currentSubSection.content += `${trimmedLine}\n`
        } else if (currentSection) {
          currentSection.content += `${trimmedLine}\n`
        }
      }
    }
    
    // Save last sub-section and section
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
        <span className="text-sm text-cyan-700">{lang("deepResearch.preparation")}</span>
      </div>
    )
  }

  // Debug: Log progress calculation
  const completedSteps = steps.filter(s => s.status === 'completed').length
  const totalSteps = steps.length
  console.log('🔢 Progress calculation:', {
    completedSteps,
    totalSteps,
    stepsDetails: steps.map(s => ({ title: s.title.substring(0, 30), status: s.status, type: s.stepType })),
    plannedStepsCount: plannedSteps.length
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-5 h-5 text-cyan-600" />
        <span className="text-sm font-medium text-cyan-700">{lang("deepResearch.title")}</span>
        <Badge variant="outline" className="text-xs">
          {/* Show the number of the current step in progress, not the number of completed steps */}
          {Math.min(completedSteps + 1, totalSteps)}/{totalSteps} {lang("deepResearch.completed")}
        </Badge>
        {plannedSteps.length > 0 && (
          <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-600">
            {plannedSteps.length} {lang("deepResearch.stepsTotal")}
          </Badge>
        )}
      </div>

      {/* If there are planned steps, show overall progress */}
      {plannedSteps.length > 0 && (
        <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg hidden">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-700">{lang("deepResearch.analysisProgress")}</span>
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
              // Find matching step by title or use index-based fallback
              const matchingStep = steps.find(step => 
                step.title === plannedStep.title || 
                step.title.includes(plannedStep.title.substring(0, 20)) ||
                plannedStep.title.includes(step.title.substring(0, 20))
              ) || steps[index]
              const stepStatus = matchingStep?.status || 'pending'
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

      {/* Detailed content for each step - excluding final answer */}
      {steps.filter(step => step.stepType !== 'final').map((step, index) => (
        <Collapsible key={step.id} open={openSteps.has(step.id)}>
          <CollapsibleTrigger 
            className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            onClick={() => toggleStep(step.id)}
          >
            <div className="flex items-center gap-3 flex-wrap">
              {getStepIcon(step.status)}
              <span className="text-sm font-medium text-gray-700 truncate min-w-0 max-w-[90%]">{step.title}</span>
              <Badge className={`text-xs flex-shrink-0 ${getStepBadgeColor(step.stepType)}`}>
                {step.stepType === 'step' ? lang("deepResearch.stepTypes.analysis") : step.stepType === 'synthesis' ? lang("deepResearch.stepTypes.synthesis") : lang("deepResearch.stepTypes.final")}
              </Badge>
              {/* 각 단계별 카운팅 제거 */}
              {step.status === 'in_progress' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                  <Badge className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700 flex-shrink-0">
                    {lang("deepResearch.status.inProgress")}
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
                  <span>{lang("deepResearch.status.analyzing")}</span>
                </div>
              ) : step.status === 'pending' ? (
                <div className="text-sm text-gray-500 italic">
                  {lang("deepResearch.status.pending")}
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
                  {lang("deepResearch.status.noContent")}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* Display final answer with full content */}
      {(() => {
        const finalStep = steps.find(step => step.stepType === 'final')
        
        // Also check if there's a final answer in deepResearchStepInfo even if no final step exists
        const finalAnswerFromStepInfo = Object.entries(deepResearchStepInfo || {}).find(([key, value]) => {
          if (typeof value === 'object' && value !== null) {
            const stepData = value as any
            return key.startsWith('final_answer_') || stepData.isFinalAnswer || stepData.title === 'Final Answer'
          }
          return false
        })
        
        console.log('🎯 Final answer display check:', {
          hasFinalStep: !!finalStep,
          finalStepId: finalStep?.id,
          finalStepTitle: finalStep?.title,
          finalStepStatus: finalStep?.status,
          finalStepContentLength: finalStep?.content?.length || 0,
          finalStepContentPreview: finalStep?.content?.substring(0, 100) || '',
          hasFinalAnswerFromStepInfo: !!finalAnswerFromStepInfo,
          finalAnswerFromStepInfoKey: finalAnswerFromStepInfo?.[0],
          finalAnswerFromStepInfoContent: finalAnswerFromStepInfo?.[1] ? (finalAnswerFromStepInfo[1] as any).content?.substring(0, 100) : ''
        })
        
        return !!finalStep || !!finalAnswerFromStepInfo
      })() && (
        <Collapsible>
          <CollapsibleTrigger 
            className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            onClick={() => {
              const finalStep = steps.find(s => s.stepType === 'final');
              if (finalStep) {
                toggleStep(finalStep.id);
              } else {
                // If no final step exists, try to find from deepResearchStepInfo
                const finalAnswerFromStepInfo = Object.entries(deepResearchStepInfo || {}).find(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                    const stepData = value as any
                    return key.startsWith('final_answer_') || stepData.isFinalAnswer || stepData.title === 'Final Answer'
                  }
                  return false
                })
                
                if (finalAnswerFromStepInfo) {
                  const [key] = finalAnswerFromStepInfo
                  toggleStep(key);
                }
              }
            }}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-shrink-0">
                {(() => {
                  const finalStep = steps.find(s => s.stepType === 'final');
                  if (finalStep) {
                    return getStepIcon(finalStep.status);
                  }
                  
                  // Check from deepResearchStepInfo if no final step exists
                  const finalAnswerFromStepInfo = Object.entries(deepResearchStepInfo || {}).find(([key, value]) => {
                    if (typeof value === 'object' && value !== null) {
                      const stepData = value as any
                      return key.startsWith('final_answer_') || stepData.isFinalAnswer || stepData.title === 'Final Answer'
                    }
                    return false
                  })
                  
                  if (finalAnswerFromStepInfo) {
                    const [, stepData] = finalAnswerFromStepInfo
                    const finalAnswerData = stepData as any
                    return getStepIcon(finalAnswerData.isComplete ? 'completed' : 'in_progress');
                  }
                  
                  return getStepIcon('pending');
                })()}
              </div>
              <span className="text-sm font-medium text-green-700 truncate min-w-0 max-w-[90%]">
                {lang("deepResearch.finalAnswer")}
              </span>
              <Badge className={`text-xs flex-shrink-0 ${getStepBadgeColor('final')}`}>
                {lang("deepResearch.stepTypes.final")}
              </Badge>
              {/* 최종 단계 카운팅 제거 */}
              {(() => {
                const finalStep = steps.find(s => s.stepType === 'final');
                if (finalStep) {
                  return finalStep.status === 'in_progress';
                }
                
                // Check from deepResearchStepInfo if no final step exists
                const finalAnswerFromStepInfo = Object.entries(deepResearchStepInfo || {}).find(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                    const stepData = value as any
                    return key.startsWith('final_answer_') || stepData.isFinalAnswer || stepData.title === 'Final Answer'
                  }
                  return false
                })
                
                if (finalAnswerFromStepInfo) {
                  const [, stepData] = finalAnswerFromStepInfo
                  const finalAnswerData = stepData as any
                  return !finalAnswerData.isComplete;
                }
                
                return false;
              })() && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                  </div>
                  <Badge className="text-xs bg-yellow-50 border-yellow-200 text-yellow-700 flex-shrink-0">
                    {lang("deepResearch.status.generating")}
                  </Badge>
                </div>
              )}
              {(() => {
                const finalStep = steps.find(s => s.stepType === 'final');
                if (finalStep) {
                  return finalStep.status === 'completed';
                }
                
                // Check from deepResearchStepInfo if no final step exists
                const finalAnswerFromStepInfo = Object.entries(deepResearchStepInfo || {}).find(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                    const stepData = value as any
                    return key.startsWith('final_answer_') || stepData.isFinalAnswer || stepData.title === 'Final Answer'
                  }
                  return false
                })
                
                if (finalAnswerFromStepInfo) {
                  const [, stepData] = finalAnswerFromStepInfo
                  const finalAnswerData = stepData as any
                  return finalAnswerData.isComplete;
                }
                
                return false;
              })() && (
                <Badge className="text-xs bg-green-50 border-green-200 text-green-700 flex-shrink-0 hover:bg-green-300 hover:text-green-900">
                  {lang("deepResearch.completed")}
                </Badge>
              )}
            </div>
            {(() => {
              const finalStep = steps.find(s => s.stepType === 'final');
              if (finalStep) {
                return openSteps.has(finalStep.id) ? 
                  <ChevronDown className="w-4 h-4 text-green-600" /> : 
                  <ChevronRight className="w-4 h-4 text-green-600" />
              }
              
              // Check from deepResearchStepInfo if no final step exists
              const finalAnswerFromStepInfo = Object.entries(deepResearchStepInfo || {}).find(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                  const stepData = value as any
                  return key.startsWith('final_answer_') || stepData.isFinalAnswer || stepData.title === 'Final Answer'
                }
                return false
              })
              
              if (finalAnswerFromStepInfo) {
                const [key] = finalAnswerFromStepInfo
                return openSteps.has(key) ? 
                  <ChevronDown className="w-4 h-4 text-green-600" /> : 
                  <ChevronRight className="w-4 h-4 text-green-600" />
              }
              
              return <ChevronRight className="w-4 h-4 text-green-600" />
            })()}
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 pb-3">
            {(() => {
              const finalStep = steps.find(s => s.stepType === 'final');
              
              // If no final step exists, try to get from deepResearchStepInfo
              if (!finalStep) {
                const finalAnswerFromStepInfo = Object.entries(deepResearchStepInfo || {}).find(([key, value]) => {
                  if (typeof value === 'object' && value !== null) {
                    const stepData = value as any
                    return key.startsWith('final_answer_') || stepData.isFinalAnswer || stepData.title === 'Final Answer'
                  }
                  return false
                })
                
                if (finalAnswerFromStepInfo) {
                  const [key, stepData] = finalAnswerFromStepInfo
                  const finalAnswerData = stepData as any
                  
                  return (
                    <div className="mt-2 p-4 bg-white rounded-lg border-l-4 border-green-400">
                      <div className="text-sm text-gray-500 italic">
                        {lang("deepResearch.finalAnswerDisplay")}
                      </div>
                    </div>
                  );
                }
                
                                  return (
                    <div className="mt-2 p-4 bg-white rounded-lg border-l-4 border-green-400">
                      <div className="text-sm text-gray-500 italic">
                        {lang("deepResearch.finalAnswerDisplay")}
                      </div>
                    </div>
                  );
              }
              
                                return (
                    <div className="mt-2 p-4 bg-white rounded-lg border-l-4 border-green-400">
                      {finalStep.status === 'in_progress' ? (
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                          </div>
                          <span>{lang("deepResearch.finalAnswerGenerating")}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          {lang("deepResearch.finalAnswerDisplay")}
                        </div>
                      )}
                    </div>
                  );
            })()}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
} 