import { z } from 'zod';

// All configurable parameters from the prompt
export const deployParamsSchema = z.object({
  // 1. General
  repo_url: z.string().url(),
  project_name: z.string().optional(),
  project_description: z.string().optional(),
  target_platform: z.enum(['vercel', 'netlify', 'cloudflare-pages', 'railway', 'self-hosted-docker']).default('vercel'),
  root_directory: z.string().default('/'),
  branch: z.string().default('main'),
  build_override: z.string().optional(),
  output_directory: z.string().optional(),
  environment_slug: z.enum(['production', 'preview', 'development']).default('production'),

  // 2. Vercel params
  framework_preset: z.enum(['nextjs', 'react', 'vue', 'angular', 'svelte', 'astro', 'other']).optional(),
  install_command: z.string().optional(),
  build_command: z.string().optional(),
  dev_command: z.string().optional(),
  vercel_json_config: z.record(z.string(), z.unknown()).optional(),
  serverless_function_region: z.string().optional(),
  environment_variables: z.record(z.string()).optional(),
  deploy_hook: z.string().url().optional(),
  ignore_build_step: z.boolean().default(false),

  // 3. Supabase params
  create_supabase_project: z.boolean().default(false),
  supabase_organization_id: z.string().optional(),
  supabase_region: z.string().optional(),
  supabase_database_password: z.string().optional(),
  supabase_plan: z.enum(['free', 'pro', 'team']).default('free'),
  supabase_template_url: z.string().url().optional(),
  run_migrations: z.boolean().default(false),
  supabase_env_keys: z.array(z.string()).default(['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SERVICE_ROLE_KEY']),

  // 4. GitHub Actions params
  setup_github_actions: z.boolean().default(true),
  exclude_authors: z.array(z.string()).default(['dependabot[bot]', 'github-actions[bot]']),
  trigger_branches: z.array(z.string()).default(['main', 'master']),
  preview_for_pr: z.boolean().default(true),
  github_token: z.string().optional(),

  // 5. IaC params
  generate_terraform: z.boolean().default(false),
  terraform_providers: z.array(z.string()).default(['vercel']),
  terraform_state_backend: z.enum(['local', 's3', 'gcs', 'azurerm']).default('local'),

  // 6. Domain & DNS
  custom_domain: z.string().optional(),
  enable_ssl: z.boolean().default(true),
  dns_provider: z.enum(['cloudflare', 'route53', 'digitalocean']).optional(),
  dns_api_token: z.string().optional(),

  // 7. Notifications
  notification_slack: z.string().url().optional(),
  notification_email: z.string().email().optional(),
  notification_discord: z.string().url().optional(),
  notification_ms_teams: z.string().url().optional(),

  // 8. Security
  enable_webhook_validation: z.boolean().default(false),
  vercel_auth_protection: z.boolean().default(true),
  ip_whitelist: z.array(z.string()).optional(),
  scan_vulnerabilities: z.boolean().default(false),
  audit_logs: z.boolean().default(true),
  environment_variables_encryption: z.boolean().default(true),

  // 9. CLI params
  cli_mode: z.boolean().default(false),
  auto_confirm: z.boolean().default(false),
  timeout_seconds: z.number().default(600),
  retry_count: z.number().default(3),
  parallel_deploys: z.number().default(5),

  // 10. UI params
  project_badge: z.boolean().default(false),
  custom_favicon: z.string().url().optional(),
  deployment_message: z.string().optional(),
  wait_for_completion: z.boolean().default(true),

  // 11. Analytics
  log_level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  log_retention_days: z.number().default(30),
  send_analytics: z.boolean().default(true),
  integrate_sentry: z.string().optional(),
});

export type DeployParams = z.infer<typeof deployParamsSchema>;

// Response schemas
export const deployResponseSchema = z.object({
  deployment_id: z.string(),
  project_id: z.number().optional(),
  status: z.enum(['pending', 'building', 'ready', 'error']),
  url: z.string().url().optional(),
  preview_url: z.string().url().optional(),
  is_preview: z.boolean().optional(),
  logs_url: z.string().optional(),
  message: z.string().optional(),
});

export type DeployResponse = z.infer<typeof deployResponseSchema>;

// Project list response
export const projectListItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  repo_url: z.string(),
  platform: z.string(),
  environment: z.string(),
  status: z.string().nullable(),
  url: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const projectListResponseSchema = z.object({
  projects: z.array(projectListItemSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type ProjectListItem = z.infer<typeof projectListItemSchema>;
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;

// Validation helper
export function validateDeployParams(data: unknown): DeployParams {
  return deployParamsSchema.parse(data);
}

export function parseDeployParams(data: unknown): {
  success: boolean;
  data?: DeployParams;
  error?: z.ZodError;
} {
  const result = deployParamsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// GitHub webhook schema
const gitHubWebhookSchema = z.object({
  ref: z.string(),
  repository: z.object({
    full_name: z.string(),
  }),
  after: z.string().optional(),
});

export function parseGitHubWebhook(data: unknown): {
  success: boolean;
  data?: z.infer<typeof gitHubWebhookSchema>;
  error?: z.ZodError;
} {
  const result = gitHubWebhookSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Vercel webhook schema
const vercelWebhookSchema = z.object({
  type: z.string(),
  payload: z.object({
    deployment: z.object({
      id: z.string(),
      url: z.string().optional(),
    }).optional(),
  }).optional(),
});

export function parseVercelWebhook(data: unknown): {
  success: boolean;
  data?: z.infer<typeof vercelWebhookSchema>;
  error?: z.ZodError;
} {
  const result = vercelWebhookSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}