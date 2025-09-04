-- Add image compression settings to agent_manage table
ALTER TABLE agent_manage ADD COLUMN compress_image INTEGER DEFAULT 1;

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_agent_manage_compress_image ON agent_manage(compress_image);
