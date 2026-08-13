CREATE TYPE "public"."app_user_status" AS ENUM('Ativo', 'Inativo');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"email" varchar(180) NOT NULL,
	"nome" varchar(160) DEFAULT '' NOT NULL,
	"allowed_tabs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"status" "app_user_status" DEFAULT 'Ativo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_users_email_idx" ON "app_users" USING btree ("email");