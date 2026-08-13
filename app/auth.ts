import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appUsers } from "@/db/schema";

export const sessionCookieName = "v4_panel_session";
export const allTabs = ["dashboard", "equipes", "clientes", "comercial", "expansao", "comissoes", "fechamento", "regras"] as const;
export const adminTabs = [...allTabs, "acessos"];

export type PanelUser = {
  email: string;
  nome: string;
  allowedTabs: string[];
  isAdmin: boolean;
};

function authSecret() {
  return process.env.AUTH_SECRET || process.env.LOGIN_ACCESS_KEY || "v4-panel-dev-secret";
}

function adminEmails() {
  return new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((email) => normalizeEmail(email))
      .filter(Boolean),
  );
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isV4Email(email: string) {
  return normalizeEmail(email).endsWith("@v4company.com");
}

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string) {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

export function createSessionToken(email: string) {
  const payload = base64Url(JSON.stringify({ email: normalizeEmail(email), createdAt: Date.now() }));
  return `${payload}.${signPayload(payload)}`;
}

export function verifySessionToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = signPayload(payload);
  const currentBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (currentBuffer.length !== expectedBuffer.length || !timingSafeEqual(currentBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { email?: string; createdAt?: number };
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    if (!parsed.email || !parsed.createdAt || Date.now() - parsed.createdAt > maxAgeMs) return null;
    return normalizeEmail(parsed.email);
  } catch {
    return null;
  }
}

export function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : "";
}

export async function getPanelUserByEmail(email: string): Promise<PanelUser | null> {
  const normalized = normalizeEmail(email);
  if (!isV4Email(normalized)) return null;

  const db = getDb();
  const [user] = await db.select().from(appUsers).where(eq(appUsers.email, normalized)).limit(1);
  const isEnvAdmin = adminEmails().has(normalized);

  if (user?.status === "Inativo" && !isEnvAdmin) return null;
  if (isEnvAdmin || user?.isAdmin) {
    return {
      email: normalized,
      nome: user?.nome || normalized,
      allowedTabs: adminTabs,
      isAdmin: true,
    };
  }

  return {
    email: normalized,
    nome: user?.nome || normalized,
    allowedTabs: user?.allowedTabs || [],
    isAdmin: false,
  };
}

export async function getPanelUserFromRequest(request: Request) {
  const token = readCookie(request, sessionCookieName);
  const email = token ? verifySessionToken(token) : null;
  return email ? getPanelUserByEmail(email) : null;
}

export function hasTabAccess(user: PanelUser, tab: string) {
  return user.isAdmin || user.allowedTabs.includes(tab);
}

export function tabForCollection(collection: string) {
  const map: Record<string, string> = {
    roles: "equipes",
    team: "equipes",
    squads: "equipes",
    clients: "clientes",
    expansions: "expansao",
    comercial: "comercial",
    commercialDailyMetrics: "comercial",
    commercialMonthlyGoals: "comercial",
    policyConfig: "regras",
  };
  return map[collection] || "";
}
