import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getPanelUserFromRequest, hasTabAccess, normalizeEmail } from "@/app/auth";
import { getDb } from "@/db";
import { appUsers } from "@/db/schema";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
}

async function requireAccessAdmin(request: Request) {
  const user = await getPanelUserFromRequest(request);
  return user && hasTabAccess(user, "acessos") ? user : null;
}

export async function GET(request: Request) {
  const user = await requireAccessAdmin(request);
  if (!user) return unauthorized();
  const db = getDb();
  const rows = await db.select().from(appUsers);
  return NextResponse.json({
    ok: true,
    data: rows
      .map((row) => ({
        id: row.id,
        email: row.email,
        nome: row.nome,
        allowedTabs: row.allowedTabs,
        isAdmin: row.isAdmin,
        status: row.status,
      }))
      .sort((a, b) => a.email.localeCompare(b.email)),
  });
}

export async function POST(request: Request) {
  const user = await requireAccessAdmin(request);
  if (!user) return unauthorized();

  const body = (await request.json()) as {
    id?: string;
    email?: string;
    nome?: string;
    allowedTabs?: string[];
    isAdmin?: boolean;
    status?: string;
  };
  const email = normalizeEmail(body.email || "");
  if (!email.endsWith("@v4company.com")) {
    return NextResponse.json({ ok: false, error: "O e-mail precisa ser @v4company.com." }, { status: 400 });
  }

  const db = getDb();
  const values = {
    id: body.id || `USR-${Date.now()}`,
    email,
    nome: body.nome || "",
    allowedTabs: Array.isArray(body.allowedTabs) ? body.allowedTabs : [],
    isAdmin: Boolean(body.isAdmin),
    status: body.status === "Inativo" ? "Inativo" : "Ativo",
    updatedAt: new Date(),
  };

  await db
    .insert(appUsers)
    .values(values)
    .onConflictDoUpdate({
      target: appUsers.email,
      set: {
        nome: values.nome,
        allowedTabs: values.allowedTabs,
        isAdmin: values.isAdmin,
        status: values.status,
        updatedAt: values.updatedAt,
      },
    });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireAccessAdmin(request);
  if (!user) return unauthorized();
  const email = normalizeEmail(new URL(request.url).searchParams.get("email") || "");
  if (!email) return NextResponse.json({ ok: false, error: "E-mail obrigatorio." }, { status: 400 });
  const db = getDb();
  await db.delete(appUsers).where(eq(appUsers.email, email));
  return NextResponse.json({ ok: true });
}
