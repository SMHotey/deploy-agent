CREATE TYPE "public"."marketing_activity_status" AS ENUM('draft', 'scheduled', 'active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."marketing_activity_type" AS ENUM('email_campaign', 'social_media', 'content_marketing', 'webinar', 'partnership', 'referral_program', 'discount_offer');--> statement-breakpoint
CREATE TYPE "public"."project_category" AS ENUM('saas', 'e-commerce', 'blog', 'portfolio', 'web-app', 'mobile-app', 'api', 'dashboard', 'landing-page', 'other');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'pro', 'team', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'cancelled', 'past_due', 'trialing');--> statement-breakpoint
CREATE TABLE "affiliate_clicks" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer,
	"user_id" integer,
	"project_id" integer,
	"referrer" varchar(500),
	"ip_address" varchar(45),
	"user_agent" text,
	"clicked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliate_conversions" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer,
	"user_id" integer,
	"project_id" integer,
	"conversion_type" varchar(50) NOT NULL,
	"conversion_value" integer DEFAULT 0,
	"commission_earned" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending',
	"external_id" varchar(100),
	"converted_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "hosting_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(50) NOT NULL,
	"description" text,
	"logo_url" varchar(500),
	"affiliate_url" varchar(500),
	"referral_code" varchar(100),
	"commission_rate" varchar(20),
	"commission_type" varchar(20) DEFAULT 'cpa',
	"min_payout" integer DEFAULT 50,
	"payment_terms" varchar(100) DEFAULT 'Net-30',
	"categories" jsonb,
	"features" jsonb,
	"pricing" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hosting_providers_name_unique" UNIQUE("name"),
	CONSTRAINT "hosting_providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "landing_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"topic" varchar(255) NOT NULL,
	"target_audience" varchar(255),
	"tone" varchar(100),
	"config" jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"published_at" timestamp,
	CONSTRAINT "landing_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "leaderboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" varchar(50),
	"points" integer DEFAULT 0 NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"avg_rating_given" integer DEFAULT 0,
	"avg_quality_score" integer DEFAULT 0,
	"rank" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" "marketing_activity_type" NOT NULL,
	"status" "marketing_activity_status" DEFAULT 'draft' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"budget_cents" integer DEFAULT 0,
	"target_audience" varchar(500),
	"conversion_goal" varchar(255),
	"current_conversions" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"reference_id" integer,
	"reference_type" varchar(50),
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"category" "project_category" NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"live_url" varchar(500),
	"repo_url" varchar(500),
	"demo_credentials" jsonb,
	"testing_instructions" text,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"points_reward" integer DEFAULT 100 NOT NULL,
	"max_testers" integer DEFAULT 5 NOT NULL,
	"current_testers" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"provider_id" integer,
	"project_id" integer,
	"event_type" varchar(50) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"referrer_id" integer NOT NULL,
	"referred_id" integer NOT NULL,
	"referral_code" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"reward_claimed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"rewarded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "review_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" integer NOT NULL,
	"rated_by" integer NOT NULL,
	"quality_score" integer NOT NULL,
	"points_awarded" integer DEFAULT 0 NOT NULL,
	"feedback" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"tester_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"pros" text,
	"cons" text,
	"bugs_found" integer DEFAULT 0,
	"screenshots" jsonb,
	"video_url" varchar(500),
	"time_spent_minutes" integer,
	"testing_checklist" jsonb,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "startup_health_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"score" integer NOT NULL,
	"metrics" jsonb NOT NULL,
	"recommendations" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "startup_readiness_checks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"project_id" integer,
	"check_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"message" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "startup_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"stack" varchar(100) NOT NULL,
	"config" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"current_period_start" timestamp DEFAULT now() NOT NULL,
	"current_period_end" timestamp DEFAULT now() NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "supabase_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"project_name" varchar(255) NOT NULL,
	"project_id" varchar(100),
	"url" varchar(500) NOT NULL,
	"anon_key" text,
	"service_role_key" text,
	"region" varchar(50),
	"plan" varchar(20) DEFAULT 'free',
	"db_password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(50) DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"owner_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"team_id" integer,
	"action" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"available_points" integer DEFAULT 0 NOT NULL,
	"spent_points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_points_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(50) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_retry_at" timestamp,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "repo_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "is_preview" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "pr_number" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "source" varchar(50) DEFAULT 'git';--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_domain" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "netlify_token" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by" integer;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_provider_id_hosting_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."hosting_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_provider_id_hosting_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."hosting_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard" ADD CONSTRAINT "leaderboard_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_activities" ADD CONSTRAINT "marketing_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_submissions" ADD CONSTRAINT "project_submissions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_submissions" ADD CONSTRAINT "project_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_provider_id_hosting_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."hosting_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_events" ADD CONSTRAINT "referral_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_users_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_users_id_fk" FOREIGN KEY ("referred_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_ratings" ADD CONSTRAINT "review_ratings_rated_by_users_id_fk" FOREIGN KEY ("rated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submission_id_project_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."project_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_tester_id_users_id_fk" FOREIGN KEY ("tester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "startup_health_scores" ADD CONSTRAINT "startup_health_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "startup_health_scores" ADD CONSTRAINT "startup_health_scores_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "startup_readiness_checks" ADD CONSTRAINT "startup_readiness_checks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "startup_readiness_checks" ADD CONSTRAINT "startup_readiness_checks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supabase_config" ADD CONSTRAINT "supabase_config_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_users_id_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");