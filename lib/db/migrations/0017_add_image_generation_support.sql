-- Migration: Add image generation support to llm_models table
-- Created: 2025-09-01

-- Add image generation support column to llm_models table
ALTER TABLE llm_models ADD COLUMN supports_image_generation INTEGER DEFAULT 0;

-- Update existing Gemini models to support image generation
UPDATE llm_models 
SET supports_image_generation = 1 
WHERE provider = 'gemini' AND (
  model_id LIKE '%flash-image%' OR 
  model_id LIKE '%imagen%' OR
  model_id = 'gemini-2.5-flash-image-preview'
);

-- Add any other image generation models here as needed
-- UPDATE llm_models SET supports_image_generation = 1 WHERE model_id IN ('dall-e-3', 'dall-e-2', 'midjourney');
