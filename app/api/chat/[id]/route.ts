import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { chatMessageRepository, chatSessionRepository, agentManageRepository, llmModelRepository, llmServerRepository, userRepository } from '@/lib/db/server'
import { LLMFactory } from '@/lib/llm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { DeepResearchUtils, DeepResearchProcessor } from '@/lib/llm/deepresearch'
import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

// Function to resize image to max width/height while maintaining aspect ratio
async function resizeImageToBase64(base64Data: string, mimeType: string, maxSize: number = 800, shouldCompress: boolean = true): Promise<string> {
  try {
    // Remove data URL prefix if present
    const cleanBase64 = base64Data.replace(/^data:image\/[^;]+;base64,/, '');
    
    // If compression is disabled, return original
    if (!shouldCompress) {
      console.log(`🔧 Image compression disabled, returning original image`);
      return cleanBase64;
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    // Resize image while maintaining aspect ratio
    const resizedBuffer = await sharp(buffer)
      .resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true // Don't enlarge smaller images
      })
      .jpeg({ quality: 90 }) // Convert to JPEG with good quality for smaller size
      .toBuffer();
    
    // Convert back to base64
    const resizedBase64 = resizedBuffer.toString('base64');
    
    console.log(`🔧 Resized image: ${buffer.length} bytes → ${resizedBuffer.length} bytes (${((resizedBuffer.length / buffer.length) * 100).toFixed(1)}% of original)`);
    
    return resizedBase64;
  } catch (error) {
    console.error('🔧 Error resizing image:', error);
    // Return original if resize fails
    return base64Data;
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('=== Chat [id] API POST request received ===')
  console.log('Request timestamp:', new Date().toISOString())
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    const session = await getServerSession(authOptions)
    
    // 미들웨어에서 이미 인증 및 계정 유효성 검증을 완료
    // 추가 안전장치로 세션 체크만 유지
    if (!session?.user?.email) {
      console.error('[Chat API] Unexpected: session is null after middleware')
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }
    
    const resolvedParams = await params
    const chatId = resolvedParams.id
    console.log('Chat ID:', chatId)
    
    // Check if request has FormData (for image uploads) or JSON
    const contentType = request.headers.get('content-type')
    let message: string
    let agentId: string | undefined
    let modelId: string | undefined
    let modelType: string
    let isRegeneration: boolean
    let isDeepResearchActive: boolean
    let isGlobeActive: boolean
    let images: File[] = []
    let fromMessageId: string | undefined
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle FormData (with images)
      const formData = await request.formData()
      console.log('FormData received')
      
      message = formData.get('message') as string || ''
      agentId = (formData.get('agentId') as string)?.trim() || undefined
      modelId = (formData.get('modelId') as string)?.trim() || undefined
      modelType = formData.get('modelType') as string
      isRegeneration = formData.get('isRegeneration') === 'true'
      isDeepResearchActive = formData.get('isDeepResearchActive') === 'true'
      isGlobeActive = formData.get('isGlobeActive') === 'true'
      fromMessageId = formData.get('fromMessageId') as string || undefined
      
      // Extract images
      const imageFiles = formData.getAll('images') as File[]
      images = imageFiles.filter(file => file.size > 0) // Filter out empty files
      
      console.log('Images received:', images.length)
      console.log('Deep research active:', isDeepResearchActive)
      console.log('Globe active:', isGlobeActive)
    } else {
      // Handle JSON (text only)
      const body = await request.json()
      console.log('JSON body received:', body)
      
      // Handle final answer save request
      if (body.isFinalAnswer) {
        console.log('💾 ========= BACKEND FINAL ANSWER SAVE START =========')
        console.log('💾 Final answer save request received')
        console.log('💾 Chat ID:', chatId)
        console.log('💾 Chat ID type:', typeof chatId)
        console.log('💾 Model ID:', body.modelId)
        console.log('💾 Model ID type:', typeof body.modelId)
        console.log('💾 Content length:', body.message?.length || 0)
        console.log('💾 Content preview:', body.message?.substring(0, 200) || 'NO CONTENT')
        console.log('💾 Full body keys:', Object.keys(body))
        console.log('💾 User email:', session.user.email)
        
        try {
          console.log('💾 Creating assistant message...')
          
          // Save final answer directly as assistant message
          const assistantMessage = {
            sessionId: chatId,
            role: 'assistant' as const,
            content: body.message || ''
          }
          
          console.log('💾 Assistant message object:', assistantMessage)
          console.log('💾 Calling chatMessageRepository.create...')
          
          const savedMessage = await chatMessageRepository.create(assistantMessage)
          
          console.log('💾 Raw saved message result:', savedMessage)
          console.log('💾 Saved message length:', Array.isArray(savedMessage) ? savedMessage.length : 'Not array')
          console.log('💾 First saved message:', savedMessage[0])
          console.log('💾 ✅ Final answer saved with ID:', savedMessage[0]?.id)
          
          const response = { 
            success: true, 
            messageId: savedMessage[0]?.id,
            message: 'Final answer saved successfully' 
          }
          
          console.log('💾 Response to send:', response)
          console.log('💾 ========= BACKEND FINAL ANSWER SAVE SUCCESS =========')
          
          return NextResponse.json(response)
        } catch (error) {
          console.error('💾 ❌ Final answer save error:', error)
          console.error('💾 Error name:', error instanceof Error ? error.name : 'Unknown')
          console.error('💾 Error message:', error instanceof Error ? error.message : String(error))
          console.error('💾 Error stack:', error instanceof Error ? error.stack : 'No stack')
          console.log('💾 ========= BACKEND FINAL ANSWER SAVE ERROR =========')
          
          return NextResponse.json({ 
            error: 'Failed to save final answer',
            details: error instanceof Error ? error.message : String(error)
          }, { status: 500 })
        }
      }
      
      message = body.message
      agentId = body.agentId
      modelId = body.modelId
      modelType = body.modelType
      isRegeneration = body.isRegeneration
      isDeepResearchActive = body.isDeepResearchActive || false
      isGlobeActive = body.isGlobeActive || false
      fromMessageId = body.fromMessageId
      
      console.log('🔍 JSON Request Body Deep Research Debug:')
      console.log('  Full body:', body)
      console.log('  body.isDeepResearchActive (raw):', body.isDeepResearchActive)
      console.log('  body.isDeepResearchActive type:', typeof body.isDeepResearchActive)
      console.log('  Final isDeepResearchActive:', isDeepResearchActive)
      console.log('  Final isDeepResearchActive type:', typeof isDeepResearchActive)
      console.log('  Deep research active:', isDeepResearchActive)
      console.log('  Globe active:', isGlobeActive)
    }

    if (!message?.trim() && images.length === 0) {
      return NextResponse.json({ error: 'Message or images are required' }, { status: 400 })
    }

    // Check image count limit
    if (images.length > 3) {
      return NextResponse.json({ error: 'Maximum 3 images allowed per message' }, { status: 400 })
    }

    // Check text length limit (more strict when images are present)
    const maxTextLength = images.length > 0 ? 500 : 4000
    if (message && message.trim().length > maxTextLength) {
      return NextResponse.json({ 
        error: `The message is too long. Please try with shorter text${images.length > 0 ? ' or fewer images' : ''}.` 
      }, { status: 400 })
    }

    // Check chat session existence and verify permissions
    console.log('Looking for chat session with ID:', chatId)
    console.log('Current user email:', session.user.email)
    const chatSession = await chatSessionRepository.findById(chatId)
    console.log('Session query result:', chatSession)
    console.log('Session query result length:', chatSession?.length)
    if (chatSession && chatSession.length > 0) {
      console.log('Found session:', {
        id: chatSession[0].id,
        userEmail: chatSession[0].userEmail,
        title: chatSession[0].title
      })
    }
    
    if (!chatSession || chatSession.length === 0) {
      console.error('Chat session not found for ID:', chatId)
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    // Check session owner by email
    console.log('Comparing emails:', {
      sessionEmail: chatSession[0].userEmail,
      currentUserEmail: session.user.email,
      match: chatSession[0].userEmail === session.user.email
    })
    if (chatSession[0].userEmail !== session.user.email) {
      console.error('Access denied - email mismatch:', {
        sessionEmail: chatSession[0].userEmail,
        currentUserEmail: session.user.email
      })
      return NextResponse.json({ error: 'Access denied to this chat' }, { status: 403 })
    }

    // Save user message only if it's not a regeneration
    if (!isRegeneration) {
      // Check if this exact message already exists to prevent duplicates
      const existingMessages = await chatMessageRepository.findBySessionId(chatId)
      const duplicateMessage = existingMessages.find((msg: any) => 
        msg.role === 'user' && 
        msg.content === message &&
        // Check if message was created within last 10 seconds (to handle rapid duplicates)
        new Date().getTime() - new Date(msg.createdAt).getTime() < 10000
      )
      
      if (duplicateMessage) {
        console.log('Duplicate message detected, skipping save:', message.substring(0, 50))
      } else {
        // Prepare user message content (include image info if present)
        let userMessageContent = message
        
        // If images are present, store as JSON with image metadata and data
        if (images.length > 0) {
          const imageInfos = await Promise.all(
            images.map(async (image) => {
              const arrayBuffer = await image.arrayBuffer()
              const base64 = Buffer.from(arrayBuffer).toString('base64')
              return {
                type: 'image',
                name: image.name,
                size: image.size,
                mimeType: image.type,
                data: `data:${image.type};base64,${base64}` // Store base64 data for display
              }
            })
          )
          
          userMessageContent = JSON.stringify({
            text: message || '', // Default to empty string if no text
            images: imageInfos,
            hasImages: true
          })
        }
        
        // Save user message
        const userMessage = {
          sessionId: chatId,
          role: 'user' as const,
          content: userMessageContent
        }
        console.log('Saving user message:', userMessage)
        await chatMessageRepository.create(userMessage)
      }
    } else {
      console.log('Regeneration mode: skipping user message save')
      
      // In regeneration mode, ensure any remaining messages after this regeneration are cleaned up
      // This provides a safety net in case frontend deletion failed
      if (fromMessageId) {
        console.log('🧹 Regeneration mode: cleaning up any remaining messages after', fromMessageId)
        try {
          const cleanupResult = await chatMessageRepository.deleteFromMessageOnwards(chatId, fromMessageId)
          console.log('🧹 Regeneration cleanup result:', cleanupResult?.length || 0, 'messages removed')
        } catch (cleanupError) {
          console.warn('🧹 Regeneration cleanup failed (non-critical):', cleanupError)
        }
      }
    }

    // Retrieve existing message history (refresh after potential save)
    const messageHistory = await chatMessageRepository.findBySessionId(chatId)
    console.log('Current message history count:', messageHistory.length)

    // Retrieve agent or model information
    let agent = null
    let model = null
    let systemPrompt = ''
    let llmParams: any = {}

    if (modelType === 'agent' && agentId) {
      console.log('Querying agent:', agentId)
      const agentResult = await agentManageRepository.findById(agentId)
      console.log('Agent query result:', agentResult)
      if (agentResult && agentResult.length > 0) {
        agent = agentResult[0]
        console.log('Selected agent:', agent)
        console.log('Agent supportsMultimodal:', agent.supportsMultimodal)
        // Use system prompt if it's 3 characters or longer
        if (agent.systemPrompt && agent.systemPrompt.trim().length >= 3) {
          systemPrompt = agent.systemPrompt
        }
        
        // Apply parameter settings if enabled
        if (agent.parameterEnabled) {
          llmParams = {
            temperature: parseFloat(agent.temperature || '0.7'),
            topK: agent.topK || 50,
            topP: parseFloat(agent.topP || '0.95'),
            maxTokens: agent.maxTokens || 2048,
            presencePenalty: parseFloat(agent.presencePenalty || '0.0'),
            frequencyPenalty: parseFloat(agent.frequencyPenalty || '0.0')
          }
        }
        
        // Increase token limit when images are present for better multimodal responses
        if (images.length > 0) {
          llmParams.maxTokens = Math.max(llmParams.maxTokens || 2048, 4096)
        }
        
        // Retrieve model information
        console.log('Querying model:', agent.modelId)
        const modelResult = await llmModelRepository.findById(agent.modelId)
        console.log('Model query result:', modelResult)
        if (modelResult && modelResult.length > 0) {
          model = modelResult[0]
          console.log('Selected model:', model)
          console.log('Model supportsImageGeneration:', model.supportsImageGeneration)
          console.log('Model supportsMultimodal:', model.supportsMultimodal)
        }
      }
    } else if (modelType === 'model' && modelId) {
      const modelResult = await llmModelRepository.findById(modelId)
      if (modelResult && modelResult.length > 0) {
        model = modelResult[0]
        console.log('Selected model (direct):', model)
        console.log('Model supportsImageGeneration (direct):', model.supportsImageGeneration)
        console.log('Model supportsMultimodal (direct):', model.supportsMultimodal)
        
        // Set default parameters for model mode
        llmParams = {
          temperature: 0.7,
          maxTokens: 4096,
          topP: 0.95
        }
        
        // Increase token limit when images are present
        if (images.length > 0) {
          llmParams.maxTokens = Math.max(llmParams.maxTokens, 18432)
        }
      }
    }

    if (!model) {
      return NextResponse.json({ error: 'Model information not found' }, { status: 404 })
    }

    // Retrieve server information
    console.log('Querying server:', model.serverId)
    const serverResult = await llmServerRepository.findById(model.serverId)
    console.log('Server query result:', serverResult)
    if (!serverResult || serverResult.length === 0) {
      return NextResponse.json({ error: 'Server information not found' }, { status: 404 })
    }
    const server = serverResult[0]
    console.log('Selected server:', server)

    // Configure LLM settings
    const llmConfig = {
      provider: server.provider as any,
      modelName: model.modelId,
      apiKey: server.apiKey || undefined,
      baseUrl: server.baseUrl,
      ...llmParams
    }
    console.log('LLM config:', llmConfig)

    // Create LLM client
    console.log('Creating LLM client...')
    const llmClient = LLMFactory.create(llmConfig)
    console.log('LLM client created')

    // Construct message array
    const messages: Array<{role: 'user' | 'assistant' | 'system', content: string | any}> = []
    
    // Add system prompt (if exists)
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    // Add existing message history with full multimodal context for image generation
    const maxHistory = images.length > 0 ? 2 : 5 // Include more history for image context
    
    // In both regeneration and normal mode, exclude the last message (current user message)
    // Regeneration: current user message exists in DB, but we want history before it
    // Normal: current user message was just saved, exclude it for history
    const historyToUse = messageHistory.slice(0, -1).slice(-maxHistory)
    
    console.log(`📝 Message history processing:`)
    console.log(`  - Is regeneration mode: ${isRegeneration}`)
    console.log(`  - Total history count: ${messageHistory.length}`)
    console.log(`  - Max history to use: ${maxHistory}`)
    console.log(`  - History messages to process: ${historyToUse.length}`)
    historyToUse.forEach((msg: any, index: number) => {
      console.log(`    ${index + 1}. ${msg.role}: "${msg.content.substring(0, 50)}..."`)
    })
    
    for (const historyMessage of historyToUse) {
      let historyContent = historyMessage.content
      
      // Handle multimodal messages in history - preserve images for image generation context
      if (historyMessage.role === 'user') {
        try {
          const parsed = JSON.parse(historyMessage.content)
          if (parsed.hasImages && parsed.images && Array.isArray(parsed.images)) {
            // Check model capabilities first
            const supportsMultimodal = model?.supportsMultimodal || agent?.supportsMultimodal
            const isImageGenerationModel = model?.supportsImageGeneration
            const textContent = parsed.text || ''
            
            // Only process images if model actually needs them
            if ((supportsMultimodal || isImageGenerationModel) && parsed.images.length > 0) {
              console.log(`✅ Processing user images - multimodal: ${supportsMultimodal}, imageGen: ${isImageGenerationModel}`)
              const imageContents = await Promise.all(
                parsed.images.map(async (imageInfo: any) => {
                  if (imageInfo.data) {
                    // Image is already in base64 format, extract just the data part
                    const base64Data = imageInfo.data.includes(',') 
                      ? imageInfo.data.split(',')[1] 
                      : imageInfo.data
                    
                    return {
                      type: 'image_url',
                      image_url: {
                        url: imageInfo.data // Use full data URL
                      }
                    }
                  }
                  return null
                })
              ).then(contents => contents.filter(content => content !== null))
              
              if (imageContents.length > 0) {
                historyContent = [
                  { type: 'text', text: textContent },
                  ...imageContents
                ]
              } else {
                historyContent = textContent
              }
            } else {
              console.log(`🚫 Skipping user image processing - multimodal: ${supportsMultimodal}, imageGen: ${isImageGenerationModel}`)
              historyContent = textContent // Text only, no image processing
            }
          }
        } catch (e) {
          // If not JSON, use as is
          historyContent = historyMessage.content
        }
      } else if (historyMessage.role === 'assistant') {
        // Check if assistant message contains generated images
        if (historyMessage.content.includes('![Generated Image](')) {
          const imageMatches = historyMessage.content.match(/!\[Generated Image\]\((\/api\/images\/generated-[a-f0-9-]+\.png)\)/g)
          if (imageMatches) {
            // Check model capabilities first
            const supportsMultimodal = model?.supportsMultimodal || agent?.supportsMultimodal
            const isImageGenerationModel = model?.supportsImageGeneration
            const isOpenAI = model?.provider === 'openai' || server?.provider === 'openai'
            
            // Only process images if model actually needs them
            if (supportsMultimodal || isImageGenerationModel) {
              console.log(`✅ Processing assistant images - multimodal: ${supportsMultimodal}, imageGen: ${isImageGenerationModel}`)
              try {
                // Extract text and image parts
                let textPart = historyMessage.content
                const imageParts = []
                
                for (const match of imageMatches) {
                  const urlMatch = match.match(/!\[Generated Image\]\((\/api\/images\/generated-[a-f0-9-]+\.png)\)/)
                  if (urlMatch) {
                    const imageUrl = urlMatch[1]
                    // Convert image URL to base64 using file system (more efficient than fetch)
                    const imagePath = imageUrl.replace('/api/images/', '')
                    const fullPath = path.join(process.cwd(), 'public', 'temp-images', imagePath)
                    
                    let base64 = ''
                    if (fs.existsSync(fullPath)) {
                      const imageBuffer = fs.readFileSync(fullPath)
                      base64 = `data:image/png;base64,${imageBuffer.toString('base64')}`
                    } else {
                      console.warn(`Generated image not found: ${fullPath}`)
                      continue
                    }
                    
                    imageParts.push({
                      type: 'image_url',
                      image_url: {
                        url: base64
                      }
                    })
                    
                    // Remove image markdown from text
                    textPart = textPart.replace(match, '')
                  }
                }
                
                // Include images only if model supports multimodal or is an image generation model
                if (imageParts.length > 0) {
                  if (!isOpenAI) {
                    console.log(`✅ Including assistant images - non-OpenAI model, multimodal: ${supportsMultimodal}, imageGen: ${isImageGenerationModel}`)
                    historyContent = [
                      { type: 'text', text: textPart.trim() },
                      ...imageParts
                    ]
                  } else if (supportsMultimodal) {
                    // For OpenAI: Convert assistant message with images to user message with tag
                    console.log('🔄 Converting assistant images to user message for OpenAI compatibility')
                    const taggedText = `[Assistant 응답] ${textPart.trim()}`
                    historyContent = [
                      { type: 'text', text: taggedText },
                      ...imageParts
                    ]
                    // Mark this message to be converted to user role later
                    historyMessage._convertToUser = true
                  } else {
                    // OpenAI doesn't support multimodal and isn't image gen - exclude images
                    console.log('🚫 Excluding assistant images - OpenAI model without multimodal support')
                    historyContent = textPart.trim()
                  }
                } else {
                  historyContent = textPart.trim()
                }
              } catch (error) {
                console.warn('Failed to process assistant image in history:', error)
                historyContent = historyMessage.content
              }
            } else {
              // Model doesn't support images - just extract text
              console.log(`🚫 Skipping assistant image processing - multimodal: ${supportsMultimodal}, imageGen: ${isImageGenerationModel}`)
              let textOnly = historyMessage.content
              for (const match of imageMatches) {
                textOnly = textOnly.replace(match, '')
              }
              historyContent = textOnly.trim()
            }
          }
        }
      }
      
      // Limit text length in history messages to save tokens
      if (typeof historyContent === 'string' && historyContent.length > 2000) {
        historyContent = historyContent.substring(0, 2000) + "..."
      }
      
      // Convert assistant messages with images to user messages for OpenAI compatibility
      const finalRole = historyMessage._convertToUser ? 'user' : (historyMessage.role as 'user' | 'assistant')
      
      messages.push({
        role: finalRole,
        content: historyContent
      })
    }

    // Add current user message (with images if model supports multimodal)
    if (images.length > 0) {
      console.log('Processing multimodal message with', images.length, 'images')
      
      const supportsMultimodal = model?.supportsMultimodal || agent?.supportsMultimodal
      const isImageGenerationModel = model?.supportsImageGeneration
      
      // Include images only if model supports multimodal or is an image generation model
      if (supportsMultimodal || isImageGenerationModel) {
        console.log(`✅ Including current user images - multimodal: ${supportsMultimodal}, imageGen: ${isImageGenerationModel}`)
        // Convert images to base64 for multimodal message
        const shouldCompressImages = agent?.compressImage ?? true // Default to true if not set
        console.log(`🖼️ Image compression setting: ${shouldCompressImages}`)
        
        const imageContents = await Promise.all(
          images.map(async (image) => {
            const arrayBuffer = await image.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            
            // Resize image if compression is enabled
            const processedBase64 = shouldCompressImages
              ? await resizeImageToBase64(base64, image.type, 800, true)
              : base64
              
            console.log(`Converted image ${image.name} to base64, original size: ${base64.length} chars, processed size: ${processedBase64.length} chars`)
            
            return {
              type: 'image_url',
              image_url: {
                url: `data:${image.type};base64,${processedBase64}`
              }
            }
          })
        )
        
        // Create multimodal message content
        const multimodalContent = [
          ...(message?.trim() ? [{ type: 'text', text: message }] : []),
          ...imageContents
        ]
        
        console.log('Multimodal content structure:', multimodalContent.map(item => ({ 
          type: item.type, 
          hasTextData: 'text' in item && !!item.text,
          hasImageData: 'image_url' in item && !!item.image_url
        })))
        messages.push({ role: 'user', content: multimodalContent })
      } else {
        console.log(`🚫 Excluding current user images - multimodal: ${model?.supportsMultimodal}, imageGen: ${model?.supportsImageGeneration})`)
        messages.push({ role: 'user', content: message || '' }) // Text only
      }
    } else {
      console.log('Processing text-only message')
      
      // Check if user is asking for original uploaded image
      const wantsOriginalImage = true
      
      let shouldIncludeImage = false
      let imageDataToInclude = null
      
      if (wantsOriginalImage) {
        console.log('🖼️ User is requesting original uploaded image')
        // Look for the first user message with uploaded images in history
        for (let i = 0; i < messages.length; i++) {
          const msg = messages[i]
          if (msg.role === 'user' && Array.isArray(msg.content)) {
            // Find image parts in user message (original uploads)
            const imageParts = msg.content.filter((part: any) => part.type === 'image_url')
            if (imageParts.length > 0) {
              imageDataToInclude = imageParts[0] // Get the first original uploaded image
              shouldIncludeImage = true
              console.log('🖼️ Found original uploaded image, including for editing')
              break
            }
          }
        }
        
        if (!shouldIncludeImage) {
          console.log('🖼️ Original image not found, falling back to recent generated image')
          // Fallback to recent generated image if original not found
          for (let i = historyToUse.length - 1; i >= 0; i--) {
            const historyMsg = historyToUse[i]
            if (historyMsg.role === 'assistant' && historyMsg.content.includes('![Generated Image](')) {
              shouldIncludeImage = true
              break
            }
          }
          
          if (shouldIncludeImage) {
            for (let i = messages.length - 1; i >= 0; i--) {
              const msg = messages[i]
              if (msg.role === 'assistant' && Array.isArray(msg.content)) {
                const imageParts = msg.content.filter((part: any) => part.type === 'image_url')
                if (imageParts.length > 0) {
                  imageDataToInclude = imageParts[0]
                  console.log('🖼️ Including recent generated image as fallback')
                  break
                }
              }
            }
          }
        }
      } else {
        // Check if there was a recent generated image to continue editing
        for (let i = historyToUse.length - 1; i >= 0; i--) {
          const historyMsg = historyToUse[i]
          if (historyMsg.role === 'assistant' && historyMsg.content.includes('![Generated Image](')) {
            shouldIncludeImage = true
            console.log('🖼️ Found recent generated image, including for text-based editing')
            break
          }
        }
        
        if (shouldIncludeImage) {
          // Find the most recent generated image from the processed history
          for (let i = messages.length - 1; i >= 0; i--) {
            const msg = messages[i]
            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
              // Find image parts in assistant message
              const imageParts = msg.content.filter((part: any) => part.type === 'image_url')
              if (imageParts.length > 0) {
                imageDataToInclude = imageParts[0] // Get the first (most recent) image
                console.log('🖼️ Including recent generated image for text-based editing')
                break
              }
            }
          }
        }
      }
      
      if (shouldIncludeImage && imageDataToInclude) {
        // Create multimodal message with text + selected image
        const multimodalContent = [
          { type: 'text', text: message },
          imageDataToInclude
        ]
        messages.push({ role: 'user', content: multimodalContent })
      } else {
        // Text-only message
        console.log('🖼️ No suitable image found, using text-only')
        messages.push({ role: 'user', content: message })
      }
    }
    
    console.log('📨 Final message array structure:')
    messages.forEach((msg, index) => {
      console.log(`  Message ${index + 1}:`)
      console.log(`    - Role: ${msg.role}`)
      if (typeof msg.content === 'string') {
        console.log(`    - Content type: string`)
        console.log(`    - Text preview: "${msg.content.substring(0, 100)}..."`)
      } else if (Array.isArray(msg.content)) {
        console.log(`    - Content type: multimodal array`)
        console.log(`    - Parts count: ${msg.content.length}`)
        msg.content.forEach((part: any, partIndex: number) => {
          if (part.type === 'text') {
            console.log(`      Part ${partIndex + 1}: text - "${part.text.substring(0, 50)}..."`)
          } else if (part.type === 'image_url') {
            console.log(`      Part ${partIndex + 1}: image - ${part.image_url.url.substring(0, 50)}...`)
          }
        })
      } else {
        console.log(`    - Content type: ${typeof msg.content}`)
        console.log(`    - Content:`, msg.content)
      }
    })

    // Generate streaming response
    const stream = new ReadableStream({
      async start(controller) {
        let controllerClosed = false
        
        // Safe controller operations
        const safeEnqueue = (data: Uint8Array) => {
          try {
            if (!controllerClosed && controller.desiredSize !== null) {
              controller.enqueue(data)
              return true
            }
          } catch (error) {
            console.log('Controller enqueue failed (likely closed):', error instanceof Error ? error.message : String(error))
            controllerClosed = true
          }
          return false
        }
        
        const safeClose = () => {
          if (!controllerClosed) {
            try {
              controller.close()
              controllerClosed = true
            } catch (error) {
              console.log('Controller close failed (likely already closed):', error instanceof Error ? error.message : String(error))
              controllerClosed = true
            }
          }
        }
        
        try {
          let fullResponse = ''
          const assistantMessageId = uuidv4()
          let completionHandled = false

          // Check if Deep Research is active
          console.log('🔍 Checking Deep Research condition:')
          console.log('  isDeepResearchActive value:', isDeepResearchActive)
          console.log('  isDeepResearchActive type:', typeof isDeepResearchActive)
          console.log('  Boolean conversion:', Boolean(isDeepResearchActive))
          console.log('  Strict comparison with true:', isDeepResearchActive === true)
          console.log('  Loose comparison with true:', isDeepResearchActive == true)
          
          if (isDeepResearchActive) {
            console.log('✅ Deep Research condition MET - Starting Complete Step-by-Step Deep Research')
            console.log('=== Starting Complete Step-by-Step Deep Research ===')
            
            // Parallel processing deep research structure
            async function handleParallelDeepResearch(
              query: string,
              modelId: string,
              onStream: (content: string, type: 'step' | 'synthesis' | 'final', stepInfo?: any) => void
            ) {
              try {
                console.log('=== Starting Parallel Deep Research ===');
                
                // Retrieve model and server information
                const modelResult = await llmModelRepository.findById(modelId);
                if (!modelResult || modelResult.length === 0) {
                  throw new Error('Model not found');
                }
                
                const modelInfo = modelResult[0];
                const serverResult = await llmServerRepository.findById(modelInfo.serverId);
                if (!serverResult || serverResult.length === 0) {
                  throw new Error('Server not found');
                }
                
                const server = serverResult[0];

                // LLM configuration
                const llmConfig = {
                  provider: server.provider as any,
                  modelName: modelInfo.modelId,
                  apiKey: server.apiKey || undefined,
                  baseUrl: server.baseUrl,
                  temperature: 0.7,
                  maxTokens: 4096
                };

                const llmClient = LLMFactory.create(llmConfig);
                const processor = new DeepResearchProcessor(llmClient, {
                  maxSteps: 4,
                  confidenceThreshold: 0.8,
                  analysisDepth: 'intermediate',
                  includeSourceCitations: false,
                  language: 'ko'
                });
                
                // Step 1: Generate sub-questions
                console.log('Step 1: Generating sub-questions...');
                const { subQuestions, plannedSteps } = await processor.generateSubQuestionsStep(query, '');

                console.log('Sub-questions generated:', subQuestions);

                // Send signal to start parallel processing with sub-questions
                const subQuestionsContent = `[Analysis Start] Sub-questions Generated

Generated Sub-questions:
The following detailed questions will be analyzed in parallel:

${subQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join('\n\n')}

Parallel Processing Plan:
- Analyze all questions simultaneously for improved speed
- Real-time updates as each analysis completes
- Comprehensive analysis and final answer generation after all analyses complete`;

                // Send sub-questions and modelId for parallel processing in frontend
                onStream(subQuestionsContent, 'step', { 
                  title: 'Sub-questions Generated', 
                  isComplete: true,
                  totalSteps: plannedSteps.length,
                  plannedSteps: plannedSteps,
                  subQuestions: subQuestions,
                  modelId: modelId,
                  originalQuery: query,
                  useParallelProcessing: true
                });

                // Send signal that parallel processing has started in frontend
                // Actual analysis is handled by individual API calls in frontend
                console.log('=== Parallel Deep Research Setup Completed ===');
                console.log('Frontend will handle parallel sub-question analysis');
                
                return 'Parallel processing initiated';

              } catch (error) {
                console.error('Parallel deep research setup error:', error);
                throw error;
              }
            }

            // Call parallel deep research processing function
            let finalDeepResearchResult = '';
            await handleParallelDeepResearch(message, model.id, (content: string, type: 'step' | 'synthesis' | 'final', stepInfo: any) => {
              if (type === 'final') {
                finalDeepResearchResult = content;
              }
              // Don't add to fullResponse to prevent automatic saving
              // fullResponse += content;
              
              // Send chunk to client safely
              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    content: content,
                    messageId: assistantMessageId,
                    deepResearchStream: true,
                    stepType: type,
                    stepInfo: stepInfo || {},
                    timestamp: Date.now(),
                    done: false 
                  })}\n\n`
                )
              )
            })

            // Start parallel deep research - continue processing in frontend
            if (!completionHandled) {
              console.log('Parallel deep research setup completed - Frontend will continue processing')
              
              // Sub-questions are not saved to database (only final answer is saved)
              // Will be saved as a new message when final answer is completed in frontend
              
              // Send parallel processing signal to frontend (including chatId and assistantMessageId)
              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    content: '', 
                    messageId: assistantMessageId,
                    chatId: chatId, // Add chat ID
                    parallelProcessingStarted: true,
                    done: false 
                  })}\n\n`
                )
              )
              
              // Mark completion as handled to prevent normal LLM processing
              completionHandled = true
              
              // Keep stream open for frontend processing, but don't continue with normal LLM processing
              console.log('Parallel deep research initiated, stream remains open for frontend processing')
              // Don't return here - let the stream stay open but skip normal processing
            }
          }

          // Skip normal LLM processing if deep research was active or completion was already handled
          console.log('🔍 Checking if normal LLM processing should be skipped:')
          console.log('  isDeepResearchActive:', isDeepResearchActive)
          console.log('  completionHandled:', completionHandled)
          console.log('  Condition (isDeepResearchActive || completionHandled):', (isDeepResearchActive || completionHandled))
          
          if (isDeepResearchActive || completionHandled) {
            console.log('✅ SKIPPING normal LLM processing - Deep research was active or completion already handled')
            console.log('Deep research was active or completion already handled - skipping normal LLM processing')
            return
          }

          // Check if this model supports image generation

          
          // Only proceed if model supports image generation
          if (model.supportsImageGeneration) {
            // Check if user uploaded images (for editing) or wants to generate new images
            const hasUploadedImages = images && images.length > 0;
            
            // Check for previously generated images in conversation
            let previousGeneratedImageUrl = null;
            let previousGeneratedImagePath = null;
            let messagesSinceLastImage = 0;
            
            if (!hasUploadedImages && messages.length > 0) {
              // Look for the most recent AI message with a generated image

              
              // Find both generated images and user uploaded images
              for (let i = messages.length - 1; i >= 0; i--) {
                const msg = messages[i];
                messagesSinceLastImage++;
                
                // Check for AI generated images
                if (msg.role === 'assistant' && msg.content.includes('![Generated Image](')) {
                  const imageMatch = msg.content.match(/!\[Generated Image\]\((\/api\/images\/generated-[a-f0-9-]+\.png)\)/);
                  if (imageMatch && !previousGeneratedImageUrl) {
                    previousGeneratedImageUrl = imageMatch[1];
                    previousGeneratedImagePath = previousGeneratedImageUrl.replace('/api/images/', 'public/temp-images/');

                    messagesSinceLastImage = 0;
                  }
                }
                
                // Check for user uploaded images (in metadata or content)
                // Note: User uploaded images would need to be tracked separately in the message content
                // or through a different mechanism as messages don't have metadata property
              }
            }
            
            // Define keywords for image generation and editing
            const imageGenerationKeywords = [
              '그림', '이미지', '사진', '그려', '생성', '만들어', '그래픽', '일러스트', '아트', '아티스트', 
              'image', 'picture', 'draw', 'create', 'generate', 'art', 'illustration', 'graphic'
            ];
            
            const imageEditingKeywords = [
              '수정', '편집', '바꿔', '변경', '조정', '개선', '스타일', '색상', '추가', '제거', '삭제',
              '노란', '빨간', '파란', '초록', '검은', '하얀', '머리', '얼굴', '옷', '배경', '색깔',
              '머리카락', '헤어스타일', '단발', '장발', '긴', '짧은', '색', '톤', '밝게', '어둡게',
              'edit', 'modify', 'change', 'adjust', 'improve', 'style', 'color', 'add', 'remove', 'delete',
              'hair', 'face', 'clothes', 'background', 'yellow', 'red', 'blue', 'green', 'black', 'white'
            ];
            
            const hasGenerationKeywords = imageGenerationKeywords.some(keyword => 
              message.toLowerCase().includes(keyword.toLowerCase())
            );
            
            const hasEditingKeywords = imageEditingKeywords.some(keyword => 
              message.toLowerCase().includes(keyword.toLowerCase())
            );
            
            // Check for reference words that indicate editing existing image
            const referencePatterns = [
              /이\s*(이미지|그림|사진)/,
              /방금\s*(그린|만든|생성한|나온)/,
              /여기[서에서의]/,
              /이거/,
              /그\s*(이미지|그림)/,
              /위[의에]\s*(이미지|그림)/,
              /아까\s*(그|만든|생성한)/
            ];
            
            const hasReferenceWords = referencePatterns.some(pattern => 
              pattern.test(message)
            );
            
            // Check for explicit new image requests
            const newImagePatterns = [
              /새로운\s*(이미지|그림|사진)/,
              /다른\s*(이미지|그림|사진)/,
              /처음부터/,
              /완전히\s*다른/
            ];
            
            const hasNewImageRequest = newImagePatterns.some(pattern => 
              pattern.test(message)
            );
            
            // Calculate context continuity score
            const isRecentContext = messagesSinceLastImage <= 4; // Within 4 messages
            const hasContinuousContext = isRecentContext && !hasNewImageRequest;
            

            
            // Determine if this is editing a previous image based on context
            let shouldEditPreviousImage = false;
            
            if (previousGeneratedImageUrl && !hasNewImageRequest) {
              // Case 1: Explicit reference words (이 이미지, 방금 그린)
              if (hasReferenceWords) {
                shouldEditPreviousImage = true;

              }
              // Case 2: Recent context with editing intent
              else if (hasContinuousContext && (hasEditingKeywords || !hasGenerationKeywords)) {
                shouldEditPreviousImage = true;

              }
              // Case 3: Editing keywords with recent image
              else if (hasEditingKeywords && isRecentContext) {
                shouldEditPreviousImage = true;

              }
              // Case 4: Very recent context (within 2 messages) without generation keywords
              else if (messagesSinceLastImage <= 2 && !hasGenerationKeywords) {
                shouldEditPreviousImage = true;

              }
            } else if (hasNewImageRequest) {

            }
            

            
            // Determine if this is an image request
            const isImageGenerationModel = model?.supportsImageGeneration;
            const isImageRequest = isImageGenerationModel && (
                                 hasUploadedImages || 
                                 hasGenerationKeywords || 
                                 shouldEditPreviousImage || 
                                 true); // Always true for image generation models
            
            if (isImageRequest) {
              const requestType = (hasUploadedImages || shouldEditPreviousImage) ? 'Image Editing' : 'Image Generation';

            
            try {

              
              // Send empty loading message to trigger loading animation
              const loadingMessage = '';
              
              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    messageId: assistantMessageId,
                    content: loadingMessage,
                    done: false
                  })}\n\n`
                )
              );

              // Prepare image data for editing - collect all relevant images for Gemini image generation model
              let imageOptions: any = {};
              const allInputImages: Array<{ data: string; mimeType: string }> = [];
              
              // 1. Add uploaded images (current context)
              if (hasUploadedImages && images.length > 0) {
                console.log('🎨 Image generation/editing with uploaded images');
                console.log(`🖼️ Processing ${images.length} uploaded context images`);
                
                // Convert uploaded File objects to format expected by Gemini
                const uploadedImages = await Promise.all(images.map(async (file: File, index: number) => {
                  const arrayBuffer = await file.arrayBuffer();
                  const base64 = Buffer.from(arrayBuffer).toString('base64');
                  
                  console.log(`🖼️ Uploaded Image ${index + 1}: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
                  
                  return {
                    data: base64,
                    mimeType: file.type || 'image/jpeg'
                  };
                }));
                
                allInputImages.push(...uploadedImages);
              }
              
              // 2. Add recent images from history (user uploads + generated images) - limit to last 3 messages
              console.log('🖼️ Collecting images from recent conversation history for Gemini image model');
              const recentMessages = messages.slice(-3); // Only last 3 messages
              const addedImageHashes = new Set(); // Track unique images to avoid duplicates
              const shouldCompressImagesHistory = agent?.compressImage ?? true // Use agent's compression setting
              
              for (const msg of recentMessages) {
                if (msg.role === 'user' && Array.isArray(msg.content)) {
                  // Extract user uploaded images from history
                  const userImageParts = msg.content.filter((part: any) => part.type === 'image_url');
                  for (const imagePart of userImageParts) {
                    if (imagePart.image_url?.url?.startsWith('data:')) {
                      const imageUrl = imagePart.image_url.url;
                      const imageHash = imageUrl.substring(0, 100); // Use first 100 chars as hash
                      
                      if (!addedImageHashes.has(imageHash)) {
                        const [, mimeAndData] = imageUrl.split(',');
                        const [mimeInfo] = imageUrl.split(';');
                        const mimeType = mimeInfo.split(':')[1] || 'image/jpeg';
                        
                        // Resize image to 800px max for history context
                        const resizedData = await resizeImageToBase64(mimeAndData, mimeType, 800, shouldCompressImagesHistory);
                        
                        allInputImages.push({
                          data: resizedData,
                          mimeType: 'image/jpeg' // Sharp converts to JPEG
                        });
                        addedImageHashes.add(imageHash);
                        console.log(`🖼️ Added resized user image from recent history: ${mimeType} → JPEG, original: ${mimeAndData.length} chars`);
                      }
                    }
                  }
                } else if (msg.role === 'assistant' && Array.isArray(msg.content)) {
                  // Extract generated images from history
                  const assistantImageParts = msg.content.filter((part: any) => part.type === 'image_url');
                  for (const imagePart of assistantImageParts) {
                    if (imagePart.image_url?.url?.startsWith('data:')) {
                      const imageUrl = imagePart.image_url.url;
                      const imageHash = imageUrl.substring(0, 100); // Use first 100 chars as hash
                      
                      if (!addedImageHashes.has(imageHash)) {
                        const [, mimeAndData] = imageUrl.split(',');
                        const [mimeInfo] = imageUrl.split(';');
                        const mimeType = mimeInfo.split(':')[1] || 'image/png';
                        
                        // Resize image to 300px max for history context
                        const resizedData = await resizeImageToBase64(mimeAndData, mimeType, 300, shouldCompressImagesHistory);
                        
                        allInputImages.push({
                          data: resizedData,
                          mimeType: 'image/jpeg' // Sharp converts to JPEG
                        });
                        addedImageHashes.add(imageHash);
                        console.log(`🖼️ Added resized generated image from recent history: ${mimeType} → JPEG, original: ${mimeAndData.length} chars`);
                      }
                    }
                  }
                }
              }
              
              // 3. Add previous generated image if editing mode
              if (shouldEditPreviousImage && previousGeneratedImagePath) {
                console.log('🖼️ Adding previous generated image for editing');
                
                try {
                  const fullPath = path.join(process.cwd(), previousGeneratedImagePath);
                  
                  if (fs.existsSync(fullPath)) {
                    const imageBuffer = fs.readFileSync(fullPath);
                    const base64 = imageBuffer.toString('base64');
                    const mimeType = previousGeneratedImagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
                    
                    // Resize previous generated image to 800px max for history context
                    const resizedData = await resizeImageToBase64(base64, mimeType, 800, shouldCompressImagesHistory);
                    
                    allInputImages.push({
                      data: resizedData,
                      mimeType: 'image/jpeg' // Sharp converts to JPEG
                    });
                    console.log(`🖼️ Added resized previous generated image: ${mimeType} → JPEG`);

                  } else {
                    console.warn(`🖼️ Previous generated image not found: ${fullPath}`);
                  }
                } catch (error) {
                  console.error('🖼️ Error loading previous generated image:', error);
                }
              }
              
              // 4. Set all collected images to imageOptions
              if (allInputImages.length > 0) {
                imageOptions.inputImages = allInputImages;
                console.log(`🎨 Final: Prepared ${allInputImages.length} images for Gemini image generation model`);
                
                // Log image details for debugging
                allInputImages.forEach((img, index) => {
                  console.log(`🖼️ Image ${index + 1}: ${img.mimeType}, data size: ${img.data.length} chars`);
                });
              } else {
                console.log('🎨 No input images found - will generate new image from text only');
              }
              
              // Generate image using Gemini image generation/editing with context

              
              // Create a simple, direct prompt for image generation
              let contextualPrompt = message;
              
              // For image generation, keep prompt simple and direct with quality instructions
              if (allInputImages.length > 0) {
                // If we have context images, this is image editing
                contextualPrompt = `Edit this image: ${message}. Generate a new high-quality, detailed, sharp image with the requested changes. Make it professional quality with vivid colors and clear details.`;
              } else {
                // If no context images, this is new image generation  
                contextualPrompt = `Generate a high-quality, detailed, sharp image: ${message}. Make it professional quality with vivid colors and clear details.`;
              }
              

              const imageResponse = await (llmClient as any).generateImage(contextualPrompt, imageOptions);


              // Check if image was actually generated
              if (!imageResponse.imageUrl) {

                
                // Send text-only response
                fullResponse = imageResponse.content;
                
                // Clear the loading message
                safeEnqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ 
                      messageId: assistantMessageId,
                      content: '',
                      done: false 
                    })}\n\n`
                  )
                );
                
                // Small delay
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Send the complete response at once (no streaming for image-related content)
                safeEnqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({
                      messageId: assistantMessageId,
                      content: fullResponse,
                      done: true
                    })}\n\n`
                  )
                );
                
                // Save assistant message
                const assistantMessage = {
                  sessionId: chatId,
                  role: 'assistant' as const,
                  content: fullResponse
                };
                await chatMessageRepository.create(assistantMessage);

                
                completionHandled = true;
                safeClose();
                return;
              }

              // Image was generated successfully
              fullResponse = imageResponse.content;
              
              // Send the image response directly (replacing the loading message)

              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    messageId: assistantMessageId,
                    content: imageResponse.content,
                    done: true 
                  })}\n\n`
                )
              );

              // Save assistant message
              const assistantMessage = {
                sessionId: chatId,
                role: 'assistant' as const,
                content: imageResponse.content
              };
              await chatMessageRepository.create(assistantMessage);
              console.log('🎨 Assistant message saved to database');
              
              completionHandled = true;
              safeClose();
              console.log('🎨 Image generation process completed successfully');
              return;

            } catch (imageError) {
              console.error('🚨 Image generation error:', imageError);
              console.error('🚨 Error stack:', imageError instanceof Error ? imageError.stack : 'No stack trace');
              console.error('🚨 Error details:', {
                name: imageError instanceof Error ? imageError.name : 'Unknown',
                message: imageError instanceof Error ? imageError.message : String(imageError),
                hasUploadedImages,
                imageCount: images?.length || 0,
                modelSupportsImageGeneration: model?.supportsImageGeneration
              });
              
              // Fallback to normal text generation
              const errorContent = `🚨 이미지 ${hasUploadedImages ? '편집' : '생성'} 중 An error occurred: ${imageError instanceof Error ? imageError.message : String(imageError)}\n\n대신 텍스트로 설명해드리겠습니다.\n\n`;
              
              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    messageId: assistantMessageId,
                    content: errorContent,
                    done: false 
                  })}\n\n`
                )
              );
              
              // Continue with normal processing below
            }
            } else {
              console.log(`🎨 ${hasUploadedImages ? 'Image editing' : 'Image generation'} keywords not found in message, proceeding with normal text generation`);
            }
          } else {
            console.log('🎨 Model does not support image generation, proceeding with normal text generation');
          }

          // Define streaming callbacks
          console.log('❌ STARTING normal LLM processing - Deep research was NOT active')
          console.log('=== Starting Normal Chat Mode ===')
          
          const streamCallbacks = {
            onToken: (token: string) => {
              fullResponse += token
              // Send chunk to client safely
              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    content: token, 
                    messageId: assistantMessageId,
                    done: false 
                  })}\n\n`
                )
              )
            },
            onComplete: async (response: any) => {
              if (completionHandled) {
                console.log('Completion already handled, skipping...')
                return
              }
              completionHandled = true
              
              try {
                console.log('=== Starting completion handler ===')
                console.log('Full response length:', fullResponse.length)
                
                // Save AI response message
                const assistantMessage = {
                  sessionId: chatId,
                  role: 'assistant' as const,
                  content: fullResponse
                }
                console.log('Saving assistant message...')
                await chatMessageRepository.create(assistantMessage)

                // Check if this is the first conversation - generate title when assistant messages = 1
                const totalMessages = await chatMessageRepository.findBySessionId(chatId)
                console.log('Total messages count:', totalMessages.length)
                
                // Count assistant messages to determine if this is the first AI response
                const assistantMessages = totalMessages.filter((msg: any) => msg.role === 'assistant')
                console.log('Assistant messages count:', assistantMessages.length)
                
                // Generate title after the first assistant response (assistant messages = 1)
                const shouldGenerateTitle = assistantMessages.length === 1
                console.log('Should generate title:', shouldGenerateTitle)
                
                                  if (shouldGenerateTitle) {
                  // Generate title for the first AI response
                  try {
                    console.log('Generating title after first AI response...')
                    let userMessage = totalMessages.find((msg: any) => msg.role === 'user')?.content || message
                    
                    // Extract text from multimodal message if needed
                    try {
                      const parsed = JSON.parse(userMessage)
                      if (parsed.hasImages && parsed.text !== undefined) {
                        userMessage = parsed.text || message
                      }
                    } catch (e) {
                      // If not JSON, use as is
                    }
                    
                    // Generate title directly without API call
                    console.log('Starting direct title generation...')
                    
                    // Get default model for title generation
                    const publicModels = await llmModelRepository.findPublic()
                    if (publicModels && publicModels.length > 0) {
                      const titleModel = publicModels[0]
                      const titleServerResult = await llmServerRepository.findById(titleModel.serverId)
                      
                      if (titleServerResult && titleServerResult.length > 0) {
                        const titleServer = titleServerResult[0]
                        
                        // Create LLM client for title generation
                        const titleLlmConfig = {
                          provider: titleServer.provider as any,
                          modelName: titleModel.modelId,
                          apiKey: titleServer.apiKey || undefined,
                          baseUrl: titleServer.baseUrl,
                          temperature: 0.3,
                          maxTokens: 50
                        }
                        
                        const titleLlmClient = LLMFactory.create(titleLlmConfig)
                        
                                                 // Generate title prompt in English (LLM will respond in the same language as the conversation)
                         const titlePrompt = `Generate a concise and clear title based on the following conversation. 
                         
