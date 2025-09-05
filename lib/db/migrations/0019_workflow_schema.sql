-- Workflow definitions table
CREATE TABLE workflow_definitions (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_published BOOLEAN DEFAULT false,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow nodes table
CREATE TABLE workflow_nodes (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255) REFERENCES workflow_definitions(workflow_id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  node_type VARCHAR(100) NOT NULL,
  position_x FLOAT NOT NULL,
  position_y FLOAT NOT NULL,
  config JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, node_id)
);

-- Workflow edges (connections between nodes)
CREATE TABLE workflow_edges (
  id SERIAL PRIMARY KEY,
  workflow_id VARCHAR(255) REFERENCES workflow_definitions(workflow_id) ON DELETE CASCADE,
  edge_id VARCHAR(255) NOT NULL,
  source_node_id VARCHAR(255) NOT NULL,
  source_port VARCHAR(100),
  target_node_id VARCHAR(255) NOT NULL,
  target_port VARCHAR(100),
  condition JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, edge_id)
);

-- Workflow executions table
CREATE TABLE workflow_executions (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(255) UNIQUE NOT NULL,
  workflow_id VARCHAR(255) REFERENCES workflow_definitions(workflow_id),
  status VARCHAR(50) NOT NULL, -- pending, running, completed, failed, cancelled
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  user_id INTEGER REFERENCES users(id)
);

-- Workflow execution logs
CREATE TABLE workflow_execution_logs (
  id SERIAL PRIMARY KEY,
  execution_id VARCHAR(255) REFERENCES workflow_executions(execution_id) ON DELETE CASCADE,
  node_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Workflow templates (predefined workflows)
CREATE TABLE workflow_templates (
  id SERIAL PRIMARY KEY,
  template_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  workflow_data JSONB NOT NULL,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
