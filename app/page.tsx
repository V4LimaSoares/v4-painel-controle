"use client";

import { Fragment, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import {
  attainmentStatus,
  buildMonthlyGoalRecord,
  countBusinessDays,
  defaultGoalSettings,
  defaultMonthlyTargets,
  dynamicDailyTarget,
  elapsedWorkdaysInSnapshot,
  goalForDate,
  monthLabel,
  remainingWorkdaysInSnapshot,
  snapshotForDate,
  summarizeSnapshot,
  type CommercialGoalSettings,
  type CommercialMonthlyGoalRecord,
  type CommercialWeeklySnapshot,
  type MetricTargets,
} from "./commercial-goals";

type Comercial = {
  id: string;
  mes: string;
  lead: string;
  canal: string;
  bdr: string;
  closer: string;
  reuniaoQualificada: string;
  status: string;
  produto: string;
  primeiroMRR: number;
  valorUnico: number;
  pagamento: string;
  primeiroPagamentoConfirmado?: boolean;
  contratoAtivado?: boolean;
  comissaoStatus?: string;
  pendenciaMotivo?: string;
};

type CommercialMetricKey = "mql" | "sql" | "sal" | "logo";

type CommercialDailyMetric = {
  id: string;
  date: string;
  mql: number;
  sql: number;
  sal: number;
  logo: number;
  dialerMinutes: number;
  followUps: number;
  observations: string;
  updatedAt: string;
};

type CommercialGoals = Record<CommercialMetricKey, number>;

type CommercialPolicyConfig = {
  bdrMaxRecurringRate: number;
  bdrMaxOneTimeRate: number;
  closerMaxRecurringRate: number;
  closerMaxOneTimeRate: number;
  bdrSaleMeetingBonus: number;
  bdrPaymentOnCallBonus: number;
  bdrActivatedContractBonus: number;
  closerPaymentOnCallBonus: number;
  closerActivatedContractBonus: number;
  expansionPoolRate: number;
  expansionLeaderShare: number;
  expansionCoordinatorShare: number;
  paymentDay: number;
};

type Operacao = {
  id: string;
  cliente: string;
  produto: string;
  squad: string;
  account: string;
  peg: string;
  status: string;
  mrr: number;
  riscoChurn: string;
  renovacao: string;
};

type Monetizacao = {
  id: string;
  cliente: string;
  tipo: string;
  lider: string;
  participantes: string;
  valorMRR: number;
  lt: number;
  arpu: number;
  pool: number;
  margem: string;
  status: string;
};

type Comissao = {
  id: string;
  pessoa: string;
  funcao: string;
  origem: string;
  valorBase: number;
  percentual: number;
  bonus: number;
  total: number;
  status: string;
};

type TeamMember = {
  id: string;
  nome: string;
  funcao: string;
  fixoAcordado: number;
  dataContratacao?: string;
  percentualProjeto: number;
  usarMaiorEntreFixoVariavel: boolean;
  socio?: boolean;
  status: string;
};

type Squad = {
  id: string;
  nome: string;
  coordenador: string;
  account: string;
  membros: string[];
  status: string;
};

type Expansion = {
  id: string;
  clienteId: string;
  projetoId: string;
  tipo: string;
  lider: string;
  participantes: string[];
  valorMRR: number;
  valorUnico: number;
  ltMeses: number;
  previsaoFechamento: string;
  etapa: string;
  status: string;
  observacoes: string;
};

type Client = {
  id: string;
  nome: string;
  razaoSocial: string;
  cnpj: string;
  nomeFantasia: string;
  segmento: string;
  responsavel: string;
  email: string;
  telefone: string;
  projetos: ClientProject[];
  status: string;
};

type ClientProject = {
  id: string;
  nome: string;
  produto: string;
  squad: string;
  saude: string;
  engajamento: string;
  mrr: number;
  valorUnico: number;
  dataInicio: string;
  mesesContrato: number;
  dataRenovacao: string;
  dataEntrega: string;
  status: string;
};

type SheetConfig = {
  comercial: string;
  operacao: string;
  monetizacao: string;
  comissoes: string;
};

type PanelState = {
  roles: string[];
  team: TeamMember[];
  squads: Squad[];
  clients: Client[];
  expansions: Expansion[];
  comercial: Comercial[];
  commercialDailyMetrics: CommercialDailyMetric[];
  commercialMonthlyGoals: CommercialMonthlyGoalRecord[];
  policyConfig: CommercialPolicyConfig | null;
};

type PanelCollection = keyof PanelState;

type AuthUser = {
  email: string;
  nome: string;
  allowedTabs: string[];
  isAdmin: boolean;
};

type AccessUser = {
  id: string;
  email: string;
  nome: string;
  allowedTabs: string[];
  isAdmin: boolean;
  status: string;
};

const navigationItems = [
  ["dashboard", "Dashboard", "DB"],
  ["equipes", "Equipes", "EQ"],
  ["clientes", "Clientes", "CL"],
  ["comercial", "Comercial", "CO"],
  ["expansao", "Expansao", "EX"],
  ["comissoes", "Comissoes", "CM"],
  ["fechamento", "Fechamento", "FC"],
  ["regras", "Regras", "RG"],
  ["acessos", "Acessos", "AC"],
] as const;

const permissionTabs = navigationItems.filter(([id]) => id !== "acessos").map(([id]) => id);

const emptyAccessUser: AccessUser = {
  id: "",
  email: "",
  nome: "",
  allowedTabs: ["dashboard"],
  isAdmin: false,
  status: "Ativo",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyExact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

const commercialMetricKeys: CommercialMetricKey[] = ["mql", "sql", "sal", "logo"];
const defaultCommercialGoals: CommercialGoals = {
  mql: 50,
  sql: 30,
  sal: 15,
  logo: 5,
};

const defaultCommercialPolicy: CommercialPolicyConfig = {
  bdrMaxRecurringRate: 0.12,
  bdrMaxOneTimeRate: 0.1,
  closerMaxRecurringRate: 0.2,
  closerMaxOneTimeRate: 0.1,
  bdrSaleMeetingBonus: 50,
  bdrPaymentOnCallBonus: 100,
  bdrActivatedContractBonus: 50,
  closerPaymentOnCallBonus: 100,
  closerActivatedContractBonus: 80,
  expansionPoolRate: 0.07,
  expansionLeaderShare: 0.3,
  expansionCoordinatorShare: 0.1,
  paymentDay: 10,
};

const bdrMonthlyQualifiedMeetingTarget = 20;

const sampleComercial: Comercial[] = [
  {
    id: "COM-001",
    mes: "2026-08",
    lead: "Clínica Aurora",
    canal: "Indicação",
    bdr: "Kyvia",
    closer: "Monique",
    reuniaoQualificada: "Sim",
    status: "Venda validada",
    produto: "EXECUTAR",
    primeiroMRR: 5000,
    valorUnico: 0,
    pagamento: "Na call",
  },
  {
    id: "COM-002",
    mes: "2026-08",
    lead: "Loja Raiz",
    canal: "LeadBroker",
    bdr: "Kyvia",
    closer: "Monique",
    reuniaoQualificada: "Sim",
    status: "Proposta enviada",
    produto: "TER",
    primeiroMRR: 0,
    valorUnico: 12000,
    pagamento: "Pendente",
  },
  {
    id: "COM-003",
    mes: "2026-08",
    lead: "Seu João Locações",
    canal: "Outbound",
    bdr: "Time interno",
    closer: "Lucas",
    reuniaoQualificada: "Sim",
    status: "Venda validada",
    produto: "SABER",
    primeiroMRR: 0,
    valorUnico: 15000,
    pagamento: "Ativado",
  },
];

const sampleOperacao: Operacao[] = [
  {
    id: "OP-001",
    cliente: "Clínica Aurora",
    produto: "EXECUTAR",
    squad: "Squad Performance",
    account: "Monique",
    peg: "Coord PE&G",
    status: "Ativo",
    mrr: 5000,
    riscoChurn: "Baixo",
    renovacao: "2027-02",
  },
  {
    id: "OP-002",
    cliente: "Seu João Locações",
    produto: "SABER",
    squad: "Squad Saber",
    account: "Amanda",
    peg: "Coord PE&G",
    status: "Diagnóstico",
    mrr: 0,
    riscoChurn: "Médio",
    renovacao: "2026-09",
  },
  {
    id: "OP-003",
    cliente: "Mercado Norte",
    produto: "EXECUTAR",
    squad: "Squad Growth",
    account: "Amanda",
    peg: "Coord PE&G",
    status: "Risco",
    mrr: 4200,
    riscoChurn: "Alto",
    renovacao: "2026-10",
  },
];

const sampleMonetizacao: Monetizacao[] = [
  {
    id: "MON-001",
    cliente: "Seu João Locações",
    tipo: "SABER -> EXECUTAR",
    lider: "Account",
    participantes: "Account; Designer; Gestor de Tráfego",
    valorMRR: 4000,
    lt: 6,
    arpu: 24000,
    pool: 1680,
    margem: "Preservada",
    status: "Validada",
  },
  {
    id: "MON-002",
    cliente: "Mercado Norte",
    tipo: "Renovação",
    lider: "PE&G",
    participantes: "PE&G; Account",
    valorMRR: 4200,
    lt: 6,
    arpu: 25200,
    pool: 756,
    margem: "Em análise",
    status: "Em negociação",
  },
];

const sampleExpansions: Expansion[] = [];

const sampleComissoes: Comissao[] = [
  {
    id: "VAR-001",
    pessoa: "Kyvia",
    funcao: "BDR/SDR",
    origem: "Clínica Aurora",
    valorBase: 5000,
    percentual: 0.1,
    bonus: 150,
    total: 650,
    status: "Prevista",
  },
  {
    id: "VAR-002",
    pessoa: "Monique",
    funcao: "Closer",
    origem: "Clínica Aurora",
    valorBase: 5000,
    percentual: 0.15,
    bonus: 100,
    total: 850,
    status: "Prevista",
  },
  {
    id: "VAR-003",
    pessoa: "Account",
    funcao: "Operação",
    origem: "MON-001",
    valorBase: 1008,
    percentual: 0.6,
    bonus: 0,
    total: 604.8,
    status: "Aguardando financeiro",
  },
];

const sampleTeam: TeamMember[] = [
  { id: "TM-001", nome: "Anderson Matheus", funcao: "Coordenador de PE&G", fixoAcordado: 5000, dataContratacao: "2026-05-04", percentualProjeto: 0, usarMaiorEntreFixoVariavel: false, status: "Ativo" },
  { id: "TM-002", nome: "Everton Matheus", funcao: "Designer", fixoAcordado: 3000, dataContratacao: "2026-06-17", percentualProjeto: 0, usarMaiorEntreFixoVariavel: false, status: "Ativo" },
  { id: "TM-003", nome: "Keila Nunes", funcao: "Coordenadora Administrativa", fixoAcordado: 3000, dataContratacao: "2026-06-01", percentualProjeto: 0, usarMaiorEntreFixoVariavel: false, status: "Ativo" },
  { id: "TM-004", nome: "Kyvia Cabral", funcao: "BDR", fixoAcordado: 2000, dataContratacao: "2026-07-23", percentualProjeto: 0.1, usarMaiorEntreFixoVariavel: false, status: "Ativo" },
  { id: "TM-005", nome: "Lucas Soares", funcao: "Coordenador de Aquisicao", fixoAcordado: 5000, dataContratacao: "2024-07-01", percentualProjeto: 0.2, usarMaiorEntreFixoVariavel: false, socio: true, status: "Ativo" },
  { id: "TM-006", nome: "Mateus Pereira", funcao: "Designer", fixoAcordado: 4000, dataContratacao: "2025-03-01", percentualProjeto: 0, usarMaiorEntreFixoVariavel: false, status: "Ativo" },
  { id: "TM-007", nome: "Mônica Betim", funcao: "Account Manager", fixoAcordado: 4500, dataContratacao: "2026-04-01", percentualProjeto: 0, usarMaiorEntreFixoVariavel: false, status: "Ativo" },
  { id: "TM-008", nome: "Monique Carvalho", funcao: "Closer", fixoAcordado: 3000, dataContratacao: "2025-12-04", percentualProjeto: 0.2, usarMaiorEntreFixoVariavel: false, status: "Ativo" },
  { id: "TM-009", nome: "Pedro Vytor", funcao: "Gestor de Trafego", fixoAcordado: 5000, dataContratacao: "2025-05-01", percentualProjeto: 0.08, usarMaiorEntreFixoVariavel: true, status: "Ativo" },
  { id: "TM-010", nome: "Rafael Macedo", funcao: "Analista de CRM", fixoAcordado: 0, dataContratacao: "2025-09-01", percentualProjeto: 0.2, usarMaiorEntreFixoVariavel: false, status: "Ativo" },
];

const sampleSquads: Squad[] = [
  {
    id: "SQ-001",
    nome: "Squad Performance",
    coordenador: "Coord PE&G",
    account: "Amanda",
    membros: ["Amanda", "Gestor Trafego", "Designer"],
    status: "Ativo",
  },
];

const sampleClients: Client[] = [];

const configKey = "v4-dashboard-sheets";
const comercialKey = "v4-dashboard-comercial";
const teamKey = "v4-dashboard-team";
const squadKey = "v4-dashboard-squads";
const clientKey = "v4-dashboard-clients";
const rolesKey = "v4-dashboard-roles";
const expansionKey = "v4-dashboard-expansions";
const commissionStatusKey = "v4-dashboard-commission-status";
const commercialDailyKey = "v4-dashboard-commercial-daily";
const commercialGoalsKey = "v4-dashboard-commercial-goals";
const commercialPolicyKey = "v4-dashboard-commercial-policy";
const defaultRoles = [
  "BDR/SDR",
  "BDR",
  "Closer",
  "Coordenador de Aquisicao",
  "Coordenador de Aquisicao / Receita",
  "Coordenador de PE&G",
  "Coordenadora Administrativa",
  "Account Manager",
  "Gestor de Trafego",
  "Designer",
  "Copywriter",
  "Social Media",
  "Analista de CRM",
  "Outro",
];
const emptyMember: TeamMember = {
  id: "",
  nome: "",
  funcao: "Account Manager",
  fixoAcordado: 0,
  dataContratacao: "",
  percentualProjeto: 0,
  usarMaiorEntreFixoVariavel: false,
  socio: false,
  status: "Ativo",
};
const emptySquad: Squad = {
  id: "",
  nome: "",
  coordenador: "",
  account: "",
  membros: [],
  status: "Ativo",
};
const emptyClient: Client = {
  id: "",
  nome: "",
  razaoSocial: "",
  cnpj: "",
  nomeFantasia: "",
  segmento: "",
  responsavel: "",
  email: "",
  telefone: "",
  projetos: [],
  status: "Ativo",
};
const emptyComercial: Comercial = {
  id: "",
  mes: currentCompetence(),
  lead: "",
  canal: "Outbound",
  bdr: "",
  closer: "",
  reuniaoQualificada: "Sim",
  status: "Reuniao realizada",
  produto: "EXECUTAR",
  primeiroMRR: 0,
  valorUnico: 0,
  pagamento: "Pendente",
  primeiroPagamentoConfirmado: false,
  contratoAtivado: false,
  comissaoStatus: "Pendente",
  pendenciaMotivo: "",
};
const emptyExpansion: Expansion = {
  id: "",
  clienteId: "",
  projetoId: "",
  tipo: "Upsell",
  lider: "",
  participantes: [],
  valorMRR: 0,
  valorUnico: 0,
  ltMeses: 6,
  previsaoFechamento: "",
  etapa: "Mapeada",
  status: "Em aberto",
  observacoes: "",
};

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(String(value).replace(/[R$\s.]/g, "").replace(",", ".")) || 0;
}

function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);

  const [headers = [], ...data] = rows;
  return data.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header.trim(), values[index]?.trim() ?? ""])),
  );
}

async function fetchCSV<T>(url: string, mapper: (row: Record<string, string>) => T) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Nao foi possivel ler a planilha.");
  return parseCSV(await response.text()).map(mapper);
}

function normalizeMember(member: Partial<TeamMember>): TeamMember {
  return {
    id: member.id ?? `TM-${String(Date.now()).slice(-6)}`,
    nome: member.nome ?? "",
    funcao: member.funcao ?? "Outro",
    fixoAcordado: Number(member.fixoAcordado) || 0,
    dataContratacao: member.dataContratacao ?? "",
    percentualProjeto: Number(member.percentualProjeto) || 0,
    usarMaiorEntreFixoVariavel: Boolean(member.usarMaiorEntreFixoVariavel),
    socio: Boolean(member.socio),
    status: member.status ?? "Ativo",
  };
}

function emptyProject(): ClientProject {
  return {
    id: `PR-${String(Date.now()).slice(-6)}-${Math.random().toString(16).slice(2, 6)}`,
    nome: "",
    produto: "EXECUTAR",
    squad: "",
    saude: "Saudável",
    engajamento: "Neutro",
    mrr: 0,
    valorUnico: 0,
    dataInicio: "",
    mesesContrato: 6,
    dataRenovacao: "",
    dataEntrega: "",
    status: "Ativo",
  };
}

function normalizeProject(project: Partial<ClientProject>): ClientProject {
  const product = project.produto ?? "EXECUTAR";
  const projectStatus = isDeliverableProduct(product) ? (project.status === "Entregue" ? "Entregue" : "Ativo") : project.status === "Inativo" ? "Inativo" : "Ativo";
  return {
    id: project.id ?? `PR-${String(Date.now()).slice(-6)}-${Math.random().toString(16).slice(2, 6)}`,
    nome: project.nome ?? "",
    produto: product,
    squad: project.squad ?? "",
    saude: project.saude ?? "Saudável",
    engajamento: project.engajamento ?? "Neutro",
    mrr: Number(project.mrr) || 0,
    valorUnico: Number(project.valorUnico) || 0,
    dataInicio: project.dataInicio ?? "",
    mesesContrato: Number(project.mesesContrato) || 6,
    dataRenovacao: project.dataRenovacao ?? "",
    dataEntrega: project.dataEntrega ?? "",
    status: projectStatus,
  };
}

function normalizeClient(client: Partial<Client> & Partial<ClientProject>): Client {
  const clientStatus = client.status === "Inativo" || client.status === "Pausado" ? client.status : "Ativo";
  const legacyProject =
    "produto" in client || "mrr" in client || "dataInicio" in client
      ? [
          normalizeProject({
            nome: client.nome ? `Projeto principal - ${client.nome}` : "Projeto principal",
            produto: client.produto,
            squad: client.squad,
            mrr: client.mrr,
            valorUnico: client.valorUnico,
            dataInicio: client.dataInicio,
            mesesContrato: client.mesesContrato,
            dataRenovacao: client.dataRenovacao,
            status: client.status,
          }),
        ]
      : [];
  return {
    id: client.id ?? `CL-${String(Date.now()).slice(-6)}`,
    nome: client.nome ?? "",
    razaoSocial: client.razaoSocial ?? "",
    cnpj: client.cnpj ?? "",
    nomeFantasia: client.nomeFantasia ?? client.nome ?? "",
    segmento: client.segmento ?? "",
    responsavel: client.responsavel ?? "",
    email: client.email ?? "",
    telefone: client.telefone ?? "",
    projetos: (client.projetos?.length ? client.projetos : legacyProject).map(normalizeProject),
    status: clientStatus,
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) return digits.replace(/^(\d{2})(\d{4})(\d)/, "($1) $2-$3");
  return digits.replace(/^(\d{2})(\d{5})(\d)/, "($1) $2-$3");
}

function activeProjects(client: Client) {
  return client.projetos.filter((project) => project.status !== "Inativo");
}

function isOneTimeProduct(product: string) {
  return product === "SABER" || product === "TER";
}

function isDeliverableProduct(product: string) {
  return product === "SABER" || product === "TER";
}

function clientMrr(client: Client) {
  return activeProjects(client).reduce((sum, project) => sum + (isOneTimeProduct(project.produto) ? 0 : project.mrr), 0);
}

function projectRevenue(project: ClientProject) {
  return isOneTimeProduct(project.produto) ? project.valorUnico : project.mrr;
}

function projectMrrTotal(projects: ClientProject[]) {
  return projects.reduce((sum, project) => sum + (isOneTimeProduct(project.produto) ? 0 : project.mrr), 0);
}

function projectOneTimeTotal(projects: ClientProject[]) {
  return projects.reduce((sum, project) => sum + (isOneTimeProduct(project.produto) ? project.valorUnico : 0), 0);
}

function projectLtMonths(projects: ClientProject[]) {
  const recurring = projects.filter((project) => !isOneTimeProduct(project.produto));
  return recurring.length ? Math.max(...recurring.map(elapsedContractMonths)) : 0;
}

function projectLtv(projects: ClientProject[]) {
  return projects.reduce(
    (sum, project) => sum + (isOneTimeProduct(project.produto) ? project.valorUnico : project.mrr * project.mesesContrato),
    0,
  );
}

function projectMonthlyRecurringRevenue(projects: ClientProject[]) {
  return projects.reduce((sum, project) => sum + (isOneTimeProduct(project.produto) ? 0 : project.mrr), 0);
}

function elapsedContractMonths(project: ClientProject) {
  const startDate = dateFromInput(project.dataInicio);
  if (!startDate) return 0;
  const today = new Date();
  if (startDate > today) return 0;
  const elapsedBillingMonths =
    (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
  return Math.min(project.mesesContrato || 0, elapsedBillingMonths);
}

function formatLt(project: ClientProject) {
  if (isOneTimeProduct(project.produto)) return "One-Time";
  const lt = elapsedContractMonths(project);
  return `LT: ${lt} ${lt === 1 ? "competencia" : "competencias"}`;
}

function projectRevenueToDate(projects: ClientProject[]) {
  const active = projects.filter((project) => project.status !== "Inativo");
  return projectMonthlyRecurringRevenue(active) * projectLtMonths(active) + projectOneTimeTotal(active);
}

function projectRevenueToDateValue(project: ClientProject) {
  if (project.status === "Inativo") return 0;
  const startDate = dateFromInput(project.dataInicio);
  if (!startDate || startDate > new Date()) return 0;
  if (isOneTimeProduct(project.produto)) return project.valorUnico;
  return project.mrr * elapsedContractMonths(project);
}

function nextRenewalDate(client: Client) {
  const renewals = activeProjects(client)
    .filter((project) => !isOneTimeProduct(project.produto))
    .map((project) => dateFromInput(project.dataRenovacao))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime());
  return renewals[0]?.toISOString().slice(0, 10) ?? "";
}

function dateFromInput(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatDate(value?: string) {
  const date = dateFromInput(value);
  return date ? date.toLocaleDateString("pt-BR") : "-";
}

function addMonthsToInputDate(value: string, months: number) {
  const date = dateFromInput(value);
  if (!date) return "";
  const renewalDate = new Date(date);
  renewalDate.setMonth(renewalDate.getMonth() + months);
  return renewalDate.toISOString().slice(0, 10);
}

function currentCompetence() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function inputDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function previousBusinessDayInput(reference = new Date()) {
  const date = new Date(reference);
  date.setHours(12, 0, 0, 0);
  do {
    date.setDate(date.getDate() - 1);
  } while (!isBusinessDay(date));
  return inputDate(date);
}

function emptyCommercialDailyMetric(): CommercialDailyMetric {
  return {
    id: "",
    date: previousBusinessDayInput(),
    mql: 0,
    sql: 0,
    sal: 0,
    logo: 0,
    dialerMinutes: 0,
    followUps: 0,
    observations: "",
    updatedAt: "",
  };
}

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function startOfBusinessWeek(reference = new Date()) {
  const date = new Date(reference);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + mondayOffset);
  return date;
}

