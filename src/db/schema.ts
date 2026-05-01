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
export const users: any = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  isAdmin: boolean('is_admin').default(false).notNull(),
  githubToken: text('github_token'),
  vercelToken: varchar('vercel_token', { length: 255 }),
  netlifyToken: varchar('netlify_token', { length: 255 }),
  supabaseToken: text('supabase_token'),
  // Referral system
  referralCode: varchar('referral_code', { length: 20 }).unique(),
  referredBy: integer('referred_by').references((): any => users.id),
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
  previewDomain: varchar('preview_domain', { length: 255 }),
  previewEnabled: boolean('preview_enabled').default(false),
  
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
  isPreview: boolean('is_preview').default(false).notNull(),
  prNumber: integer('pr_number'),
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

// Teams table
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  ownerId: integer('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Team members table
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  userId: integer('user_id').notNull().references(() => users.id),
  role: varchar('role', { length: 50 }).default('member').notNull(), // 'owner', 'admin', 'member', 'viewer'
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

// Webhook events table (for replay/retry)
export const webhookEvents = pgTable('webhook_events', {
  id: serial('id').primaryKey(),
  source: varchar('source', { length: 50 }).notNull(), // 'github', 'vercel'
  eventType: varchar('event_type', { length: 100 }).notNull(), // 'push', 'pull_request', 'deployment_status'
  payload: jsonb('payload').notNull(),
  signature: varchar('signature', { length: 255 }),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'processed', 'failed'
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0).notNull(),
  lastRetryAt: timestamp('last_retry_at'),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  // No direct FK relations needed - webhook events are standalone
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  supabaseConfigs: many(supabaseConfig),
  owndTeams: many(teams, { relationName: 'teamOwner' }),
  teamMemberships: many(teamMembers),
}));

export const supabaseConfigRelations = relations(supabaseConfig, ({ one }) => ({
  user: one(users, { fields: [supabaseConfig.userId], references: [users.id] }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.ownerId], references: [users.id], relationName: 'teamOwner' }),
  members: many(teamMembers),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
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

// Usage tracking table
export const usageRecords = pgTable('usage_records', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  teamId: integer('team_id').references(() => teams.id),
  action: varchar('action', { length: 100 }).notNull(), // 'deployment', 'storage', 'api_call', etc.
  quantity: integer('quantity').default(1).notNull(),
  metadata: jsonb('metadata'), // Additional context (project_id, deployment_id, etc.)
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  user: one(users, { fields: [usageRecords.userId], references: [users.id] }),
  team: one(teams, { fields: [usageRecords.teamId], references: [teams.id] }),
}));

// Subscription / billing table
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'pro', 'team', 'enterprise']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'past_due', 'trialing']);

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().unique().references(() => users.id),
  plan: subscriptionPlanEnum('plan').default('free').notNull(),
  status: subscriptionStatusEnum('status').default('active').notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  currentPeriodStart: timestamp('current_period_start').defaultNow().notNull(),
  currentPeriodEnd: timestamp('current_period_end').defaultNow().notNull(),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, { fields: [subscriptions.userId], references: [users.id] }),
}));

// Referrals table
export const referrals = pgTable('referrals', {
  id: serial('id').primaryKey(),
  referrerId: integer('referrer_id').notNull().references(() => users.id),
  referredId: integer('referred_id').notNull().references(() => users.id),
  referralCode: varchar('referral_code', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, completed, rewarded
  rewardClaimed: boolean('reward_claimed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  rewardedAt: timestamp('rewarded_at'),
});

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id], relationName: 'referrer' }),
  referred: one(users, { fields: [referrals.referredId], references: [users.id], relationName: 'referred' }),
}));

// Marketing activities table
export const marketingActivityTypeEnum = pgEnum('marketing_activity_type', [
  'email_campaign', 'social_media', 'content_marketing', 'webinar', 'partnership', 'referral_program', 'discount_offer'
]);

export const marketingActivityStatusEnum = pgEnum('marketing_activity_status', [
  'draft', 'scheduled', 'active', 'completed', 'cancelled'
]);

