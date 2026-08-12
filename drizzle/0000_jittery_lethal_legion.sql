CREATE TYPE "public"."client_status" AS ENUM('Ativo', 'Pausado', 'Inativo');--> statement-breakpoint
CREATE TYPE "public"."commission_status" AS ENUM('Pendente', 'Liberada', 'Bloqueada');--> statement-breakpoint
CREATE TYPE "public"."expansion_status" AS ENUM('Aberta', 'Ganha', 'Perdida', 'Pausada');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('Ativo', 'Pausado', 'Inativo');--> statement-breakpoint
CREATE TYPE "public"."project_engagement" AS ENUM('Engajado', 'Neutro', 'Desengajado');--> statement-breakpoint
CREATE TYPE "public"."project_health" AS ENUM('Saudavel', 'Alerta', 'Perigo');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('Ativo', 'Pausado', 'Inativo', 'Entregue');--> statement-breakpoint
CREATE TABLE "client_projects" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"client_id" varchar(64) NOT NULL,
	"nome" varchar(220) NOT NULL,
	"produto" varchar(40) NOT NULL,
	"squad" varchar(140) DEFAULT '' NOT NULL,
	"saude" "project_health" DEFAULT 'Saudavel' NOT NULL,
	"engajamento" "project_engagement" DEFAULT 'Neutro' NOT NULL,
	"mrr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"valor_unico" numeric(12, 2) DEFAULT '0' NOT NULL,
	"data_inicio" date,
	"meses_contrato" integer DEFAULT 0 NOT NULL,
	"data_renovacao" date,
	"data_entrega" date,
	"status" "project_status" DEFAULT 'Ativo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"nome" varchar(220) NOT NULL,
	"razao_social" varchar(240) DEFAULT '' NOT NULL,
	"cnpj" varchar(24) DEFAULT '' NOT NULL,
	"nome_fantasia" varchar(220) DEFAULT '' NOT NULL,
	"segmento" text DEFAULT '' NOT NULL,
	"responsavel" varchar(160) DEFAULT '' NOT NULL,
	"email" varchar(180) DEFAULT '' NOT NULL,
	"telefone" varchar(40) DEFAULT '' NOT NULL,
	"status" "client_status" DEFAULT 'Ativo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_daily_metrics" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"mql" integer DEFAULT 0 NOT NULL,
	"sql" integer DEFAULT 0 NOT NULL,
	"sal" integer DEFAULT 0 NOT NULL,
	"logo" integer DEFAULT 0 NOT NULL,
	"dialer_minutes" integer DEFAULT 0 NOT NULL,
	"follow_ups" integer DEFAULT 0 NOT NULL,
	"observations" text DEFAULT '' NOT NULL,
	"updated_by" varchar(160) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_monthly_goals" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"mes" varchar(7) NOT NULL,
	"mql" integer DEFAULT 0 NOT NULL,
	"sql" integer DEFAULT 0 NOT NULL,
	"sal" integer DEFAULT 0 NOT NULL,
	"logo" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_policy" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"bdr_max_recurring_rate" numeric(8, 4) DEFAULT '0.12' NOT NULL,
	"bdr_max_one_time_rate" numeric(8, 4) DEFAULT '0.10' NOT NULL,
	"closer_max_recurring_rate" numeric(8, 4) DEFAULT '0.20' NOT NULL,
	"closer_max_one_time_rate" numeric(8, 4) DEFAULT '0.10' NOT NULL,
	"bdr_sale_meeting_bonus" numeric(12, 2) DEFAULT '50' NOT NULL,
	"bdr_payment_on_call_bonus" numeric(12, 2) DEFAULT '100' NOT NULL,
	"bdr_activated_contract_bonus" numeric(12, 2) DEFAULT '50' NOT NULL,
	"closer_payment_on_call_bonus" numeric(12, 2) DEFAULT '100' NOT NULL,
	"closer_activated_contract_bonus" numeric(12, 2) DEFAULT '80' NOT NULL,
	"expansion_pool_rate" numeric(8, 4) DEFAULT '0.07' NOT NULL,
	"expansion_leader_share" numeric(8, 4) DEFAULT '0.30' NOT NULL,
	"expansion_coordinator_share" numeric(8, 4) DEFAULT '0.10' NOT NULL,
	"payment_day" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commercial_records" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"mes" varchar(7) NOT NULL,
	"lead" varchar(220) NOT NULL,
	"canal" varchar(80) DEFAULT '' NOT NULL,
	"bdr" varchar(160) DEFAULT '' NOT NULL,
	"closer" varchar(160) DEFAULT '' NOT NULL,
	"reuniao_qualificada" varchar(20) DEFAULT 'Nao' NOT NULL,
	"status" varchar(80) DEFAULT '' NOT NULL,
	"produto" varchar(40) DEFAULT '' NOT NULL,
	"primeiro_mrr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"valor_unico" numeric(12, 2) DEFAULT '0' NOT NULL,
	"pagamento" varchar(80) DEFAULT '' NOT NULL,
	"primeiro_pagamento_confirmado" boolean DEFAULT false NOT NULL,
	"contrato_ativado" boolean DEFAULT false NOT NULL,
	"comissao_status" "commission_status" DEFAULT 'Pendente' NOT NULL,
	"pendencia_motivo" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expansions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"cliente_id" varchar(64),
	"projeto_id" varchar(64),
	"tipo" varchar(80) NOT NULL,
	"lider" varchar(160) DEFAULT '' NOT NULL,
	"participantes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"valor_mrr" numeric(12, 2) DEFAULT '0' NOT NULL,
	"valor_unico" numeric(12, 2) DEFAULT '0' NOT NULL,
	"lt_meses" integer DEFAULT 0 NOT NULL,
	"previsao_fechamento" date,
	"etapa" varchar(120) DEFAULT '' NOT NULL,
	"status" "expansion_status" DEFAULT 'Aberta' NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"nome" varchar(120) NOT NULL,
	"descricao" text DEFAULT '' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "squads" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"nome" varchar(140) NOT NULL,
	"coordenador" varchar(160) DEFAULT '' NOT NULL,
	"account" varchar(160) DEFAULT '' NOT NULL,
	"membros" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "member_status" DEFAULT 'Ativo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"nome" varchar(160) NOT NULL,
	"funcao" varchar(120) NOT NULL,
	"custo_fixo" numeric(12, 2) DEFAULT '0' NOT NULL,
	"data_contratacao" date,
	"percentual_projeto" numeric(8, 4) DEFAULT '0' NOT NULL,
	"usar_fixo_ou_variavel" boolean DEFAULT false NOT NULL,
	"socio" boolean DEFAULT false NOT NULL,
	"status" "member_status" DEFAULT 'Ativo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_projects" ADD CONSTRAINT "client_projects_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expansions" ADD CONSTRAINT "expansions_cliente_id_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expansions" ADD CONSTRAINT "expansions_projeto_id_client_projects_id_fk" FOREIGN KEY ("projeto_id") REFERENCES "public"."client_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_daily_metrics_date_idx" ON "commercial_daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "commercial_monthly_goals_mes_idx" ON "commercial_monthly_goals" USING btree ("mes");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_nome_idx" ON "roles" USING btree ("nome");