Rules:
- Generate the title in the SAME LANGUAGE as the conversation (Korean for Korean conversation, English for English conversation, Japanese for Japanese conversation, etc.)
- Keep the title within 15 characters/words appropriate for the language
- Summarize the core topic or question content of the conversation
- Respond with title only, no quotes or special characters
- Write concisely without formal language

User question: ${userMessage}
Assistant answer: ${fullResponse.substring(0, 200)}...

Title:`

                        const titleMessages = [{ role: 'user' as const, content: titlePrompt }]
                        
                        // Generate title
                        console.log('Calling LLM for title generation...')
                        const titleResponse = await titleLlmClient.chat(titleMessages, { maxTokens: 50 })
                        console.log('Title LLM response received:', titleResponse.content)
                        
                        let generatedTitle = titleResponse.content.trim()
                        
                        // Clean up title
                        generatedTitle = generatedTitle
                          .replace(/^["'`]|["'`]$/g, '') // Remove quotes
                          .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
                          .replace(/^\s+|\s+$/g, '') // Remove whitespace
                          .replace(/[^\w\sㄱ-ㅎ가-힣]/g, '') // Remove special characters
                        
                        if (generatedTitle.length > 30) {
                          generatedTitle = generatedTitle.substring(0, 27) + '...'
                        }
                        
                        // Fallback to user message if title is empty
                        if (!generatedTitle || generatedTitle.length < 2) {
                          generatedTitle = userMessage.substring(0, 15) + (userMessage.length > 15 ? '...' : '')
                        }
                        
                        // Update chat session title
                        await chatSessionRepository.update(chatId, { title: generatedTitle })
                        console.log('Title updated in database:', generatedTitle)
                        
                        // Send title update signal to client
                        const titleUpdateData = { 
                          titleGenerated: true,
                          title: generatedTitle,
                          chatId: chatId
                        }
                        console.log('Sending title update signal to client:', titleUpdateData)
                        
                        // Send title update signal safely
                        safeEnqueue(
                          new TextEncoder().encode(
                            `data: ${JSON.stringify(titleUpdateData)}\n\n`
                          )
                        )
                        
                        console.log('Title generation completed successfully')
                      } else {
                        console.error('Title server not found')
                      }
                    } else {
                      console.error('No public models available for title generation')
                    }
                  } catch (titleError) {
                    console.error('Title generation error:', titleError)
                  }
                }

                // Send completion signal safely
                safeEnqueue(
                  new TextEncoder().encode(
                    `data: ${JSON.stringify({ 
                      content: '', 
                      messageId: assistantMessageId,
                      done: true 
                    })}\n\n`
                  )
                )

                safeClose()
              } catch (error) {
                console.error('Message save error:', error)
                safeClose()
              }
            },
            onError: (error: Error) => {
              console.error('Streaming response error:', error)
              
              // Build user-visible message
              let summary = 'An error occurred while generating AI response'
              const rawMsg = (error?.message || '')
              const lower = rawMsg.toLowerCase()
              const status = (error as any)?.status
              
              const isUnsupportedParam = lower.includes('unsupported parameter') || lower.includes('invalid_request_error')
              const mentionsMaxTokensParam = lower.includes('max_tokens')
              const isTokenOrContextLimit = (
                (lower.includes('context length') || lower.includes('maximum context') || lower.includes('max context') || lower.includes('context window')) ||
                (lower.includes('too many tokens') || lower.includes('token limit') || lower.includes('maximum tokens'))
              )
              const isGenericTokenMention = lower.includes(' token') || lower.includes('tokens')
              
              if (lower.includes('multimodal') || lower.includes('vision') || lower.includes('image')) {
                summary = 'This model does not support image analysis. Please try with a text-only message or switch to a vision-capable model (like GPT-4 Vision).'
              } else if (isUnsupportedParam && mentionsMaxTokensParam) {
                summary = 'Model configuration mismatch detected. Please update the model/server settings and try again.'
              } else if (isTokenOrContextLimit || (!isUnsupportedParam && isGenericTokenMention)) {
                summary = 'The message is too long. Please try with shorter text or fewer images.'
              } else if (lower.includes('format') || lower.includes('content')) {
                summary = 'Invalid message format. Please try again with a different image or text.'
              }
              
              const statusPrefix = status ? `HTTP ${status} - ` : ''
              const details = `${statusPrefix}${rawMsg}`.trim()
              const displayContent = details ? `${summary}\n\nDetails: ${details}` : summary
              
              // Send as assistant content so it appears in chat
              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    messageId: assistantMessageId || uuidv4(),
                    content: displayContent,
                    done: true 
                  })}\n\n`
                )
              )
              safeClose()
            }
          }

          // Streaming call
          console.log('Starting streaming call...')
          try {
            // Adjust token limit when images are present
            let dynamicMaxTokens = llmParams.maxTokens || 2048
            if (images.length > 0) {
              // Adjust token count based on number of images (reduce response tokens as image count increases)
              dynamicMaxTokens = Math.max(1024, dynamicMaxTokens - (images.length * 200))
              console.log(`Adjusted maxTokens for ${images.length} images: ${dynamicMaxTokens}`)
            }
            
            await llmClient.streamChat(messages, streamCallbacks, {
              stream: true,
              // maxTokens parameter may be rejected by OpenAI Responses-only models (e.g., gpt-5 family)
              // The LLM implementation safely omits it depending on the model
              maxTokens: dynamicMaxTokens
            })
            console.log('Streaming call completed, fullResponse length:', fullResponse.length)
          } catch (streamError) {
            console.error('Stream chat error:', streamError)
            // Handle streaming error with onError callback
            if (streamCallbacks.onError) {
              await streamCallbacks.onError(streamError as Error)
            }
            throw streamError
          }
          
          // Always force completion handling after streaming is done
          console.log('Forcing completion handling...')
          // console.log('completionHandled:', completionHandled)
          // console.log('fullResponse exists:', !!fullResponse)
          // console.log('fullResponse content preview:', fullResponse.substring(0, 100))
          
          if (fullResponse) {
            if (!completionHandled) {
              console.log('Manually triggering completion callback...')
              await streamCallbacks.onComplete(null)
            } else {
              console.log('Completion already handled, but ensuring title generation...')
              // Even if completion was handled, ensure title generation happens
              
              // Check assistant message count for title generation
              const totalMessages = await chatMessageRepository.findBySessionId(chatId)
              const assistantMessages = totalMessages.filter((msg: any) => msg.role === 'assistant')
              console.log('Post-stream assistant messages count:', assistantMessages.length)
              
              if (assistantMessages.length === 1) {
                console.log('Triggering title generation directly...')
                
                try {
                  const userMessage = totalMessages.find((msg: any) => msg.role === 'user')?.content || message
                  
                  const titleResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/chat/${chatId}/title`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Cookie': request.headers.get('Cookie') || '',
                      'Authorization': request.headers.get('Authorization') || '',
                    },
                    body: JSON.stringify({
                      userId: session.user.email,
                      userMessage: userMessage,
                      assistantMessage: fullResponse
                    })
                  })

                  if (titleResponse.ok) {
                    const titleData = await titleResponse.json()
                    console.log('Direct title generated successfully:', titleData.title)
                    
                    // Send title update signal to client safely
                    const titleUpdateData = { 
                      titleGenerated: true,
                      title: titleData.title,
                      chatId: chatId
                    }
                    
                    safeEnqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify(titleUpdateData)}\n\n`
                      )
                    )
                    
                    console.log('Direct title update signal sent to client')
                  }
                } catch (titleError) {
                  console.error('Direct title generation error:', titleError)
                }
              }
            }
          } else {
            console.error('No response content received!')
          }
        } catch (error) {
          console.error('Streaming initialization error:', error)
          
          // Provide more specific error messages
          let summary = 'An error occurred while generating AI response'
          
          if (error instanceof Error) {
            const rawMsg = (error.message || '')
            const msg = rawMsg.toLowerCase()
            const status = (error as any)?.status
            const isUnsupportedParam = msg.includes('unsupported parameter') || msg.includes('invalid_request_error')
            const mentionsMaxTokensParam = msg.includes('max_tokens')
            const isTokenOrContextLimit = (
              (msg.includes('context length') || msg.includes('maximum context') || msg.includes('max context') || msg.includes('context window')) ||
              (msg.includes('too many tokens') || msg.includes('token limit') || msg.includes('maximum tokens'))
            )
            const isGenericTokenMention = msg.includes(' token') || msg.includes('tokens')

            if (msg.includes('multimodal') || msg.includes('vision') || msg.includes('image')) {
              summary = 'This model does not support image analysis. Please try with a text-only message or switch to a vision-capable model (like GPT-4 Vision).'
            } else if (isUnsupportedParam && mentionsMaxTokensParam) {
              summary = 'Model configuration mismatch detected. Please update the model/server settings and try again.'
            } else if (isTokenOrContextLimit) {
              summary = 'The message is too long. Please try with shorter text or fewer images.'
            } else if (!isUnsupportedParam && isGenericTokenMention) {
              summary = 'The message is too long. Please try with shorter text or fewer images.'
            } else if (msg.includes('format') || msg.includes('content')) {
              summary = 'Invalid message format. Please try again with a different image or text.'
            }
            const statusPrefix = status ? `HTTP ${status} - ` : ''
            const details = `${statusPrefix}${rawMsg}`.trim()
            const displayContent = details ? `${summary}\n\nDetails: ${details}` : summary

            // Send assistant content safely with a new messageId (no stream started yet)
            const errorMessageId = uuidv4()
            safeEnqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ 
                  messageId: errorMessageId,
                  content: displayContent,
                  done: true 
                })}\n\n`
              )
            )
            safeClose()
          }
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Message sending error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

