import { parseArgs } from "node:util";

interface Envelope<T> {
  data: T;
  message: string;
  status: number;
}

interface LoginResult {
  user: {
    id: string;
    role: string;
  };
}

interface BackupRunResult {
  sent: true;
  fileName: string;
  fileSizeBytes: number;
  recipientEmail: string;
  completedAt: string;
}

function readInput() {
  const { values } = parseArgs({
    options: {
      apiBaseUrl: { type: "string" },
      email: { type: "string" },
      password: { type: "string" },
    },
  });
  const apiBaseUrl = (
    values.apiBaseUrl ??
    process.env.API_BASE_URL ??
    process.env.RSC_API_BASE_URL ??
    "http://localhost:4000/api/v1"
  ).replace(/\/$/, "");
  const email = (values.email ?? process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  const password = values.password ?? process.env.OWNER_PASSWORD ?? "";

  if (!email) {
    throw new Error("OWNER_EMAIL is required");
  }
  if (!password) {
    throw new Error("OWNER_PASSWORD is required");
  }

  return { apiBaseUrl, email, password };
}

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

function cookieHeader(headers: Headers): string {
  const headersWithCookies = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = headersWithCookies.getSetCookie?.() ?? [];
  const fallback = headers.get("set-cookie");
  const cookies = setCookies.length > 0 ? setCookies : fallback ? [fallback] : [];

  return cookies
    .map((cookie) => cookie.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function main(): Promise<void> {
  const { apiBaseUrl, email, password } = readInput();
  const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginPayload = await readJson<Envelope<LoginResult>>(loginResponse);

  if (!loginResponse.ok || loginPayload.data?.user?.role !== "OWNER") {
    throw new Error(
      `Owner login failed: ${loginPayload.message ?? loginResponse.statusText} (${loginResponse.status})`,
    );
  }

  const cookies = cookieHeader(loginResponse.headers);
  if (!cookies) {
    throw new Error("Owner login did not return auth cookies");
  }

  const backupResponse = await fetch(`${apiBaseUrl}/system/backups/run`, {
    method: "POST",
    headers: {
      accept: "application/json",
      cookie: cookies,
    },
  });
  const backupPayload = await readJson<Envelope<BackupRunResult>>(backupResponse);

  if (!backupResponse.ok || !backupPayload.data?.sent) {
    throw new Error(
      `Manual backup failed: ${backupPayload.message ?? backupResponse.statusText} (${backupResponse.status})`,
    );
  }

  console.table([
    {
      sent: backupPayload.data.sent,
      recipientEmail: backupPayload.data.recipientEmail,
      fileName: backupPayload.data.fileName,
      fileSizeBytes: backupPayload.data.fileSizeBytes,
      completedAt: backupPayload.data.completedAt,
    },
  ]);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
