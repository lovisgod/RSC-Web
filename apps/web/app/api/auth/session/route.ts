export const dynamic = "force-dynamic";

const BACKEND_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function GET(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";

  const upstream = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
    headers: { cookie },
    credentials: "include",
  });

  if (!upstream.ok) {
    return Response.json({ error: "Unauthorized" }, { status: upstream.status });
  }

  const user = await upstream.json();
  return Response.json(user);
}
