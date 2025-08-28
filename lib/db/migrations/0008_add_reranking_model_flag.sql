-- Add isRerankingModel flag to llm_models table
ALTER TABLE llm_models ADD COLUMN is_reranking_model INTEGER DEFAULT 0;

-- Update existing models that might be reranking models based on their name/id
UPDATE llm_models 
SET is_reranking_model = 1 
WHERE 
  LOWER(model_id) LIKE '%rerank%' OR 
  LOWER(model_id) LIKE '%cohere%rerank%' OR
  LOWER(model_id) LIKE '%bge-reranker%';
