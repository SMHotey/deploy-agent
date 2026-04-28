CREATE TYPE "public"."deployment_status" AS ENUM('pending', 'building', 'ready', 'error', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."environment" AS ENUM('production', 'preview', 'development');--> statement-breakpoint
CREATE TYPE "public"."platform" AS ENUM('vercel', 'netlify', 'cloudflare-pages', 'railway', 'self-hosted-docker');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"details" jsonb,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"deployment_id_external" varchar(100),
	"status" "deployment_status" DEFAULT 'pending' NOT NULL,
	"url" varchar(500),
	"logs_url" varchar(500),
	"commit_sha" varchar(100),
	"commit_message" text,
	"author" varchar(255),
	"branch" varchar(100),
	"started_at" timestamp,
	"ready_at" timestamp,
	"build_time" integer,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "environment_variables" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"key" varchar(255) NOT NULL,
	"encrypted_value" text NOT NULL,
	"iv" varchar(50) NOT NULL,
	"is_secret" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"repo_url" varchar(500) NOT NULL,
	"platform" "platform" DEFAULT 'vercel' NOT NULL,
	"environment" "environment" DEFAULT 'production' NOT NULL,
	"root_directory" varchar(255) DEFAULT '/',
	"branch" varchar(100) DEFAULT 'main',
	"build_override" varchar(500),
	"output_directory" varchar(255),
	"framework_preset" varchar(50),
	"install_command" varchar(255),
	"build_command" varchar(255),
	"dev_command" varchar(255),
	"vercel_json_config" jsonb,
	"serverless_function_region" varchar(20),
	"deploy_hook" varchar(500),
	"ignore_build_step" boolean DEFAULT false,
	"create_supabase_project" boolean DEFAULT false,
	"supabase_project_id" varchar(100),
	"supabase_db_password" text,
	"supabase_region" varchar(50),
	"run_migrations" boolean DEFAULT false,
	"setup_github_actions" boolean DEFAULT true,
	"exclude_authors" jsonb,
	"trigger_branches" jsonb DEFAULT '["main","master"]'::jsonb,
	"preview_for_pr" boolean DEFAULT true,
	"generate_terraform" boolean DEFAULT false,
	"terraform_providers" jsonb,
	"custom_domain" varchar(255),
	"enable_ssl" boolean DEFAULT true,
	"dns_provider" varchar(50),
	"dns_api_token" text,
	"notification_slack" varchar(500),
	"notification_email" varchar(255),
	"notification_discord" varchar(500),
	"notification_ms_teams" varchar(500),
	"enable_webhook_validation" boolean DEFAULT false,
	"vercel_auth_protection" boolean DEFAULT true,
	"ip_whitelist" jsonb,
	"scan_vulnerabilities" boolean DEFAULT false,
	"audit_logs" boolean DEFAULT true,
	"project_badge" boolean DEFAULT false,
	"custom_favicon" varchar(500),
	"deployment_message" text,
	"wait_for_completion" boolean DEFAULT true,
	"log_level" varchar(20) DEFAULT 'info',
	"log_retention_days" integer DEFAULT 30,
	"send_analytics" boolean DEFAULT true,
	"sentry_dsn" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255),
	"github_token" text,
	"vercel_token" varchar(255),
	"supabase_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environment_variables" ADD CONSTRAINT "environment_variables_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;