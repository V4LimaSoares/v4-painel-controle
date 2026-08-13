import { NextResponse } from "next/server";
import { createSessionToken, getPanelUserByEmail, isV4Email, normalizeEmail, sessionCookieName } from "@/app/auth";

export async function POST(request: Request) {
  const { email, accessCode } = (await request.json()) as { email?: string; accessCode?: string };
  const normalizedEmail = normalizeEmail(email || "");

  if (!isV4Email(normalizedEmail)) {
    return NextResponse.json({ ok: false, error: "Use um e-mail @v4company.com para acessar." }, { status: 403 });
  }

  const expectedCode = process.env.LOGIN_ACCESS_KEY || "";
  if (expectedCode && accessCode !== expectedCode) {
    return NextResponse.json({ ok: false, error: "Codigo de acesso invalido." }, { status: 401 });
  }

  const user = await getPanelUserByEmail(normalizedEmail);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Usuario inativo ou nao autorizado." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set(sessionCookieName, createSessionToken(normalizedEmail), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
