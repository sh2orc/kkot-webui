import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// Serve images from public/temp-images directory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params as required by Next.js
    const { path: pathSegments } = await params
    
    // Reconstruct the full path from the path segments
    const imagePath = pathSegments.join('/')
    
    // Security: Ensure the path doesn't contain directory traversal attempts
    if (imagePath.includes('..') || imagePath.includes('~')) {
      return new NextResponse('Invalid path', { status: 400 })
    }
    
    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'public', 'temp-images', imagePath)
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      console.error('Image not found:', fullPath)
      
      // Return a placeholder image for missing files
      const placeholderPath = path.join(process.cwd(), 'public', 'placeholder.jpg')
      if (fs.existsSync(placeholderPath)) {
        const placeholderBuffer = fs.readFileSync(placeholderPath)
        return new NextResponse(placeholderBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'public, max-age=3600',
            'X-Image-Status': 'placeholder'
          }
        })
      }
      
      return new NextResponse('Image not found', { status: 404 })
    }
    
    // Read the file
    const fileBuffer = fs.readFileSync(fullPath)
    
    // Determine content type based on file extension
    const ext = path.extname(imagePath).toLowerCase()
    let contentType = 'image/jpeg' // default
    
    switch (ext) {
      case '.png':
        contentType = 'image/png'
        break
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
    }
    
    // Return the image with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      }
    })
  } catch (error) {
    console.error('Error serving image:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
