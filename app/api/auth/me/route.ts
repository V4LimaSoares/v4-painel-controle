import { NextResponse } from "next/server";
import { getPanelUserFromRequest } from "@/app/auth";

export async function GET(request: Request) {
  const user = await getPanelUserFromRequest(request);
  if (!user) return NextResponse.json({ ok: false, error: "Nao autenticado." }, { status: 401 });
  return NextResponse.json({ ok: true, user });
}
