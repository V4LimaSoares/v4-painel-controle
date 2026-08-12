import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { getDb } from "@/db";
import {
  clientProjects,
  clients,
  commercialDailyMetrics,
  commercialMonthlyGoals,
  commercialPolicy,
  commercialRecords,
  expansions,
  roles,
  squads,
  teamMembers,
} from "@/db/schema";

type PanelCollection =
  | "roles"
  | "team"
  | "squads"
  | "clients"
  | "expansions"
  | "comercial"
  | "commercialDailyMetrics"
  | "commercialMonthlyGoals"
  | "policyConfig";

function numberString(value: unknown) {
  return String(Number(value) || 0);
}

function numberValue(value: unknown) {
  return Number(value) || 0;
}

function nullableDate(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function healthToDb(value: unknown) {
  return value === "Alerta" || value === "Perigo" ? value : "Saudavel";
}

function healthFromDb(value: unknown) {
  return value === "Saudavel" ? "SaudÃ¡vel" : String(value || "SaudÃ¡vel");
}

function projectStatusToDb(product: unknown, status: unknown) {
  if ((product === "SABER" || product === "TER") && status === "Entregue") return "Entregue";
  if (status === "Pausado") return "Pausado";
  if (status === "Inativo") return "Inativo";
  return "Ativo";
}

function collectionError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}

