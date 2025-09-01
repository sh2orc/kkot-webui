import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { chatMessageRepository, chatSessionRepository, agentManageRepository, llmModelRepository, llmServerRepository } from '@/lib/db/server'
import { LLMFactory } from '@/lib/llm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { DeepResearchUtils, DeepResearchProcessor } from '@/lib/llm/deepresearch'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('=== Chat [id] API POST request received ===')
  console.log('Request timestamp:', new Date().toISOString())
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
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
        }
      }
    } else if (modelType === 'model' && modelId) {
      const modelResult = await llmModelRepository.findById(modelId)
      if (modelResult && modelResult.length > 0) {
        model = modelResult[0]
        
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

    // Add existing message history (limit more aggressively when images present)
    const maxHistory = images.length > 0 ? 1 : 5
    const historyToUse = messageHistory.slice(0, -1).slice(-maxHistory)
    for (const historyMessage of historyToUse) {
      let historyContent = historyMessage.content
      
      // Handle multimodal messages in history - extract only text for LLM context
      if (historyMessage.role === 'user') {
        try {
          const parsed = JSON.parse(historyMessage.content)
          if (parsed.hasImages && parsed.text !== undefined) {
            // For history, use only text content to avoid confusion
            historyContent = parsed.text || historyMessage.content
          }
        } catch (e) {
          // If not JSON, use as is
          historyContent = historyMessage.content
        }
      }
      
      // Limit text length in history messages to save tokens
      if (typeof historyContent === 'string' && historyContent.length > 2000) {
        historyContent = historyContent.substring(0, 2000) + "..."
      }
      
      messages.push({
        role: historyMessage.role as 'user' | 'assistant',
        content: historyContent
      })
    }

    // Add current user message (with images if present)
    if (images.length > 0) {
      console.log('Processing multimodal message with', images.length, 'images')
      // Convert images to base64 for multimodal message
      const imageContents = await Promise.all(
        images.map(async (image) => {
          const arrayBuffer = await image.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')
          console.log(`Converted image ${image.name} to base64, size: ${base64.length} chars`)
          return {
            type: 'image_url',
            image_url: {
              url: `data:${image.type};base64,${base64}`
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
      console.log('Processing text-only message')
      // Text-only message
      messages.push({ role: 'user', content: message })
    }
    
    console.log('Final message array:', messages)

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
          console.log('🎨 Checking image generation capability:', {
            modelId: model.modelId,
            supportsImageGeneration: model.supportsImageGeneration,
            provider: server.provider
          });
          
          // Only proceed if model supports image generation
          if (model.supportsImageGeneration) {
            // Check if user uploaded images (for editing) or wants to generate new images
            const hasUploadedImages = images && images.length > 0;
            
            // Define keywords for image generation and editing
            const imageGenerationKeywords = [
              '그림', '이미지', '사진', '그려', '생성', '만들어', '그래픽', '일러스트', '아트', '아티스트', 
              'image', 'picture', 'draw', 'create', 'generate', 'art', 'illustration', 'graphic'
            ];
            
            const imageEditingKeywords = [
              '수정', '편집', '바꿔', '변경', '조정', '개선', '스타일', '색상', '추가', '제거', '삭제',
              'edit', 'modify', 'change', 'adjust', 'improve', 'style', 'color', 'add', 'remove', 'delete'
            ];
            
            const hasGenerationKeywords = imageGenerationKeywords.some(keyword => 
              message.toLowerCase().includes(keyword.toLowerCase())
            );
            
            const hasEditingKeywords = imageEditingKeywords.some(keyword => 
              message.toLowerCase().includes(keyword.toLowerCase())
            );
            
            console.log('🎨 Image processing analysis:', {
              hasUploadedImages,
              hasGenerationKeywords,
              hasEditingKeywords,
              imageCount: images?.length || 0
            });
            
            // Determine if this is an image generation/editing request
            const isImageRequest = hasUploadedImages ? hasEditingKeywords : hasGenerationKeywords;
            
            if (isImageRequest) {
              const requestType = hasUploadedImages ? 'Image Editing' : 'Image Generation';
              console.log(`🎨 ${requestType} request detected, using Gemini ${requestType.toLowerCase()}`)
            
            try {
              console.log(`🎨 Starting image ${hasUploadedImages ? 'editing' : 'generation'} process...`);
              
              // Send loading message based on request type
              const loadingMessage = hasUploadedImages 
                ? '🎨 이미지를 편집하고 있습니다...'
                : '🎨 이미지를 생성하고 있습니다...';
              
              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    messageId: assistantMessageId,
                    content: loadingMessage,
                    done: false
                  })}\n\n`
                )
              );

              // Prepare image data for editing if images are uploaded
              let imageOptions: any = {};
              
              if (hasUploadedImages && images.length > 0) {
                console.log('🎨 Preparing input images for editing:', images.length);
                
                // Convert uploaded File objects to format expected by Gemini
                imageOptions.inputImages = await Promise.all(images.map(async (file: File) => {
                  const arrayBuffer = await file.arrayBuffer();
                  const base64 = Buffer.from(arrayBuffer).toString('base64');
                  
                  return {
                    data: base64,
                    mimeType: file.type || 'image/jpeg'
                  };
                }));
                
                console.log('🎨 Input images prepared for editing:', {
                  count: imageOptions.inputImages.length,
                  mimeTypes: imageOptions.inputImages.map((img: any) => img.mimeType)
                });
              }
              
              // Generate image using Gemini image generation/editing
              console.log('🎨 Calling generateImage with message:', message);
              console.log('🎨 Image options:', imageOptions);
              const imageResponse = await (llmClient as any).generateImage(message, imageOptions);
              console.log('🎨 Image generation completed');

              fullResponse = imageResponse.content;
              
              // Clear the loading message first
              console.log('🎨 Clearing loading message...');
              safeEnqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({ 
                    messageId: assistantMessageId,
                    content: '',
                    done: false 
                  })}\n\n`
                )
              );
              
              // Small delay to ensure loading message is cleared
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Send final response with image
              console.log('🎨 Sending final response to client...');
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
              console.error('Image generation error:', imageError);
              
              // Fallback to normal text generation
              const errorContent = `이미지 생성 중 오류가 발생했습니다: ${imageError instanceof Error ? imageError.message : String(imageError)}\n\n대신 텍스트로 설명해드리겠습니다.\n\n`;
              
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
    const messages = await chatMessageRepository.findBySessionId(chatId)
    console.log('Retrieved message count:', messages.length)

    return NextResponse.json({ 
      messages,
      session: chatSession[0]
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
