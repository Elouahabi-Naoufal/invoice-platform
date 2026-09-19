/**
 * Dokploy API client. Creates and deploys a tenant application.
 * Server-only. Configured via env: DOKPLOY_URL, DOKPLOY_TOKEN.
 */

interface DokployEnv {
  url: string;
  token: string;
}

function config(): DokployEnv {
  const url = process.env.DOKPLOY_URL?.replace(/\/$/, "");
  const token = process.env.DOKPLOY_TOKEN;
  if (!url || !token) throw new Error("DOKPLOY_URL and DOKPLOY_TOKEN must be set");
  return { url, token };
}

export function dokployConfigured(): boolean {
  return !!(process.env.DOKPLOY_URL && process.env.DOKPLOY_TOKEN && process.env.DOKPLOY_ENVIRONMENT_ID);
}

async function dokployPost<T = unknown>(endpoint: string, data: Record<string, unknown>): Promise<T> {
  const { url, token } = config();
  const res = await fetch(`${url}/api/trpc/${endpoint}`, {
    method: "POST",
    headers: { "x-api-key": token, "Content-Type": "application/json" },
    body: JSON.stringify({ json: data }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) {
    const msg = body?.error?.json?.message || body?.error?.message || res.statusText;
    throw new Error(`Dokploy ${endpoint}: ${msg}`);
  }
  return (body?.result?.data?.json ?? body?.result?.data) as T;
}

/** tRPC query procedures must be called with GET + ?input=. */
async function dokployGet<T = unknown>(endpoint: string, data: Record<string, unknown>): Promise<T> {
  const { url, token } = config();
  const input = encodeURIComponent(JSON.stringify({ json: data }));
  const res = await fetch(`${url}/api/trpc/${endpoint}?input=${input}`, {
    method: "GET",
    headers: { "x-api-key": token },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) {
    const msg = body?.error?.json?.message || body?.error?.message || res.statusText;
    throw new Error(`Dokploy ${endpoint}: ${msg}`);
  }
  return (body?.result?.data?.json ?? body?.result?.data) as T;
}

export interface CreateTenantAppInput {
  slug: string;
  companyName: string;
  env: Record<string, string>;
  domain: string;
  port: number;
}

export interface CreateTenantAppResult {
  applicationId: string;
  appName: string;
}

export async function createTenantApplication(input: CreateTenantAppInput): Promise<CreateTenantAppResult> {
  const environmentId = process.env.DOKPLOY_ENVIRONMENT_ID;
  if (!environmentId) throw new Error("DOKPLOY_ENVIRONMENT_ID must be set");

  const appName = `invora-${input.slug}`;
  const created = await dokployPost<{ applicationId?: string; id?: string }>("application.create", {
    name: input.companyName,
    appName,
    description: `Invora tenant: ${input.companyName}`,
    environmentId,
    ...(process.env.DOKPLOY_SERVER_ID ? { serverId: process.env.DOKPLOY_SERVER_ID } : {}),
    sourceType: "github",
  });
  const applicationId = created.applicationId ?? created.id;
  if (!applicationId) throw new Error("Dokploy did not return an application id");

  // Dokploy defaults new apps to nixpacks, which ignores our Dockerfile and its
  // ENTRYPOINT (DB init + owner bootstrap). Force the Dockerfile build.
  await dokployPost("application.saveBuildType", {
    applicationId,
    buildType: "dockerfile",
    dockerfile: "./Dockerfile",
  });

  // GitHub source (reuse the platform repo).
  const owner = process.env.DOKPLOY_GITHUB_OWNER;
  const repository = process.env.DOKPLOY_GITHUB_REPOSITORY;
  const githubId = process.env.DOKPLOY_GITHUB_ID;
  if (!owner || !repository || !githubId) {
    throw new Error("DOKPLOY_GITHUB_OWNER, DOKPLOY_GITHUB_REPOSITORY and DOKPLOY_GITHUB_ID must be set");
  }
  await dokployPost("application.saveGithubProvider", {
    applicationId,
    repository,
    owner,
    branch: process.env.DOKPLOY_GITHUB_BRANCH || "main",
    buildPath: "/",
    githubId,
    triggerType: "push",
    watchPaths: [],
    enableSubmodules: false,
  });

  // Environment variables (dotenv string).
  const envString = Object.entries(input.env).map(([k, v]) => `${k}=${v}`).join("\n");
  await dokployPost("application.saveEnvironment", {
    applicationId,
    env: envString,
    buildArgs: "{}",
    buildSecrets: "{}",
    createEnvFile: true,
  });

  // Domain.
  await dokployPost("domain.create", {
    applicationId,
    host: input.domain,
    path: "/",
    port: input.port,
    https: true,
    certificateType: "letsencrypt",
    domainType: "application",
  });

  return { applicationId, appName };
}

export async function deployApplication(applicationId: string): Promise<void> {
  await dokployPost("application.deploy", { applicationId });
}

export interface AppStatus {
  status: string;
  appName: string;
}

export async function getApplicationStatus(applicationId: string): Promise<AppStatus> {
  const app = await dokployGet<{ applicationStatus?: string; status?: string; appName?: string }>("application.one", {
    applicationId,
  });
  return { status: app.applicationStatus ?? app.status ?? "unknown", appName: app.appName ?? "" };
}

/** True only when the last deployment has finished (not mid-build). */
export async function isDeploymentSettled(applicationId: string): Promise<boolean> {
  const { status } = await getApplicationStatus(applicationId);
  return ["done", "idle"].includes(status.toLowerCase());
}

export async function deleteApplication(applicationId: string): Promise<void> {
  await dokployPost("application.delete", { applicationId });
}

export async function stopApplication(applicationId: string): Promise<void> {
  await dokployPost("application.stop", { applicationId });
}

export async function startApplication(applicationId: string): Promise<void> {
  await dokployPost("application.start", { applicationId });
}