export async function GET() {
  try {
    const db = getDb();
    const [roleRows, teamRows, squadRows, clientRows, projectRows, expansionRows, commercialRows, dailyRows, goalRows, policyRows] =
      await Promise.all([
        db.select().from(roles).orderBy(asc(roles.nome)),
        db.select().from(teamMembers).orderBy(asc(teamMembers.nome)),
        db.select().from(squads).orderBy(asc(squads.nome)),
        db.select().from(clients).orderBy(asc(clients.nome)),
        db.select().from(clientProjects).orderBy(asc(clientProjects.nome)),
        db.select().from(expansions).orderBy(asc(expansions.createdAt)),
        db.select().from(commercialRecords).orderBy(asc(commercialRecords.createdAt)),
        db.select().from(commercialDailyMetrics).orderBy(asc(commercialDailyMetrics.date)),
        db.select().from(commercialMonthlyGoals).orderBy(asc(commercialMonthlyGoals.mes)),
        db.select().from(commercialPolicy),
      ]);

    const projectsByClient = new Map<string, typeof projectRows>();
    for (const project of projectRows) {
      const current = projectsByClient.get(project.clientId) ?? [];
      current.push(project);
      projectsByClient.set(project.clientId, current);
    }

    return NextResponse.json({
      ok: true,
      data: {
        roles: roleRows.map((item) => item.nome),
        team: teamRows.map((item) => ({
          id: item.id,
          nome: item.nome,
          funcao: item.funcao,
          fixoAcordado: numberValue(item.custoFixo),
          dataContratacao: item.dataContratacao ?? "",
          percentualProjeto: numberValue(item.percentualProjeto),
          usarMaiorEntreFixoVariavel: item.usarFixoOuVariavel,
          socio: item.socio,
          status: item.status,
        })),
        squads: squadRows.map((item) => ({
          id: item.id,
          nome: item.nome,
          coordenador: item.coordenador,
          account: item.account,
          membros: item.membros,
          status: item.status,
        })),
        clients: clientRows.map((client) => ({
          id: client.id,
          nome: client.nome,
          razaoSocial: client.razaoSocial,
          cnpj: client.cnpj,
          nomeFantasia: client.nomeFantasia,
          segmento: client.segmento,
          responsavel: client.responsavel,
          email: client.email,
          telefone: client.telefone,
          status: client.status,
          projetos: (projectsByClient.get(client.id) ?? []).map((project) => ({
            id: project.id,
            nome: project.nome,
            produto: project.produto,
            squad: project.squad,
            saude: healthFromDb(project.saude),
            engajamento: project.engajamento,
            mrr: numberValue(project.mrr),
            valorUnico: numberValue(project.valorUnico),
            dataInicio: project.dataInicio ?? "",
            mesesContrato: project.mesesContrato,
            dataRenovacao: project.dataRenovacao ?? "",
            dataEntrega: project.dataEntrega ?? "",
            status: project.status,
          })),
        })),
        expansions: expansionRows.map((item) => ({
          id: item.id,
          clienteId: item.clienteId ?? "",
          projetoId: item.projetoId ?? "",
          tipo: item.tipo,
          lider: item.lider,
          participantes: item.participantes,
          valorMRR: numberValue(item.valorMRR),
          valorUnico: numberValue(item.valorUnico),
          ltMeses: item.ltMeses,
          previsaoFechamento: item.previsaoFechamento ?? "",
          etapa: item.etapa,
          status: item.status,
          observacoes: item.observacoes,
        })),
        comercial: commercialRows.map((item) => ({
          id: item.id,
          mes: item.mes,
          lead: item.lead,
          canal: item.canal,
          bdr: item.bdr,
          closer: item.closer,
          reuniaoQualificada: item.reuniaoQualificada,
          status: item.status,
          produto: item.produto,
          primeiroMRR: numberValue(item.primeiroMRR),
          valorUnico: numberValue(item.valorUnico),
          pagamento: item.pagamento,
          primeiroPagamentoConfirmado: item.primeiroPagamentoConfirmado,
          contratoAtivado: item.contratoAtivado,
          comissaoStatus: item.comissaoStatus,
          pendenciaMotivo: item.pendenciaMotivo,
        })),
        commercialDailyMetrics: dailyRows.map((item) => ({
          id: item.id,
          date: item.date,
          mql: item.mql,
          sql: item.sql,
          sal: item.sal,
          logo: item.logo,
          dialerMinutes: item.dialerMinutes,
          followUps: item.followUps,
          observations: item.observations,
          updatedAt: item.updatedAt.toISOString(),
        })),
        commercialMonthlyGoals: goalRows.map((item) => ({
          id: item.id,
          referenceMonth: item.mes,
          ...(item.settings as Record<string, unknown>),
        })),
        policyConfig: policyRows[0]
          ? {
              bdrMaxRecurringRate: numberValue(policyRows[0].bdrMaxRecurringRate),
              bdrMaxOneTimeRate: numberValue(policyRows[0].bdrMaxOneTimeRate),
              closerMaxRecurringRate: numberValue(policyRows[0].closerMaxRecurringRate),
              closerMaxOneTimeRate: numberValue(policyRows[0].closerMaxOneTimeRate),
              bdrSaleMeetingBonus: numberValue(policyRows[0].bdrSaleMeetingBonus),
              bdrPaymentOnCallBonus: numberValue(policyRows[0].bdrPaymentOnCallBonus),
              bdrActivatedContractBonus: numberValue(policyRows[0].bdrActivatedContractBonus),
              closerPaymentOnCallBonus: numberValue(policyRows[0].closerPaymentOnCallBonus),
              closerActivatedContractBonus: numberValue(policyRows[0].closerActivatedContractBonus),
              expansionPoolRate: numberValue(policyRows[0].expansionPoolRate),
              expansionLeaderShare: numberValue(policyRows[0].expansionLeaderShare),
              expansionCoordinatorShare: numberValue(policyRows[0].expansionCoordinatorShare),
              paymentDay: policyRows[0].paymentDay,
            }
          : null,
      },
    });
  } catch (error) {
    return collectionError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { collection, data } = (await request.json()) as { collection: PanelCollection; data: unknown };
    const rows = Array.isArray(data) ? data : [];
    const db = getDb();

    await db.transaction(async (tx) => {
      if (collection === "roles") {
        await tx.delete(roles);
        if (rows.length) {
          await tx.insert(roles).values(rows.map((nome) => ({ id: `ROLE-${String(nome)}`, nome: String(nome) })));
        }
      }

      if (collection === "team") {
        await tx.delete(teamMembers);
        if (rows.length) {
          await tx.insert(teamMembers).values(
            rows.map((item) => {
              const member = item as Record<string, unknown>;
              return {
                id: String(member.id),
                nome: String(member.nome ?? ""),
                funcao: String(member.funcao ?? "Outro"),
                custoFixo: numberString(member.fixoAcordado),
                dataContratacao: nullableDate(member.dataContratacao),
                percentualProjeto: numberString(member.percentualProjeto),
                usarFixoOuVariavel: Boolean(member.usarMaiorEntreFixoVariavel),
                socio: Boolean(member.socio),
                status: member.status === "Pausado" || member.status === "Inativo" ? member.status : "Ativo",
              };
            }),
          );
        }
      }

      if (collection === "squads") {
        await tx.delete(squads);
        if (rows.length) {
          await tx.insert(squads).values(
            rows.map((item) => {
              const squad = item as Record<string, unknown>;
              return {
                id: String(squad.id),
                nome: String(squad.nome ?? ""),
                coordenador: String(squad.coordenador ?? ""),
                account: String(squad.account ?? ""),
                membros: Array.isArray(squad.membros) ? squad.membros.map(String) : [],
                status: squad.status === "Pausado" || squad.status === "Inativo" ? squad.status : "Ativo",
              };
            }),
          );
        }
      }

      if (collection === "clients") {
        await tx.delete(clients);
        const projectValues = [];
        if (rows.length) {
          await tx.insert(clients).values(
            rows.map((item) => {
              const client = item as Record<string, unknown>;
              const projects = Array.isArray(client.projetos) ? client.projetos : [];
              for (const project of projects) {
                const current = project as Record<string, unknown>;
                projectValues.push({
                  id: String(current.id),
                  clientId: String(client.id),
                  nome: String(current.nome ?? ""),
                  produto: String(current.produto ?? "EXECUTAR"),
                  squad: String(current.squad ?? ""),
                  saude: healthToDb(current.saude),
                  engajamento:
                    current.engajamento === "Engajado" || current.engajamento === "Desengajado"
                      ? current.engajamento
                      : "Neutro",
                  mrr: numberString(current.mrr),
                  valorUnico: numberString(current.valorUnico),
                  dataInicio: nullableDate(current.dataInicio),
                  mesesContrato: numberValue(current.mesesContrato) || 0,
                  dataRenovacao: nullableDate(current.dataRenovacao),
                  dataEntrega: nullableDate(current.dataEntrega),
                  status: projectStatusToDb(current.produto, current.status),
                });
              }
              return {
                id: String(client.id),
                nome: String(client.nome ?? ""),
                razaoSocial: String(client.razaoSocial ?? ""),
                cnpj: String(client.cnpj ?? ""),
                nomeFantasia: String(client.nomeFantasia ?? ""),
                segmento: String(client.segmento ?? ""),
                responsavel: String(client.responsavel ?? ""),
                email: String(client.email ?? ""),
                telefone: String(client.telefone ?? ""),
                status: client.status === "Pausado" || client.status === "Inativo" ? client.status : "Ativo",
              };
            }),
          );
          if (projectValues.length) await tx.insert(clientProjects).values(projectValues);
        }
      }

      if (collection === "expansions") {
        await tx.delete(expansions);
        if (rows.length) {
          await tx.insert(expansions).values(
            rows.map((item) => {
              const expansion = item as Record<string, unknown>;
              return {
                id: String(expansion.id),
                clienteId: String(expansion.clienteId || "") || null,
                projetoId: String(expansion.projetoId || "") || null,
                tipo: String(expansion.tipo ?? ""),
                lider: String(expansion.lider ?? ""),
                participantes: Array.isArray(expansion.participantes) ? expansion.participantes.map(String) : [],
                valorMRR: numberString(expansion.valorMRR),
                valorUnico: numberString(expansion.valorUnico),
                ltMeses: numberValue(expansion.ltMeses) || 0,
                previsaoFechamento: nullableDate(expansion.previsaoFechamento),
                etapa: String(expansion.etapa ?? ""),
                status:
                  expansion.status === "Ganha" || expansion.status === "Perdida" || expansion.status === "Pausada"
                    ? expansion.status
                    : "Aberta",
                observacoes: String(expansion.observacoes ?? ""),
              };
            }),
          );
        }
      }

      if (collection === "comercial") {
        await tx.delete(commercialRecords);
        if (rows.length) {
          await tx.insert(commercialRecords).values(
            rows.map((item) => {
              const record = item as Record<string, unknown>;
              return {
                id: String(record.id),
                mes: String(record.mes ?? ""),
                lead: String(record.lead ?? ""),
                canal: String(record.canal ?? ""),
                bdr: String(record.bdr ?? ""),
                closer: String(record.closer ?? ""),
                reuniaoQualificada: String(record.reuniaoQualificada ?? "Nao"),
                status: String(record.status ?? ""),
                produto: String(record.produto ?? ""),
                primeiroMRR: numberString(record.primeiroMRR),
                valorUnico: numberString(record.valorUnico),
                pagamento: String(record.pagamento ?? ""),
                primeiroPagamentoConfirmado: Boolean(record.primeiroPagamentoConfirmado),
                contratoAtivado: Boolean(record.contratoAtivado),
                comissaoStatus:
                  record.comissaoStatus === "Liberada" || record.comissaoStatus === "Bloqueada" ? record.comissaoStatus : "Pendente",
                pendenciaMotivo: String(record.pendenciaMotivo ?? ""),
              };
            }),
          );
        }
      }

      if (collection === "commercialDailyMetrics") {
        await tx.delete(commercialDailyMetrics);
        if (rows.length) {
          await tx.insert(commercialDailyMetrics).values(
            rows.map((item) => {
              const record = item as Record<string, unknown>;
              return {
                id: String(record.id),
                date: String(record.date),
                mql: numberValue(record.mql),
                sql: numberValue(record.sql),
                sal: numberValue(record.sal),
                logo: numberValue(record.logo),
                dialerMinutes: numberValue(record.dialerMinutes),
                followUps: numberValue(record.followUps),
                observations: String(record.observations ?? ""),
              };
            }),
          );
        }
      }

      if (collection === "commercialMonthlyGoals") {
        await tx.delete(commercialMonthlyGoals);
        if (rows.length) {
          await tx.insert(commercialMonthlyGoals).values(
            rows.map((item) => {
              const record = item as Record<string, unknown>;
              const targets = record.targets as Record<string, unknown> | undefined;
              return {
                id: String(record.id),
                mes: String(record.referenceMonth ?? ""),
                mql: numberValue(targets?.mql),
                sql: numberValue(targets?.sql),
                sal: numberValue(targets?.sal),
                logo: numberValue(targets?.logo),
                settings: record,
              };
            }),
          );
        }
      }

      if (collection === "policyConfig") {
        const policy = data as Record<string, unknown>;
        await tx.delete(commercialPolicy);
        await tx.insert(commercialPolicy).values({
          id: "default",
          bdrMaxRecurringRate: numberString(policy.bdrMaxRecurringRate),
          bdrMaxOneTimeRate: numberString(policy.bdrMaxOneTimeRate),
          closerMaxRecurringRate: numberString(policy.closerMaxRecurringRate),
          closerMaxOneTimeRate: numberString(policy.closerMaxOneTimeRate),
          bdrSaleMeetingBonus: numberString(policy.bdrSaleMeetingBonus),
          bdrPaymentOnCallBonus: numberString(policy.bdrPaymentOnCallBonus),
          bdrActivatedContractBonus: numberString(policy.bdrActivatedContractBonus),
          closerPaymentOnCallBonus: numberString(policy.closerPaymentOnCallBonus),
          closerActivatedContractBonus: numberString(policy.closerActivatedContractBonus),
          expansionPoolRate: numberString(policy.expansionPoolRate),
          expansionLeaderShare: numberString(policy.expansionLeaderShare),
          expansionCoordinatorShare: numberString(policy.expansionCoordinatorShare),
          paymentDay: numberValue(policy.paymentDay) || 10,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return collectionError(error);
  }
}
