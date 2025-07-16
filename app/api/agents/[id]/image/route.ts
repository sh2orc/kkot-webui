import { NextRequest, NextResponse } from 'next/server'
import { agentManageRepository } from '@/lib/db/server'

// GET - Fetch agent image
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("Agent image request:", id);
    
    // Fetch agent information
    const agentData = await agentManageRepository.findById(id);
    
    if (!agentData || agentData.length === 0 || !agentData[0].imageData) {
      console.log("No image:", id);
      return NextResponse.json(
        { error: 'Image not found.' },
        { status: 404 }
      );
    }
    
    const agent = agentData[0];
    let imageData;
    
    try {
      console.log('Original image data type:', typeof agent.imageData);
      console.log('Original image data length:', agent.imageData instanceof Uint8Array ? agent.imageData.length : agent.imageData?.length);
      console.log('Original image data sample:', 
        agent.imageData instanceof Uint8Array 
          ? `Uint8Array[${agent.imageData.slice(0, 10).join(',')}...]`
          : agent.imageData?.substring(0, 50) + '...'
      );
      
      // Process various image data formats
      if (agent.imageData instanceof Uint8Array) {
        // Stored as Uint8Array in SQLite
        // Error if data is too small
        if (agent.imageData.length < 100) {
          console.error('Image data is too small:', agent.imageData.length, 'bytes');
          return NextResponse.json(
            { error: 'Image data is corrupted or incomplete.' },
            { status: 400 }
          );
        }
        
        const base64String = Buffer.from(agent.imageData).toString();
        imageData = `data:image/png;base64,${base64String}`;
        console.log('Image data conversion (Uint8Array -> base64 URL)');
        console.log('Converted base64 length:', base64String.length);
        console.log('Converted base64 sample:', base64String.substring(0, 50) + '...');
      } else if (typeof agent.imageData === 'string') {
        // Stored as base64 string in PostgreSQL
        // Error if data is too small
        if (agent.imageData.length < 100) {
          console.error('Image data is too small:', agent.imageData.length, 'characters');
          return NextResponse.json(
            { error: 'Image data is corrupted or incomplete.' },
            { status: 400 }
          );
        }
        
        // Use as is if already in data:image/ format
        if (agent.imageData.startsWith('data:')) {
          imageData = agent.imageData;
          console.log('Image data conversion (already in data URL format)');
        } else {
          // Convert regular base64 string to data URL
          imageData = `data:image/png;base64,${agent.imageData}`;
          console.log('Image data conversion (base64 -> data URL)');
          console.log('Original base64 length:', agent.imageData.length);
        }
      } else if (typeof agent.imageData === 'object' && agent.imageData !== null) {
        // Incorrectly stored case: ASCII code array or other object form
        console.log('Object-type image data detected');
        
        if (Array.isArray(agent.imageData)) {
          // For ASCII code array
          console.log('Converting ASCII code array to string');
          const base64String = String.fromCharCode(...agent.imageData);
          console.log('Converted base64 string length:', base64String.length);
          console.log('Converted base64 sample:', base64String.substring(0, 50) + '...');
          
          if (base64String.length < 100) {
            console.error('Converted base64 data is too small:', base64String.length, 'characters');
            return NextResponse.json(
              { error: 'Image data is corrupted or incomplete.' },
              { status: 400 }
            );
          }
          
          imageData = `data:image/png;base64,${base64String}`;
        } else if (agent.imageData.type === 'Buffer' && agent.imageData.data) {
          // Buffer object serialized to JSON
          console.log('Serialized Buffer object detected');
          const buffer = Buffer.from(agent.imageData.data);
          if (buffer.length < 100) {
            console.error('Image data is too small:', buffer.length, 'bytes');
            return NextResponse.json(
              { error: 'Image data is corrupted or incomplete.' },
              { status: 400 }
            );
          }
          
          const base64String = buffer.toString('base64');
          imageData = `data:image/png;base64,${base64String}`;
          console.log('Image data conversion (Serialized Buffer -> base64 URL)');
          console.log('Converted base64 length:', base64String.length);
        } else {
          // Other object form - may be an object with keys and values
          console.log('Unknown object form of image data');
          console.log('Object keys:', Object.keys(agent.imageData));
          
          // Check if object has numeric keys (array-like structure)
          const keys = Object.keys(agent.imageData);
          const isNumericKeys = keys.every(key => !isNaN(parseInt(key)));
          
          if (isNumericKeys) {
            console.log('Converting numeric key object to array');
            const values = keys.map(key => agent.imageData[key]);
            const base64String = String.fromCharCode(...values);
            console.log('Converted base64 string length:', base64String.length);
            console.log('Converted base64 sample:', base64String.substring(0, 50) + '...');
            
            if (base64String.length < 100) {
              console.error('Converted base64 data is too small:', base64String.length, 'characters');
              return NextResponse.json(
                { error: 'Image data is corrupted or incomplete.' },
                { status: 400 }
              );
            }
            
            imageData = `data:image/png;base64,${base64String}`;
          } else {
            console.error('Unsupported object form of image data');
            return NextResponse.json(
              { error: 'Unsupported image format.' },
              { status: 400 }
            );
          }
        }
      } else if (agent.imageData && (agent.imageData.type === 'Buffer' || Array.isArray(agent.imageData))) {
        // Buffer object serialized to JSON
        const buffer = Buffer.from(agent.imageData);
        if (buffer.length < 100) {
          console.error('Image data is too small:', buffer.length, 'bytes');
          return NextResponse.json(
            { error: 'Image data is corrupted or incomplete.' },
            { status: 400 }
          );
        }
        
        const base64String = buffer.toString('base64');
        imageData = `data:image/png;base64,${base64String}`;
        console.log('Image data conversion (Buffer -> base64 URL)');
        console.log('Converted base64 length:', base64String.length);
      } else {
        console.log('Unknown image data format:', typeof agent.imageData);
        console.log('Image data content:', agent.imageData);
        return NextResponse.json(
          { error: 'Unsupported image format.' },
          { status: 400 }
        );
      }
      
      // Validate image data
      if (!imageData || !imageData.includes('base64,')) {
        console.error('Invalid image data format');
        return NextResponse.json(
          { error: 'Invalid image data format.' },
          { status: 400 }
        );
      }
      
      // Check base64 data length
      const base64Part = imageData.split('base64,')[1];
      if (base64Part.length < 100) {
        console.error('Image data is too short:', base64Part.length, 'characters');
        console.error('Image data content:', base64Part);
        return NextResponse.json(
          { error: 'Image data is corrupted or incomplete.' },
          { status: 400 }
        );
      }
      
      console.log('Image data return successful');
      console.log('Final data length:', imageData.length);
      console.log('Final data sample:', imageData.substring(0, 50) + '...');
      
      // Return image data
      return NextResponse.json({ 
        imageData,
        format: 'data-url',
        size: imageData.length
      });
      
    } catch (error) {
      console.error('Error processing image data:', error);
      return NextResponse.json(
        { error: 'An error occurred while processing image data.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to fetch agent image:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching agent image.' },
      { status: 500 }
    );
  }
} 