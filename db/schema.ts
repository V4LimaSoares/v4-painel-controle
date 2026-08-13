import { boolean, date, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const memberStatusEnum = pgEnum("member_status", ["Ativo", "Pausado", "Inativo"]);
export const clientStatusEnum = pgEnum("client_status", ["Ativo", "Pausado", "Inativo"]);
export const projectStatusEnum = pgEnum("project_status", ["Ativo", "Pausado", "Inativo", "Entregue"]);
export const projectHealthEnum = pgEnum("project_health", ["Saudavel", "Alerta", "Perigo"]);
export const projectEngagementEnum = pgEnum("project_engagement", ["Engajado", "Neutro", "Desengajado"]);
export const expansionStatusEnum = pgEnum("expansion_status", ["Aberta", "Ganha", "Perdida", "Pausada"]);
export const commissionStatusEnum = pgEnum("commission_status", ["Pendente", "Liberada", "Bloqueada"]);
export const appUserStatusEnum = pgEnum("app_user_status", ["Ativo", "Inativo"]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

export const roles = pgTable(
  "roles",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    nome: varchar("nome", { length: 120 }).notNull(),
    descricao: text("descricao").default("").notNull(),
    ativo: boolean("ativo").default(true).notNull(),
    ...timestamps,
  },
  (table) => ({
    nomeIdx: uniqueIndex("roles_nome_idx").on(table.nome),
  })
);

export const teamMembers = pgTable("team_members", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nome: varchar("nome", { length: 160 }).notNull(),
  funcao: varchar("funcao", { length: 120 }).notNull(),
  custoFixo: numeric("custo_fixo", { precision: 12, scale: 2 }).default("0").notNull(),
  dataContratacao: date("data_contratacao"),
  percentualProjeto: numeric("percentual_projeto", { precision: 8, scale: 4 }).default("0").notNull(),
  usarFixoOuVariavel: boolean("usar_fixo_ou_variavel").default(false).notNull(),
  socio: boolean("socio").default(false).notNull(),
  status: memberStatusEnum("status").default("Ativo").notNull(),
  ...timestamps,
});

export const squads = pgTable("squads", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nome: varchar("nome", { length: 140 }).notNull(),
  coordenador: varchar("coordenador", { length: 160 }).default("").notNull(),
  account: varchar("account", { length: 160 }).default("").notNull(),
  membros: jsonb("membros").$type<string[]>().default([]).notNull(),
  status: memberStatusEnum("status").default("Ativo").notNull(),
  ...timestamps,
});

export const clients = pgTable("clients", {
  id: varchar("id", { length: 64 }).primaryKey(),
  nome: varchar("nome", { length: 220 }).notNull(),
  razaoSocial: varchar("razao_social", { length: 240 }).default("").notNull(),
  cnpj: varchar("cnpj", { length: 24 }).default("").notNull(),
  nomeFantasia: varchar("nome_fantasia", { length: 220 }).default("").notNull(),
  segmento: text("segmento").default("").notNull(),
  responsavel: varchar("responsavel", { length: 160 }).default("").notNull(),
  email: varchar("email", { length: 180 }).default("").notNull(),
  telefone: varchar("telefone", { length: 40 }).default("").notNull(),
  status: clientStatusEnum("status").default("Ativo").notNull(),
  ...timestamps,
});

export const clientProjects = pgTable("client_projects", {
  id: varchar("id", { length: 64 }).primaryKey(),
  clientId: varchar("client_id", { length: 64 }).notNull().references(() => clients.id, { onDelete: "cascade" }),
  nome: varchar("nome", { length: 220 }).notNull(),
  produto: varchar("produto", { length: 40 }).notNull(),
  squad: varchar("squad", { length: 140 }).default("").notNull(),
  saude: projectHealthEnum("saude").default("Saudavel").notNull(),
  engajamento: projectEngagementEnum("engajamento").default("Neutro").notNull(),
  mrr: numeric("mrr", { precision: 12, scale: 2 }).default("0").notNull(),
  valorUnico: numeric("valor_unico", { precision: 12, scale: 2 }).default("0").notNull(),
  dataInicio: date("data_inicio"),
  mesesContrato: integer("meses_contrato").default(0).notNull(),
  dataRenovacao: date("data_renovacao"),
  dataEntrega: date("data_entrega"),
  status: projectStatusEnum("status").default("Ativo").notNull(),
  ...timestamps,
});

export const expansions = pgTable("expansions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  clienteId: varchar("cliente_id", { length: 64 }).references(() => clients.id, { onDelete: "set null" }),
  projetoId: varchar("projeto_id", { length: 64 }).references(() => clientProjects.id, { onDelete: "set null" }),
  tipo: varchar("tipo", { length: 80 }).notNull(),
  lider: varchar("lider", { length: 160 }).default("").notNull(),
  participantes: jsonb("participantes").$type<string[]>().default([]).notNull(),
  valorMRR: numeric("valor_mrr", { precision: 12, scale: 2 }).default("0").notNull(),
  valorUnico: numeric("valor_unico", { precision: 12, scale: 2 }).default("0").notNull(),
  ltMeses: integer("lt_meses").default(0).notNull(),
  previsaoFechamento: date("previsao_fechamento"),
  etapa: varchar("etapa", { length: 120 }).default("").notNull(),
  status: expansionStatusEnum("status").default("Aberta").notNull(),
  observacoes: text("observacoes").default("").notNull(),
  ...timestamps,
});

