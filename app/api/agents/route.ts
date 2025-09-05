import { NextRequest, NextResponse } from 'next/server'
import { agentManageRepository, llmModelRepository } from '@/lib/db/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { filterResourcesByPermission, checkResourcePermission, requireResourcePermission } from '@/lib/auth/permissions'

// GET - Fetch all agents and public models
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 1. Fetch all agents (high priority)
    const agents = await agentManageRepository.findAllWithModelAndServer()
    
    // Convert image data to base64 and return
    const processedAgents = agents.map((agent: any) => {

      // Check for image data existence (more flexible)
      const hasImageData = agent.imageData && (
        (agent.imageData instanceof Uint8Array && agent.imageData.length > 0) ||
        (typeof agent.imageData === 'string' && agent.imageData.length > 0)
      );
      
      let imageData = null;
      
      // Load image data if available
      if (hasImageData) {
        try {
          
          if (agent.imageData instanceof Uint8Array) {
            // For Uint8Array type
            const base64String = Buffer.from(agent.imageData).toString();
            imageData = `data:image/png;base64,${base64String}`;
          } else if (typeof agent.imageData === 'string') {
            // For string type
            if (agent.imageData.startsWith('data:image/')) {
              // Already a complete data URL
              imageData = agent.imageData;
            } else {
              // Base64 string
              imageData = `data:image/png;base64,${agent.imageData}`;
            }
          }
          
        } catch (error) {
          console.error('Image conversion error:', error);
        }
      } else {
        console.log(`Agent ${agent.name}: No image`)
      }
      
      return {
        ...agent,
        imageData: imageData, // Converted image data
        hasImage: !!imageData, // Flag indicating image existence
        type: 'agent', // Field added for type distinction
        supportsMultimodal: agent.supportsMultimodal || agent.modelSupportsMultimodal, // Include multimodal support info
        supportsDeepResearch: agent.supportsDeepResearch,
        supportsWebSearch: agent.supportsWebSearch,
        compressImage: agent.compressImage
      }
    })
        
    // 2. Fetch all models (both public and private)
    const allModels = await llmModelRepository.findAllChatModelsWithServer()
        // Parse capabilities JSON for all models
    const parsedModels = allModels.map((model: any) => ({
      ...model,
      capabilities: model.capabilities ? JSON.parse(model.capabilities) : null,
      type: 'model', // Field added for type distinction
      supportsMultimodal: model.supportsMultimodal // Include multimodal support info
    }))
    
    // Filter accessible agents (similar to models, check isPublic)
    const accessibleAgents = await filterResourcesByPermission(
      processedAgents,
      'agent',
      'enabled'  // Changed from 'read' to 'enabled' for consistency
    );
    
    // Filter by enabled status - only show active agents
    const filteredAgents = accessibleAgents.filter((agent: any) => {
      const isEnabled = agent.enabled === true || agent.enabled === 1;
      if (!isEnabled) {
        // console.log(`Agent ${agent.name} filtered out: enabled=${agent.enabled}`);
      }
      return isEnabled;
    });
    
    // Filter accessible models (includes public models + group permitted private models)
    const accessibleModels = await filterResourcesByPermission(
      parsedModels,
      'model',
      'enabled'
    );
    
    // Filter by enabled status - only show active models
    const filteredModels = accessibleModels.filter((model: any) => {
      const isEnabled = model.enabled === true || model.enabled === 1;
      return isEnabled;
    });
        // Return agents and accessible models combined (agents have priority)
    return NextResponse.json({
      agents: filteredAgents,
      publicModels: filteredModels // Keep the same name for backward compatibility
    })
  } catch (error) {
    console.error('Failed to fetch agents and public models:', error)
    return NextResponse.json(
      { error: 'An error occurred while loading agents and public models.' },
      { status: 500 }
    )
  }
}

// POST - Create new agent
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admin can create agents
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can create agents' },
        { status: 403 }
      );
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.modelId || !body.name || !body.agentId) {
      return NextResponse.json(
        { error: 'Model ID, name, and agent ID are required' },
        { status: 400 }
      )
    }

    // Check if agentId is available
    const isAgentIdAvailable = await agentManageRepository.isAgentIdAvailable(body.agentId)
    if (!isAgentIdAvailable) {
      return NextResponse.json(
        { error: 'Agent ID is already in use' },
        { status: 400 }
      )
    }

    // Image processing: convert base64 string to proper format
    let imageData = body.imageData;
    
    if (imageData) {
      console.log('Image data processing started');
      console.log('Original image data type:', typeof imageData);
      console.log('Original image data length:', imageData.length);
      
      // Extract base64 part if image data starts with data:image/ format
      if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
        imageData = imageData.split(',')[1];
        console.log('Extracted base64 part from data URL');
      }
      
      // Validate base64 string
      if (typeof imageData === 'string' && imageData.length > 0) {
        try {
          // Test base64 decoding
          const buffer = Buffer.from(imageData, 'base64');
          console.log('Base64 decoding successful, size:', buffer.length, 'bytes');
          
          // Error if image data is too small
          if (buffer.length < 100) {
            console.error('Image data is too small:', buffer.length, 'bytes');
            return NextResponse.json(
              { error: 'Image data is too small.' },
              { status: 400 }
            );
          }
          
          // For SQLite store as Uint8Array, for PostgreSQL store as string
          // Convert to appropriate format according to database schema
          imageData = imageData; // Store base64 string as is
          
        } catch (error) {
          console.error('Base64 decoding failed:', error);
          return NextResponse.json(
            { error: 'Invalid image data.' },
            { status: 400 }
          );
        }
      } else {
        console.log('No image data or invalid data');
        imageData = null;
      }
    }
    
    const agent = await agentManageRepository.create({
      agentId: body.agentId,
      modelId: body.modelId,
      name: body.name,
      systemPrompt: body.systemPrompt,
      temperature: body.temperature,
      topK: body.topK,
      topP: body.topP,
      maxTokens: body.maxTokens,
      presencePenalty: body.presencePenalty,
      frequencyPenalty: body.frequencyPenalty,
      imageData: imageData, // Processed image data
      description: body.description,
      enabled: body.enabled,
      parameterEnabled: body.parameterEnabled,
      supportsDeepResearch: body.supportsDeepResearch ?? true,
      supportsWebSearch: body.supportsWebSearch ?? true,
      compressImage: body.compressImage ?? true,
      isPublic: body.isPublic ?? false
    })
    
    // Fetch the created agent with model and server info
    const [createdAgent] = await agentManageRepository.findById(agent[0].id)
    const agents = await agentManageRepository.findAllWithModelAndServer()
    const fullAgent = agents.find((a: any) => a.id === createdAgent.id)
    
    // Convert Uint8Array to Base64 string
    if (fullAgent && fullAgent.imageData instanceof Uint8Array) {
      fullAgent.imageData = `data:image/png;base64,${Buffer.from(fullAgent.imageData).toString('base64')}`
    }
    
  
    return NextResponse.json(fullAgent)
  } catch (error) {
    console.error('Failed to create agent:', error)
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    )
  }
}