// Retrieve chat message history
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('=== Chat [id] API GET request received ===')
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }
    
    const resolvedParams = await params
    const chatId = resolvedParams.id
    console.log('Chat ID:', chatId)
    
    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const beforeMessageId = searchParams.get('beforeMessageId') || undefined
    const usePagination = searchParams.get('paginated') === 'true'
    
    console.log('Pagination params:', { limit, beforeMessageId, usePagination })
    
    // Check chat session existence and verify permissions
    const chatSession = await chatSessionRepository.findById(chatId)
    console.log('Session query result:', chatSession)
    if (!chatSession || chatSession.length === 0) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    // Check session owner by email
    if (chatSession[0].userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Access denied to this chat' }, { status: 403 })
    }

    // Retrieve messages for the chat session
    let messages;
    let totalCount = 0;
    let hasMore = false;
    
    if (usePagination) {
      // Use paginated query
      messages = await chatMessageRepository.findBySessionIdPaginated(chatId, limit, beforeMessageId)
      totalCount = await chatMessageRepository.countBySessionId(chatId)
      
      // Check if there are more messages to load
      if (messages.length > 0) {
        const oldestMessage = messages[0]
        const olderMessagesCount = await chatMessageRepository.countBySessionId(chatId)
        // Simple check: if we have messages and total count is more than what we've loaded so far
        hasMore = messages.length === limit
      }
      
      console.log('Paginated retrieval - count:', messages.length, 'total:', totalCount, 'hasMore:', hasMore)
    } else {
      // Use traditional full load (for backward compatibility)
      messages = await chatMessageRepository.findBySessionId(chatId)
      totalCount = messages.length
      console.log('Full retrieval - message count:', messages.length)
    }

    return NextResponse.json({ 
      messages,
      session: chatSession[0],
      pagination: usePagination ? {
        totalCount,
        hasMore,
        limit
      } : undefined
    })
  } catch (error) {
    console.error('Chat history retrieval error:', error)
    return NextResponse.json({ error: 'Failed to load chat history' }, { status: 500 })
  }
}