export const commercialRecords = pgTable("commercial_records", {
  id: varchar("id", { length: 64 }).primaryKey(),
  mes: varchar("mes", { length: 7 }).notNull(),
  lead: varchar("lead", { length: 220 }).notNull(),
  canal: varchar("canal", { length: 80 }).default("").notNull(),
  bdr: varchar("bdr", { length: 160 }).default("").notNull(),
  closer: varchar("closer", { length: 160 }).default("").notNull(),
  reuniaoQualificada: varchar("reuniao_qualificada", { length: 20 }).default("Nao").notNull(),
  status: varchar("status", { length: 80 }).default("").notNull(),
  produto: varchar("produto", { length: 40 }).default("").notNull(),
  primeiroMRR: numeric("primeiro_mrr", { precision: 12, scale: 2 }).default("0").notNull(),
  valorUnico: numeric("valor_unico", { precision: 12, scale: 2 }).default("0").notNull(),
  pagamento: varchar("pagamento", { length: 80 }).default("").notNull(),
  primeiroPagamentoConfirmado: boolean("primeiro_pagamento_confirmado").default(false).notNull(),
  contratoAtivado: boolean("contrato_ativado").default(false).notNull(),
  comissaoStatus: commissionStatusEnum("comissao_status").default("Pendente").notNull(),
  pendenciaMotivo: text("pendencia_motivo").default("").notNull(),
  ...timestamps,
});

export const commercialDailyMetrics = pgTable(
  "commercial_daily_metrics",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    date: date("date").notNull(),
    mql: integer("mql").default(0).notNull(),
    sql: integer("sql").default(0).notNull(),
    sal: integer("sal").default(0).notNull(),
    logo: integer("logo").default(0).notNull(),
    dialerMinutes: integer("dialer_minutes").default(0).notNull(),
    followUps: integer("follow_ups").default(0).notNull(),
    observations: text("observations").default("").notNull(),
    updatedBy: varchar("updated_by", { length: 160 }).default("").notNull(),
    ...timestamps,
  },
  (table) => ({
    dateIdx: uniqueIndex("commercial_daily_metrics_date_idx").on(table.date),
  })
);

export const commercialMonthlyGoals = pgTable(
  "commercial_monthly_goals",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    mes: varchar("mes", { length: 7 }).notNull(),
    mql: integer("mql").default(0).notNull(),
    sql: integer("sql").default(0).notNull(),
    sal: integer("sal").default(0).notNull(),
    logo: integer("logo").default(0).notNull(),
    settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
    ...timestamps,
  },
  (table) => ({
    mesIdx: uniqueIndex("commercial_monthly_goals_mes_idx").on(table.mes),
  })
);

export const commercialPolicy = pgTable("commercial_policy", {
  id: varchar("id", { length: 64 }).primaryKey(),
  bdrMaxRecurringRate: numeric("bdr_max_recurring_rate", { precision: 8, scale: 4 }).default("0.12").notNull(),
  bdrMaxOneTimeRate: numeric("bdr_max_one_time_rate", { precision: 8, scale: 4 }).default("0.10").notNull(),
  closerMaxRecurringRate: numeric("closer_max_recurring_rate", { precision: 8, scale: 4 }).default("0.20").notNull(),
  closerMaxOneTimeRate: numeric("closer_max_one_time_rate", { precision: 8, scale: 4 }).default("0.10").notNull(),
  bdrSaleMeetingBonus: numeric("bdr_sale_meeting_bonus", { precision: 12, scale: 2 }).default("50").notNull(),
  bdrPaymentOnCallBonus: numeric("bdr_payment_on_call_bonus", { precision: 12, scale: 2 }).default("100").notNull(),
  bdrActivatedContractBonus: numeric("bdr_activated_contract_bonus", { precision: 12, scale: 2 }).default("50").notNull(),
  closerPaymentOnCallBonus: numeric("closer_payment_on_call_bonus", { precision: 12, scale: 2 }).default("100").notNull(),
  closerActivatedContractBonus: numeric("closer_activated_contract_bonus", { precision: 12, scale: 2 }).default("80").notNull(),
  expansionPoolRate: numeric("expansion_pool_rate", { precision: 8, scale: 4 }).default("0.07").notNull(),
  expansionLeaderShare: numeric("expansion_leader_share", { precision: 8, scale: 4 }).default("0.30").notNull(),
  expansionCoordinatorShare: numeric("expansion_coordinator_share", { precision: 8, scale: 4 }).default("0.10").notNull(),
  paymentDay: integer("payment_day").default(10).notNull(),
  ...timestamps,
});

export const appUsers = pgTable(
  "app_users",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    email: varchar("email", { length: 180 }).notNull(),
    nome: varchar("nome", { length: 160 }).default("").notNull(),
    allowedTabs: jsonb("allowed_tabs").$type<string[]>().default([]).notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    status: appUserStatusEnum("status").default("Ativo").notNull(),
    ...timestamps,
  },
  (table) => ({
    emailIdx: uniqueIndex("app_users_email_idx").on(table.email),
  }),
);
