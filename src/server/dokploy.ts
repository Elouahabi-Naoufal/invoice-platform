interface DeployConfig {
  subdomain: string;
  domain: string;
  supportKey: string;
}

export async function createTenantDeployment(config: DeployConfig): Promise<string> {
  const url = process.env.DOKPLOY_URL;
  const token = process.env.DOKPLOY_TOKEN;
  if (!url || !token) throw new Error("DOKPLOY_URL and DOKPLOY_TOKEN must be set");

  // The Dokploy API for creating deployments from a template/project.
  // We clone the existing project configuration with new env vars.
  const projectId = process.env.DOKPLOY_TEMPLATE_PROJECT_ID;
  if (!projectId) throw new Error("DOKPLOY_TEMPLATE_PROJECT_ID must be set");

  const res = await fetch(`${url}/trpc/deployment.create`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId,
      domain: config.domain,
      env: [
        { key: "APP_MODE", value: "tenant" },
        { key: "DATABASE_URL", value: `file:./data/tenant.db` },
        { key: "SUPPORT_KEY", value: config.supportKey },
        { key: "NEXT_PUBLIC_APP_URL", value: `https://${config.domain}` },
        { key: "TZ", value: "Africa/Casablanca" },
      ],
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Dokploy error: ${body?.error?.message || res.statusText}`);
  return body?.result?.id || "deployed";
}