import { 
  pgTable, 
  serial, 
  varchar, 
  text as pgText, 
  integer, 
  boolean, 
  timestamp, 
  jsonb
} from 'drizzle-orm/pg-core'
import { 
  sqliteTable, 
  text as sqliteText, 
  integer as sqliteInteger,
  blob 
} from 'drizzle-orm/sqlite-core'
import { getDbType } from './config'
import { users } from './schema'

// Workflow definitions table
export const workflowDefinitions = getDbType() === 'sqlite'
  ? sqliteTable('workflow_definitions', {
      id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
      workflowId: sqliteText('workflow_id').notNull().unique(),
      name: sqliteText('name').notNull(),
      description: sqliteText('description'),
      version: sqliteInteger('version').default(1),
      isPublished: sqliteInteger('is_published', { mode: 'boolean' }).default(false),
      config: blob('config', { mode: 'json' }), // stores nodes, edges, variables
      createdBy: sqliteText('created_by').references(() => (users as any).id),
      createdAt: sqliteInteger('created_at', { mode: 'timestamp' }).defaultNow(),
      updatedAt: sqliteInteger('updated_at', { mode: 'timestamp' }).defaultNow(),
    })
  : pgTable('workflow_definitions', {
      id: serial('id').primaryKey(),
      workflowId: varchar('workflow_id', { length: 255 }).notNull().unique(),
      name: varchar('name', { length: 255 }).notNull(),
      description: pgText('description'),
      version: integer('version').default(1),
      isPublished: boolean('is_published').default(false),
      config: jsonb('config'), // stores nodes, edges, variables
      createdBy: integer('created_by').references(() => (users as any).id),
      createdAt: timestamp('created_at').defaultNow(),
      updatedAt: timestamp('updated_at').defaultNow(),
    })

// Workflow executions table
export const workflowExecutions = getDbType() === 'sqlite'
  ? sqliteTable('workflow_executions', {
      id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
      executionId: sqliteText('execution_id').notNull().unique(),
      workflowId: sqliteText('workflow_id').notNull(),
      status: sqliteText('status').notNull(), // pending, running, completed, failed, cancelled
      inputData: blob('input_data', { mode: 'json' }),
      outputData: blob('output_data', { mode: 'json' }),
      errorMessage: sqliteText('error_message'),
      startedAt: sqliteInteger('started_at', { mode: 'timestamp' }).defaultNow(),
      completedAt: sqliteInteger('completed_at', { mode: 'timestamp' }),
      userId: sqliteText('user_id').references(() => (users as any).id),
    })
  : pgTable('workflow_executions', {
      id: serial('id').primaryKey(),
      executionId: varchar('execution_id', { length: 255 }).notNull().unique(),
      workflowId: varchar('workflow_id', { length: 255 }).notNull(),
      status: varchar('status', { length: 50 }).notNull(),
      inputData: jsonb('input_data'),
      outputData: jsonb('output_data'),
      errorMessage: pgText('error_message'),
      startedAt: timestamp('started_at').defaultNow(),
      completedAt: timestamp('completed_at'),
      userId: integer('user_id').references(() => (users as any).id),
    })

// Workflow execution logs table
export const workflowExecutionLogs = getDbType() === 'sqlite'
  ? sqliteTable('workflow_execution_logs', {
      id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
      executionId: sqliteText('execution_id').notNull(),
      nodeId: sqliteText('node_id').notNull(),
      status: sqliteText('status').notNull(),
      inputData: blob('input_data', { mode: 'json' }),
      outputData: blob('output_data', { mode: 'json' }),
      errorMessage: sqliteText('error_message'),
      startedAt: sqliteInteger('started_at', { mode: 'timestamp' }).defaultNow(),
      completedAt: sqliteInteger('completed_at', { mode: 'timestamp' }),
    })
  : pgTable('workflow_execution_logs', {
      id: serial('id').primaryKey(),
      executionId: varchar('execution_id', { length: 255 }).notNull(),
      nodeId: varchar('node_id', { length: 255 }).notNull(),
      status: varchar('status', { length: 50 }).notNull(),
      inputData: jsonb('input_data'),
      outputData: jsonb('output_data'),
      errorMessage: pgText('error_message'),
      startedAt: timestamp('started_at').defaultNow(),
      completedAt: timestamp('completed_at'),
    })

// Workflow templates table
export const workflowTemplates = getDbType() === 'sqlite'
  ? sqliteTable('workflow_templates', {
      id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
      templateId: sqliteText('template_id').notNull().unique(),
      name: sqliteText('name').notNull(),
      description: sqliteText('description'),
      category: sqliteText('category'),
      workflowData: blob('workflow_data', { mode: 'json' }).notNull(),
      thumbnailUrl: sqliteText('thumbnail_url'),
      isPublic: sqliteInteger('is_public', { mode: 'boolean' }).default(true),
      createdAt: sqliteInteger('created_at', { mode: 'timestamp' }).defaultNow(),
    })
  : pgTable('workflow_templates', {
      id: serial('id').primaryKey(),
      templateId: varchar('template_id', { length: 255 }).notNull().unique(),
      name: varchar('name', { length: 255 }).notNull(),
      description: pgText('description'),
      category: varchar('category', { length: 100 }),
      workflowData: jsonb('workflow_data').notNull(),
      thumbnailUrl: pgText('thumbnail_url'),
      isPublic: boolean('is_public').default(true),
      createdAt: timestamp('created_at').defaultNow(),
    })