// Update chat session title
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('=== Chat [id] API PUT request received ===')
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }
    
    const resolvedParams = await params
    const chatId = resolvedParams.id
    const body = await request.json()
    const { title, content, messageId } = body
    
         if (title !== undefined) {
       // Update chat session title
       await chatSessionRepository.update(chatId, { title: title.trim() })
       return NextResponse.json({ success: true, message: 'Title updated successfully' })
     }
    
    if (content !== undefined && messageId !== undefined) {
      // Update message content
      await chatMessageRepository.updateContent(messageId, content)
      return NextResponse.json({ success: true, message: 'Content updated successfully' })
    }
    
    return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
  } catch (error) {
    console.error('PUT request error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('=== Chat [id] API DELETE request received ===')
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 })
    }
    
    const resolvedParams = await params
    const chatId = resolvedParams.id
    console.log('Chat ID:', chatId)
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const fromMessageId = searchParams.get('fromMessageId')
    const userId = searchParams.get('userId')
    
    console.log('Delete parameters:', { fromMessageId, userId })
    
    // Check chat session existence and verify permissions
    const chatSession = await chatSessionRepository.findById(chatId)
    console.log('Session query result:', chatSession)
    if (!chatSession || chatSession.length === 0) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    // Check session owner by email
    if (chatSession[0].userEmail !== session.user.email) {
      return NextResponse.json({ error: 'Access denied to this chat' }, { status: 403 })
    }

    // If fromMessageId is provided, delete messages from that point onwards (for regeneration)
    if (fromMessageId) {
      console.log('=== Deleting messages from specific point ===');
      console.log('fromMessageId:', fromMessageId);
      console.log('userId:', userId);
      
      try {
        // Verify that the fromMessageId exists and belongs to this session
        const allMessages = await chatMessageRepository.findBySessionId(chatId);
        console.log('Total messages in session before deletion:', allMessages.length);
        
        const targetMessage = allMessages.find((msg: any) => msg.id === fromMessageId);
        if (!targetMessage) {
          console.log('Target message not found in session');
          return NextResponse.json({ success: true, deletedCount: 0, message: 'Target message not found' });
        }
        
        console.log('Target message found:', {
          id: targetMessage.id,
          role: targetMessage.role,
          createdAt: targetMessage.createdAt
        });
        
        // Use the dedicated method to delete messages from a specific point onwards
        const deleteResult = await chatMessageRepository.deleteFromMessageOnwards(chatId, fromMessageId);
        console.log('Delete operation result:', deleteResult);
        
        // Verify deletion by checking remaining messages
        const remainingMessages = await chatMessageRepository.findBySessionId(chatId);
        console.log('Remaining messages after deletion:', remainingMessages.length);
        
        return NextResponse.json({ 
          success: true, 
          deletedCount: deleteResult.length || 0,
          remainingCount: remainingMessages.length,
          message: `Successfully deleted ${deleteResult.length || 0} messages`
        });
      } catch (error) {
        console.error('Error deleting messages from point onwards:', error);
        if (error instanceof Error && error.message === 'Message not found') {
          console.log('From message not found, no messages to delete');
          return NextResponse.json({ success: true, deletedCount: 0, message: 'Target message not found' });
        }
        console.error('Unexpected error during message deletion:', error);
        return NextResponse.json({ 
          error: 'Failed to delete messages',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    } else {
      // Delete entire chat session (original behavior)
      console.log('Deleting entire chat session')
      await chatSessionRepository.delete(chatId)
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    console.error('Chat deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete chat' }, { status: 500 })
  }
}
