-- Update llm_models table: rename multimodal column and add image generation support
-- SQLite version

-- Add new columns
ALTER TABLE llm_models ADD COLUMN supports_image_recognition INTEGER DEFAULT 0;
ALTER TABLE llm_models ADD COLUMN supports_image_generation INTEGER DEFAULT 0;

-- Copy data from old column to new column
UPDATE llm_models SET supports_image_recognition = supports_multimodal;

-- Note: SQLite doesn't support dropping columns directly
-- The old supports_multimodal column will remain but won't be used
-- In a production environment, you would need to:
-- 1. Create a new table with the correct schema
-- 2. Copy all data from the old table
-- 3. Drop the old table
-- 4. Rename the new table

-- PostgreSQL version would be:
-- ALTER TABLE llm_models RENAME COLUMN supports_multimodal TO supports_image_recognition;
-- ALTER TABLE llm_models ADD COLUMN supports_image_generation BOOLEAN DEFAULT FALSE;