function businessWeekDays(reference = new Date()) {
  const monday = startOfBusinessWeek(reference);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function weekRangeLabel(days: Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return "-";
  const start = first.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const end = last.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${start} a ${end}`;
}

function dailyMetricValue(record: CommercialDailyMetric | undefined, key: CommercialMetricKey) {
  return record ? Number(record[key]) || 0 : 0;
}

function metricLabel(key: CommercialMetricKey) {
  const labels: Record<CommercialMetricKey, string> = {
    mql: "MQL",
    sql: "SQL",
    sal: "SAL",
    logo: "LOGO",
  };
  return labels[key];
}

function metricTone(key: CommercialMetricKey) {
  const tones: Record<CommercialMetricKey, string> = {
    mql: "blue",
    sql: "green",
    sal: "purple",
    logo: "orange",
  };
  return tones[key];
}

function formatMinutes(minutes: number) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return `${hours}h ${String(rest).padStart(2, "0")}min`;
}

function minutesToTimeInput(minutes: number) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function timeInputToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
}

function commercialDailyInWeek(records: CommercialDailyMetric[], reference = new Date()) {
  const days = businessWeekDays(reference);
  const dayKeys = new Set(days.map(inputDate));
  return records.filter((record) => dayKeys.has(record.date)).sort((a, b) => a.date.localeCompare(b.date));
}

function commercialWeekSummary(records: CommercialDailyMetric[], goals: CommercialGoals, reference = new Date()) {
  const days = businessWeekDays(reference);
  const todayKey = inputDate(reference);
  const elapsedDays = Math.max(1, days.filter((day) => inputDate(day) <= todayKey).length);
  const remainingDays = Math.max(1, days.filter((day) => inputDate(day) >= todayKey).length);
  const weekRecords = commercialDailyInWeek(records, reference);
  const totals = commercialMetricKeys.reduce(
    (acc, key) => ({ ...acc, [key]: weekRecords.reduce((sum, record) => sum + dailyMetricValue(record, key), 0) }),
    {} as CommercialGoals,
  );
  const ideal = commercialMetricKeys.reduce(
    (acc, key) => ({ ...acc, [key]: Math.ceil((goals[key] / 5) * elapsedDays) }),
    {} as CommercialGoals,
  );
  const targetToday = commercialMetricKeys.reduce(
    (acc, key) => ({ ...acc, [key]: Math.max(0, Math.ceil((goals[key] - totals[key]) / remainingDays)) }),
    {} as CommercialGoals,
  );
  return {
    days,
    records: weekRecords,
    totals,
    ideal,
    targetToday,
    elapsedDays,
    weekProgress: elapsedDays / 5,
  };
}

function conversionRate(from: number, to: number) {
  return from ? to / from : 0;
}

function competenceReferenceDate(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function formatCompetence(value: string) {
  const date = competenceReferenceDate(value);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function competenceOptions() {
  const base = new Date();
  return Array.from({ length: 13 }, (_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - 6 + index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { value, label: formatCompetence(value) };
  });
}

function daysInReferenceMonth(referenceDate: Date) {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
}

function monthlyFixedCost(member: TeamMember, referenceDate = new Date()) {
  if (member.status === "Inativo") return 0;
  const hiringDate = dateFromInput(member.dataContratacao);
  if (!hiringDate) return member.fixoAcordado;

  const hiredAfterReferenceMonth =
    hiringDate.getFullYear() > referenceDate.getFullYear() ||
    (hiringDate.getFullYear() === referenceDate.getFullYear() && hiringDate.getMonth() > referenceDate.getMonth());
  if (hiredAfterReferenceMonth) return 0;

  const hiredThisMonth =
    hiringDate.getFullYear() === referenceDate.getFullYear() && hiringDate.getMonth() === referenceDate.getMonth();
  if (!hiredThisMonth) return member.fixoAcordado;

  const hiringDay = hiringDate.getDate();
  if (hiringDay <= 1) return member.fixoAcordado;
  const monthDays = daysInReferenceMonth(referenceDate);
  const workedDays = Math.max(0, monthDays - hiringDay + 1);
  return (member.fixoAcordado / monthDays) * workedDays;
}

function projectActiveRatioInReferenceMonth(project: ClientProject, referenceDate = new Date()) {
  const startDate = dateFromInput(project.dataInicio);
  if (!startDate) return 1;
  const startsAfterReferenceMonth =
    startDate.getFullYear() > referenceDate.getFullYear() ||
    (startDate.getFullYear() === referenceDate.getFullYear() && startDate.getMonth() > referenceDate.getMonth());
  if (startsAfterReferenceMonth) return 0;

  const startsThisMonth =
    startDate.getFullYear() === referenceDate.getFullYear() && startDate.getMonth() === referenceDate.getMonth();
  if (!startsThisMonth) return 1;

  const monthDays = daysInReferenceMonth(referenceDate);
  const startDay = Math.min(startDate.getDate(), monthDays);
  return Math.max(0, monthDays - startDay + 1) / monthDays;
}

function memberIsInSquad(member: TeamMember, squad?: Squad) {
  if (!squad) return false;
  const memberName = memberKey(member.nome);
  return [squad.coordenador, squad.account, ...squad.membros].some((name) => memberKey(name) === memberName);
}

function memberRecurringProjectVariable(member: TeamMember, clients: Client[], squads: Squad[], referenceDate = new Date()) {
  if (member.status === "Inativo" || !member.percentualProjeto) return 0;
  return clients.reduce(
    (sum, client) =>
      sum +
      activeProjects(client).reduce((projectSum, project) => {
        if (project.status !== "Ativo" || (project.produto !== "EXECUTAR" && project.produto !== "CRM")) return projectSum;
        const squad = squads.find((item) => item.nome === project.squad);
        if (!memberIsInSquad(member, squad)) return projectSum;
        return projectSum + project.mrr * member.percentualProjeto * projectActiveRatioInReferenceMonth(project, referenceDate);
      }, 0),
    0,
  );
}

function expansionPool(expansion: Expansion, policy = defaultCommercialPolicy) {
  return (expansion.valorUnico + expansion.valorMRR * expansion.ltMeses) * policy.expansionPoolRate;
}

function expansionInReferenceMonth(expansion: Expansion, referenceDate = new Date()) {
  if (expansion.status !== "Ganha") return false;
  const closingDate = dateFromInput(expansion.previsaoFechamento);
  if (!closingDate) return false;
  return closingDate.getFullYear() === referenceDate.getFullYear() && closingDate.getMonth() === referenceDate.getMonth();
}

function expansionParticipantWeight(member?: TeamMember) {
  const role = memberKey(member?.funcao ?? "");
  if (role.includes("account")) return 45;
  if (role.includes("designer") || role.includes("copy") || role.includes("social")) return 20;
  if (role.includes("crm")) return 20;
  if (role.includes("trafego")) return 10;
  return 10;
}

function memberExpansionVariable(member: TeamMember, expansions: Expansion[], clients: Client[], squads: Squad[], team: TeamMember[], referenceDate = new Date(), policy = defaultCommercialPolicy) {
  if (member.status === "Inativo") return 0;
  const currentMemberName = memberKey(member.nome);

  return expansions.reduce((sum, expansion) => {
    if (!expansionInReferenceMonth(expansion, referenceDate)) return sum;

    const client = clients.find((item) => item.id === expansion.clienteId);
    const project = client?.projetos.find((item) => item.id === expansion.projetoId);
    const squad = squads.find((item) => item.nome === project?.squad);
    const pool = expansionPool(expansion, policy);
    if (!pool) return sum;

    const leaderName = memberKey(expansion.lider);
    const coordinatorName = memberKey(squad?.coordenador ?? "");
    const coordinatorParticipated = Boolean(coordinatorName && expansion.participantes.some((name) => memberKey(name) === coordinatorName));
    const coordinatorGetsShare = coordinatorParticipated && coordinatorName !== leaderName;

    if (leaderName && currentMemberName === leaderName) return sum + pool * policy.expansionLeaderShare;
    if (coordinatorGetsShare && currentMemberName === coordinatorName) return sum + pool * policy.expansionCoordinatorShare;

    const excludedNames = new Set([leaderName, coordinatorGetsShare ? coordinatorName : ""].filter(Boolean));
    const squadParticipants = expansion.participantes.filter((name) => !excludedNames.has(memberKey(name)));
    if (!squadParticipants.some((name) => memberKey(name) === currentMemberName)) return sum;

    const distributedShare = pool - (leaderName ? pool * policy.expansionLeaderShare : 0) - (coordinatorGetsShare ? pool * policy.expansionCoordinatorShare : 0);
    const weightedParticipants = squadParticipants.map((name) => {
      const participant = team.find((item) => memberKey(item.nome) === memberKey(name));
      return { name, weight: expansionParticipantWeight(participant) };
    });
    const totalWeight = weightedParticipants.reduce((weightSum, item) => weightSum + item.weight, 0) || 1;
    const participantWeight = weightedParticipants.find((item) => memberKey(item.name) === currentMemberName)?.weight ?? 0;

    return sum + distributedShare * (participantWeight / totalWeight);
  }, 0);
}

function commercialRecordsInReferenceMonth(comercial: Comercial[], referenceDate = new Date()) {
  const competence = `${referenceDate.getFullYear()}-${String(referenceDate.getMonth() + 1).padStart(2, "0")}`;
  return comercial.filter((record) => record.mes === competence);
}

function commercialSaleBase(record: Comercial) {
  return isOneTimeProduct(record.produto) ? record.valorUnico : record.primeiroMRR;
}

function bdrCommissionRate(attainment: number) {
  if (attainment < 0.5) return 0;
  if (attainment < 0.8) return 0.04;
  if (attainment < 1) return 0.08;
  if (attainment < 1.2) return 0.1;
  return 0.12;
}

function closerCommissionRate(conversion: number) {
  if (conversion <= 0) return 0;
  if (conversion < 0.2) return 0.05;
  if (conversion < 0.3) return 0.1;
  if (conversion < 0.4) return 0.15;
  return 0.2;
}

function activationBonusForBdr(payment: string, policy = defaultCommercialPolicy) {
  if (payment === "Na call") return policy.bdrPaymentOnCallBonus;
  if (payment === "Ativado") return policy.bdrActivatedContractBonus;
  return 0;
}

function activationBonusForCloser(payment: string, policy = defaultCommercialPolicy) {
  if (payment === "Na call") return policy.closerPaymentOnCallBonus;
  if (payment === "Ativado") return policy.closerActivatedContractBonus;
  return 0;
}

function commercialPaymentConfirmed(record: Comercial) {
  return Boolean(record.primeiroPagamentoConfirmado || record.pagamento === "Na call" || record.pagamento === "Ativado");
}

function commercialCommissionReleased(record: Comercial) {
  return record.status === "Venda validada" && commercialPaymentConfirmed(record) && record.comissaoStatus !== "Bloqueada";
}

function normalizeCommercialRecord(record: Comercial) {
  const rawPaymentConfirmed = record.primeiroPagamentoConfirmado;
  const rawContractActivated = record.contratoAtivado;
  const paymentConfirmed =
    typeof rawPaymentConfirmed === "string"
      ? rawPaymentConfirmed.toLowerCase() === "true" || rawPaymentConfirmed.toLowerCase() === "sim"
      : rawPaymentConfirmed ?? commercialPaymentConfirmed(record);
  const contractActivated =
    typeof rawContractActivated === "string"
      ? rawContractActivated.toLowerCase() === "true" || rawContractActivated.toLowerCase() === "sim"
      : rawContractActivated ?? record.pagamento === "Ativado";
  return {
    ...record,
    primeiroPagamentoConfirmado: paymentConfirmed,
    contratoAtivado: contractActivated,
    comissaoStatus: record.comissaoStatus || (record.status === "Venda validada" && paymentConfirmed ? "Liberada" : "Pendente"),
    pendenciaMotivo: record.pendenciaMotivo || "",
  };
}

function memberCommercialVariable(member: TeamMember, comercial: Comercial[], referenceDate = new Date(), policy = defaultCommercialPolicy) {
  if (member.status === "Inativo") return 0;
  const memberName = memberKey(member.nome);
  const records = commercialRecordsInReferenceMonth(comercial, referenceDate);
  const qualifiedBdrMeetings = records.filter((record) => memberKey(record.bdr) === memberName && record.reuniaoQualificada === "Sim").length;
  const bdrAttainment = qualifiedBdrMeetings / bdrMonthlyQualifiedMeetingTarget;
  const bdrRate = bdrCommissionRate(bdrAttainment);

  const bdrVariable = records
    .filter((record) => memberKey(record.bdr) === memberName && commercialCommissionReleased(record))
    .reduce((sum, record) => {
      const commissionRate = isOneTimeProduct(record.produto) ? Math.min(bdrRate, policy.bdrMaxOneTimeRate) : Math.min(bdrRate, policy.bdrMaxRecurringRate);
      return sum + commercialSaleBase(record) * commissionRate + policy.bdrSaleMeetingBonus + activationBonusForBdr(record.pagamento, policy);
    }, 0);

  const closerQualifiedMeetings = records.filter((record) => memberKey(record.closer) === memberName && record.reuniaoQualificada === "Sim").length;
  const closerSales = records.filter((record) => memberKey(record.closer) === memberName && record.status === "Venda validada").length;
  const closerConversion = closerQualifiedMeetings ? closerSales / closerQualifiedMeetings : 0;
  const closerRate = closerCommissionRate(closerConversion);

  const closerVariable = records
    .filter((record) => memberKey(record.closer) === memberName && commercialCommissionReleased(record))
    .reduce((sum, record) => {
      const commissionRate = isOneTimeProduct(record.produto) ? Math.min(closerRate, policy.closerMaxOneTimeRate) : Math.min(closerRate, policy.closerMaxRecurringRate);
      return sum + commercialSaleBase(record) * commissionRate + activationBonusForCloser(record.pagamento, policy);
    }, 0);

  return bdrVariable + closerVariable;
}

function memberProjectVariable(member: TeamMember, clients: Client[], squads: Squad[], expansions: Expansion[] = [], team: TeamMember[] = [], comercial: Comercial[] = [], referenceDate = new Date(), policy = defaultCommercialPolicy) {
  return (
    memberRecurringProjectVariable(member, clients, squads, referenceDate) +
    memberExpansionVariable(member, expansions, clients, squads, team, referenceDate, policy) +
    memberCommercialVariable(member, comercial, referenceDate, policy)
  );
}

function memberEffectiveRecurringProjectVariable(member: TeamMember, clients: Client[], squads: Squad[], referenceDate = new Date()) {
  const fixed = monthlyFixedCost(member, referenceDate);
  const recurringVariable = memberRecurringProjectVariable(member, clients, squads, referenceDate);
  return member.usarMaiorEntreFixoVariavel ? Math.max(0, recurringVariable - fixed) : recurringVariable;
}

function memberMonthlyCost(member: TeamMember, clients: Client[], squads: Squad[], expansions: Expansion[] = [], team: TeamMember[] = [], comercial: Comercial[] = [], referenceDate = new Date(), policy = defaultCommercialPolicy) {
  const fixed = monthlyFixedCost(member, referenceDate);
  return fixed + memberEffectiveProjectVariable(member, clients, squads, expansions, team, comercial, referenceDate, policy);
}

function memberEffectiveProjectVariable(member: TeamMember, clients: Client[], squads: Squad[], expansions: Expansion[] = [], team: TeamMember[] = [], comercial: Comercial[] = [], referenceDate = new Date(), policy = defaultCommercialPolicy) {
  const effectiveRecurringVariable = memberEffectiveRecurringProjectVariable(member, clients, squads, referenceDate);
  const expansionVariable = memberExpansionVariable(member, expansions, clients, squads, team, referenceDate, policy);
  const commercialVariable = memberCommercialVariable(member, comercial, referenceDate, policy);
  return effectiveRecurringVariable + expansionVariable + commercialVariable;
}

function memberKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function mergeTeamWithSeed(current: TeamMember[]) {
  const currentByName = new Map(current.map((member) => [memberKey(member.nome), member]));
  const seeded = sampleTeam.map((member) => {
    const saved = currentByName.get(memberKey(member.nome));
    return saved
      ? {
          ...member,
          ...saved,
          id: saved.id || member.id,
          nome: member.nome,
          dataContratacao: saved.dataContratacao || member.dataContratacao,
        }
      : member;
  });
  const seededNames = new Set(seeded.map((member) => memberKey(member.nome)));
  const extras = current.filter((member) => !seededNames.has(memberKey(member.nome)));
  return [...seeded, ...extras];
}

export default function Home() {
  const [active, setActive] = useState("dashboard");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [loginForm, setLoginForm] = useState({ email: "", accessCode: "" });
  const [loginError, setLoginError] = useState("");
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [accessUserForm, setAccessUserForm] = useState<AccessUser>(emptyAccessUser);
  const [accessStatus, setAccessStatus] = useState("");
  const [clientProductTab, setClientProductTab] = useState("Empresas");
  const [commercialView, setCommercialView] = useState("Dashboard");
  const [commercialRegistryTab, setCommercialRegistryTab] = useState("BDR/SDR");
  const [selectedCompetence, setSelectedCompetence] = useState(currentCompetence());
  const [month, setMonth] = useState("todos");
  const [channel, setChannel] = useState("todos");
  const [config, setConfig] = useState<SheetConfig>({
    comercial: "",
    operacao: "",
    monetizacao: "",
    comissoes: "",
  });
  const [policyConfig, setPolicyConfig] = useState<CommercialPolicyConfig>(defaultCommercialPolicy);
  const [comercial, setComercial] = useState<Comercial[]>([]);
  const [commercialDailyMetrics, setCommercialDailyMetrics] = useState<CommercialDailyMetric[]>([]);
  const [commercialGoals, setCommercialGoals] = useState<CommercialGoals>(defaultCommercialGoals);
  const [commercialMonthlyGoals, setCommercialMonthlyGoals] = useState<CommercialMonthlyGoalRecord[]>([]);
  const [goalReferenceMonth, setGoalReferenceMonth] = useState(currentCompetence());
  const [monthlyGoalForm, setMonthlyGoalForm] = useState<MetricTargets>(defaultMonthlyTargets);
  const [goalSettings, setGoalSettings] = useState<CommercialGoalSettings>(defaultGoalSettings);
  const [operacao, setOperacao] = useState<Operacao[]>([]);
  const [monetizacao, setMonetizacao] = useState<Monetizacao[]>([]);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expansions, setExpansions] = useState<Expansion[]>([]);
  const [commissionStatuses, setCommissionStatuses] = useState<Record<string, string>>({});
  const [memberForm, setMemberForm] = useState<TeamMember>(emptyMember);
  const [squadForm, setSquadForm] = useState<Squad>(emptySquad);
  const [clientForm, setClientForm] = useState<Client>(emptyClient);
  const [commercialForm, setCommercialForm] = useState<Comercial>(emptyComercial);
  const [commercialDailyForm, setCommercialDailyForm] = useState<CommercialDailyMetric>(emptyCommercialDailyMetric());
  const [expansionForm, setExpansionForm] = useState<Expansion>(emptyExpansion);
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isCommercialModalOpen, setIsCommercialModalOpen] = useState(false);
  const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [roles, setRoles] = useState(defaultRoles);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [newRole, setNewRole] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [cnpjLookupStatus, setCnpjLookupStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState("Banco conectado: aguardando dados");
  const [dailySaveStatus, setDailySaveStatus] = useState("");
  const [goalSaveStatus, setGoalSaveStatus] = useState("");
  const [historyIndicator, setHistoryIndicator] = useState("todos");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyDetail, setHistoryDetail] = useState<CommercialWeeklySnapshot | null>(null);
  const [chartMetric, setChartMetric] = useState<CommercialMetricKey>("mql");
  const competenceDate = competenceReferenceDate(selectedCompetence);
  const paymentCompetenceDate = new Date(competenceDate.getFullYear(), competenceDate.getMonth() + 1, policyConfig.paymentDay);

  async function loadPanelState() {
    try {
      const response = await fetch("/api/panel-state", { cache: "no-store" });
      if (!response.ok) throw new Error("API indisponivel");
      const payload = (await response.json()) as { ok: boolean; data: PanelState };
      if (!payload.ok) return;
      const data = payload.data;
      setPolicyConfig({ ...defaultCommercialPolicy, ...(data.policyConfig ?? {}) });
      setComercial(data.comercial.map(normalizeCommercialRecord));
      setCommercialDailyMetrics(data.commercialDailyMetrics);
      setCommercialMonthlyGoals(data.commercialMonthlyGoals);
      setTeam(data.team.map(normalizeMember));
      setSquads(data.squads);
      setClients(data.clients.map(normalizeClient));
      setExpansions(data.expansions);
      const mergedRoles = Array.from(
        new Set([...(data.roles.length ? data.roles : defaultRoles), ...data.team.map((member) => member.funcao).filter(Boolean)]),
      ).sort((a, b) => a.localeCompare(b));
      setRoles(mergedRoles);
      const currentGoal = data.commercialMonthlyGoals.find((item) => item.referenceMonth === currentCompetence()) || data.commercialMonthlyGoals[0];
      if (currentGoal) {
        setMonthlyGoalForm(currentGoal.targets);
        setGoalSettings({
          weekdays: currentGoal.weekdays || defaultGoalSettings.weekdays,
          distributionType: currentGoal.distributionType || defaultGoalSettings.distributionType,
          ignoreHolidays: Boolean(currentGoal.ignoreHolidays),
        });
      }
      setSyncStatus("Dados carregados do Postgres");
    } catch {
      setSyncStatus("Postgres nao disponivel neste ambiente. Painel aberto zerado.");
    }
  }

  async function loadAccessUsers(isAllowed = authUser?.isAdmin) {
    if (!isAllowed) return;
    try {
      const response = await fetch("/api/access-users", { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao buscar usuarios");
      const payload = (await response.json()) as { ok: boolean; data: AccessUser[] };
      if (payload.ok) setAccessUsers(payload.data);
    } catch {
      setAccessStatus("Nao foi possivel carregar os acessos.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function bootstrapAuth() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) throw new Error("Sem sessao");
        const payload = (await response.json()) as { ok: boolean; user: AuthUser };
        if (!payload.ok || cancelled) return;
        setAuthUser(payload.user);
        setAuthStatus("authenticated");
        const firstTab = payload.user.allowedTabs[0] || "dashboard";
        setActive((current) => (payload.user.allowedTabs.includes(current) ? current : firstTab));
        await loadPanelState();
        await loadAccessUsers(payload.user.isAdmin);
      } catch {
        if (!cancelled) setAuthStatus("unauthenticated");
      }
    }
    void bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredComercial = useMemo(
    () =>
      comercial.filter(
        (item) =>
          (month === "todos" || item.mes === month) &&
          (channel === "todos" || item.canal === channel),
      ),
    [channel, comercial, month],
  );

  const metrics = useMemo(() => {
    const reunioes = filteredComercial.filter((item) => item.reuniaoQualificada === "Sim").length;
    const vendas = filteredComercial.filter((item) => item.status === "Venda validada").length;
    const mrr = filteredComercial.reduce((sum, item) => sum + item.primeiroMRR, 0);
    const valorUnico = filteredComercial.reduce((sum, item) => sum + item.valorUnico, 0);
    const riscoAlto = operacao.filter((item) => item.riscoChurn === "Alto").length;
    const pool = monetizacao.reduce((sum, item) => sum + item.pool, 0);
    const variavel = comissoes.reduce((sum, item) => sum + item.total, 0);
    return {
      reunioes,
      vendas,
      conversao: reunioes ? vendas / reunioes : 0,
      mrr,
      valorUnico,
      riscoAlto,
      pool,
      variavel,
      gapMeta: Math.max(0, 18000 - mrr),
    };
  }, [comissoes, filteredComercial, monetizacao, operacao]);

  const months = ["todos", ...Array.from(new Set(comercial.map((item) => item.mes)))];
  const channels = ["todos", ...Array.from(new Set(comercial.map((item) => item.canal)))];
  const currentMonthlyGoal = useMemo(() => goalForDate(commercialMonthlyGoals), [commercialMonthlyGoals]);
  const currentWeeklyGoal = useMemo(() => snapshotForDate(currentMonthlyGoal), [currentMonthlyGoal]);
  const currentWeeklySummary = useMemo(
    () => (currentWeeklyGoal ? summarizeSnapshot(commercialDailyMetrics, currentWeeklyGoal) : null),
    [commercialDailyMetrics, currentWeeklyGoal],
  );
  const commercialWeek = useMemo(() => {
    if (!currentMonthlyGoal || !currentWeeklyGoal || !currentWeeklySummary) {
      return commercialWeekSummary(commercialDailyMetrics, commercialGoals);
    }
    const elapsedDays = elapsedWorkdaysInSnapshot(currentWeeklyGoal, currentMonthlyGoal.weekdays);
    const remainingDays = remainingWorkdaysInSnapshot(currentWeeklyGoal, currentMonthlyGoal.weekdays);
    const ideal = commercialMetricKeys.reduce(
      (acc, key) => ({ ...acc, [key]: Math.ceil((currentWeeklyGoal.targets[key] / Math.max(1, currentWeeklyGoal.workDays)) * elapsedDays) }),
      {} as CommercialGoals,
    );
    const targetToday = commercialMetricKeys.reduce(
      (acc, key) => ({ ...acc, [key]: dynamicDailyTarget(currentWeeklyGoal.targets[key], currentWeeklySummary.totals[key], remainingDays) }),
      {} as CommercialGoals,
    );
    return {
      days: businessWeekDays(),
      records: currentWeeklySummary.records,
      totals: currentWeeklySummary.totals,
      ideal,
      targetToday,
      elapsedDays,
      weekProgress: elapsedDays / Math.max(1, currentWeeklyGoal.workDays),
    };
  }, [commercialDailyMetrics, commercialGoals, currentMonthlyGoal, currentWeeklyGoal, currentWeeklySummary]);
  const activeWeeklyTargets = currentWeeklyGoal?.targets || commercialGoals;
  const goalPreviewRecord = useMemo(
    () =>
      buildMonthlyGoalRecord({
        existing: commercialMonthlyGoals.find((item) => item.referenceMonth === goalReferenceMonth),
        referenceMonth: goalReferenceMonth,
        targets: monthlyGoalForm,
        settings: goalSettings,
      }),
    [commercialMonthlyGoals, goalReferenceMonth, goalSettings, monthlyGoalForm],
  );
  const selectedHistoryGoal = commercialMonthlyGoals.find((item) => item.referenceMonth === goalReferenceMonth);
  const historyRows = useMemo(() => {
    const goals = selectedHistoryGoal ? [selectedHistoryGoal] : commercialMonthlyGoals;
    return goals
      .flatMap((goal) =>
        goal.weeklySnapshots.map((snapshot) => {
          const summary = summarizeSnapshot(commercialDailyMetrics, snapshot);
          return { goal, snapshot, summary };
        }),
      )
      .sort((a, b) => b.snapshot.startDate.localeCompare(a.snapshot.startDate));
  }, [commercialDailyMetrics, commercialMonthlyGoals, selectedHistoryGoal]);
  const filteredHistoryRows = historyRows.filter((row) => {
    if (historyIndicator === "todos") return true;
    if (historyIndicator === "discador") return row.summary.dialerMinutes > 0;
    if (historyIndicator === "followups") return row.summary.followUps > 0;
    return row.summary.totals[historyIndicator as CommercialMetricKey] > 0 || row.snapshot.targets[historyIndicator as CommercialMetricKey] > 0;
  });
  const historyPageSize = 8;
  const historyPageCount = Math.max(1, Math.ceil(filteredHistoryRows.length / historyPageSize));
  const paginatedHistoryRows = filteredHistoryRows.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);
  const latestCommercialDaily = commercialDailyMetrics
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))[0];
  const lastCommercialUpdate = latestCommercialDaily?.updatedAt
    ? new Date(latestCommercialDaily.updatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Sem atualizacao";
  const commercialConversions = {
    mqlSql: conversionRate(commercialWeek.totals.mql, commercialWeek.totals.sql),
    sqlSal: conversionRate(commercialWeek.totals.sql, commercialWeek.totals.sal),
    salLogo: conversionRate(commercialWeek.totals.sal, commercialWeek.totals.logo),
    mqlLogo: conversionRate(commercialWeek.totals.mql, commercialWeek.totals.logo),
  };
  const qualifiedMeetings = filteredComercial.filter((item) => item.reuniaoQualificada === "Sim");
  const validatedSales = filteredComercial.filter((item) => item.status === "Venda validada");
  const commercialMrr = validatedSales.reduce((sum, item) => sum + item.primeiroMRR, 0);
  const commercialOneTime = validatedSales.reduce((sum, item) => sum + item.valorUnico, 0);
  const commercialConversion = qualifiedMeetings.length ? validatedSales.length / qualifiedMeetings.length : 0;
  const costedTeam = team.filter((item) => item.status !== "Inativo");
  const activeOperationalTeam = costedTeam.filter((item) => !item.socio);
  const partners = team.filter((item) => item.socio);
  const operationalTeam = team.filter((item) => !item.socio);
  const totalProlabore = costedTeam.reduce((sum, item) => sum + monthlyFixedCost(item, competenceDate), 0);
  const totalCommercialVariable = costedTeam.reduce((sum, item) => sum + memberCommercialVariable(item, comercial, competenceDate, policyConfig), 0);
  const totalProjectVariable = costedTeam.reduce((sum, item) => sum + memberEffectiveRecurringProjectVariable(item, clients, squads, competenceDate), 0);
  const totalExpansionVariable = costedTeam.reduce((sum, item) => sum + memberExpansionVariable(item, expansions, clients, squads, team, competenceDate, policyConfig), 0);
  const totalTeamVariable = costedTeam.reduce((sum, item) => sum + memberEffectiveProjectVariable(item, clients, squads, expansions, team, comercial, competenceDate, policyConfig), 0);
  const totalTeamCost = totalProlabore + totalTeamVariable;
  const commissionCheckedCount = costedTeam.filter((member) => commissionStatuses[commissionStatusId(member.id)] === "Conferido").length;
  const commissionPaidCount = costedTeam.filter((member) => commissionStatuses[commissionStatusId(member.id)] === "Pago").length;
  const activeClients = clients.filter((item) => item.status !== "Inativo");
  const filteredClients =
    clientProductTab === "Empresas"
      ? clients
      : clients.filter((client) => client.projetos.some((project) => project.produto === clientProductTab));
  const filteredActiveClients = filteredClients.filter((item) => item.status !== "Inativo");
  const filteredProjects = filteredClients.flatMap((client) => client.projetos);
  const activeClientProjects = filteredProjects.filter((project) => project.status !== "Inativo");
  const activeClientMrr = activeClientProjects.reduce((sum, item) => sum + (isOneTimeProduct(item.produto) ? 0 : item.mrr), 0);
  const activeOneTimeRevenue = activeClientProjects.reduce((sum, item) => sum + (isOneTimeProduct(item.produto) ? item.valorUnico : 0), 0);
  const clientsWithoutSquad = activeClientProjects.filter((item) => !item.squad).length;
  const upcomingRenewals = activeClientProjects.filter((item) => !isOneTimeProduct(item.produto)).filter((item) => {
    const renewalDate = dateFromInput(item.dataRenovacao);
    if (!renewalDate) return false;
    const today = new Date();
    const limit = new Date(today);
    limit.setDate(today.getDate() + 60);
    return renewalDate >= today && renewalDate <= limit;
  }).length;
  const openExpansions = expansions.filter((item) => item.status !== "Ganha" && item.status !== "Perdida");
  const wonExpansions = expansions.filter((item) => item.status === "Ganha");
  const expansionMrrPipeline = openExpansions.reduce((sum, item) => sum + item.valorMRR, 0);
  const expansionOneTimePipeline = openExpansions.reduce((sum, item) => sum + item.valorUnico, 0);
  const expansionWonMrr = wonExpansions.reduce((sum, item) => sum + item.valorMRR, 0);
  const expansionPotential = openExpansions.reduce((sum, item) => sum + item.valorUnico + item.valorMRR * item.ltMeses, 0);
  const currentCommercialRecords = commercialRecordsInReferenceMonth(comercial, competenceDate);
  const currentCommercialSales = currentCommercialRecords.filter((item) => item.status === "Venda validada");
  const currentReleasedSales = currentCommercialSales.filter(commercialCommissionReleased);
  const currentPendingSales = currentCommercialSales.filter((item) => !commercialCommissionReleased(item));
  const currentCommercialMrr = currentCommercialSales.reduce((sum, item) => sum + item.primeiroMRR, 0);
  const currentCommercialOneTime = currentCommercialSales.reduce((sum, item) => sum + item.valorUnico, 0);
  const currentQualifiedMeetings = currentCommercialRecords.filter((item) => item.reuniaoQualificada === "Sim");
  const currentCommercialConversion = currentQualifiedMeetings.length ? currentCommercialSales.length / currentQualifiedMeetings.length : 0;
  const allActiveProjects = clients.flatMap((client) => activeProjects(client));
  const recurringActiveProjects = allActiveProjects.filter((project) => !isOneTimeProduct(project.produto));
  const dashboardMrr = recurringActiveProjects.reduce((sum, project) => sum + project.mrr, 0);
  const healthyProjects = allActiveProjects.filter((project) => project.saude === "Saudável").length;
  const alertProjects = allActiveProjects.filter((project) => project.saude === "Alerta").length;
  const dangerProjects = allActiveProjects.filter((project) => project.saude === "Perigo").length;
  const engagedProjects = allActiveProjects.filter((project) => project.engajamento === "Engajado").length;
  const inactiveEngagementProjects = allActiveProjects.filter((project) => project.engajamento === "Desengajado").length;
  const variableCostRatio = dashboardMrr ? totalTeamVariable / dashboardMrr : 0;
  const commercialMrrTarget = 18000;
  const commercialMrrProgress = commercialMrrTarget ? Math.min(1, currentCommercialMrr / commercialMrrTarget) : 0;
  const monthValidatedRevenue = currentCommercialMrr + currentCommercialOneTime;
  const totalActiveProjects = allActiveProjects.length || 1;
  const healthyProjectRatio = healthyProjects / totalActiveProjects;
  const operationalAttentionCount = alertProjects + dangerProjects + inactiveEngagementProjects + clientsWithoutSquad;
  const totalPipeline = expansionMrrPipeline + expansionOneTimePipeline;
  const allowedNavigation = useMemo(
    () => navigationItems.filter(([id]) => authUser?.allowedTabs.includes(id) || authUser?.isAdmin),
    [authUser?.allowedTabs, authUser?.isAdmin],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const payload = (await response.json()) as { ok: boolean; user?: AuthUser; error?: string };
      if (!response.ok || !payload.ok || !payload.user) throw new Error(payload.error || "Nao foi possivel entrar.");
      setAuthUser(payload.user);
      setAuthStatus("authenticated");
      setActive(payload.user.allowedTabs[0] || "dashboard");
      await loadPanelState();
      await loadAccessUsers(payload.user.isAdmin);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Nao foi possivel entrar.");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthUser(null);
    setAuthStatus("unauthenticated");
    setComercial([]);
    setTeam([]);
    setSquads([]);
    setClients([]);
    setExpansions([]);
  }

  function toggleAccessTab(tab: string) {
    setAccessUserForm((current) => ({
      ...current,
      allowedTabs: current.allowedTabs.includes(tab) ? current.allowedTabs.filter((item) => item !== tab) : [...current.allowedTabs, tab],
    }));
  }

  async function saveAccessUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccessStatus("Salvando acesso...");
    try {
      const response = await fetch("/api/access-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accessUserForm),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) throw new Error(payload.error || "Falha ao salvar acesso.");
      setAccessUserForm(emptyAccessUser);
      setAccessStatus("Acesso salvo.");
      await loadAccessUsers();
    } catch (error) {
      setAccessStatus(error instanceof Error ? error.message : "Falha ao salvar acesso.");
    }
  }

  async function deleteAccessUser(user: AccessUser) {
    const shouldDelete = window.confirm(`Remover acesso de ${user.email}?`);
    if (!shouldDelete) return;
    setAccessStatus("Removendo acesso...");
    try {
      const response = await fetch(`/api/access-users?email=${encodeURIComponent(user.email)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Falha ao remover acesso.");
      setAccessStatus("Acesso removido.");
      await loadAccessUsers();
    } catch {
      setAccessStatus("Falha ao remover acesso.");
    }
  }

  async function persistPanelCollection(collection: PanelCollection, data: unknown) {
    try {
      const response = await fetch("/api/panel-state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection, data }),
      });
      if (!response.ok) throw new Error("Falha ao salvar");
      setSyncStatus("Alteracao salva no Postgres");
    } catch {
      setSyncStatus("Nao foi possivel salvar no Postgres neste ambiente.");
    }
  }

  async function syncSheets() {
    setSyncStatus("Sincronizando...");
    try {
      const jobs = [];
      if (config.comercial) {
        jobs.push(
          fetchCSV<Comercial>(config.comercial, (row) =>
            normalizeCommercialRecord({
              id: row.id,
              mes: row.mes,
              lead: row.lead,
              canal: row.canal,
              bdr: row.bdr,
              closer: row.closer,
              reuniaoQualificada: row.reuniaoQualificada,
              status: row.status,
              produto: row.produto,
              primeiroMRR: numberValue(row.primeiroMRR),
              valorUnico: numberValue(row.valorUnico),
              pagamento: row.pagamento,
              primeiroPagamentoConfirmado: row.primeiroPagamentoConfirmado,
              contratoAtivado: row.contratoAtivado,
              comissaoStatus: row.comissaoStatus,
              pendenciaMotivo: row.pendenciaMotivo,
            }),
          ).then(setComercial),
        );
      }
      if (config.operacao) {
        jobs.push(
          fetchCSV<Operacao>(config.operacao, (row) => ({
            id: row.id,
            cliente: row.cliente,
            produto: row.produto,
            squad: row.squad,
            account: row.account,
            peg: row.peg,
            status: row.status,
            mrr: numberValue(row.mrr),
            riscoChurn: row.riscoChurn,
            renovacao: row.renovacao,
          })).then(setOperacao),
        );
      }
      if (config.monetizacao) {
        jobs.push(
          fetchCSV<Monetizacao>(config.monetizacao, (row) => ({
            id: row.id,
            cliente: row.cliente,
            tipo: row.tipo,
            lider: row.lider,
            participantes: row.participantes,
            valorMRR: numberValue(row.valorMRR),
            lt: numberValue(row.lt),
            arpu: numberValue(row.arpu),
            pool: numberValue(row.pool),
            margem: row.margem,
            status: row.status,
          })).then(setMonetizacao),
        );
      }
      if (config.comissoes) {
        jobs.push(
          fetchCSV<Comissao>(config.comissoes, (row) => ({
            id: row.id,
            pessoa: row.pessoa,
            funcao: row.funcao,
            origem: row.origem,
            valorBase: numberValue(row.valorBase),
            percentual: numberValue(row.percentual),
            bonus: numberValue(row.bonus),
            total: numberValue(row.total),
            status: row.status,
          })).then(setComissoes),
        );
      }
      await Promise.all(jobs);
      setSyncStatus(jobs.length ? "Dados sincronizados com Google Planilhas" : "Usando dados de exemplo");
    } catch {
      setSyncStatus("Nao foi possivel sincronizar. Verifique se as abas foram publicadas como CSV.");
    }
  }

  function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberForm.nome.trim()) return;
    const previousMember = team.find((item) => item.id === memberForm.id);
    const member: TeamMember = {
      ...memberForm,
      id: memberForm.id || `TM-${String(Date.now()).slice(-6)}`,
      nome: memberForm.nome.trim(),
      fixoAcordado: Number(memberForm.fixoAcordado) || 0,
      percentualProjeto: Number(memberForm.percentualProjeto) || 0,
      usarMaiorEntreFixoVariavel: Boolean(memberForm.usarMaiorEntreFixoVariavel),
      socio: Boolean(memberForm.socio),
    };
    const next = team.some((item) => item.id === member.id)
      ? team.map((item) => (item.id === member.id ? member : item))
      : [...team, member];
    setTeam(next);
    void persistPanelCollection("team", next);
    if (previousMember && previousMember.nome !== member.nome) {
      const nextSquads = squads.map((squad) => ({
        ...squad,
        coordenador: squad.coordenador === previousMember.nome ? member.nome : squad.coordenador,
        account: squad.account === previousMember.nome ? member.nome : squad.account,
        membros: squad.membros.map((nome) => (nome === previousMember.nome ? member.nome : nome)),
      }));
      setSquads(nextSquads);
      void persistPanelCollection("squads", nextSquads);
    }
    setMemberForm(emptyMember);
    setIsMemberModalOpen(false);
  }

  function openNewMemberModal() {
    setMemberForm(emptyMember);
    setIsMemberModalOpen(true);
  }

  function openNewSquadModal() {
    setSquadForm(emptySquad);
    setIsSquadModalOpen(true);
  }

  function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const role = newRole.trim();
    if (!role) return;
    const next = Array.from(
      new Set(editingRole ? roles.map((item) => (item === editingRole ? role : item)) : [...roles, role]),
    ).sort((a, b) => a.localeCompare(b));
    setRoles(next);
    void persistPanelCollection("roles", next);
    if (editingRole) {
      const nextTeam = team.map((member) => (member.funcao === editingRole ? { ...member, funcao: role } : member));
      setTeam(nextTeam);
      void persistPanelCollection("team", nextTeam);
    }
    setMemberForm((current) => ({ ...current, funcao: role }));
    setNewRole("");
    setEditingRole(null);
    setIsRoleModalOpen(false);
  }

  function startEditRole(role: string) {
    setEditingRole(role);
    setNewRole(role);
  }

  function clearRoleForm() {
    setEditingRole(null);
    setNewRole("");
  }

  function deleteRole(role: string) {
    const usageCount = team.filter((member) => member.funcao === role).length;
    const message = usageCount
      ? `Excluir a funcao ${role}? ${usageCount} pessoa(s) usando essa funcao serao movidas para Outro.`
      : `Excluir a funcao ${role}?`;
    const shouldDelete = window.confirm(message);
    if (!shouldDelete) return;
    const nextRoles = roles.filter((item) => item !== role);
    const fallbackRole = nextRoles.includes("Outro") ? "Outro" : nextRoles[0] ?? "";
    const nextTeam = team.map((member) => (member.funcao === role ? { ...member, funcao: fallbackRole } : member));
    setRoles(nextRoles);
    setTeam(nextTeam);
    void persistPanelCollection("roles", nextRoles);
    void persistPanelCollection("team", nextTeam);
    if (memberForm.funcao === role) setMemberForm((current) => ({ ...current, funcao: fallbackRole }));
    if (editingRole === role) clearRoleForm();
  }

  function editMember(member: TeamMember) {
    setMemberForm(member);
    setIsMemberModalOpen(true);
  }

  function deleteMember(member: TeamMember) {
    const shouldDelete = window.confirm(`Excluir ${member.nome} do time?`);
    if (!shouldDelete) return;
    const nextTeam = team.filter((item) => item.id !== member.id);
    const nextSquads = squads.map((squad) => ({
      ...squad,
      coordenador: squad.coordenador === member.nome ? "" : squad.coordenador,
      account: squad.account === member.nome ? "" : squad.account,
      membros: squad.membros.filter((nome) => nome !== member.nome),
    }));
    setTeam(nextTeam);
    setSquads(nextSquads);
    void persistPanelCollection("team", nextTeam);
    void persistPanelCollection("squads", nextSquads);
    if (memberForm.id === member.id) setMemberForm(emptyMember);
  }

  function saveSquad(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!squadForm.nome.trim()) return;
    const squad: Squad = {
      ...squadForm,
      id: squadForm.id || `SQ-${String(Date.now()).slice(-6)}`,
      nome: squadForm.nome.trim(),
      membros: Array.from(new Set(squadForm.membros.filter(Boolean))),
    };
    const next = squads.some((item) => item.id === squad.id)
      ? squads.map((item) => (item.id === squad.id ? squad : item))
      : [...squads, squad];
    setSquads(next);
    void persistPanelCollection("squads", next);
    setSquadForm(emptySquad);
    setIsSquadModalOpen(false);
  }

  function toggleSquadMember(nome: string) {
    setSquadForm((current) => ({
      ...current,
      membros: current.membros.includes(nome)
        ? current.membros.filter((item) => item !== nome)
        : [...current.membros, nome],
    }));
  }

  function editSquad(squad: Squad) {
    setSquadForm(squad);
    setIsSquadModalOpen(true);
  }

  function deleteSquad(squad: Squad) {
    const shouldDelete = window.confirm(`Excluir ${squad.nome}?`);
    if (!shouldDelete) return;
    const next = squads.filter((item) => item.id !== squad.id);
    setSquads(next);
    void persistPanelCollection("squads", next);
    if (squadForm.id === squad.id) setSquadForm(emptySquad);
  }

  function openNewCommercialModal() {
    setCommercialForm({ ...emptyComercial, mes: selectedCompetence });
    setIsCommercialModalOpen(true);
  }

  function saveCommercial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commercialForm.lead.trim()) return;
    const record: Comercial = normalizeCommercialRecord({
      ...commercialForm,
      id: commercialForm.id || `COM-${String(Date.now()).slice(-6)}`,
      lead: commercialForm.lead.trim(),
      primeiroMRR: Number(commercialForm.primeiroMRR) || 0,
      valorUnico: Number(commercialForm.valorUnico) || 0,
    });
    const next = comercial.some((item) => item.id === record.id)
      ? comercial.map((item) => (item.id === record.id ? record : item))
      : [...comercial, record];
    setComercial(next);
    void persistPanelCollection("comercial", next);
    setCommercialForm(emptyComercial);
    setIsCommercialModalOpen(false);
  }

  function editCommercial(record: Comercial) {
    setCommercialForm(record);
    setIsCommercialModalOpen(true);
  }

  function deleteCommercial(record: Comercial) {
    const shouldDelete = window.confirm(`Excluir o registro comercial de ${record.lead}?`);
    if (!shouldDelete) return;
    const next = comercial.filter((item) => item.id !== record.id);
    setComercial(next);
    void persistPanelCollection("comercial", next);
    if (commercialForm.id === record.id) setCommercialForm(emptyComercial);
  }

  function saveCommercialDaily(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commercialDailyForm.date) return;
    const existing = commercialDailyMetrics.find((item) => item.date === commercialDailyForm.date);
    if (existing && existing.id !== commercialDailyForm.id) {
      const shouldReplace = window.confirm("Ja existe uma atualizacao para esta data. Deseja substituir os dados?");
      if (!shouldReplace) return;
    }
    const record: CommercialDailyMetric = {
      ...commercialDailyForm,
      id: existing?.id || commercialDailyForm.id || `CD-${String(Date.now()).slice(-6)}`,
      mql: Number(commercialDailyForm.mql) || 0,
      sql: Number(commercialDailyForm.sql) || 0,
      sal: Number(commercialDailyForm.sal) || 0,
      logo: Number(commercialDailyForm.logo) || 0,
      dialerMinutes: Number(commercialDailyForm.dialerMinutes) || 0,
      followUps: Number(commercialDailyForm.followUps) || 0,
      observations: commercialDailyForm.observations.trim(),
      updatedAt: new Date().toISOString(),
    };
    const next = commercialDailyMetrics.some((item) => item.date === record.date)
      ? commercialDailyMetrics.map((item) => (item.date === record.date ? record : item))
      : [...commercialDailyMetrics, record];
    setCommercialDailyMetrics(next);
    void persistPanelCollection("commercialDailyMetrics", next);
    setCommercialDailyForm(emptyCommercialDailyMetric());
    setDailySaveStatus(`Atualizacao de ${formatDate(record.date)} salva.`);
    setCommercialView("Dashboard");
  }

  function changeGoalReferenceMonth(value: string) {
    setGoalReferenceMonth(value);
    const existing = commercialMonthlyGoals.find((item) => item.referenceMonth === value);
    setMonthlyGoalForm(existing?.targets || defaultMonthlyTargets);
    setGoalSettings(
      existing
        ? {
            weekdays: existing.weekdays,
            distributionType: existing.distributionType,
            ignoreHolidays: existing.ignoreHolidays,
          }
        : defaultGoalSettings,
    );
    setHistoryPage(1);
  }

  function toggleGoalWeekday(day: number) {
    const current = goalSettings.weekdays.includes(day)
      ? goalSettings.weekdays.filter((item) => item !== day)
      : [...goalSettings.weekdays, day].sort((a, b) => a - b);
    setGoalSettings({ ...goalSettings, weekdays: current.length ? current : defaultGoalSettings.weekdays });
  }

  function saveMonthlyGoals(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const existing = commercialMonthlyGoals.find((item) => item.referenceMonth === goalReferenceMonth);
    const record = buildMonthlyGoalRecord({
      existing,
      referenceMonth: goalReferenceMonth,
      targets: monthlyGoalForm,
      settings: goalSettings,
      updatedBy: "Lucas Soares",
    });
    const next = existing
      ? commercialMonthlyGoals.map((item) => (item.referenceMonth === goalReferenceMonth ? record : item))
      : [...commercialMonthlyGoals, record];
    setCommercialMonthlyGoals(next);
    void persistPanelCollection("commercialMonthlyGoals", next);
    setGoalSaveStatus(`Metas de ${monthLabel(goalReferenceMonth)} atualizadas com sucesso.`);
  }

  function exportHistoryCsv() {
    const headers = ["Semana", "Periodo", "MQL realizado", "MQL meta", "SQL realizado", "SQL meta", "SAL realizado", "SAL meta", "LOGO realizado", "LOGO meta", "Discador minutos", "Follow-ups"];
    const lines = filteredHistoryRows.map(({ snapshot, summary }) => [
      snapshot.label,
      snapshot.periodLabel,
      summary.totals.mql,
      snapshot.targets.mql,
      summary.totals.sql,
      snapshot.targets.sql,
      summary.totals.sal,
      snapshot.targets.sal,
      summary.totals.logo,
      snapshot.targets.logo,
      summary.dialerMinutes,
      summary.followUps,
    ]);
    const csv = [headers, ...lines].map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `historico-comercial-${goalReferenceMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function openNewClientModal() {
    setClientForm(emptyClient);
    setIsClientModalOpen(true);
  }

  function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clientForm.nome.trim() && !clientForm.razaoSocial.trim() && !clientForm.nomeFantasia.trim()) return;
    const client: Client = {
      ...clientForm,
      id: clientForm.id || `CL-${String(Date.now()).slice(-6)}`,
      nome: (clientForm.nome || clientForm.nomeFantasia || clientForm.razaoSocial).trim(),
      projetos: clientForm.projetos.map(normalizeProject),
    };
    const next = clients.some((item) => item.id === client.id)
      ? clients.map((item) => (item.id === client.id ? client : item))
      : [...clients, client];
    setClients(next);
    void persistPanelCollection("clients", next);
    setClientForm(emptyClient);
    setIsClientModalOpen(false);
  }

  function editClient(client: Client) {
    setClientForm(client);
    setIsClientModalOpen(true);
  }

  function openClientProjects(client: Client) {
    setClientForm(client);
    setEditingProjectId(null);
    setIsProjectModalOpen(true);
  }

  function openSingleClientProject(client: Client, project: ClientProject) {
    setClientForm(client);
    setEditingProjectId(project.id);
    setIsProjectModalOpen(true);
  }

  function closeProjectModal() {
    setEditingProjectId(null);
    setIsProjectModalOpen(false);
  }

  function openClientView(client: Client) {
    setViewClient(client);
  }

  function deleteClient(client: Client) {
    const shouldDelete = window.confirm(`Excluir ${client.nome}?`);
    if (!shouldDelete) return;
    const next = clients.filter((item) => item.id !== client.id);
    setClients(next);
    void persistPanelCollection("clients", next);
    if (clientForm.id === client.id) setClientForm(emptyClient);
  }

  async function lookupClientCnpj() {
    const cnpj = onlyDigits(clientForm.cnpj);
    if (cnpj.length !== 14) return;
    setCnpjLookupStatus("Consultando CNPJ...");
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!response.ok) throw new Error("CNPJ nao encontrado");
      const data = await response.json();
      const fantasia = data.nome_fantasia || data.razao_social || "";
      setClientForm((current) => ({
        ...current,
        cnpj: formatCnpj(cnpj),
        razaoSocial: data.razao_social || current.razaoSocial,
        nomeFantasia: fantasia || current.nomeFantasia,
        nome: current.nome || fantasia,
        email: data.email || current.email,
        telefone: formatPhone(data.ddd_telefone_1 || data.ddd_telefone_2 || current.telefone),
        segmento: data.cnae_fiscal_descricao || current.segmento,
      }));
      setCnpjLookupStatus("Dados preenchidos pelo CNPJ.");
    } catch {
      setCnpjLookupStatus("Nao foi possivel consultar esse CNPJ.");
    }
  }

  function addClientProject() {
    setClientForm((current) => ({ ...current, projetos: [...current.projetos, emptyProject()] }));
  }

  function saveClientProjects(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = normalizeClient({ ...clientForm, projetos: clientForm.projetos.map(normalizeProject) });
    const next = clients.map((item) => (item.id === client.id ? client : item));
    setClients(next);
    void persistPanelCollection("clients", next);
    setClientForm(emptyClient);
    closeProjectModal();
  }

  function updateClientProject(projectId: string, patch: Partial<ClientProject>) {
    setClientForm((current) => ({
      ...current,
      projetos: current.projetos.map((project) => (project.id === projectId ? { ...project, ...patch } : project)),
    }));
  }

  function removeClientProject(projectId: string) {
    setClientForm((current) => ({
      ...current,
      projetos: current.projetos.filter((project) => project.id !== projectId),
    }));
  }

  function updateProjectFromClient(client: Client, project: ClientProject, patch: Partial<ClientProject>) {
    const next = clients.map((item) =>
      item.id === client.id
        ? {
            ...item,
            projetos: item.projetos.map((currentProject) =>
              currentProject.id === project.id ? normalizeProject({ ...currentProject, ...patch }) : currentProject,
            ),
          }
        : item,
    );
    setClients(next);
    void persistPanelCollection("clients", next);
    if (clientForm.id === client.id) {
      setClientForm((current) => ({
        ...current,
        projetos: current.projetos.map((currentProject) =>
          currentProject.id === project.id ? normalizeProject({ ...currentProject, ...patch }) : currentProject,
        ),
      }));
    }
  }

  function deleteProjectFromClient(client: Client, project: ClientProject) {
    const projectName = project.nome || client.nomeFantasia || client.nome || "projeto";
    const shouldDelete = window.confirm(`Excluir o projeto ${projectName}?`);
    if (!shouldDelete) return;
    const next = clients.map((item) =>
      item.id === client.id
        ? { ...item, projetos: item.projetos.filter((currentProject) => currentProject.id !== project.id) }
        : item,
    );
    setClients(next);
    void persistPanelCollection("clients", next);
    if (clientForm.id === client.id) {
      setClientForm((current) => ({
        ...current,
        projetos: current.projetos.filter((currentProject) => currentProject.id !== project.id),
      }));
    }
  }

  function openNewExpansionModal() {
    setExpansionForm({
      ...emptyExpansion,
      clienteId: clients[0]?.id ?? "",
      projetoId: clients[0]?.projetos[0]?.id ?? "",
    });
    setIsExpansionModalOpen(true);
  }

  function saveExpansion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expansionForm.clienteId || !expansionForm.tipo.trim()) return;
    const expansion: Expansion = {
      ...expansionForm,
      id: expansionForm.id || `EX-${String(Date.now()).slice(-6)}`,
      valorMRR: Number(expansionForm.valorMRR) || 0,
      valorUnico: Number(expansionForm.valorUnico) || 0,
      ltMeses: Number(expansionForm.ltMeses) || 0,
      participantes: Array.from(new Set(expansionForm.participantes.filter(Boolean))),
    };
    const next = expansions.some((item) => item.id === expansion.id)
      ? expansions.map((item) => (item.id === expansion.id ? expansion : item))
      : [...expansions, expansion];
    setExpansions(next);
    void persistPanelCollection("expansions", next);
    setExpansionForm(emptyExpansion);
    setIsExpansionModalOpen(false);
  }

  function editExpansion(expansion: Expansion) {
    setExpansionForm(expansion);
    setIsExpansionModalOpen(true);
  }

  function deleteExpansion(expansion: Expansion) {
    const client = clients.find((item) => item.id === expansion.clienteId);
    const shouldDelete = window.confirm(`Excluir oportunidade de ${client?.nomeFantasia || client?.nome || "expansao"}?`);
    if (!shouldDelete) return;
    const next = expansions.filter((item) => item.id !== expansion.id);
    setExpansions(next);
    void persistPanelCollection("expansions", next);
  }

  function toggleExpansionParticipant(nome: string) {
    setExpansionForm((current) => ({
      ...current,
      participantes: current.participantes.includes(nome)
        ? current.participantes.filter((item) => item !== nome)
        : [...current.participantes, nome],
    }));
  }

  function commissionStatusId(memberId: string) {
    return `${selectedCompetence}:${memberId}`;
  }

  function updateCommissionStatus(memberId: string, status: string) {
    const next = { ...commissionStatuses, [commissionStatusId(memberId)]: status };
    setCommissionStatuses(next);
    localStorage.setItem(commissionStatusKey, JSON.stringify(next));
  }

  if (authStatus === "loading") {
    return (
      <main className="login-screen">
        <section className="login-card">
          <img className="login-logo" src="/logo-branca.png" alt="V4 Company" />
          <p className="eyebrow">Painel interno</p>
          <h1>Carregando acesso...</h1>
        </section>
      </main>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <main className="login-screen">
        <form className="login-card" onSubmit={handleLogin}>
          <img className="login-logo" src="/logo-branca.png" alt="V4 Company" />
          <p className="eyebrow">V4 Lima Soares & Co</p>
          <h1>Entrar no painel</h1>
          <p className="muted">Acesso restrito a e-mails @v4company.com.</p>
          <label>
            <span>E-mail</span>
            <input
              type="email"
              placeholder="nome@v4company.com"
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>Codigo de acesso</span>
            <input
              type="password"
              placeholder="Codigo liberado pela unidade"
              value={loginForm.accessCode}
              onChange={(event) => setLoginForm((current) => ({ ...current, accessCode: event.target.value }))}
            />
          </label>
          {loginError && <p className="form-error">{loginError}</p>}
          <button className="primary" type="submit">Entrar</button>
        </form>
      </main>
    );
  }

  if (!allowedNavigation.length) {
    return (
      <main className="login-screen">
        <section className="login-card">
          <img className="login-logo" src="/logo-branca.png" alt="V4 Company" />
          <p className="eyebrow">Sem permissao</p>
          <h1>Acesso ainda nao liberado</h1>
          <p className="muted">Seu e-mail foi validado, mas nenhuma aba foi liberada para este usuario.</p>
          <button className="secondary" type="button" onClick={handleLogout}>Sair</button>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <img className="brand-logo" src="/logo-branca.png" alt="V4 Company" />
          <p className="eyebrow">V4 Lima Soares & Co</p>
          <h1>Controle comercial e operacional</h1>
        </div>
        <nav>
          {allowedNavigation.map(([id, label, shortLabel]) => (
            <button className={active === id ? "active" : ""} key={id} onClick={() => setActive(id)} title={label}>
              <span className="nav-icon">{shortLabel}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>{authUser?.isAdmin ? "Administrador" : "Usuario"}</span>
          <strong>{authUser?.nome || authUser?.email}</strong>
          <small>{authUser?.email}</small>
          <button type="button" onClick={handleLogout}>Sair</button>
        </div>
        <div className="status competence-card">
          <label>
            <span>Competencia</span>
            <select value={selectedCompetence} onChange={(event) => setSelectedCompetence(event.target.value)}>
              {competenceOptions().map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <small>Pagamentos desta competencia: dia {paymentCompetenceDate.toLocaleDateString("pt-BR")}.</small>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel interno</p>
            <h2>{titleFor(active)}</h2>
          </div>
        </header>

        {active === "dashboard" && (
          <section className="executive-dashboard">
            <section className="dashboard-hero">
              <div className="dashboard-hero-main">
                <p className="eyebrow">Visao executiva</p>
                <h3>{formatCompetence(selectedCompetence)}</h3>
                <p className="muted">Resumo comercial, carteira, operacao e custos da unidade.</p>
                <div className="hero-progress">
                  <div>
                    <span>Meta de MRR novo</span>
                    <strong>{currencyExact.format(currentCommercialMrr)} / {currencyExact.format(commercialMrrTarget)}</strong>
                  </div>
                  <div className="progress-track">
                    <i style={{ width: `${commercialMrrProgress * 100}%` }} />
                  </div>
                </div>
              </div>
              <div className="dashboard-hero-side">
                <span>Receita validada no mes</span>
                <strong>{currencyExact.format(monthValidatedRevenue)}</strong>
                <small>{currentCommercialSales.length} venda(s) validada(s), {currentPendingSales.length} pendencia(s)</small>
              </div>
            </section>

            <div className="executive-kpi-grid">
              <article className="executive-kpi good">
                <span>MRR ativo</span>
                <strong>{currencyExact.format(dashboardMrr)}</strong>
                <small>{recurringActiveProjects.length} projeto(s) recorrente(s)</small>
              </article>
              <article className="executive-kpi neutral">
                <span>Custo total com time</span>
                <strong>{currencyExact.format(totalTeamCost)}</strong>
                <small>{currencyExact.format(totalProlabore)} fixo + {currencyExact.format(totalTeamVariable)} variavel</small>
              </article>
              <article className="executive-kpi warning">
                <span>Variavel / MRR</span>
                <strong>{percent.format(variableCostRatio)}</strong>
                <small>Peso da variavel sobre MRR ativo</small>
              </article>
              <article className="executive-kpi danger">
                <span>Pontos de atencao</span>
                <strong>{operationalAttentionCount}</strong>
                <small>Saude, engajamento e squad</small>
              </article>
            </div>

            <div className="executive-dashboard-grid">
              <section className="panel visual-panel commercial-visual">
                <div className="visual-panel-header">
                  <div>
                    <h3>Comercial do mes</h3>
                    <p className="muted">Reuniao acontecida ate venda validada.</p>
                  </div>
                  <strong>{percent.format(currentCommercialConversion)}</strong>
                </div>
                <div className="mini-funnel-visual">
                  <div style={{ height: "100%" }}><span>Reunioes</span><strong>{currentQualifiedMeetings.length}</strong></div>
                  <div style={{ height: `${Math.max(18, currentQualifiedMeetings.length ? (currentCommercialSales.length / currentQualifiedMeetings.length) * 100 : 18)}%` }}><span>Vendas</span><strong>{currentCommercialSales.length}</strong></div>
                  <div style={{ height: `${Math.max(18, commercialMrrProgress * 100)}%` }}><span>MRR</span><strong>{percent.format(commercialMrrProgress)}</strong></div>
                </div>
                <div className="metric-list compact-list">
                  <div><span>MRR vendido</span><strong>{currencyExact.format(currentCommercialMrr)}</strong></div>
                  <div><span>One-Time vendido</span><strong>{currencyExact.format(currentCommercialOneTime)}</strong></div>
                  <div><span>Comissoes liberadas</span><strong>{currentReleasedSales.length}</strong></div>
                </div>
              </section>

              <section className="panel visual-panel">
                <div className="visual-panel-header">
                  <div>
                    <h3>Carteira</h3>
                    <p className="muted">Base ativa e previsibilidade.</p>
                  </div>
                  <strong>{activeClients.length}</strong>
                </div>
                <div className="donut-row">
                  <div className="donut" style={{ "--value": `${healthyProjectRatio * 100}%` } as CSSProperties}>
                    <strong>{percent.format(healthyProjectRatio)}</strong>
                    <span>saudavel</span>
                  </div>
                  <div className="metric-list compact-list">
                    <div><span>Clientes ativos</span><strong>{activeClients.length}</strong></div>
                    <div><span>Projetos recorrentes</span><strong>{recurringActiveProjects.length}</strong></div>
                    <div><span>Renovacoes proximas</span><strong>{upcomingRenewals}</strong></div>
                    <div><span>Sem squad</span><strong>{clientsWithoutSquad}</strong></div>
                  </div>
                </div>
              </section>

              <section className="panel visual-panel">
                <div className="visual-panel-header">
                  <div>
                    <h3>Saude operacional</h3>
                    <p className="muted">Qualidade da entrega e engajamento.</p>
                  </div>
                  <strong>{allActiveProjects.length}</strong>
                </div>
                <div className="health-bars">
                  <div className="good"><span>Saudavel</span><i style={{ width: `${(healthyProjects / totalActiveProjects) * 100}%` }} /><strong>{healthyProjects}</strong></div>
                  <div className="warning"><span>Alerta</span><i style={{ width: `${(alertProjects / totalActiveProjects) * 100}%` }} /><strong>{alertProjects}</strong></div>
                  <div className="danger"><span>Perigo</span><i style={{ width: `${(dangerProjects / totalActiveProjects) * 100}%` }} /><strong>{dangerProjects}</strong></div>
                  <div className="neutral"><span>Engajados</span><i style={{ width: `${(engagedProjects / totalActiveProjects) * 100}%` }} /><strong>{engagedProjects}</strong></div>
                  <div className="danger"><span>Desengajados</span><i style={{ width: `${(inactiveEngagementProjects / totalActiveProjects) * 100}%` }} /><strong>{inactiveEngagementProjects}</strong></div>
                </div>
              </section>

              <section className="panel visual-panel">
                <div className="visual-panel-header">
                  <div>
                    <h3>Expansao</h3>
                    <p className="muted">Pipeline de carteira e monetizacao.</p>
                  </div>
                  <strong>{openExpansions.length}</strong>
                </div>
                <div className="pipeline-card">
                  <span>Pipeline total</span>
                  <strong>{currencyExact.format(totalPipeline)}</strong>
                  <div className="split-bars">
                    <i className="good" style={{ width: `${totalPipeline ? (expansionMrrPipeline / totalPipeline) * 100 : 0}%` }} />
                    <i className="warning" style={{ width: `${totalPipeline ? (expansionOneTimePipeline / totalPipeline) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="metric-list compact-list">
                  <div><span>MRR em pipeline</span><strong>{currencyExact.format(expansionMrrPipeline)}</strong></div>
                  <div><span>One-Time em pipeline</span><strong>{currencyExact.format(expansionOneTimePipeline)}</strong></div>
                  <div><span>Potencial contratado</span><strong>{currencyExact.format(expansionPotential)}</strong></div>
                  <div><span>MRR ganho</span><strong>{currencyExact.format(expansionWonMrr)}</strong></div>
                </div>
              </section>
            </div>

            <section className="panel action-panel">
              <div>
                <h3>Prioridades do painel</h3>
                <p className="muted">Pontos que merecem revisao antes do fechamento.</p>
              </div>
              <div className="action-list">
                <div><strong>{currentPendingSales.length}</strong><span>venda(s) com comissao pendente de validacao</span></div>
                <div><strong>{clientsWithoutSquad}</strong><span>projeto(s) sem squad definido</span></div>
                <div><strong>{upcomingRenewals}</strong><span>renovacao(oes) proximas</span></div>
                <div><strong>{currencyExact.format(Math.max(0, commercialMrrTarget - currentCommercialMrr))}</strong><span>gap para meta de MRR novo</span></div>
              </div>
            </section>
          </section>
        )}

        {active === "equipes" && (
          <section className="teams-layout">
            <div className="kpis compact">
              <Kpi label="Prestadores de Servico ativos" value={String(activeOperationalTeam.length)} detail="Sem socios" tone="good" />
              <Kpi label="Custo com Time" value={currency.format(totalProlabore)} detail="Apenas fixo proporcional" tone="warning" />
              <Kpi label="Custo Variavel com Time" value={currency.format(totalTeamVariable)} detail="Comercial, projetos e expansao" tone="neutral" />
              <Kpi label="Custo Total com Time" value={currency.format(totalTeamCost)} detail="Fixo + variavel da competencia" tone="danger" />
            </div>

            <div className="section-toolbar">
              <div>
                <h3>Socios</h3>
                <p className="muted">Controle de socios e custo fixo acordado.</p>
              </div>
              <button className="primary" type="button" onClick={openNewMemberModal}>
                Cadastrar pessoa
              </button>
            </div>

            <TeamTable team={partners} allTeam={team} clients={clients} squads={squads} expansions={expansions} comercial={comercial} referenceDate={competenceDate} emptyText="Nenhum socio cadastrado." onEdit={editMember} onDelete={deleteMember} />

            <div className="section-toolbar">
              <div>
                <h3>Time operacional</h3>
                <p className="muted">Controle de pessoas, funcoes e custo fixo.</p>
              </div>
              <button className="primary" type="button" onClick={openNewMemberModal}>
                Cadastrar pessoa
              </button>
            </div>

            <TeamTable team={operationalTeam} allTeam={team} clients={clients} squads={squads} expansions={expansions} comercial={comercial} referenceDate={competenceDate} emptyText="Nenhuma pessoa cadastrada no time operacional." onEdit={editMember} onDelete={deleteMember} />

            <div className="section-toolbar">
              <div>
                <h3>Squads cadastrados</h3>
                <p className="muted">Controle de estruturas operacionais e participantes.</p>
              </div>
              <button className="primary" type="button" onClick={openNewSquadModal}>
                Criar squad
              </button>
            </div>

            <SquadTable squads={squads} onEdit={editSquad} onDelete={deleteSquad} />

            {isSquadModalOpen && (
              <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsSquadModalOpen(false)}>
                <section className="modal" role="dialog" aria-modal="true" aria-labelledby="squad-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Equipes</p>
                      <h3 id="squad-modal-title">{squadForm.id ? "Editar squad" : "Criar squad"}</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsSquadModalOpen(false)}>
                      x
                    </button>
                  </div>
                  <form className="form-grid" onSubmit={saveSquad}>
                    <label>
                      <span>Nome do squad</span>
                      <input
                        autoFocus
                        value={squadForm.nome}
                        onChange={(event) => setSquadForm({ ...squadForm, nome: event.target.value })}
                        placeholder="Squad Performance"
                      />
                    </label>
                    <label>
                      <span>Coordenador</span>
                      <select
                        value={squadForm.coordenador}
                        onChange={(event) => setSquadForm({ ...squadForm, coordenador: event.target.value })}
                      >
                        <option value="">Selecionar</option>
                        {team.map((item) => (
                          <option key={item.id}>{item.nome}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Account responsavel</span>
                      <select
                        value={squadForm.account}
                        onChange={(event) => setSquadForm({ ...squadForm, account: event.target.value })}
                      >
                        <option value="">Selecionar</option>
                        {team.map((item) => (
                          <option key={item.id}>{item.nome}</option>
                        ))}
                      </select>
                    </label>
                    <div className="member-picker">
                      <span>Membros do squad</span>
                      <div>
                        {team.map((item) => (
                          <label className="check" key={item.id}>
                            <input
                              type="checkbox"
                              checked={squadForm.membros.includes(item.nome)}
                              onChange={() => toggleSquadMember(item.nome)}
                            />
                            <span>{item.nome}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        {squadForm.id ? "Atualizar squad" : "Salvar squad"}
                      </button>
                      <button className="secondary" type="button" onClick={() => setIsSquadModalOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            {isMemberModalOpen && (
              <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsMemberModalOpen(false)}>
                <section className="modal" role="dialog" aria-modal="true" aria-labelledby="member-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Equipes</p>
                      <h3 id="member-modal-title">{memberForm.id ? "Editar pessoa do time" : "Cadastrar pessoa do time"}</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsMemberModalOpen(false)}>
                      x
                    </button>
                  </div>
                  <form className="form-grid" onSubmit={saveMember}>
                    <label>
                      <span>Nome</span>
                      <input
                        autoFocus
                        value={memberForm.nome}
                        onChange={(event) => setMemberForm({ ...memberForm, nome: event.target.value })}
                        placeholder="Nome da pessoa"
                      />
                    </label>
                    <label>
                      <span>Funcao</span>
                      <div className="inline-control">
                        <select
                          value={memberForm.funcao}
                          onChange={(event) => setMemberForm({ ...memberForm, funcao: event.target.value })}
                        >
                          {roles.map((item) => (
                            <option key={item}>{item}</option>
                          ))}
                        </select>
                        <button className="secondary" type="button" onClick={() => setIsRoleModalOpen(true)}>
                          Nova função
                        </button>
                      </div>
                    </label>
                    <label>
                      <span>Custo Fixo com Time</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={memberForm.fixoAcordado}
                        onChange={(event) => setMemberForm({ ...memberForm, fixoAcordado: Number(event.target.value) })}
                        placeholder="0"
                      />
                    </label>
                    <label>
                      <span>Data de contratacao</span>
                      <input
                        type="date"
                        value={memberForm.dataContratacao ?? ""}
                        onChange={(event) => setMemberForm({ ...memberForm, dataContratacao: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Percentual por projeto</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={memberForm.percentualProjeto * 100}
                        onChange={(event) =>
                          setMemberForm({
                            ...memberForm,
                            percentualProjeto: Number(event.target.value) / 100,
                          })
                        }
                        placeholder="8"
                      />
                    </label>
                    <label>
                      <span>Status</span>
                      <select
                        value={memberForm.status}
                        onChange={(event) => setMemberForm({ ...memberForm, status: event.target.value })}
                      >
                        <option>Ativo</option>
                        <option>Inativo</option>
                        <option>Em teste</option>
                      </select>
                    </label>
                    <div className="toggle-card">
                      <div>
                        <strong>Fixo ou Variável</strong>
                        <span>
                          Quando ativo, a pessoa recebe o maior valor entre o custo fixo com time e a variável por projeto.
                        </span>
                      </div>
                      <button
                        className={memberForm.usarMaiorEntreFixoVariavel ? "switch on" : "switch"}
                        type="button"
                        aria-pressed={memberForm.usarMaiorEntreFixoVariavel}
                        onClick={() =>
                          setMemberForm({
                            ...memberForm,
                            usarMaiorEntreFixoVariavel: !memberForm.usarMaiorEntreFixoVariavel,
                          })
                        }
                      >
                        <i />
                      </button>
                    </div>
                    <div className="toggle-card">
                      <div>
                        <strong>Marcar como socio</strong>
                        <span>Quando ativo, a pessoa aparece com a etiqueta de socio na tabela do time.</span>
                      </div>
                      <button
                        className={memberForm.socio ? "switch on" : "switch"}
                        type="button"
                        aria-pressed={Boolean(memberForm.socio)}
                        onClick={() =>
                          setMemberForm({
                            ...memberForm,
                            socio: !memberForm.socio,
                          })
                        }
                      >
                        <i />
                      </button>
                    </div>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        {memberForm.id ? "Atualizar pessoa" : "Salvar pessoa"}
                      </button>
                      <button className="secondary" type="button" onClick={() => setIsMemberModalOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            {isRoleModalOpen && (
              <div className="modal-backdrop top-layer" role="presentation" onMouseDown={() => setIsRoleModalOpen(false)}>
                <section className="modal small-modal" role="dialog" aria-modal="true" aria-labelledby="role-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Funcoes</p>
                      <h3 id="role-modal-title">Criar nova função</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsRoleModalOpen(false)}>
                      x
                    </button>
                  </div>
                  <form className="form-grid one-column" onSubmit={saveRole}>
                    <label>
                      <span>Nome da função</span>
                      <input
                        autoFocus
                        value={newRole}
                        onChange={(event) => setNewRole(event.target.value)}
                        placeholder="Ex: Estrategista de Conteúdo"
                      />
                    </label>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        Salvar função
                      </button>
                      <button className="secondary" type="button" onClick={() => setIsRoleModalOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                  <div className="role-list">
                    <span>Funcoes cadastradas</span>
                    {roles.map((role) => (
                      <div className="role-row" key={role}>
                        <strong>{role}</strong>
                        <div className="row-actions">
                          <button type="button" aria-label={`Editar funcao ${role}`} title="Editar" onClick={() => startEditRole(role)}>
                            <EditIcon />
                          </button>
                          <button className="danger-action" type="button" aria-label={`Excluir funcao ${role}`} title="Excluir" onClick={() => deleteRole(role)}>
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </section>
        )}

        {active === "clientes" && (
          <section className="teams-layout">
            <div className="subtabs" role="tablist" aria-label="Filtro por produto">
              {["Empresas", "SABER", "TER", "EXECUTAR", "CRM"].map((item) => (
                <button
                  className={clientProductTab === item ? "active" : ""}
                  key={item}
                  type="button"
                  onClick={() => setClientProductTab(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="kpis compact">
              <Kpi label="Clientes ativos" value={String(filteredActiveClients.length)} detail="Carteira em operacao" tone="good" />
              <Kpi label="MRR ativo" value={currency.format(activeClientMrr)} detail="EXECUTAR e CRM" tone="neutral" />
              <Kpi label="One-Time" value={currency.format(activeOneTimeRevenue)} detail="SABER e TER" tone="warning" />
              <Kpi label="Sem squad" value={String(clientsWithoutSquad)} detail="Clientes ativos sem alocacao" tone="danger" />
            </div>

            <div className="section-toolbar">
              <div>
                <h3>Clientes cadastrados</h3>
                <p className="muted">Controle de carteira, squad, contrato e renovacao.</p>
              </div>
              <button className="primary" type="button" onClick={openNewClientModal}>
                Cadastrar cliente
              </button>
            </div>

            {clientProductTab === "Empresas" ? (
              <ClientTable clients={filteredClients} onView={openClientView} onProjects={openClientProjects} onEdit={editClient} onDelete={deleteClient} />
            ) : (
              <ProjectTable
                clients={filteredClients}
                productFilter={clientProductTab}
                squads={squads}
                onView={openClientView}
                onEditProject={openSingleClientProject}
                onUpdateProject={updateProjectFromClient}
                onDeleteProject={deleteProjectFromClient}
              />
            )}

            {isClientModalOpen && (
              <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsClientModalOpen(false)}>
                <section className="modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Clientes</p>
                      <h3 id="client-modal-title">{clientForm.id ? "Editar cliente" : "Cadastrar cliente"}</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsClientModalOpen(false)}>
                      x
                    </button>
                  </div>
                  <form className="form-grid" onSubmit={saveClient}>
                    <label>
                      <span>CNPJ</span>
                      <input
                        autoFocus
                        value={clientForm.cnpj}
                        onBlur={lookupClientCnpj}
                        onChange={(event) => {
                          setCnpjLookupStatus("");
                          setClientForm({ ...clientForm, cnpj: formatCnpj(event.target.value) });
                        }}
                        placeholder="00.000.000/0000-00"
                      />
                    </label>
                    <label>
                      <span>Razao Social</span>
                      <input
                        value={clientForm.razaoSocial}
                        onChange={(event) => setClientForm({ ...clientForm, razaoSocial: event.target.value })}
                        placeholder="Razao social da empresa"
                      />
                    </label>
                    <label>
                      <span>Nome Fantasia</span>
                      <input
                        value={clientForm.nomeFantasia}
                        onChange={(event) => setClientForm({ ...clientForm, nomeFantasia: event.target.value, nome: event.target.value })}
                        placeholder="Nome comercial"
                      />
                    </label>
                    <label>
                      <span>Segmento</span>
                      <input
                        value={clientForm.segmento}
                        onChange={(event) => setClientForm({ ...clientForm, segmento: event.target.value })}
                        placeholder="Ex: Saude, Educacao, Varejo"
                      />
                    </label>
                    <label>
                      <span>Responsavel</span>
                      <input
                        value={clientForm.responsavel}
                        onChange={(event) => setClientForm({ ...clientForm, responsavel: event.target.value })}
                        placeholder="Nome do contato"
                      />
                    </label>
                    <label>
                      <span>E-mail</span>
                      <input
                        type="email"
                        value={clientForm.email}
                        onChange={(event) => setClientForm({ ...clientForm, email: event.target.value })}
                        placeholder="contato@empresa.com"
                      />
                    </label>
                    <label>
                      <span>Telefone de Contato</span>
                      <input
                        value={clientForm.telefone}
                        onChange={(event) => setClientForm({ ...clientForm, telefone: formatPhone(event.target.value) })}
                        placeholder="(00) 00000-0000"
                      />
                    </label>
                    <label>
                      <span>Status do cliente</span>
                      <select value={clientForm.status} onChange={(event) => setClientForm({ ...clientForm, status: event.target.value })}>
                        <option>Ativo</option>
                        <option>Pausado</option>
                        <option>Inativo</option>
                      </select>
                    </label>
                    {cnpjLookupStatus && <p className="form-note">{cnpjLookupStatus}</p>}
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        {clientForm.id ? "Atualizar cliente" : "Salvar cliente"}
                      </button>
                      <button className="secondary" type="button" onClick={() => setIsClientModalOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            {isProjectModalOpen && (
              <div className="modal-backdrop" role="presentation" onMouseDown={closeProjectModal}>
                <section className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Projetos</p>
                      <h3 id="project-modal-title">{editingProjectId ? "Editar projeto" : "Projetos"} de {clientForm.nomeFantasia || clientForm.nome}</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={closeProjectModal}>
                      x
                    </button>
                  </div>
                  <form className="form-grid one-column" onSubmit={saveClientProjects}>
                    <div className="project-editor">
                      <div className="project-editor-header">
                        <div>
                          <strong>Projetos do cliente</strong>
                          <span>O Account e o coordenador vêm do squad escolhido.</span>
                        </div>
                        {!editingProjectId && (
                          <button className="secondary" type="button" onClick={addClientProject}>
                            Adicionar projeto
                          </button>
                        )}
                      </div>
                      {!clientForm.projetos.length && <p className="muted">Nenhum projeto cadastrado para este cliente.</p>}
                      {clientForm.projetos.filter((project) => !editingProjectId || project.id === editingProjectId).map((project, index) => (
                        <ClientProjectEditor
                          key={project.id}
                          index={index}
                          project={project}
                          squads={squads}
                          onChange={updateClientProject}
                          onRemove={removeClientProject}
                          canRemove={!editingProjectId}
                        />
                      ))}
                    </div>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        Salvar projetos
                      </button>
                      <button className="secondary" type="button" onClick={closeProjectModal}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            {viewClient && (
              <div className="modal-backdrop" role="presentation" onMouseDown={() => setViewClient(null)}>
                <section className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="client-view-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Cliente</p>
                      <h3 id="client-view-title">{viewClient.nomeFantasia || viewClient.nome}</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setViewClient(null)}>
                      x
                    </button>
                  </div>

                  <div className="details-grid">
                    <div><span>Razao Social</span><strong>{viewClient.razaoSocial || "-"}</strong></div>
                    <div><span>CNPJ</span><strong>{viewClient.cnpj || "-"}</strong></div>
                    <div><span>Responsavel</span><strong>{viewClient.responsavel || "-"}</strong></div>
                    <div><span>E-mail</span><strong>{viewClient.email || "-"}</strong></div>
                    <div><span>Telefone</span><strong>{viewClient.telefone || "-"}</strong></div>
                    <div><span>Segmento</span><strong>{viewClient.segmento || "-"}</strong></div>
                    <div><span>Status</span><strong>{viewClient.status}</strong></div>
                    <div><span>Receita ate hoje</span><strong>{currencyExact.format(projectRevenueToDate(activeProjects(viewClient)))}</strong></div>
                    <div><span>MRR mensal</span><strong>{currencyExact.format(projectMonthlyRecurringRevenue(activeProjects(viewClient)))}</strong></div>
                    <div><span>LT atual</span><strong>{projectLtMonths(activeProjects(viewClient))} competencia(s)</strong></div>
                    <div><span>LTV</span><strong>{currencyExact.format(projectLtv(activeProjects(viewClient)))}</strong></div>
                  </div>

                  <div className="project-editor view-only">
                    <div className="project-editor-header">
                      <div>
                        <strong>Projetos</strong>
                        <span>Resumo financeiro e operacional do cliente.</span>
                      </div>
                    </div>
                    {!viewClient.projetos.length && <p className="muted">Nenhum projeto cadastrado.</p>}
                    {viewClient.projetos.map((project) => (
                      <div className="project-summary" key={project.id}>
                        <strong>{project.nome || "Projeto sem nome"}</strong>
                        <span>{project.produto}</span>
                        <span>{project.squad || "Sem squad"}</span>
                        <span>{formatDate(project.dataInicio)}</span>
                        <span>{isOneTimeProduct(project.produto) ? `One-Time: ${currencyExact.format(project.valorUnico)}` : `MRR: ${currencyExact.format(project.mrr)}`}</span>
                        <span>{formatLt(project)}</span>
                        <span>{`Receita: ${currencyExact.format(projectRevenueToDateValue(project))}`}</span>
                        <span>{project.status === "Entregue" && project.dataEntrega ? `Entregue em ${formatDate(project.dataEntrega)}` : project.status}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </section>
        )}

        {active === "comercial" && (
          <section className="teams-layout">
            <div className="commercial-topbar">
              <div>
                <p className="eyebrow">Comercial</p>
                <h3>Dashboard Comercial</h3>
                <p className="muted">Acompanhamento diario do Comercial, da reuniao acontecida ate a venda.</p>
              </div>
              <div className="commercial-topbar-actions">
                <div className="mini-info">
                  <span>Semana atual</span>
                  <strong>{currentWeeklyGoal?.periodLabel || weekRangeLabel(commercialWeek.days)}</strong>
                </div>
                <div className="mini-info">
                  <span>Ultima atualizacao</span>
                  <strong>{lastCommercialUpdate}</strong>
                </div>
                <button className="secondary" type="button" onClick={() => setCommercialView("Atualizacao Diaria")}>
                  Atualizar dia
                </button>
              </div>
            </div>

            <div className="subtabs" role="tablist" aria-label="Visao comercial">
              {["Dashboard", "Atualizacao Diaria", "Historico", "Metas e Ajustes", "Registros comerciais"].map((item) => (
                <button
                  className={commercialView === item ? "active" : ""}
                  key={item}
                  type="button"
                  onClick={() => setCommercialView(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {commercialView === "Dashboard" && (
              <>
                {!currentMonthlyGoal && (
                  <div className="empty-state-panel">
                    <div>
                      <strong>Metas mensais ainda nao configuradas</strong>
                      <span>Configure as metas de {formatCompetence(currentCompetence())} para calcular meta semanal e meta necessaria de hoje automaticamente.</span>
                    </div>
                    <button className="primary" type="button" onClick={() => setCommercialView("Metas e Ajustes")}>
                      Configurar metas
                    </button>
                  </div>
                )}

                <div className="commercial-metric-grid">
                  {commercialMetricKeys.map((key) => {
                    const value = commercialWeek.totals[key];
                    const goal = activeWeeklyTargets[key];
                    const percentage = goal ? Math.min(1, value / goal) : 0;
                    const gap = value - commercialWeek.ideal[key];
                    return (
                      <article className={`commercial-card ${metricTone(key)}`} key={key}>
                        <div className="commercial-card-head">
                          <span>{metricLabel(key)}</span>
                          <strong>{percent.format(percentage)}</strong>
                        </div>
                        <div className="commercial-card-number">
                          <strong>{value}</strong>
                          <span>/ {goal}</span>
                        </div>
                        <p>{currentMonthlyGoal ? `Meta mensal: ${currentMonthlyGoal.targets[key]}` : "Meta semanal"}</p>
                        <div className="progress-track">
                          <i style={{ width: `${percentage * 100}%` }} />
                        </div>
                        <div className="commercial-card-foot">
                          <div><span>Ideal ate hoje</span><strong>{commercialWeek.ideal[key]}</strong></div>
                          <div><span>Realizado</span><strong>{value}</strong></div>
                          <div><span>Gap</span><strong className={gap >= 0 ? "positive" : "negative"}>{gap > 0 ? `+${gap}` : gap}</strong></div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="commercial-dashboard-grid">
                  <section className="panel commercial-panel">
                    <h3>Ontem {latestCommercialDaily ? `(${formatDate(latestCommercialDaily.date)})` : ""}</h3>
                    <div className="daily-snapshot">
                      <div><span>Tempo de Discador</span><strong>{latestCommercialDaily ? formatMinutes(latestCommercialDaily.dialerMinutes) : "-"}</strong></div>
                      <div><span>Follow-ups realizados</span><strong>{latestCommercialDaily?.followUps ?? "-"}</strong></div>
                      {commercialMetricKeys.map((key) => (
                        <div key={key}><span>{metricLabel(key)}</span><strong>{dailyMetricValue(latestCommercialDaily, key)}</strong></div>
                      ))}
                    </div>
                  </section>

                  <section className="panel commercial-panel">
                    <h3>Meta de hoje</h3>
                    <div className="today-targets">
                      {commercialMetricKeys.map((key) => (
                        <div key={key}>
                          <span>{metricLabel(key)}</span>
                          <strong>{commercialWeek.targetToday[key]}</strong>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="panel commercial-panel">
                    <h3>Progresso da semana</h3>
                    <div className="progress-list">
                      {commercialMetricKeys.map((key) => {
                        const progress = activeWeeklyTargets[key] ? Math.min(1, commercialWeek.totals[key] / activeWeeklyTargets[key]) : 0;
                        return (
                          <div className={`progress-row ${metricTone(key)}`} key={key}>
                            <span>{metricLabel(key)}</span>
                            <div className="progress-track"><i style={{ width: `${progress * 100}%` }} /></div>
                            <strong>{percent.format(progress)}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <p className="week-progress">{percent.format(commercialWeek.weekProgress)} da semana concluida</p>
                  </section>

                  <section className="panel commercial-panel chart-panel">
                    <div className="panel-heading-inline">
                      <h3>Evolucao diaria da semana</h3>
                      <select value={chartMetric} onChange={(event) => setChartMetric(event.target.value as CommercialMetricKey)}>
                        {commercialMetricKeys.map((key) => <option key={key} value={key}>{metricLabel(key)}</option>)}
                      </select>
                    </div>
                    <CommercialLineChart records={commercialWeek.records} days={commercialWeek.days} goal={activeWeeklyTargets[chartMetric]} metricKey={chartMetric} />
                  </section>

                  <section className="panel commercial-panel">
                    <h3>Conversoes da semana</h3>
                    <div className="conversion-list">
                      <div><span>MQL -&gt; SQL</span><small>{commercialWeek.totals.mql} -&gt; {commercialWeek.totals.sql}</small><strong>{percent.format(commercialConversions.mqlSql)}</strong></div>
                      <div><span>SQL -&gt; SAL</span><small>{commercialWeek.totals.sql} -&gt; {commercialWeek.totals.sal}</small><strong>{percent.format(commercialConversions.sqlSal)}</strong></div>
                      <div><span>SAL -&gt; LOGO</span><small>{commercialWeek.totals.sal} -&gt; {commercialWeek.totals.logo}</small><strong>{percent.format(commercialConversions.salLogo)}</strong></div>
                      <div><span>MQL -&gt; LOGO</span><small>{commercialWeek.totals.mql} -&gt; {commercialWeek.totals.logo}</small><strong>{percent.format(commercialConversions.mqlLogo)}</strong></div>
                    </div>
                  </section>

                  <section className="panel commercial-panel">
                    <h3>Funil da semana</h3>
                    <div className="funnel-list">
                      {commercialMetricKeys.map((key) => {
                        const base = commercialWeek.totals.mql || 1;
                        const width = Math.max(18, (commercialWeek.totals[key] / base) * 100);
                        return (
                          <div className={`funnel-row ${metricTone(key)}`} key={key}>
                            <span style={{ width: `${width}%` }}>{metricLabel(key)}</span>
                            <strong>{commercialWeek.totals[key]}</strong>
                            <small>{percent.format(conversionRate(commercialWeek.totals.mql, commercialWeek.totals[key]))}</small>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="tip-strip">
                  <strong>Dica do dia</strong>
                  <span>{commercialWeek.totals.mql >= commercialWeek.ideal.mql ? "Ritmo de topo de funil acima do ideal. Mantenha follow-up forte para converter SQL e SAL." : "O maior ganho agora esta em puxar MQL e manter cadencia diaria sem duplicar trabalho do CRM."}</span>
                </div>
              </>
            )}

            {commercialView === "Atualizacao Diaria" && (
              <div className="daily-update-layout">
                <form className="panel daily-form-panel" onSubmit={saveCommercialDaily}>
                  <div className="daily-form-header">
                    <div>
                      <p className="eyebrow">Atualizacao diaria</p>
                      <h3>Lance os dados do dia anterior</h3>
                      <p className="muted">Os dados informados pela manha sao referentes ao dia util anterior.</p>
                    </div>
                    <label className="date-field">
                      <span>Dados de</span>
                      <input type="date" value={commercialDailyForm.date} onChange={(event) => setCommercialDailyForm({ ...commercialDailyForm, date: event.target.value })} />
                    </label>
                  </div>

                  <div className="daily-section">
                    <h4>Metricas comerciais</h4>
                    <div className="metric-input-grid">
                      {commercialMetricKeys.map((key) => (
                        <label className={`metric-input-card ${metricTone(key)}`} key={key}>
                          <span>{metricLabel(key)}</span>
                          <input type="number" min="0" value={commercialDailyForm[key]} onChange={(event) => setCommercialDailyForm({ ...commercialDailyForm, [key]: Number(event.target.value) })} />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="daily-section">
                    <h4>Atividades</h4>
                    <div className="activity-input-grid">
                      <label className="activity-card">
                        <span>Tempo de Discador</span>
                        <input type="time" value={minutesToTimeInput(commercialDailyForm.dialerMinutes)} onChange={(event) => setCommercialDailyForm({ ...commercialDailyForm, dialerMinutes: timeInputToMinutes(event.target.value) })} />
                      </label>
                      <label className="activity-card">
                        <span>Follow-ups realizados</span>
                        <input type="number" min="0" value={commercialDailyForm.followUps} onChange={(event) => setCommercialDailyForm({ ...commercialDailyForm, followUps: Number(event.target.value) })} />
                      </label>
                    </div>
                  </div>

                  <label className="daily-section observations-field">
                    <h4>Observacoes</h4>
                    <textarea value={commercialDailyForm.observations} onChange={(event) => setCommercialDailyForm({ ...commercialDailyForm, observations: event.target.value })} placeholder="Comentarios relevantes sobre o dia, gargalos ou contexto do funil." />
                  </label>

                  <div className="form-actions">
                    <button className="primary" type="submit">Salvar dados</button>
                    <button className="secondary" type="button" onClick={() => setCommercialDailyForm(emptyCommercialDailyMetric())}>Limpar</button>
                  </div>
                  {dailySaveStatus && <p className="muted">{dailySaveStatus}</p>}
                </form>

                <aside className="panel daily-summary-panel">
                  <div className="daily-summary-header">
                    <p className="eyebrow">Previa</p>
                    <h3>Resumo rapido</h3>
                  </div>
                  <div className="summary-list">
                    {commercialMetricKeys.map((key) => (
                      <div className={metricTone(key)} key={key}>
                        <span>{metricLabel(key)}</span>
                        <strong>{commercialDailyForm[key]}</strong>
                      </div>
                    ))}
                    <div><span>Tempo de Discador</span><strong>{formatMinutes(commercialDailyForm.dialerMinutes)}</strong></div>
                    <div><span>Follow-ups realizados</span><strong>{commercialDailyForm.followUps}</strong></div>
                  </div>
                </aside>
              </div>
            )}

            {commercialView === "Historico" && (
              <section className="teams-layout">
                <div className="commercial-section-title">
                  <div>
                    <h3>Historico</h3>
                    <p className="muted">Visualize o historico detalhado de todas as semanas.</p>
                  </div>
                  <div className="filters compact-filters">
                    <select value={goalReferenceMonth} onChange={(event) => changeGoalReferenceMonth(event.target.value)} aria-label="Periodo do historico">
                      {competenceOptions().map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    <select value={historyIndicator} onChange={(event) => { setHistoryIndicator(event.target.value); setHistoryPage(1); }} aria-label="Indicador">
                      <option value="todos">Todos os indicadores</option>
                      <option value="mql">MQL</option>
                      <option value="sql">SQL</option>
                      <option value="sal">SAL</option>
                      <option value="logo">LOGO</option>
                      <option value="discador">Discador</option>
                      <option value="followups">Follow-ups</option>
                    </select>
                    <button className="secondary" type="button" onClick={exportHistoryCsv}>Exportar</button>
                  </div>
                </div>

                <section className="panel commercial-history-panel">
                  <div className="panel-heading-inline">
                    <div>
                      <h3>Historico de semanas</h3>
                      <p className="muted">Acompanhe o desempenho do comercial em todas as semanas.</p>
                    </div>
                  </div>

                  {!selectedHistoryGoal && (
                    <div className="empty-state-panel compact">
                      <div>
                        <strong>Sem metas configuradas para {formatCompetence(goalReferenceMonth)}</strong>
                        <span>Configure as metas do mes para exibir realizado / meta no historico.</span>
                      </div>
                      <button className="primary" type="button" onClick={() => setCommercialView("Metas e Ajustes")}>
                        Configurar metas
                      </button>
                    </div>
                  )}

                  <div className="table-wrap history-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Semana</th>
                          <th>Periodo</th>
                          <th>MQL</th>
                          <th>SQL</th>
                          <th>SAL</th>
                          <th>LOGO</th>
                          <th>Discador</th>
                          <th>Follow-ups</th>
                          <th>Acoes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!paginatedHistoryRows.length && (
                          <tr>
                            <td colSpan={9} className="empty-cell">Nenhuma semana encontrada para os filtros atuais.</td>
                          </tr>
                        )}
                        {paginatedHistoryRows.map(({ snapshot, summary }) => (
                          <tr key={snapshot.id}>
                            <td><strong>{snapshot.label}</strong></td>
                            <td>{snapshot.periodLabel}</td>
                            {commercialMetricKeys.map((key) => (
                              <td key={key}>
                                <HistoryMetricCell
                                  realized={summary.totals[key]}
                                  target={snapshot.targets[key]}
                                  status={attainmentStatus(summary.totals[key], snapshot.targets[key])}
                                />
                              </td>
                            ))}
                            <td>{formatMinutes(summary.dialerMinutes)}</td>
                            <td>{summary.followUps}</td>
                            <td>
                              <button className="icon-button" type="button" title="Visualizar" aria-label={`Visualizar ${snapshot.label}`} onClick={() => setHistoryDetail(snapshot)}>
                                <ViewIcon />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pagination-bar">
                    <button className="secondary" type="button" disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}>Anterior</button>
                    {Array.from({ length: historyPageCount }, (_, index) => index + 1).slice(0, 5).map((page) => (
                      <button className={historyPage === page ? "page-button active" : "page-button"} key={page} type="button" onClick={() => setHistoryPage(page)}>{page}</button>
                    ))}
                    <button className="secondary" type="button" disabled={historyPage >= historyPageCount} onClick={() => setHistoryPage((page) => Math.min(historyPageCount, page + 1))}>Proxima</button>
                  </div>

                  <div className="tip-strip">
                    <strong>Indicadores</strong>
                    <span>Percentual calculado com base no realizado acumulado em relacao a meta da semana vigente.</span>
                  </div>
                </section>
              </section>
            )}

            {commercialView === "Metas e Ajustes" && (
              <form className="teams-layout" onSubmit={saveMonthlyGoals}>
                <div className="commercial-section-title">
                  <div>
                    <h3>Metas e Ajustes</h3>
                    <p className="muted">Configure metas mensais e veja a distribuicao automatica por semana.</p>
                  </div>
                  <label className="date-field">
                    <span>Mes de referencia</span>
                    <input type="month" value={goalReferenceMonth} onChange={(event) => changeGoalReferenceMonth(event.target.value)} />
                  </label>
                </div>

                <section className="panel goals-panel">
                  <div>
                    <h3>Metas mensais</h3>
                    <p className="muted">Defina as metas do mes. As metas semanais e diarias sao calculadas automaticamente.</p>
                  </div>
                  <div className="monthly-goal-grid">
                    {commercialMetricKeys.map((key) => (
                      <label className={`monthly-goal-card ${metricTone(key)}`} key={key}>
                        <span>{metricLabel(key)}</span>
                        <small>Meta mensal</small>
                        <input type="number" min="0" value={monthlyGoalForm[key]} onChange={(event) => setMonthlyGoalForm({ ...monthlyGoalForm, [key]: Number(event.target.value) })} />
                      </label>
                    ))}
                    <article className="monthly-workdays-card">
                      <span>Dias uteis no mes</span>
                      <strong>{countBusinessDays(goalReferenceMonth, goalSettings.weekdays)} dias</strong>
                      <small>Usado para distribuir a meta pelas semanas do mes.</small>
                    </article>
                  </div>
                </section>

                <section className="panel goals-panel">
                  <div>
                    <h3>Distribuicao automatica por semana</h3>
                    <p className="muted">As metas semanais sao calculadas proporcionalmente aos dias uteis de cada semana dentro do mes.</p>
                  </div>
                  <div className="goal-distribution-layout">
                    <div className="table-wrap goal-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Semana</th>
                            <th>Periodo</th>
                            <th>Dias uteis</th>
                            <th>MQL</th>
                            <th>SQL</th>
                            <th>SAL</th>
                            <th>LOGO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {goalPreviewRecord.weeklySnapshots.map((snapshot) => {
                            const isCurrent = snapshotForDate(goalPreviewRecord)?.id === snapshot.id;
                            return (
                              <tr className={isCurrent ? "current-week-row" : ""} key={snapshot.id}>
                                <td><strong>{snapshot.label}{isCurrent ? " (atual)" : ""}</strong></td>
                                <td>{snapshot.periodLabel}</td>
                                <td>{snapshot.workDays}</td>
                                {commercialMetricKeys.map((key) => <td className={metricTone(key)} key={key}><strong>{snapshot.targets[key]}</strong></td>)}
                              </tr>
                            );
                          })}
                          <tr className="goal-total-row">
                            <td colSpan={2}><strong>Total do mes</strong></td>
                            <td>{goalPreviewRecord.workDays}</td>
                            {commercialMetricKeys.map((key) => <td className={metricTone(key)} key={key}><strong>{goalPreviewRecord.targets[key]}</strong></td>)}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <aside className="how-it-works-card">
                      <h3>Como funciona</h3>
                      <div><strong>1. Meta diaria-base</strong><span>Meta mensal dividida pelos dias uteis do mes.</span></div>
                      <div><strong>2. Distribuicao semanal</strong><span>A meta diaria-base e distribuida proporcionalmente pelos dias uteis de cada semana.</span></div>
                      <div><strong>3. Meta necessaria hoje</strong><span>No Dashboard, a meta diaria recalcula conforme o realizado da semana.</span></div>
                    </aside>
                  </div>
                </section>

                <section className="panel goals-panel">
                  <div>
                    <h3>Configuracoes avancadas</h3>
                    <p className="muted">Ajustes opcionais para calculo e exibicao das metas.</p>
                  </div>
                  <div className="advanced-goals-grid">
                    <div>
                      <strong>Tipo de distribuicao</strong>
                      <label className="check"><input type="radio" checked={goalSettings.distributionType === "proportional"} onChange={() => setGoalSettings({ ...goalSettings, distributionType: "proportional" })} /> <span>Distribuicao proporcional (recomendado)</span></label>
                      <label className="check"><input type="radio" checked={goalSettings.distributionType === "linear"} onChange={() => setGoalSettings({ ...goalSettings, distributionType: "linear" })} /> <span>Distribuicao linear</span></label>
                    </div>
                    <div>
                      <strong>Considerar dias uteis</strong>
                      {["Domingo", "Segunda-feira", "Terca-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sabado"].map((label, index) => (
                        <label className="check" key={label}><input type="checkbox" checked={goalSettings.weekdays.includes(index)} onChange={() => toggleGoalWeekday(index)} /> <span>{label}</span></label>
                      ))}
                    </div>
                    <div>
                      <strong>Arredondamento</strong>
                      <label className="check"><input type="radio" checked readOnly /> <span>Distribuir restos automaticamente</span></label>
                      <label className="check"><input type="checkbox" checked={goalSettings.ignoreHolidays} onChange={(event) => setGoalSettings({ ...goalSettings, ignoreHolidays: event.target.checked })} /> <span>Ignorar feriados (preparado)</span></label>
                    </div>
                  </div>
                </section>

                <div className="form-actions sticky-actions">
                  <button className="secondary" type="button" onClick={() => setGoalSaveStatus("Preview recalculado.")}>Recalcular metas</button>
                  <button className="primary" type="submit">Salvar metas</button>
                  {goalSaveStatus && <span className="muted">{goalSaveStatus}</span>}
                </div>
              </form>
            )}

            {historyDetail && (
              <div className="modal-backdrop" role="presentation" onMouseDown={() => setHistoryDetail(null)}>
                <section className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="history-detail-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Historico</p>
                      <h3 id="history-detail-title">{historyDetail.label} - {historyDetail.periodLabel}</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setHistoryDetail(null)}>x</button>
                  </div>
                  {(() => {
                    const summary = summarizeSnapshot(commercialDailyMetrics, historyDetail);
                    return (
                      <div className="history-detail-content">
                        <div className="details-grid">
                          {commercialMetricKeys.map((key) => (
                            <Fragment key={key}>
                              <div><span>Meta {metricLabel(key)}</span><strong>{historyDetail.targets[key]}</strong></div>
                              <div><span>Realizado {metricLabel(key)}</span><strong>{summary.totals[key]}</strong></div>
                            </Fragment>
                          ))}
                          <div><span>Discador acumulado</span><strong>{formatMinutes(summary.dialerMinutes)}</strong></div>
                          <div><span>Follow-ups acumulados</span><strong>{summary.followUps}</strong></div>
                        </div>
                        <section className="panel commercial-panel">
                          <h3>Conversoes</h3>
                          <div className="conversion-list">
                            <div><span>MQL -&gt; SQL</span><small>{summary.totals.mql} -&gt; {summary.totals.sql}</small><strong>{percent.format(conversionRate(summary.totals.mql, summary.totals.sql))}</strong></div>
                            <div><span>SQL -&gt; SAL</span><small>{summary.totals.sql} -&gt; {summary.totals.sal}</small><strong>{percent.format(conversionRate(summary.totals.sql, summary.totals.sal))}</strong></div>
                            <div><span>SAL -&gt; LOGO</span><small>{summary.totals.sal} -&gt; {summary.totals.logo}</small><strong>{percent.format(conversionRate(summary.totals.sal, summary.totals.logo))}</strong></div>
                            <div><span>MQL -&gt; LOGO</span><small>{summary.totals.mql} -&gt; {summary.totals.logo}</small><strong>{percent.format(conversionRate(summary.totals.mql, summary.totals.logo))}</strong></div>
                          </div>
                        </section>
                        <section className="table-wrap history-table">
                          <table>
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>MQL</th>
                                <th>SQL</th>
                                <th>SAL</th>
                                <th>LOGO</th>
                                <th>Discador</th>
                                <th>Follow-ups</th>
                              </tr>
                            </thead>
                            <tbody>
                              {!summary.records.length && (
                                <tr><td colSpan={7} className="empty-cell">Sem lancamentos nessa semana.</td></tr>
                              )}
                              {summary.records.map((record) => (
                                <tr key={record.date}>
                                  <td>{formatDate(record.date)}</td>
                                  <td>{record.mql}</td>
                                  <td>{record.sql}</td>
                                  <td>{record.sal}</td>
                                  <td>{record.logo}</td>
                                  <td>{formatMinutes(record.dialerMinutes)}</td>
                                  <td>{record.followUps}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </section>
                      </div>
                    );
                  })()}
                </section>
              </div>
            )}

            {commercialView === "Registros comerciais" && (
              <>
                <div className="section-toolbar">
                  <div>
                    <h3>Registro comercial</h3>
                    <p className="muted">Apenas reuniao acontecida, status da venda e dados que impactam remuneracao.</p>
                  </div>
                  <button className="primary" type="button" onClick={openNewCommercialModal}>
                    Registrar reuniao/venda
                  </button>
                </div>

                <div className="subtabs" role="tablist" aria-label="Frente comercial">
                  {["BDR/SDR", "Closer"].map((item) => (
                    <button
                      className={commercialRegistryTab === item ? "active" : ""}
                      key={item}
                      type="button"
                      onClick={() => setCommercialRegistryTab(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="filters compact-filters">
                  <select value={month} onChange={(event) => setMonth(event.target.value)} aria-label="Mes">
                    {months.map((item) => (
                      <option key={item} value={item}>
                        {item === "todos" ? "Todos os meses" : item}
                      </option>
                    ))}
                  </select>
                  <select value={channel} onChange={(event) => setChannel(event.target.value)} aria-label="Canal">
                    {channels.map((item) => (
                      <option key={item} value={item}>
                        {item === "todos" ? "Todos os canais" : item}
                      </option>
                    ))}
                  </select>
                </div>

                {commercialRegistryTab === "BDR/SDR" ? (
                  <>
                    <div className="kpis compact">
                      <Kpi label="Reunioes qualificadas" value={String(qualifiedMeetings.length)} detail="Calls com criterio validado" tone="good" />
                      <Kpi label="Vendas originadas" value={String(validatedSales.length)} detail="Vendas vindas do funil" tone="neutral" />
                      <Kpi label="Conversao" value={percent.format(commercialConversion)} detail="Venda / reuniao qualificada" tone="warning" />
                      <Kpi label="MRR originado" value={currencyExact.format(commercialMrr)} detail="Primeiro MRR validado" tone="danger" />
                    </div>
                    <div className="section-toolbar">
                      <div>
                        <h3>BDR/SDR</h3>
                        <p className="muted">Controle simples de reunioes acontecidas e vendas geradas.</p>
                      </div>
                    </div>
                    <CommercialBdrTable rows={filteredComercial} onEdit={editCommercial} onDelete={deleteCommercial} />
                  </>
                ) : (
                  <>
                    <div className="kpis compact">
                      <Kpi label="Vendas validadas" value={String(validatedSales.length)} detail="Fechamentos no periodo" tone="good" />
                      <Kpi label="MRR fechado" value={currencyExact.format(commercialMrr)} detail="Produtos recorrentes" tone="neutral" />
                      <Kpi label="One-Time fechado" value={currencyExact.format(commercialOneTime)} detail="SABER e TER" tone="warning" />
                      <Kpi label="Conversao minima" value="30%" detail="Referencia da politica" tone="danger" />
                    </div>
                    <div className="section-toolbar">
                      <div>
                        <h3>Closer</h3>
                        <p className="muted">Controle de fechamento, produto, pagamento e receita validada.</p>
                      </div>
                    </div>
                    <CommercialCloserTable rows={filteredComercial} onEdit={editCommercial} onDelete={deleteCommercial} />
                  </>
                )}
              </>
            )}

            {isCommercialModalOpen && (
              <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsCommercialModalOpen(false)}>
                <section className="modal" role="dialog" aria-modal="true" aria-labelledby="commercial-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Comercial</p>
                      <h3 id="commercial-modal-title">{commercialForm.id ? "Editar registro" : "Registrar reuniao/venda"}</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsCommercialModalOpen(false)}>
                      x
                    </button>
                  </div>
                  <form className="form-grid" onSubmit={saveCommercial}>
                    <label>
                      <span>Competencia</span>
                      <input type="month" value={commercialForm.mes} onChange={(event) => setCommercialForm({ ...commercialForm, mes: event.target.value })} />
                    </label>
                    <label>
                      <span>Empresa / Lead</span>
                      <input autoFocus value={commercialForm.lead} onChange={(event) => setCommercialForm({ ...commercialForm, lead: event.target.value })} placeholder="Nome da empresa" />
                    </label>
                    <label>
                      <span>Canal</span>
                      <select value={commercialForm.canal} onChange={(event) => setCommercialForm({ ...commercialForm, canal: event.target.value })}>
                        <option>Outbound</option>
                        <option>Indicacao</option>
                        <option>LeadBroker</option>
                        <option>Packs</option>
                        <option>Inbound</option>
                        <option>Parceiro</option>
                      </select>
                    </label>
                    <label>
                      <span>BDR/SDR</span>
                      <select value={commercialForm.bdr} onChange={(event) => setCommercialForm({ ...commercialForm, bdr: event.target.value })}>
                        <option value="">Selecione</option>
                        {team.filter((member) => member.status !== "Inativo").map((member) => (
                          <option key={member.id} value={member.nome}>{member.nome}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Closer</span>
                      <select value={commercialForm.closer} onChange={(event) => setCommercialForm({ ...commercialForm, closer: event.target.value })}>
                        <option value="">Selecione</option>
                        {team.filter((member) => member.status !== "Inativo").map((member) => (
                          <option key={member.id} value={member.nome}>{member.nome}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Reuniao qualificada?</span>
                      <select value={commercialForm.reuniaoQualificada} onChange={(event) => setCommercialForm({ ...commercialForm, reuniaoQualificada: event.target.value })}>
                        <option>Sim</option>
                        <option>Nao</option>
                      </select>
                    </label>
                    <label>
                      <span>Status</span>
                      <select value={commercialForm.status} onChange={(event) => setCommercialForm({ ...commercialForm, status: event.target.value })}>
                        <option>Reuniao realizada</option>
                        <option>Proposta enviada</option>
                        <option>Venda validada</option>
                        <option>Perdida</option>
                      </select>
                    </label>
                    <label>
                      <span>Produto</span>
                      <select value={commercialForm.produto} onChange={(event) => setCommercialForm({ ...commercialForm, produto: event.target.value, primeiroMRR: isOneTimeProduct(event.target.value) ? 0 : commercialForm.primeiroMRR, valorUnico: isOneTimeProduct(event.target.value) ? commercialForm.valorUnico : 0 })}>
                        <option>EXECUTAR</option>
                        <option>CRM</option>
                        <option>SABER</option>
                        <option>TER</option>
                      </select>
                    </label>
                    <label>
                      <span>{isOneTimeProduct(commercialForm.produto) ? "Valor One-Time" : "Primeiro MRR"}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={isOneTimeProduct(commercialForm.produto) ? commercialForm.valorUnico : commercialForm.primeiroMRR}
                        onChange={(event) => setCommercialForm({ ...commercialForm, ...(isOneTimeProduct(commercialForm.produto) ? { valorUnico: Number(event.target.value) } : { primeiroMRR: Number(event.target.value) }) })}
                      />
                    </label>
                    <label>
                      <span>Pagamento</span>
                      <select value={commercialForm.pagamento} onChange={(event) => setCommercialForm({ ...commercialForm, pagamento: event.target.value })}>
                        <option>Pendente</option>
                        <option>Na call</option>
                        <option>Ativado</option>
                      </select>
                    </label>
                    <label className="toggle-card">
                      <div>
                        <strong>Primeiro pagamento confirmado</strong>
                        <span>Libera a venda para calculo da comissao comercial.</span>
                      </div>
                      <button className={commercialForm.primeiroPagamentoConfirmado ? "switch on" : "switch"} type="button" onClick={() => setCommercialForm({ ...commercialForm, primeiroPagamentoConfirmado: !commercialForm.primeiroPagamentoConfirmado })}>
                        <i />
                      </button>
                    </label>
                    <label className="toggle-card">
                      <div>
                        <strong>Contrato ativado</strong>
                        <span>Usado para bonus de ativacao quando nao foi pagamento na call.</span>
                      </div>
                      <button className={commercialForm.contratoAtivado ? "switch on" : "switch"} type="button" onClick={() => setCommercialForm({ ...commercialForm, contratoAtivado: !commercialForm.contratoAtivado, pagamento: !commercialForm.contratoAtivado && commercialForm.pagamento === "Pendente" ? "Ativado" : commercialForm.pagamento })}>
                        <i />
                      </button>
                    </label>
                    <label>
                      <span>Status da comissao</span>
                      <select value={commercialForm.comissaoStatus || "Pendente"} onChange={(event) => setCommercialForm({ ...commercialForm, comissaoStatus: event.target.value })}>
                        <option>Pendente</option>
                        <option>Liberada</option>
                        <option>Bloqueada</option>
                      </select>
                    </label>
                    <label>
                      <span>Motivo da pendencia</span>
                      <input value={commercialForm.pendenciaMotivo || ""} onChange={(event) => setCommercialForm({ ...commercialForm, pendenciaMotivo: event.target.value })} placeholder="Ex: aguardando pagamento inicial" />
                    </label>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        {commercialForm.id ? "Atualizar registro" : "Salvar registro"}
                      </button>
                      <button className="secondary" type="button" onClick={() => setIsCommercialModalOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </section>
        )}

        {active === "expansao" && (
          <section className="teams-layout">
            <div className="kpis compact">
              <Kpi label="Oportunidades abertas" value={String(openExpansions.length)} detail="Pipeline de carteira" tone="good" />
              <Kpi label="MRR em pipeline" value={currencyExact.format(expansionMrrPipeline)} detail="Recorrencia potencial" tone="neutral" />
              <Kpi label="One-Time em pipeline" value={currencyExact.format(expansionOneTimePipeline)} detail="SABER, TER e implantacoes" tone="warning" />
              <Kpi label="Potencial contratado" value={currencyExact.format(expansionPotential)} detail="MRR x LT + One-Time" tone="danger" />
            </div>

            <div className="section-toolbar">
              <div>
                <h3>Oportunidades de expansao</h3>
                <p className="muted">Controle de upsell, cross-sell, renovacao e monetizacao da carteira.</p>
              </div>
              <button className="primary" type="button" onClick={openNewExpansionModal}>
                Nova oportunidade
              </button>
            </div>

            <ExpansionTable expansions={expansions} clients={clients} onEdit={editExpansion} onDelete={deleteExpansion} />

            <div className="kpis compact">
              <Kpi label="MRR ganho" value={currencyExact.format(expansionWonMrr)} detail="Expansoes marcadas como ganhas" tone="good" />
              <Kpi label="Renovacoes proximas" value={String(upcomingRenewals)} detail="Projetos recorrentes em ate 60 dias" tone="warning" />
              <Kpi label="Clientes ativos" value={String(activeClients.length)} detail="Base para expansao" tone="neutral" />
              <Kpi label="Sem squad" value={String(clientsWithoutSquad)} detail="Projetos sem dono claro" tone="danger" />
            </div>

            {isExpansionModalOpen && (
              <div className="modal-backdrop" role="presentation" onMouseDown={() => setIsExpansionModalOpen(false)}>
                <section className="modal" role="dialog" aria-modal="true" aria-labelledby="expansion-modal-title" onMouseDown={(event) => event.stopPropagation()}>
                  <div className="modal-header">
                    <div>
                      <p className="eyebrow">Expansao</p>
                      <h3 id="expansion-modal-title">{expansionForm.id ? "Editar oportunidade" : "Nova oportunidade"}</h3>
                    </div>
                    <button className="icon-button" type="button" aria-label="Fechar" onClick={() => setIsExpansionModalOpen(false)}>
                      x
                    </button>
                  </div>
                  <form className="form-grid" onSubmit={saveExpansion}>
                    <label>
                      <span>Cliente</span>
                      <select
                        value={expansionForm.clienteId}
                        onChange={(event) => {
                          const selectedClient = clients.find((client) => client.id === event.target.value);
                          setExpansionForm({ ...expansionForm, clienteId: event.target.value, projetoId: selectedClient?.projetos[0]?.id ?? "" });
                        }}
                      >
                        <option value="">Selecione</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.nomeFantasia || client.nome || client.razaoSocial}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Projeto origem</span>
                      <select value={expansionForm.projetoId} onChange={(event) => setExpansionForm({ ...expansionForm, projetoId: event.target.value })}>
                        <option value="">Sem projeto vinculado</option>
                        {clients
                          .find((client) => client.id === expansionForm.clienteId)
                          ?.projetos.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.nome || project.produto}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      <span>Tipo</span>
                      <select value={expansionForm.tipo} onChange={(event) => setExpansionForm({ ...expansionForm, tipo: event.target.value })}>
                        <option>Upsell</option>
                        <option>Cross-sell</option>
                        <option>Renovacao</option>
                        <option>SABER -&gt; EXECUTAR</option>
                        <option>SABER -&gt; TER</option>
                        <option>Reajuste de escopo</option>
                      </select>
                    </label>
                    <label>
                      <span>Lider</span>
                      <select value={expansionForm.lider} onChange={(event) => setExpansionForm({ ...expansionForm, lider: event.target.value })}>
                        <option value="">Selecione</option>
                        {team.filter((member) => member.status !== "Inativo").map((member) => (
                          <option key={member.id} value={member.nome}>
                            {member.nome}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>Valor MRR</span>
                      <input type="number" min="0" step="0.01" value={expansionForm.valorMRR} onChange={(event) => setExpansionForm({ ...expansionForm, valorMRR: Number(event.target.value) })} />
                    </label>
                    <label>
                      <span>Valor One-Time</span>
                      <input type="number" min="0" step="0.01" value={expansionForm.valorUnico} onChange={(event) => setExpansionForm({ ...expansionForm, valorUnico: Number(event.target.value) })} />
                    </label>
                    <label>
                      <span>LT projetado</span>
                      <input type="number" min="0" step="1" value={expansionForm.ltMeses} onChange={(event) => setExpansionForm({ ...expansionForm, ltMeses: Number(event.target.value) })} />
                    </label>
                    <label>
                      <span>Previsao fechamento</span>
                      <input type="date" value={expansionForm.previsaoFechamento} onChange={(event) => setExpansionForm({ ...expansionForm, previsaoFechamento: event.target.value })} />
                    </label>
                    <label>
                      <span>Etapa</span>
                      <select value={expansionForm.etapa} onChange={(event) => setExpansionForm({ ...expansionForm, etapa: event.target.value })}>
                        <option>Mapeada</option>
                        <option>Diagnostico</option>
                        <option>Proposta</option>
                        <option>Negociacao</option>
                        <option>Fechamento</option>
                      </select>
                    </label>
                    <label>
                      <span>Status</span>
                      <select value={expansionForm.status} onChange={(event) => setExpansionForm({ ...expansionForm, status: event.target.value })}>
                        <option>Em aberto</option>
                        <option>Ganha</option>
                        <option>Perdida</option>
                        <option>Pausada</option>
                      </select>
                    </label>
                    <label className="full">
                      <span>Participantes</span>
                      <div className="check-grid">
                        {team.filter((member) => member.status !== "Inativo").map((member) => (
                          <label className="check-pill" key={member.id}>
                            <input type="checkbox" checked={expansionForm.participantes.includes(member.nome)} onChange={() => toggleExpansionParticipant(member.nome)} />
                            <span>{member.nome}</span>
                          </label>
                        ))}
                      </div>
                    </label>
                    <label className="full">
                      <span>Observacoes</span>
                      <input value={expansionForm.observacoes} onChange={(event) => setExpansionForm({ ...expansionForm, observacoes: event.target.value })} placeholder="Contexto, dor do cliente, proximo passo ou criterio de validacao" />
                    </label>
                    <div className="form-actions">
                      <button className="primary" type="submit">
                        {expansionForm.id ? "Atualizar oportunidade" : "Salvar oportunidade"}
                      </button>
                      <button className="secondary" type="button" onClick={() => setIsExpansionModalOpen(false)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}
          </section>
        )}

        {active === "comissoes" && (
          <section className="teams-layout">
            <div className="kpis compact">
              <Kpi label="Fixo do mes" value={currencyExact.format(totalProlabore)} detail="Custo fixo proporcional" tone="warning" />
              <Kpi label="Variavel calculada" value={currencyExact.format(totalTeamVariable)} detail="Comercial + projetos + expansao" tone="good" />
              <Kpi label="Conferidos / pagos" value={`${commissionCheckedCount}/${commissionPaidCount}`} detail="Status por prestador" tone="neutral" />
              <Kpi label="Total em conferencia" value={currencyExact.format(totalTeamCost)} detail="Previa por pessoa" tone="danger" />
            </div>

            <div className="section-toolbar">
              <div>
                <h3>Conferencia de comissoes</h3>
                <p className="muted">Validacao individual dos valores calculados por pessoa antes do fechamento financeiro.</p>
              </div>
            </div>

            <CommissionsTable
              team={costedTeam}
              clients={clients}
              squads={squads}
              expansions={expansions}
              allTeam={team}
              comercial={comercial}
              policyConfig={policyConfig}
              referenceDate={competenceDate}
              selectedCompetence={selectedCompetence}
              commissionStatuses={commissionStatuses}
              onStatusChange={updateCommissionStatus}
            />
          </section>
        )}

        {active === "fechamento" && (
          <section className="teams-layout">
            <div className="kpis compact">
              <Kpi label="Receita comercial validada" value={currencyExact.format(currentCommercialMrr + currentCommercialOneTime)} detail="MRR novo + One-Time" tone="good" />
              <Kpi label="Expansoes ganhas" value={currencyExact.format(expansionWonMrr)} detail="MRR ganho em carteira" tone="neutral" />
              <Kpi label="Comissoes liberadas" value={String(currentReleasedSales.length)} detail={`${currentPendingSales.length} pendente(s)`} tone="warning" />
              <Kpi label="Total a pagar" value={currencyExact.format(totalTeamCost)} detail="Fixo + variaveis da competencia" tone="danger" />
            </div>

            <section className="panel closing-panel">
              <div className="section-toolbar flat-toolbar">
                <div>
                  <h3>Fechamento mensal</h3>
                  <p className="muted">Visao consolidada da competencia antes do pagamento do dia {paymentCompetenceDate.toLocaleDateString("pt-BR")}.</p>
                </div>
              </div>
              <div className="closing-grid">
                <div className="metric-list">
                  <div><span>MRR novo validado</span><strong>{currencyExact.format(currentCommercialMrr)}</strong></div>
                  <div><span>One-Time vendido</span><strong>{currencyExact.format(currentCommercialOneTime)}</strong></div>
                  <div><span>Expansao MRR ganha</span><strong>{currencyExact.format(expansionWonMrr)}</strong></div>
                  <div><span>Custo fixo com time</span><strong>{currencyExact.format(totalProlabore)}</strong></div>
                  <div><span>Variavel comercial</span><strong>{currencyExact.format(totalCommercialVariable)}</strong></div>
                  <div><span>Variavel operacao/expansao</span><strong>{currencyExact.format(totalProjectVariable + totalExpansionVariable)}</strong></div>
                </div>
                <div className="closing-status-card">
                  <h3>Status do fechamento</h3>
                  <div><span>Prestadores ativos</span><strong>{costedTeam.length}</strong></div>
                  <div><span>Conferidos</span><strong>{commissionCheckedCount}</strong></div>
                  <div><span>Pagos</span><strong>{commissionPaidCount}</strong></div>
                  <div><span>Pendencias comerciais</span><strong>{currentPendingSales.length}</strong></div>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="section-toolbar flat-toolbar">
                <div>
                  <h3>Validacoes para pagamento</h3>
                  <p className="muted">Vendas validadas precisam de pagamento inicial confirmado para liberar comissao.</p>
                </div>
              </div>
              <CommercialValidationTable rows={currentCommercialSales} onEdit={editCommercial} />
            </section>

            <section className="panel">
              <div className="section-toolbar flat-toolbar">
                <div>
                  <h3>Resumo por pessoa</h3>
                  <p className="muted">Previa do valor calculado por regra aplicada.</p>
                </div>
              </div>
              <CommissionsTable
                team={costedTeam}
                clients={clients}
                squads={squads}
                expansions={expansions}
                allTeam={team}
                comercial={comercial}
                policyConfig={policyConfig}
                referenceDate={competenceDate}
                selectedCompetence={selectedCompetence}
                commissionStatuses={commissionStatuses}
                onStatusChange={updateCommissionStatus}
              />
            </section>
          </section>
        )}

        {active === "acessos" && authUser?.isAdmin && (
          <section className="teams-layout">
            <section className="panel access-panel">
              <div className="section-toolbar flat-toolbar">
                <div>
                  <h3>Acessos do painel</h3>
                  <p className="muted">Libere quais abas cada e-mail @v4company.com pode visualizar e editar.</p>
                </div>
              </div>

              <form className="access-form" onSubmit={saveAccessUser}>
                <label>
                  <span>Nome</span>
                  <input
                    value={accessUserForm.nome}
                    onChange={(event) => setAccessUserForm((current) => ({ ...current, nome: event.target.value }))}
                    placeholder="Nome do usuario"
                  />
                </label>
                <label>
                  <span>E-mail V4</span>
                  <input
                    type="email"
                    value={accessUserForm.email}
                    onChange={(event) => setAccessUserForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="nome@v4company.com"
                    required
                  />
                </label>
                <label>
                  <span>Status</span>
                  <select
                    value={accessUserForm.status}
                    onChange={(event) => setAccessUserForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    <option>Ativo</option>
                    <option>Inativo</option>
                  </select>
                </label>
                <label className="check-card compact-check">
                  <input
                    type="checkbox"
                    checked={accessUserForm.isAdmin}
                    onChange={(event) => setAccessUserForm((current) => ({ ...current, isAdmin: event.target.checked }))}
                  />
                  <span>Administrador</span>
                </label>
                <div className="permission-grid">
                  {permissionTabs.map((tab) => (
                    <label className="check-card compact-check" key={tab}>
                      <input
                        type="checkbox"
                        checked={accessUserForm.isAdmin || accessUserForm.allowedTabs.includes(tab)}
                        disabled={accessUserForm.isAdmin}
                        onChange={() => toggleAccessTab(tab)}
                      />
                      <span>{titleFor(tab)}</span>
                    </label>
                  ))}
                </div>
                <div className="form-actions">
                  <button className="primary" type="submit">Salvar acesso</button>
                  <button className="secondary" type="button" onClick={() => setAccessUserForm(emptyAccessUser)}>Limpar</button>
                  {accessStatus && <span className="muted">{accessStatus}</span>}
                </div>
              </form>

              <section className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>E-mail</th>
                      <th>Abas liberadas</th>
                      <th>Status</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!accessUsers.length && (
                      <tr>
                        <td colSpan={5} className="empty-cell">Nenhum usuario cadastrado.</td>
                      </tr>
                    )}
                    {accessUsers.map((user) => (
                      <tr key={user.email}>
                        <td><strong>{user.nome || "-"}</strong>{user.isAdmin && <span className="role-pill">Admin</span>}</td>
                        <td>{user.email}</td>
                        <td>{user.isAdmin ? "Todas as abas" : user.allowedTabs.map(titleFor).join(", ") || "-"}</td>
                        <td><span className={`status-chip ${user.status === "Ativo" ? "good" : "neutral"}`}>{user.status}</span></td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-button" type="button" title="Editar acesso" onClick={() => setAccessUserForm(user)}>✎</button>
                            <button className="icon-button danger" type="button" title="Excluir acesso" onClick={() => deleteAccessUser(user)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </section>
          </section>
        )}

        {active === "regras" && (
          <section className="teams-layout">
            <section className="panel rules-panel">
              <div className="section-toolbar flat-toolbar">
                <div>
                  <h3>Regras do sistema</h3>
                  <p className="muted">Configuracoes usadas nos calculos de comissao e fechamento mensal.</p>
                </div>
                <button
                  className="primary"
                  type="button"
                  onClick={() => {
                    void persistPanelCollection("policyConfig", policyConfig);
                  }}
                >
                  Salvar regras
                </button>
              </div>
              <PolicySettings policy={policyConfig} onChange={setPolicyConfig} />
            </section>
          </section>
        )}

      </section>
    </main>
  );
}

function titleFor(active: string) {
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    equipes: "Equipes e squads",
    clientes: "Clientes",
    comercial: "Comercial",
    expansao: "Expansao",
    comissoes: "Conferencia de comissoes",
    fechamento: "Fechamento mensal",
    regras: "Regras do sistema",
    acessos: "Acessos",
  };
  return map[active] ?? "Painel";
}

function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
  return (
    <article className={`kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function HistoryMetricCell({ realized, target, status }: { realized: number; target: number; status: string }) {
  const rate = target ? realized / target : 0;
  const label = status === "adequado" ? "Adequado" : status === "atencao" ? "Atencao" : "Abaixo";
  return (
    <div className="history-metric-cell">
      <strong>{realized} / {target}</strong>
      <span className={`history-status ${status}`} title={label} aria-label={`${label}: ${percent.format(rate)}`}>
        <i aria-hidden="true" />
        {percent.format(rate)}
      </span>
    </div>
  );
}

function CommercialLineChart({
  records,
  days,
  goal,
  metricKey,
}: {
  records: CommercialDailyMetric[];
  days: Date[];
  goal: number;
  metricKey: CommercialMetricKey;
}) {
  const values = days.map((day) => {
    const dayKey = inputDate(day);
    return records.filter((record) => record.date <= dayKey).reduce((sum, record) => sum + dailyMetricValue(record, metricKey), 0);
  });
  const ideal = days.map((_, index) => Math.ceil((goal / 5) * (index + 1)));
  const max = Math.max(goal, ...values, ...ideal, 1);
  const width = 520;
  const height = 210;
  const padding = 34;
  const x = (index: number) => padding + (index * (width - padding * 2)) / Math.max(1, days.length - 1);
  const y = (value: number) => height - padding - (value / max) * (height - padding * 2);
  const line = (items: number[]) => items.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(value)}`).join(" ");

  return (
    <div className={`commercial-chart ${metricTone(metricKey)}`}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolucao de ${metricLabel(metricKey)}`}>
        {[0, 1, 2, 3].map((item) => {
          const gy = padding + item * ((height - padding * 2) / 3);
          return <line key={item} x1={padding} x2={width - padding} y1={gy} y2={gy} className="chart-grid-line" />;
        })}
        <path className="chart-ideal-line" d={line(ideal)} />
        <path className="chart-real-line" d={line(values)} />
        {values.map((value, index) => (
          <g key={days[index].toISOString()}>
            <circle className="chart-point" cx={x(index)} cy={y(value)} r="4" />
            <text x={x(index)} y={height - 10} textAnchor="middle">{days[index].toLocaleDateString("pt-BR", { weekday: "short" })}</text>
            <text x={x(index)} y={Math.max(18, y(value) - 10)} textAnchor="middle">{value}</text>
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="real" /> Realizado</span>
        <span><i className="ideal" /> Ideal acumulado</span>
      </div>
    </div>
  );
}

function CommercialBdrTable({ rows, onEdit, onDelete }: { rows: Comercial[]; onEdit: (record: Comercial) => void; onDelete: (record: Comercial) => void }) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Mes</th>
            <th>Canal</th>
            <th>BDR/SDR</th>
            <th>Reuniao qualificada</th>
            <th>Status</th>
            <th>Produto</th>
            <th>MRR</th>
            <th>One-Time</th>
            <th>Pagamento</th>
            <th>Comissao</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={12} className="empty-cell">
                Nenhum registro comercial encontrado.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.lead}</strong></td>
              <td>{row.mes}</td>
              <td>{row.canal}</td>
              <td>{row.bdr || "-"}</td>
              <td><span className={`status-chip ${row.reuniaoQualificada === "Sim" ? "good" : "neutral"}`}>{row.reuniaoQualificada || "-"}</span></td>
              <td>{row.status}</td>
              <td>{row.produto}</td>
              <td>{currencyExact.format(row.primeiroMRR)}</td>
              <td>{currencyExact.format(row.valorUnico)}</td>
              <td>{row.pagamento}</td>
              <td><span className={`status-chip ${commercialCommissionReleased(row) ? "good" : row.comissaoStatus === "Bloqueada" ? "danger" : "warning"}`}>{commercialCommissionReleased(row) ? "Liberada" : row.comissaoStatus || "Pendente"}</span></td>
              <td>
                <CommercialRowActions record={row} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CommercialCloserTable({ rows, onEdit, onDelete }: { rows: Comercial[]; onEdit: (record: Comercial) => void; onDelete: (record: Comercial) => void }) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Mes</th>
            <th>Closer</th>
            <th>BDR/SDR</th>
            <th>Status</th>
            <th>Produto</th>
            <th>MRR</th>
            <th>One-Time</th>
            <th>Pagamento</th>
            <th>Comissao</th>
            <th>Canal</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={12} className="empty-cell">
                Nenhum fechamento encontrado.
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.id}>
              <td><strong>{row.lead}</strong></td>
              <td>{row.mes}</td>
              <td>{row.closer || "-"}</td>
              <td>{row.bdr || "-"}</td>
              <td><span className={`status-chip ${row.status === "Venda validada" ? "good" : "warning"}`}>{row.status}</span></td>
              <td>{row.produto}</td>
              <td>{currencyExact.format(row.primeiroMRR)}</td>
              <td>{currencyExact.format(row.valorUnico)}</td>
              <td>{row.pagamento}</td>
              <td><span className={`status-chip ${commercialCommissionReleased(row) ? "good" : row.comissaoStatus === "Bloqueada" ? "danger" : "warning"}`}>{commercialCommissionReleased(row) ? "Liberada" : row.comissaoStatus || "Pendente"}</span></td>
              <td>{row.canal}</td>
              <td>
                <CommercialRowActions record={row} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CommercialValidationTable({ rows, onEdit }: { rows: Comercial[]; onEdit: (record: Comercial) => void }) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Lead</th>
            <th>Produto</th>
            <th>Valor base</th>
            <th>Pagamento inicial</th>
            <th>Contrato ativado</th>
            <th>Comissao</th>
            <th>Pendencia</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={8} className="empty-cell">Nenhuma venda validada nesta competencia.</td>
            </tr>
          )}
          {rows.map((row) => {
            const released = commercialCommissionReleased(row);
            return (
              <tr key={row.id}>
                <td><strong>{row.lead}</strong><span className="cell-note">{row.bdr || "-"} / {row.closer || "-"}</span></td>
                <td>{row.produto}</td>
                <td>{currencyExact.format(commercialSaleBase(row))}</td>
                <td><span className={`status-chip ${commercialPaymentConfirmed(row) ? "good" : "warning"}`}>{commercialPaymentConfirmed(row) ? "Confirmado" : "Pendente"}</span></td>
                <td><span className={`status-chip ${row.contratoAtivado ? "good" : "neutral"}`}>{row.contratoAtivado ? "Ativado" : "Nao ativado"}</span></td>
                <td><span className={`status-chip ${released ? "good" : row.comissaoStatus === "Bloqueada" ? "danger" : "warning"}`}>{released ? "Liberada" : row.comissaoStatus || "Pendente"}</span></td>
                <td>{row.pendenciaMotivo || (released ? "-" : "Aguardando validacao")}</td>
                <td>
                  <button className="icon-button" type="button" aria-label={`Editar ${row.lead}`} title="Editar validacao" onClick={() => onEdit(row)}>
                    <EditIcon />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function CommercialRowActions({
  record,
  onEdit,
  onDelete,
}: {
  record: Comercial;
  onEdit: (record: Comercial) => void;
  onDelete: (record: Comercial) => void;
}) {
  return (
    <div className="row-actions">
      <button type="button" aria-label={`Editar ${record.lead}`} title="Editar" onClick={() => onEdit(record)}>
        <EditIcon />
      </button>
      <button className="danger-action" type="button" aria-label={`Excluir ${record.lead}`} title="Excluir" onClick={() => onDelete(record)}>
        <TrashIcon />
      </button>
    </div>
  );
}

function ExpansionTable({
  expansions,
  clients,
  onEdit,
  onDelete,
}: {
  expansions: Expansion[];
  clients: Client[];
  onEdit: (expansion: Expansion) => void;
  onDelete: (expansion: Expansion) => void;
}) {
  function clientName(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    return client?.nomeFantasia || client?.nome || client?.razaoSocial || "-";
  }

  function projectName(expansion: Expansion) {
    const client = clients.find((item) => item.id === expansion.clienteId);
    const project = client?.projetos.find((item) => item.id === expansion.projetoId);
    return project?.nome || project?.produto || "Sem projeto vinculado";
  }

  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Projeto origem</th>
            <th>Tipo</th>
            <th>Lider</th>
            <th>Participantes</th>
            <th>Etapa</th>
            <th>Status</th>
            <th>MRR</th>
            <th>One-Time</th>
            <th>LT</th>
            <th>Potencial</th>
            <th>Previsao</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {!expansions.length && (
            <tr>
              <td colSpan={13} className="empty-cell">
                Nenhuma oportunidade de expansao cadastrada.
              </td>
            </tr>
          )}
          {expansions.map((expansion) => {
            const potential = expansion.valorUnico + expansion.valorMRR * expansion.ltMeses;
            return (
              <tr key={expansion.id}>
                <td>
                  <strong>{clientName(expansion.clienteId)}</strong>
                  {expansion.observacoes && <span className="cell-note">{expansion.observacoes}</span>}
                </td>
                <td>{projectName(expansion)}</td>
                <td>{expansion.tipo}</td>
                <td>{expansion.lider || "-"}</td>
                <td>{expansion.participantes.join(", ") || "-"}</td>
                <td>{expansion.etapa}</td>
                <td><span className={`status-chip ${expansionStatusClass(expansion.status)}`}>{expansion.status}</span></td>
                <td>{currencyExact.format(expansion.valorMRR)}</td>
                <td>{currencyExact.format(expansion.valorUnico)}</td>
                <td>{expansion.ltMeses ? `${expansion.ltMeses} meses` : "-"}</td>
                <td>{currencyExact.format(potential)}</td>
                <td>{formatDate(expansion.previsaoFechamento)}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" aria-label="Editar oportunidade" title="Editar" onClick={() => onEdit(expansion)}>
                      <EditIcon />
                    </button>
                    <button className="danger-action" type="button" aria-label="Excluir oportunidade" title="Excluir" onClick={() => onDelete(expansion)}>
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function expansionStatusClass(status: string) {
  if (status === "Ganha") return "good";
  if (status === "Perdida") return "danger";
  if (status === "Pausada") return "warning";
  return "neutral";
}

function CommissionsTable({
  team,
  clients,
  squads,
  expansions,
  allTeam,
  comercial,
  policyConfig,
  referenceDate,
  selectedCompetence,
  commissionStatuses,
  onStatusChange,
}: {
  team: TeamMember[];
  clients: Client[];
  squads: Squad[];
  expansions: Expansion[];
  allTeam: TeamMember[];
  comercial: Comercial[];
  policyConfig: CommercialPolicyConfig;
  referenceDate: Date;
  selectedCompetence: string;
  commissionStatuses: Record<string, string>;
  onStatusChange: (memberId: string, status: string) => void;
}) {
  return (
    <section className="table-wrap commissions-table">
      <table>
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>Funcao</th>
            <th>Fixo do mes</th>
            <th>Variavel comercial</th>
            <th>Variavel projetos</th>
            <th>Variavel expansao</th>
            <th>Variavel total</th>
            <th>Total do mes</th>
            <th>Regra</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {!team.length && (
            <tr>
              <td colSpan={10} className="empty-cell">
                Nenhuma pessoa ativa na competencia.
              </td>
            </tr>
          )}
          {team.map((member) => {
            const status = commissionStatuses[`${selectedCompetence}:${member.id}`] ?? "Previsto";
            const fixed = monthlyFixedCost(member, referenceDate);
            const commercialVariable = memberCommercialVariable(member, comercial, referenceDate, policyConfig);
            const projectVariable = memberEffectiveRecurringProjectVariable(member, clients, squads, referenceDate);
            const expansionVariable = memberExpansionVariable(member, expansions, clients, squads, allTeam, referenceDate, policyConfig);
            const totalVariable = commercialVariable + projectVariable + expansionVariable;
            const total = fixed + totalVariable;

            return (
              <tr key={member.id}>
                <td>
                  <div className="name-cell">
                    <span>{member.nome}</span>
                    {member.socio && <span className="partner-badge">Socio</span>}
                  </div>
                </td>
                <td>{member.funcao}</td>
                <td>{currencyExact.format(fixed)}</td>
                <td>{commercialVariable ? currencyExact.format(commercialVariable) : "-"}</td>
                <td>{projectVariable ? currencyExact.format(projectVariable) : "-"}</td>
                <td>{expansionVariable ? currencyExact.format(expansionVariable) : "-"}</td>
                <td>{totalVariable ? currencyExact.format(totalVariable) : "-"}</td>
                <td><strong>{currencyExact.format(total)}</strong></td>
                <td>
                  {member.usarMaiorEntreFixoVariavel ? (
                    <span className="rule-pill">Fixo ou Variavel</span>
                  ) : (
                    <span className="muted">Padrao</span>
                  )}
                </td>
                <td>
                  <select
                    className={`commission-status-select ${commissionStatusClass(status)}`}
                    value={status}
                    onChange={(event) => onStatusChange(member.id, event.target.value)}
                    aria-label={`Status da comissao de ${member.nome}`}
                  >
                    <option>Previsto</option>
                    <option>Conferido</option>
                    <option>Pago</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function commissionStatusClass(status: string) {
  if (status === "Pago") return "good";
  if (status === "Conferido") return "warning";
  return "neutral";
}

function PolicySettings({ policy, onChange }: { policy: CommercialPolicyConfig; onChange: (policy: CommercialPolicyConfig) => void }) {
  function updateMoney(key: keyof CommercialPolicyConfig, value: number) {
    onChange({ ...policy, [key]: Math.max(0, Number(value) || 0) });
  }

  function updatePercent(key: keyof CommercialPolicyConfig, value: number) {
    onChange({ ...policy, [key]: Math.max(0, Number(value) || 0) / 100 });
  }

  return (
    <div className="rules-grid">
      <section>
        <h3>Comercial - BDR/SDR</h3>
        <label><span>% maximo recorrente</span><input type="number" min="0" step="0.1" value={policy.bdrMaxRecurringRate * 100} onChange={(event) => updatePercent("bdrMaxRecurringRate", Number(event.target.value))} /></label>
        <label><span>% maximo One-Time</span><input type="number" min="0" step="0.1" value={policy.bdrMaxOneTimeRate * 100} onChange={(event) => updatePercent("bdrMaxOneTimeRate", Number(event.target.value))} /></label>
        <label><span>Bonus reuniao que virou venda</span><input type="number" min="0" step="1" value={policy.bdrSaleMeetingBonus} onChange={(event) => updateMoney("bdrSaleMeetingBonus", Number(event.target.value))} /></label>
        <label><span>Bonus pagamento na call</span><input type="number" min="0" step="1" value={policy.bdrPaymentOnCallBonus} onChange={(event) => updateMoney("bdrPaymentOnCallBonus", Number(event.target.value))} /></label>
        <label><span>Bonus contrato ativado</span><input type="number" min="0" step="1" value={policy.bdrActivatedContractBonus} onChange={(event) => updateMoney("bdrActivatedContractBonus", Number(event.target.value))} /></label>
      </section>
      <section>
        <h3>Comercial - Closer</h3>
        <label><span>% maximo recorrente</span><input type="number" min="0" step="0.1" value={policy.closerMaxRecurringRate * 100} onChange={(event) => updatePercent("closerMaxRecurringRate", Number(event.target.value))} /></label>
        <label><span>% maximo One-Time</span><input type="number" min="0" step="0.1" value={policy.closerMaxOneTimeRate * 100} onChange={(event) => updatePercent("closerMaxOneTimeRate", Number(event.target.value))} /></label>
        <label><span>Bonus pagamento na call</span><input type="number" min="0" step="1" value={policy.closerPaymentOnCallBonus} onChange={(event) => updateMoney("closerPaymentOnCallBonus", Number(event.target.value))} /></label>
        <label><span>Bonus contrato ativado</span><input type="number" min="0" step="1" value={policy.closerActivatedContractBonus} onChange={(event) => updateMoney("closerActivatedContractBonus", Number(event.target.value))} /></label>
      </section>
      <section>
        <h3>Operacao e fechamento</h3>
        <label><span>Pool de expansao/monetizacao (%)</span><input type="number" min="0" step="0.1" value={policy.expansionPoolRate * 100} onChange={(event) => updatePercent("expansionPoolRate", Number(event.target.value))} /></label>
        <label><span>Fatia lider da monetizacao (%)</span><input type="number" min="0" step="0.1" value={policy.expansionLeaderShare * 100} onChange={(event) => updatePercent("expansionLeaderShare", Number(event.target.value))} /></label>
        <label><span>Fatia coordenador (%)</span><input type="number" min="0" step="0.1" value={policy.expansionCoordinatorShare * 100} onChange={(event) => updatePercent("expansionCoordinatorShare", Number(event.target.value))} /></label>
        <label><span>Dia de pagamento</span><input type="number" min="1" max="28" step="1" value={policy.paymentDay} onChange={(event) => updateMoney("paymentDay", Number(event.target.value))} /></label>
      </section>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function MiniFunnel({ reunioes, propostas, vendas }: { reunioes: number; propostas: number; vendas: number }) {
  const max = Math.max(reunioes, propostas, vendas, 1);
  return (
    <div className="funnel">
      {[
        ["Reunioes qualificadas", reunioes],
        ["Propostas", propostas],
        ["Vendas", vendas],
      ].map(([label, value]) => (
        <div className="bar-row" key={label}>
          <span>{label}</span>
          <div>
            <i style={{ width: `${(Number(value) / max) * 100}%` }} />
          </div>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function TeamTable({
  team,
  allTeam,
  clients,
  squads,
  expansions,
  comercial,
  referenceDate,
  emptyText,
  onEdit,
  onDelete,
}: {
  team: TeamMember[];
  allTeam: TeamMember[];
  clients: Client[];
  squads: Squad[];
  expansions: Expansion[];
  comercial: Comercial[];
  referenceDate: Date;
  emptyText: string;
  onEdit: (member: TeamMember) => void;
  onDelete: (member: TeamMember) => void;
}) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Funcao</th>
            <th>Data contratacao</th>
            <th>Custo Fixo com Time</th>
            <th>Variavel total</th>
            <th>Custo do mes</th>
            <th>Percentual</th>
            <th>Regra variavel</th>
            <th>Status</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {!team.length && (
            <tr>
              <td colSpan={10} className="empty-cell">
                {emptyText}
              </td>
            </tr>
          )}
          {team.map((member) => {
            const variable = memberProjectVariable(member, clients, squads, expansions, allTeam, comercial, referenceDate);
            const monthlyCost = memberMonthlyCost(member, clients, squads, expansions, allTeam, comercial, referenceDate);
            return (
              <tr key={member.id}>
                <td>
                  <div className="name-cell">
                    <span>{member.nome}</span>
                    {member.socio && <span className="partner-badge">Socio</span>}
                  </div>
                </td>
                <td>{member.funcao}</td>
                <td>{formatDate(member.dataContratacao)}</td>
                <td>{currency.format(member.fixoAcordado)}</td>
                <td>{variable ? currency.format(variable) : "-"}</td>
                <td>{currency.format(monthlyCost)}</td>
                <td>{member.percentualProjeto ? percent.format(member.percentualProjeto) : "-"}</td>
                <td>
                  {member.usarMaiorEntreFixoVariavel ? (
                    <span className="rule-pill">Fixo ou Variável</span>
                  ) : (
                    <span className="muted">Padrao</span>
                  )}
                </td>
                <td>{member.status}</td>
                <td>
                  <div className="row-actions">
                    <button type="button" aria-label={`Editar ${member.nome}`} title="Editar" onClick={() => onEdit(member)}>
                      <EditIcon />
                    </button>
                    <button className="danger-action" type="button" aria-label={`Excluir ${member.nome}`} title="Excluir" onClick={() => onDelete(member)}>
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function ClientTable({
  clients,
  onView,
  onProjects,
  onEdit,
  onDelete,
}: {
  clients: Client[];
  onView: (client: Client) => void;
  onProjects: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Razao Social</th>
            <th>Projetos Ativo</th>
            <th>MRR</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {!clients.length && (
            <tr>
              <td colSpan={5} className="empty-cell">
                Nenhum cliente cadastrado.
              </td>
            </tr>
          )}
          {clients.map((client) => (
            <tr key={client.id}>
              <td>{client.nomeFantasia || client.nome || "-"}</td>
              <td>{client.razaoSocial || "-"}</td>
              <td>{activeProjects(client).length}</td>
              <td>{currency.format(projectMrrTotal(activeProjects(client)))}</td>
              <td>
                <ClientRowActions client={client} onView={onView} onProjects={onProjects} onEdit={onEdit} onDelete={onDelete} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ProjectTable({
  clients,
  productFilter,
  squads,
  onView,
  onEditProject,
  onUpdateProject,
  onDeleteProject,
}: {
  clients: Client[];
  productFilter: string;
  squads: Squad[];
  onView: (client: Client) => void;
  onEditProject: (client: Client, project: ClientProject) => void;
  onUpdateProject: (client: Client, project: ClientProject, patch: Partial<ClientProject>) => void;
  onDeleteProject: (client: Client, project: ClientProject) => void;
}) {
  const [groupByClient, setGroupByClient] = useState(false);
  const rows = clients.flatMap((client) =>
    activeProjects(client)
      .filter((project) => project.produto === productFilter)
      .map((project) => ({ client, project, squad: squads.find((item) => item.nome === project.squad) })),
  );
  const groupedRows = clients
    .map((client) => ({
      client,
      rows: activeProjects(client)
        .filter((project) => project.produto === productFilter)
        .map((project) => ({ client, project, squad: squads.find((item) => item.nome === project.squad) })),
    }))
    .filter((group) => group.rows.length);
  const renderProjectRow = ({ client, project, squad }: { client: Client; project: ClientProject; squad?: Squad }) => (
    <tr key={`${client.id}-${project.id}`}>
      <td>
        <strong>{project.nome || client.nomeFantasia || client.nome || "-"}</strong>
        <span className="cell-note">{client.nomeFantasia || client.nome || "-"}</span>
      </td>
      <td>{squad?.coordenador || "-"}</td>
      <td>{squad?.account || "-"}</td>
      <td>{project.squad || "-"}</td>
      <td>
        <select
          className={`health-select ${healthClass(project.saude)}`}
          value={project.saude}
          onChange={(event) => onUpdateProject(client, project, { saude: event.target.value })}
          aria-label={`Saude do projeto ${project.nome || client.nome}`}
        >
          <option>Saudável</option>
          <option>Alerta</option>
          <option>Perigo</option>
        </select>
      </td>
      <td>
        <select
          className={`engagement-select ${engagementClass(project.engajamento)}`}
          value={project.engajamento}
          onChange={(event) => onUpdateProject(client, project, { engajamento: event.target.value })}
          aria-label={`Engajamento do projeto ${project.nome || client.nome}`}
        >
          <option>Engajado</option>
          <option>Neutro</option>
          <option>Desengajado</option>
        </select>
      </td>
      <td>{formatDate(project.dataInicio)}</td>
      <td>{project.status === "Entregue" && project.dataEntrega ? `Entregue em ${formatDate(project.dataEntrega)}` : project.status}</td>
      <td>{currencyExact.format(isOneTimeProduct(project.produto) ? project.valorUnico : project.mrr)}</td>
      <td>
        <ProjectRowActions client={client} project={project} onView={onView} onEditProject={onEditProject} onDeleteProject={onDeleteProject} />
      </td>
    </tr>
  );

  return (
    <section className="projects-panel">
      {productFilter === "EXECUTAR" && (
        <div className="table-options">
          <button className={groupByClient ? "secondary active" : "secondary"} type="button" onClick={() => setGroupByClient((current) => !current)}>
            Agrupar por empresa
          </button>
        </div>
      )}
      <div className="table-wrap projects-table">
        <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Coord.</th>
            <th>Account</th>
            <th>Squad</th>
            <th>Saude</th>
            <th>Engajamento</th>
            <th>Inicio</th>
            <th>Status</th>
            <th>{isOneTimeProduct(productFilter) ? "One-Time" : "MRR"}</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={10} className="empty-cell">
                Nenhum projeto cadastrado nessa categoria.
              </td>
            </tr>
          )}
          {groupByClient && productFilter === "EXECUTAR"
            ? groupedRows.map((group) => (
                <Fragment key={`${group.client.id}-group`}>
                  <tr className="project-group-row">
                    <td colSpan={8}>
                      <strong>{group.client.nomeFantasia || group.client.nome || "-"}</strong>
                      <span>{group.rows.length} projeto(s) EXECUTAR</span>
                    </td>
                    <td>{currencyExact.format(projectMrrTotal(group.rows.map((item) => item.project)))}</td>
                    <td>
                      <button type="button" className="secondary" onClick={() => onView(group.client)}>
                        Ver cliente
                      </button>
                    </td>
                  </tr>
                  {group.rows.map(renderProjectRow)}
                </Fragment>
              ))
            : rows.map(renderProjectRow)}
        </tbody>
        </table>
      </div>
    </section>
  );
}

function ProjectRowActions({
  client,
  project,
  onView,
  onEditProject,
  onDeleteProject,
}: {
  client: Client;
  project: ClientProject;
  onView: (client: Client) => void;
  onEditProject: (client: Client, project: ClientProject) => void;
  onDeleteProject: (client: Client, project: ClientProject) => void;
}) {
  const projectName = project.nome || client.nomeFantasia || client.nome || "projeto";
  return (
    <div className="row-actions">
      <button type="button" aria-label={`Visualizar ${projectName}`} title="Visualizar projeto" onClick={() => onView(client)}>
        <ViewIcon />
      </button>
      <button type="button" aria-label={`Editar ${projectName}`} title="Editar projeto" onClick={() => onEditProject(client, project)}>
        <EditIcon />
      </button>
      <button className="danger-action" type="button" aria-label={`Excluir ${projectName}`} title="Excluir projeto" onClick={() => onDeleteProject(client, project)}>
        <TrashIcon />
      </button>
    </div>
  );
}

function healthClass(value: string) {
  if (value === "Perigo") return "danger";
  if (value === "Alerta") return "warning";
  return "good";
}

function engagementClass(value: string) {
  if (value === "Engajado") return "good";
  if (value === "Desengajado") return "danger";
  return "neutral";
}

function ClientRowActions({
  client,
  onView,
  onProjects,
  onEdit,
  onDelete,
}: {
  client: Client;
  onView: (client: Client) => void;
  onProjects: (client: Client) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}) {
  return (
    <div className="row-actions">
      <button type="button" aria-label={`Visualizar ${client.nome}`} title="Visualizar" onClick={() => onView(client)}>
        <ViewIcon />
      </button>
      <button type="button" aria-label={`Projetos de ${client.nome}`} title="Projetos" onClick={() => onProjects(client)}>
        <ProjectsIcon />
      </button>
      <button type="button" aria-label={`Editar ${client.nome}`} title="Editar" onClick={() => onEdit(client)}>
        <EditIcon />
      </button>
      <button className="danger-action" type="button" aria-label={`Excluir ${client.nome}`} title="Excluir" onClick={() => onDelete(client)}>
        <TrashIcon />
      </button>
    </div>
  );
}

function ClientProjectEditor({
  index,
  project,
  squads,
  onChange,
  onRemove,
  canRemove = true,
}: {
  index: number;
  project: ClientProject;
  squads: Squad[];
  onChange: (projectId: string, patch: Partial<ClientProject>) => void;
  onRemove: (projectId: string) => void;
  canRemove?: boolean;
}) {
  return (
    <div className="project-card">
      <div className="project-card-title">
        <strong>Projeto {index + 1}</strong>
        {canRemove && (
          <button className="danger-action" type="button" onClick={() => onRemove(project.id)}>
            Remover
          </button>
        )}
      </div>
      <div className="project-grid">
        <label>
          <span>Nome do projeto</span>
          <input
            value={project.nome}
            onChange={(event) => onChange(project.id, { nome: event.target.value })}
            placeholder="Ex: Gestao de trafego"
          />
        </label>
        <label>
          <span>Produto</span>
          <select
            value={project.produto}
            onChange={(event) => {
              const produto = event.target.value;
              onChange(project.id, {
                produto,
                dataRenovacao: isOneTimeProduct(produto) ? "" : project.dataRenovacao,
                dataEntrega: isDeliverableProduct(produto) ? project.dataEntrega : "",
                status: isDeliverableProduct(produto) ? (project.status === "Entregue" ? "Entregue" : "Ativo") : project.status === "Inativo" ? "Inativo" : "Ativo",
              });
            }}
          >
            <option>SABER</option>
            <option>TER</option>
            <option>EXECUTAR</option>
            <option>CRM</option>
            <option>Outro</option>
          </select>
        </label>
        <label>
          <span>Squad</span>
          <select value={project.squad} onChange={(event) => onChange(project.id, { squad: event.target.value })}>
            <option value="">Selecionar</option>
            {squads.map((item) => (
              <option key={item.id}>{item.nome}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Saude</span>
          <select className={`health-select ${healthClass(project.saude)}`} value={project.saude} onChange={(event) => onChange(project.id, { saude: event.target.value })}>
            <option>Saudável</option>
            <option>Alerta</option>
            <option>Perigo</option>
          </select>
        </label>
        <label>
          <span>Engajamento</span>
          <select className={`engagement-select ${engagementClass(project.engajamento)}`} value={project.engajamento} onChange={(event) => onChange(project.id, { engajamento: event.target.value })}>
            <option>Engajado</option>
            <option>Neutro</option>
            <option>Desengajado</option>
          </select>
        </label>
        <label>
          <span>{isOneTimeProduct(project.produto) ? "Valor One-Time" : "MRR"}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={isOneTimeProduct(project.produto) ? project.valorUnico : project.mrr}
            onChange={(event) =>
              onChange(project.id, isOneTimeProduct(project.produto) ? { valorUnico: Number(event.target.value) } : { mrr: Number(event.target.value) })
            }
            placeholder="0"
          />
        </label>
        {!isOneTimeProduct(project.produto) && (
          <label>
            <span>Contrato</span>
            <select
              value={project.mesesContrato}
              onChange={(event) => {
                const mesesContrato = Number(event.target.value);
                onChange(project.id, {
                  mesesContrato,
                  dataRenovacao: project.dataInicio ? addMonthsToInputDate(project.dataInicio, mesesContrato) : project.dataRenovacao,
                });
              }}
            >
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
            </select>
          </label>
        )}
        <label>
          <span>Inicio</span>
          <input
            type="date"
            value={project.dataInicio}
            onChange={(event) => {
              const dataInicio = event.target.value;
              onChange(project.id, {
                dataInicio,
                dataRenovacao: dataInicio && !isOneTimeProduct(project.produto) ? addMonthsToInputDate(dataInicio, project.mesesContrato) : "",
              });
            }}
          />
        </label>
        {!isOneTimeProduct(project.produto) && (
          <label>
            <span>Renovacao</span>
            <input type="date" value={project.dataRenovacao} onChange={(event) => onChange(project.id, { dataRenovacao: event.target.value })} />
          </label>
        )}
        <label>
          <span>Status</span>
          <select
            value={project.status}
            onChange={(event) => onChange(project.id, { status: event.target.value, dataEntrega: event.target.value === "Entregue" ? project.dataEntrega : "" })}
          >
            {isDeliverableProduct(project.produto) ? (
              <>
                <option>Ativo</option>
                <option>Entregue</option>
              </>
            ) : (
              <>
                <option>Ativo</option>
                <option>Inativo</option>
              </>
            )}
          </select>
        </label>
        {isDeliverableProduct(project.produto) && project.status === "Entregue" && (
          <label>
            <span>Data da entrega</span>
            <input type="date" required value={project.dataEntrega} onChange={(event) => onChange(project.id, { dataEntrega: event.target.value })} />
          </label>
        )}
      </div>
    </div>
  );
}

function SquadTable({
  squads,
  onEdit,
  onDelete,
}: {
  squads: Squad[];
  onEdit: (squad: Squad) => void;
  onDelete: (squad: Squad) => void;
}) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Squad</th>
            <th>Coordenador</th>
            <th>Account</th>
            <th>Membros</th>
            <th>Status</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {squads.map((squad) => (
            <tr key={squad.id}>
              <td>{squad.nome}</td>
              <td>{squad.coordenador || "-"}</td>
              <td>{squad.account || "-"}</td>
              <td>{squad.membros.join(", ") || "-"}</td>
              <td>{squad.status}</td>
              <td>
                <div className="row-actions">
                  <button type="button" aria-label={`Editar ${squad.nome}`} title="Editar" onClick={() => onEdit(squad)}>
                    <EditIcon />
                  </button>
                  <button className="danger-action" type="button" aria-label={`Excluir ${squad.nome}`} title="Excluir" onClick={() => onDelete(squad)}>
                    <TrashIcon />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function EditIcon() {
  return (
    <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h4.8L19.1 9.7l-4.8-4.8L4 15.2V20Zm12-13.4 1.4-1.4c.5-.5 1.2-.5 1.7 0l.7.7c.5.5.5 1.2 0 1.7L18.4 9 16 6.6Z" />
    </svg>
  );
}

function ProjectsIcon() {
  return (
    <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5c0-1.1.9-2 2-2h5l2 2h5c1.1 0 2 .9 2 2v2H4V5Zm0 6h16v6c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-6Zm3 2v2h10v-2H7Z" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5c5.5 0 9 5.2 9 7s-3.5 7-9 7-9-5.2-9-7 3.5-7 9-7Zm0 2c-4.1 0-6.8 3.8-7 5 .2 1.2 2.9 5 7 5s6.8-3.8 7-5c-.2-1.2-2.9-5-7-5Zm0 2.5A2.5 2.5 0 1 1 12 14.5 2.5 2.5 0 0 1 12 9.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="action-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 21c-1.1 0-2-.9-2-2V8h14v11c0 1.1-.9 2-2 2H7ZM9 4h6l1 2h4v2H4V6h4l1-2Zm0 7v7h2v-7H9Zm4 0v7h2v-7h-2Z" />
    </svg>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <section className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