// PUT - Update agent
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // Check if user has write permission for this agent
    const permissionCheck = await requireResourcePermission('agent', body.id, 'write');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }
    
    // Build update data
    const updateData: any = {}
    if (body.agentId !== undefined) {
      // Check if agentId is available (excluding current agent)
      const isAgentIdAvailable = await agentManageRepository.isAgentIdAvailable(body.agentId, body.id)
      if (!isAgentIdAvailable) {
        return NextResponse.json(
          { error: 'Agent ID is already in use' },
          { status: 400 }
        )
      }
      updateData.agentId = body.agentId
    }
    if (body.modelId !== undefined) updateData.modelId = body.modelId
    if (body.name !== undefined) updateData.name = body.name
    if (body.systemPrompt !== undefined) updateData.systemPrompt = body.systemPrompt
    if (body.temperature !== undefined) updateData.temperature = body.temperature
    if (body.topK !== undefined) updateData.topK = body.topK
    if (body.topP !== undefined) updateData.topP = body.topP
    if (body.maxTokens !== undefined) updateData.maxTokens = body.maxTokens
    if (body.presencePenalty !== undefined) updateData.presencePenalty = body.presencePenalty
    if (body.frequencyPenalty !== undefined) updateData.frequencyPenalty = body.frequencyPenalty
    if (body.description !== undefined) updateData.description = body.description
    if (body.enabled !== undefined) updateData.enabled = body.enabled
    if (body.parameterEnabled !== undefined) updateData.parameterEnabled = body.parameterEnabled
    if (body.supportsDeepResearch !== undefined) updateData.supportsDeepResearch = body.supportsDeepResearch
    if (body.supportsWebSearch !== undefined) updateData.supportsWebSearch = body.supportsWebSearch
    if (body.compressImage !== undefined) updateData.compressImage = body.compressImage
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic
    
    // Process image data
    if (body.imageData !== undefined) {
      let imageData = body.imageData;
      
      if (imageData) {
        console.log('Image data update processing started');
        console.log('Original image data type:', typeof imageData);
        console.log('Original image data length:', imageData.length);
        
        // Extract base64 part if image data starts with data:image/ format
        if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
          imageData = imageData.split(',')[1];
          console.log('Extracted base64 part from data URL');
        }
        
        // Validate base64 string
        if (typeof imageData === 'string' && imageData.length > 0) {
          try {
            // Test base64 decoding
            const buffer = Buffer.from(imageData, 'base64');
            console.log('Base64 decoding successful, size:', buffer.length, 'bytes');
            
            // Error if image data is too small
            if (buffer.length < 100) {
              console.error('Image data is too small:', buffer.length, 'bytes');
              return NextResponse.json(
                { error: 'Image data is too small.' },
                { status: 400 }
              );
            }
            
            updateData.imageData = imageData; // Store base64 string as is
            
          } catch (error) {
            console.error('Base64 decoding failed:', error);
            return NextResponse.json(
              { error: 'Invalid image data.' },
              { status: 400 }
            );
          }
        } else {
          console.log('Removing image data');
          updateData.imageData = null;
        }
      } else {
        console.log('Removing image data');
        updateData.imageData = null;
      }
    }
    
    await agentManageRepository.update(body.id, updateData)
    
    // Fetch the updated agent with model and server info
    const agents = await agentManageRepository.findAllWithModelAndServer()
    const updatedAgent = agents.find((a: any) => a.id === body.id)
    
    // Convert Uint8Array to Base64 string
    if (updatedAgent && updatedAgent.imageData instanceof Uint8Array) {
      updatedAgent.imageData = `data:image/png;base64,${Buffer.from(updatedAgent.imageData).toString()}`
    }   
    
    return NextResponse.json(updatedAgent)
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 }
    )
  }
}

// DELETE - Delete agent
export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      )
    }

    // Check if user has delete permission for this agent
    const permissionCheck = await requireResourcePermission('agent', body.id, 'delete');
    if (!permissionCheck.authorized) {
      return NextResponse.json(
        { error: permissionCheck.error },
        { status: 403 }
      );
    }
    
    await agentManageRepository.delete(body.id)
       
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete agent:', error)
    return NextResponse.json(
      { error: 'Failed to delete agent' },
      { status: 500 }
    )
  }
} 