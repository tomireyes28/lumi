import { NextRequest, NextResponse } from "next/server";
import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const COOKIE = "lumi_session";
const roots = new Set([
  "auth",
  "transactions",
  "categories",
  "credit-cards",
  "reminders",
  "budgets",
  "analytics",
]);
type Context = { params: Promise<{ path: string[] }> };
function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function publicUser(value: unknown) {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) ||
    !("email" in value) ||
    !("name" in value) ||
    typeof value.id !== "string" ||
    typeof value.email !== "string" ||
    typeof value.name !== "string"
  )
    return null;
  return {
    id: value.id,
    email: value.email,
    name: value.name,
    picture:
      "picture" in value && typeof value.picture === "string"
        ? value.picture
        : null,
  };
}
async function handle(
  req: NextRequest,
  context: Context,
): Promise<NextResponse> {
  const { path } = await context.params;
  if (!roots.has(path[0]) || path.some((p) => !/^[a-zA-Z0-9_-]+$/.test(p)))
    return json({ message: "Ruta inválida" }, 404);
  const endpoint = path.join("/");
  const auth = ["auth/login", "auth/register", "auth/exchange"].includes(
    endpoint,
  );
  if (
    path[0] === "auth" &&
    !auth &&
    !["auth/me", "auth/logout"].includes(endpoint)
  )
    return json({ message: "Ruta inválida" }, 404);
  if (auth && req.method !== "POST")
    return json({ message: "Método inválido" }, 405);
  if (
    !["GET", "HEAD"].includes(req.method) &&
    req.headers.get("origin") !== req.nextUrl.origin
  )
    return json({ message: "Origen inválido" }, 403);
  const token = req.cookies.get(COOKIE)?.value;
  if (!auth && !token)
    return json({ message: "Iniciá sesión nuevamente" }, 401);
  const base =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production" ? null : "http://localhost:3000");
  if (!base) return json({ message: "Servicio no configurado" }, 503);
  try {
    const headers = new Headers({ Accept: "application/json" });
    if (token && !auth) headers.set("Authorization", `Bearer ${token}`);
    const body = ["GET", "HEAD"].includes(req.method)
      ? undefined
      : await req.text();
    if (body && Buffer.byteLength(body) > 100000)
      return json({ message: "Solicitud demasiado grande" }, 413);
    if (body) headers.set("Content-Type", "application/json");
    const secret = process.env.LUMI_PROXY_SECRET;
    if (!secret || secret.length < 32)
      return json({ message: "Servicio no configurado" }, 503);
    const ip =
      process.env.VERCEL === "1"
        ? req.headers.get("x-forwarded-for")?.split(",")[0].trim()
        : "127.0.0.1";
    if (!ip || !isIP(ip))
      return json(
        { message: "No se pudo validar el origen de la petición" },
        503,
      );
    const time = String(Date.now());
    const digest = createHash("sha256")
      .update(body ?? "")
      .digest("hex");
    const signature = createHmac("sha256", secret)
      .update(
        [
          time,
          ip,
          req.method,
          `/${endpoint}${req.nextUrl.search}`,
          digest,
        ].join("\n"),
      )
      .digest("hex");
    headers.set("x-lumi-client-ip", ip);
    headers.set("x-lumi-proxy-time", time);
    headers.set("x-lumi-proxy-signature", signature);
    const upstream = await fetch(
      `${base.replace(/\/$/, "")}/${endpoint}${req.nextUrl.search}`,
      {
        method: req.method,
        headers,
        body,
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    if (upstream.status >= 300 && upstream.status < 400)
      return json({ message: "Respuesta inesperada" }, 502);
    const payload: unknown =
      upstream.status === 204 ? null : await upstream.json();
    let response: NextResponse;
    if (auth && upstream.ok) {
      if (
        !payload ||
        typeof payload !== "object" ||
        !("token" in payload) ||
        typeof payload.token !== "string" ||
        !("user" in payload)
      )
        return json({ message: "Respuesta de acceso inválida" }, 502);
      const user = publicUser(payload.user);
      if (!user) return json({ message: "Perfil inválido" }, 502);
      response = json({ user }, upstream.status);
      response.cookies.set(COOKIE, payload.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 604800,
      });
    } else if (endpoint === "auth/me" && upstream.ok) {
      const user = publicUser(payload);
      if (!user) return json({ message: "Perfil inválido" }, 502);
      response = json(user);
    } else
      response =
        upstream.status === 204
          ? new NextResponse(null, {
              status: 204,
              headers: { "Cache-Control": "no-store" },
            })
          : json(payload, upstream.status);
    if (upstream.status === 401 || (endpoint === "auth/logout" && upstream.ok))
      response.cookies.set(COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    response.cookies.set("lumi_token", "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    return json(
      { message: "No se pudo comunicar con el servidor. Reintentá." },
      503,
    );
  }
}
export {
  handle as GET,
  handle as POST,
  handle as PATCH,
  handle as DELETE,
  handle as PUT,
};
