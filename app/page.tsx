"use client";

import { useEffect, useMemo, useState } from "react";

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

type SheetConfig = {
  comercial: string;
  operacao: string;
  monetizacao: string;
  comissoes: string;
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

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
    canal: "Orgânico",
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

const configKey = "v4-dashboard-sheets";

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

export default function Home() {
  const [active, setActive] = useState("visao");
  const [month, setMonth] = useState("todos");
  const [channel, setChannel] = useState("todos");
  const [config, setConfig] = useState<SheetConfig>({
    comercial: "",
    operacao: "",
    monetizacao: "",
    comissoes: "",
  });
  const [comercial, setComercial] = useState(sampleComercial);
  const [operacao, setOperacao] = useState(sampleOperacao);
  const [monetizacao, setMonetizacao] = useState(sampleMonetizacao);
  const [comissoes, setComissoes] = useState(sampleComissoes);
  const [syncStatus, setSyncStatus] = useState("Usando dados de exemplo");

  useEffect(() => {
    const saved = localStorage.getItem(configKey);
    if (saved) setConfig(JSON.parse(saved));
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

  async function syncSheets() {
    localStorage.setItem(configKey, JSON.stringify(config));
    setSyncStatus("Sincronizando...");
    try {
      const jobs = [];
      if (config.comercial) {
        jobs.push(
          fetchCSV<Comercial>(config.comercial, (row) => ({
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
          })).then(setComercial),
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

  return (
    <main className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">V4 Lima Soares & Co</p>
          <h1>Controle comercial e operacional</h1>
        </div>
        <nav>
          {[
            ["visao", "Visao geral"],
            ["comercial", "Comercial"],
            ["operacao", "Operacao"],
            ["monetizacao", "Monetizacao"],
            ["comissoes", "Comissoes"],
            ["config", "Google Planilhas"],
          ].map(([id, label]) => (
            <button className={active === id ? "active" : ""} key={id} onClick={() => setActive(id)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="status">
          <span>Status da base</span>
          <strong>{syncStatus}</strong>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <p className="eyebrow">Painel interno</p>
            <h2>{titleFor(active)}</h2>
          </div>
          <div className="filters">
            <select value={month} onChange={(event) => setMonth(event.target.value)}>
              {months.map((item) => (
                <option key={item} value={item}>
                  {item === "todos" ? "Todos os meses" : item}
                </option>
              ))}
            </select>
            <select value={channel} onChange={(event) => setChannel(event.target.value)}>
              {channels.map((item) => (
                <option key={item} value={item}>
                  {item === "todos" ? "Todos os canais" : item}
                </option>
              ))}
            </select>
          </div>
        </header>

        {active === "visao" && (
          <>
            <section className="kpis">
              <Kpi label="MRR novo" value={currency.format(metrics.mrr)} detail={`Gap meta: ${currency.format(metrics.gapMeta)}`} tone="good" />
              <Kpi label="Conversao" value={percent.format(metrics.conversao)} detail={`${metrics.vendas} vendas / ${metrics.reunioes} reunioes`} tone="neutral" />
              <Kpi label="Valor unico" value={currency.format(metrics.valorUnico)} detail="SABER e TER pontual" tone="neutral" />
              <Kpi label="Pool operacao" value={currency.format(metrics.pool)} detail="Monetizacoes previstas" tone="good" />
              <Kpi label="Variavel prevista" value={currency.format(metrics.variavel)} detail="Comercial + operacao" tone="warning" />
              <Kpi label="Risco alto" value={String(metrics.riscoAlto)} detail="Clientes em atencao" tone="danger" />
            </section>
            <section className="split">
              <Panel title="Funil comercial">
                <MiniFunnel reunioes={metrics.reunioes} vendas={metrics.vendas} propostas={filteredComercial.filter((item) => item.status.includes("Proposta")).length} />
              </Panel>
              <Panel title="Alertas de gestao">
                <ul className="alerts">
                  {metrics.gapMeta > 0 && <li>MRR novo ainda abaixo da meta de referencia de R$ 18.000.</li>}
                  {metrics.conversao < 0.3 && <li>Conversao abaixo da faixa saudavel de 30%.</li>}
                  {metrics.riscoAlto > 0 && <li>Existem clientes com risco alto de churn na operacao.</li>}
                  {monetizacao.some((item) => item.margem === "Em análise") && <li>Ha monetizacoes aguardando validacao de margem.</li>}
                </ul>
              </Panel>
            </section>
          </>
        )}

        {active === "comercial" && (
          <DataTable
            headers={["Lead", "Canal", "BDR", "Closer", "Produto", "Status", "MRR", "Valor unico", "Pagamento"]}
            rows={filteredComercial.map((item) => [
              item.lead,
              item.canal,
              item.bdr,
              item.closer,
              item.produto,
              item.status,
              currency.format(item.primeiroMRR),
              currency.format(item.valorUnico),
              item.pagamento,
            ])}
          />
        )}

        {active === "operacao" && (
          <DataTable
            headers={["Cliente", "Produto", "Squad", "Account", "PE&G", "Status", "MRR", "Risco", "Renovacao"]}
            rows={operacao.map((item) => [
              item.cliente,
              item.produto,
              item.squad,
              item.account,
              item.peg,
              item.status,
              currency.format(item.mrr),
              item.riscoChurn,
              item.renovacao,
            ])}
          />
        )}

        {active === "monetizacao" && (
          <DataTable
            headers={["Cliente", "Tipo", "Lider", "Participantes", "MRR", "LT", "ARPU", "Pool", "Margem", "Status"]}
            rows={monetizacao.map((item) => [
              item.cliente,
              item.tipo,
              item.lider,
              item.participantes,
              currency.format(item.valorMRR),
              `${item.lt}m`,
              currency.format(item.arpu),
              currency.format(item.pool),
              item.margem,
              item.status,
            ])}
          />
        )}

        {active === "comissoes" && (
          <DataTable
            headers={["Pessoa", "Funcao", "Origem", "Base", "Percentual", "Bonus", "Total", "Status"]}
            rows={comissoes.map((item) => [
              item.pessoa,
              item.funcao,
              item.origem,
              currency.format(item.valorBase),
              percent.format(item.percentual),
              currency.format(item.bonus),
              currency.format(item.total),
              item.status,
            ])}
          />
        )}

        {active === "config" && (
          <Panel title="Conectar Google Planilhas">
            <p className="muted">
              Publique cada aba da planilha como CSV e cole os links abaixo. O painel salva os links neste navegador e atualiza os indicadores ao sincronizar.
            </p>
            <div className="config-grid">
              {([
                ["comercial", "Aba Comercial"],
                ["operacao", "Aba Operacao"],
                ["monetizacao", "Aba Monetizacao"],
                ["comissoes", "Aba Comissoes"],
              ] as const).map(([key, label]) => (
                <label key={key}>
                  <span>{label}</span>
                  <input
                    value={config[key]}
                    onChange={(event) => setConfig({ ...config, [key]: event.target.value })}
                    placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?gid=...&single=true&output=csv"
                  />
                </label>
              ))}
            </div>
            <button className="primary" onClick={syncSheets}>
              Salvar e sincronizar
            </button>
          </Panel>
        )}
      </section>
    </main>
  );
}

function titleFor(active: string) {
  const map: Record<string, string> = {
    visao: "Visao geral da unidade",
    comercial: "Controle comercial",
    operacao: "Controle operacional",
    monetizacao: "Monetizacao e renovacoes",
    comissoes: "Comissoes e variaveis",
    config: "Banco em Google Planilhas",
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