export const marketingActivities = pgTable('marketing_activities', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  type: marketingActivityTypeEnum('type').notNull(),
  status: marketingActivityStatusEnum('status').default('draft').notNull(),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  budgetCents: integer('budget_cents').default(0),
  targetAudience: varchar('target_audience', { length: 500 }),
  conversionGoal: varchar('conversion_goal', { length: 255 }),
  currentConversions: integer('current_conversions').default(0).notNull(),
  notes: text('notes'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const marketingActivitiesRelations = relations(marketingActivities, ({ one }) => ({
  creator: one(users, { fields: [marketingActivities.createdBy], references: [users.id] }),
}));

// Hosting providers table (for affiliate partnerships)
export const hostingProviders = pgTable('hosting_providers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  description: text('description'),
  logoUrl: varchar('logo_url', { length: 500 }),
  affiliateUrl: varchar('affiliate_url', { length: 500 }),
  commissionRate: varchar('commission_rate', { length: 20 }), // e.g. "$20 per signup"
  commissionType: varchar('commission_type', { length: 20 }).default('cpa'), // cpa, cpc, revenue_share
  minPayout: integer('min_payout').default(50),
  paymentTerms: varchar('payment_terms', { length: 100 }).default('Net-30'),
  categories: jsonb('categories').$type<string[]>(), // e.g. ['frontend', 'fullstack', 'static']
  features: jsonb('features').$type<string[]>(),
  pricing: jsonb('pricing').$type<{ plan: string; price: string; specs: string[] }[]>(),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Affiliate clicks tracking
export const affiliateClicks = pgTable('affiliate_clicks', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => hostingProviders.id),
  userId: integer('user_id').references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  referrer: varchar('referrer', { length: 500 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  clickedAt: timestamp('clicked_at').defaultNow().notNull(),
});

// Affiliate conversions tracking
export const affiliateConversions = pgTable('affiliate_conversions', {
  id: serial('id').primaryKey(),
  providerId: integer('provider_id').references(() => hostingProviders.id),
  userId: integer('user_id').references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  conversionType: varchar('conversion_type', { length: 50 }).notNull(), // 'signup', 'deployment', 'paid_plan'
  conversionValue: integer('conversion_value').default(0), // in cents
  commissionEarned: integer('commission_earned').default(0), // in cents
  status: varchar('status', { length: 20 }).default('pending'), // pending, confirmed, paid
  externalId: varchar('external_id', { length: 100 }), // provider's conversion ID
  convertedAt: timestamp('converted_at').defaultNow().notNull(),
  paidAt: timestamp('paid_at'),
});

// Startup templates table
export const startupTemplates = pgTable('startup_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  stack: varchar('stack', { length: 100 }).notNull(), // nextjs-supabase, react-vite, python-fastapi, etc.
  config: jsonb('config').notNull(), // pre-configured settings
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Startup readiness checks table
export const startupReadinessChecks = pgTable('startup_readiness_checks', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  checkType: varchar('check_type', { length: 50 }).notNull(), // env-vars, tokens, repo-access, config, etc.
  status: varchar('status', { length: 20 }).notNull(), // passed, failed, warning
  message: text('message'),
  details: jsonb('details'), // detailed check results
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Startup health scores table
export const startupHealthScores = pgTable('startup_health_scores', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  projectId: integer('project_id').references(() => projects.id),
  score: integer('score').notNull(), // 0-100
  metrics: jsonb('metrics').notNull(), // detailed metrics
  recommendations: jsonb('recommendations'), // array of recommendations
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const startupTemplatesRelations = relations(startupTemplates, ({ many }) => ({
  // No direct relations needed
}));

export const startupReadinessChecksRelations = relations(startupReadinessChecks, ({ one }) => ({
  user: one(users, { fields: [startupReadinessChecks.userId], references: [users.id] }),
  project: one(projects, { fields: [startupReadinessChecks.projectId], references: [projects.id] }),
}));

export const startupHealthScoresRelations = relations(startupHealthScores, ({ one }) => ({
  user: one(users, { fields: [startupHealthScores.userId], references: [users.id] }),
  project: one(projects, { fields: [startupHealthScores.projectId], references: [projects.id] }),
}));

// Relations
export const hostingProvidersRelations = relations(hostingProviders, ({ many }) => ({
  clicks: many(affiliateClicks),
  conversions: many(affiliateConversions),
}));

export const affiliateClicksRelations = relations(affiliateClicks, ({ one }) => ({
  provider: one(hostingProviders, { fields: [affiliateClicks.providerId], references: [hostingProviders.id] }),
  user: one(users, { fields: [affiliateClicks.userId], references: [users.id] }),
  project: one(projects, { fields: [affiliateClicks.projectId], references: [projects.id] }),
}));

export const affiliateConversionsRelations = relations(affiliateConversions, ({ one }) => ({
  provider: one(hostingProviders, { fields: [affiliateConversions.providerId], references: [hostingProviders.id] }),
  user: one(users, { fields: [affiliateConversions.userId], references: [users.id] }),
  project: one(projects, { fields: [affiliateConversions.projectId], references: [projects.id] }),
}));

// Type exports
export type HostingProvider = typeof hostingProviders.$inferSelect;
export type NewHostingProvider = typeof hostingProviders.$inferInsert;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;
export type NewAffiliateClick = typeof affiliateClicks.$inferInsert;
export type AffiliateConversion = typeof affiliateConversions.$inferSelect;
export type NewAffiliateConversion = typeof affiliateConversions.$inferInsert;

export type MarketingActivity = typeof marketingActivities.$inferSelect;
export type NewMarketingActivity = typeof marketingActivities.$inferInsert;