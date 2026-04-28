import { pgTable, serial, varchar, text, boolean, timestamp, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const deploymentStatusEnum = pgEnum('deployment_status', [
  'pending', 'building', 'ready', 'error', 'cancelled'
]);

export const platformEnum = pgEnum('platform', [
  'vercel', 'netlify', 'cloudflare-pages', 'railway', 'self-hosted-docker'
]);

export const environmentEnum = pgEnum('environment', [
  'production', 'preview', 'development'
]);

// Supabase config table
export const supabaseConfig = pgTable('supabase_config', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  projectName: varchar('project_name', { length: 255 }).notNull(),
  projectId: varchar('project_id', { length: 100 }),
  url: varchar('url', { length: 500 }).notNull(),
  anonKey: text('anon_key'),
  serviceRoleKey: text('service_role_key'),
  region: varchar('region', { length: 50 }),
  plan: varchar('plan', { length: 20 }).default('free'),
  dbPassword: text('db_password'), // encrypted
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  githubToken: text('github_token'),
  vercelToken: varchar('vercel_token', { length: 255 }),
  supabaseToken: text('supabase_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Projects table
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  repoUrl: varchar('repo_url', { length: 500 }).notNull(),
  platform: platformEnum('platform').default('vercel').notNull(),
  environment: environmentEnum('environment').default('production').notNull(),
  
  // Build configuration
  rootDirectory: varchar('root_directory', { length: 255 }).default('/'),
  branch: varchar('branch', { length: 100 }).default('main'),
  buildOverride: varchar('build_override', { length: 500 }),
  outputDirectory: varchar('output_directory', { length: 255 }),
  
  // Vercel specific
  frameworkPreset: varchar('framework_preset', { length: 50 }),
  installCommand: varchar('install_command', { length: 255 }),
  buildCommand: varchar('build_command', { length: 255 }),
  devCommand: varchar('dev_command', { length: 255 }),
  vercelJsonConfig: jsonb('vercel_json_config'),
  serverlessFunctionRegion: varchar('serverless_function_region', { length: 20 }),
  deployHook: varchar('deploy_hook', { length: 500 }),
  ignoreBuildStep: boolean('ignore_build_step').default(false),
  
  // Supabase
  createSupabaseProject: boolean('create_supabase_project').default(false),
  supabaseProjectId: varchar('supabase_project_id', { length: 100 }),
  supabaseDbPassword: text('supabase_db_password'),
  supabaseRegion: varchar('supabase_region', { length: 50 }),
  runMigrations: boolean('run_migrations').default(false),
  
  // GitHub Actions
  setupGithubActions: boolean('setup_github_actions').default(true),
  excludeAuthors: jsonb('exclude_authors').$type<string[]>(),
  triggerBranches: jsonb('trigger_branches').$type<string[]>().default(['main', 'master']),
  previewForPr: boolean('preview_for_pr').default(true),
  
  // IaC
  generateTerraform: boolean('generate_terraform').default(false),
  terraformProviders: jsonb('terraform_providers').$type<string[]>(),
  
  // Domain & DNS
  customDomain: varchar('custom_domain', { length: 255 }),
  enableSsl: boolean('enable_ssl').default(true),
  dnsProvider: varchar('dns_provider', { length: 50 }),
  dnsApiToken: text('dns_api_token'),
  
  // Notifications
  notificationSlack: varchar('notification_slack', { length: 500 }),
  notificationEmail: varchar('notification_email', { length: 255 }),
  notificationDiscord: varchar('notification_discord', { length: 500 }),
  notificationMsTeams: varchar('notification_ms_teams', { length: 500 }),
  
  // Security
  enableWebhookValidation: boolean('enable_webhook_validation').default(false),
  vercelAuthProtection: boolean('vercel_auth_protection').default(true),
  ipWhitelist: jsonb('ip_whitelist').$type<string[]>(),
  scanVulnerabilities: boolean('scan_vulnerabilities').default(false),
  auditLogs: boolean('audit_logs').default(true),
  
  // UI params
  projectBadge: boolean('project_badge').default(false),
  customFavicon: varchar('custom_favicon', { length: 500 }),
  deploymentMessage: text('deployment_message'),
  waitForCompletion: boolean('wait_for_completion').default(true),
  
  // Analytics
  logLevel: varchar('log_level', { length: 20 }).default('info'),
  logRetentionDays: integer('log_retention_days').default(30),
  sendAnalytics: boolean('send_analytics').default(true),
  sentryDsn: varchar('sentry_dsn', { length: 500 }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Deployments table
export const deployments = pgTable('deployments', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  deploymentIdExternal: varchar('deployment_id_external', { length: 100 }),
  status: deploymentStatusEnum('status').default('pending').notNull(),
  url: varchar('url', { length: 500 }),
  logsUrl: varchar('logs_url', { length: 500 }),
  commitSha: varchar('commit_sha', { length: 100 }),
  commitMessage: text('commit_message'),
  author: varchar('author', { length: 255 }),
  branch: varchar('branch', { length: 100 }),
  startedAt: timestamp('started_at'),
  readyAt: timestamp('ready_at'),
  buildTime: integer('build_time'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Environment variables (encrypted)
export const environmentVariables = pgTable('environment_variables', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  key: varchar('key', { length: 255 }).notNull(),
  encryptedValue: text('encrypted_value').notNull(),
  iv: varchar('iv', { length: 50 }).notNull(),
  isSecret: boolean('is_secret').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Audit logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id),
  userId: integer('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  supabaseConfigs: many(supabaseConfig),
}));

export const supabaseConfigRelations = relations(supabaseConfig, ({ one }) => ({
  user: one(users, { fields: [supabaseConfig.userId], references: [users.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  deployments: many(deployments),
  environmentVariables: many(environmentVariables),
}));

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  project: one(projects, { fields: [deployments.projectId], references: [projects.id] }),
}));

export const environmentVariablesRelations = relations(environmentVariables, ({ one }) => ({
  project: one(projects, { fields: [environmentVariables.projectId], references: [projects.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  project: one(projects, { fields: [auditLogs.projectId], references: [projects.id] }),
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Deployment = typeof deployments.$inferSelect;
export type NewDeployment = typeof deployments.$inferInsert;
export type EnvironmentVariable = typeof environmentVariables.$inferSelect;
export type NewEnvironmentVariable = typeof environmentVariables.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;