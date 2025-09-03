-- Add API key settings to api_management table
ALTER TABLE api_management ADD COLUMN api_key_enabled BOOLEAN DEFAULT false;
ALTER TABLE api_management ADD COLUMN api_key_endpoint_limited BOOLEAN DEFAULT false;
