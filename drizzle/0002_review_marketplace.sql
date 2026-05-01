-- Review Marketplace Tables Migration
-- Generated from src/db/schema.ts

-- Create enums for project categories
CREATE TYPE "public"."project_category" AS ENUM(
  'saas', 'e-commerce', 'blog', 'portfolio', 'web-app', 
  'mobile-app', 'api', 'dashboard', 'landing-page', 'other'
);--> statement-breakpoint

-- Project submissions table
CREATE TABLE IF NOT EXISTS "project_submissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "project_id" integer NOT NULL REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action,
  "user_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  "category" "public"."project_category" NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "live_url" varchar(500),
  "repo_url" varchar(500) NOT NULL,
  "demo_credentials" text,
  "testing_instructions" text,
  "points_reward" integer DEFAULT 100 NOT NULL,
  "max_testers" integer DEFAULT 5 NOT NULL,
  "current_testers" integer DEFAULT 0 NOT NULL,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Reviews table
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" serial PRIMARY KEY NOT NULL,
  "submission_id" integer NOT NULL REFERENCES "public"."project_submissions"("id") ON DELETE cascade ON UPDATE no action,
  "tester_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  "rating" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "content" text NOT NULL,
  "pros" text,
  "cons" text,
  "bugs_found" integer DEFAULT 0 NOT NULL,
  "screenshots" text,
  "video_url" varchar(500),
  "testing_checklist" text,
  "time_spent_minutes" integer,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Review ratings table (project owner rates the review quality)
CREATE TABLE IF NOT EXISTS "review_ratings" (
  "id" serial PRIMARY KEY NOT NULL,
  "review_id" integer NOT NULL REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action,
  "rated_by" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  "quality_score" integer NOT NULL,
  "points_awarded" integer NOT NULL,
  "feedback" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- User points table
CREATE TABLE IF NOT EXISTS "user_points" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action UNIQUE,
  "total_points" integer DEFAULT 0 NOT NULL,
  "available_points" integer DEFAULT 0 NOT NULL,
  "spent_points" integer DEFAULT 0 NOT NULL,
  "level" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Points transactions table
CREATE TABLE IF NOT EXISTS "points_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  "amount" integer NOT NULL,
  "type" varchar(50) NOT NULL,
  "reference_id" integer,
  "reference_type" varchar(50),
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Leaderboard table
CREATE TABLE IF NOT EXISTS "leaderboard" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  "category" "public"."project_category",
  "points" integer DEFAULT 0 NOT NULL,
  "reviews_count" integer DEFAULT 0 NOT NULL,
  "avg_rating_given" decimal(3,2),
  "avg_quality_score" decimal(3,2),
  "rank" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_project_submissions_user" ON "project_submissions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_project_submissions_status" ON "project_submissions"("status");
CREATE INDEX IF NOT EXISTS "idx_project_submissions_category" ON "project_submissions"("category");

CREATE INDEX IF NOT EXISTS "idx_reviews_submission" ON "reviews"("submission_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_tester" ON "reviews"("tester_id");

CREATE INDEX IF NOT EXISTS "idx_review_ratings_review" ON "review_ratings"("review_id");
CREATE INDEX IF NOT EXISTS "idx_review_ratings_rated_by" ON "review_ratings"("rated_by");

CREATE INDEX IF NOT EXISTS "idx_points_transactions_user" ON "points_transactions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_points_transactions_created" ON "points_transactions"("created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_leaderboard_category" ON "leaderboard"("category");
CREATE INDEX IF NOT EXISTS "idx_leaderboard_rank" ON "leaderboard"("rank");
CREATE INDEX IF NOT EXISTS "idx_leaderboard_points" ON "leaderboard"("points" DESC);
