import { NextResponse } from "next/server";
import { createSessionToken, getPanelUserByEmail, isV4Email, normalizeEmail, sessionCookieName } from "@/app/auth";

export async function POST(request: Request) {
  const { email, password, accessCode } = (await request.json()) as { email?: string; password?: string; accessCode?: string };
  const normalizedEmail = normalizeEmail(email || "");

  if (!isV4Email(normalizedEmail)) {
    return NextResponse.json({ ok: false, error: "Use um e-mail @v4company.com para acessar." }, { status: 403 });
  }

  const expectedPassword = process.env.LOGIN_PASSWORD || process.env.LOGIN_ACCESS_KEY || "";
  if (expectedPassword && (password || accessCode) !== expectedPassword) {
    return NextResponse.json({ ok: false, error: "Senha invalida." }, { status: 401 });
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
