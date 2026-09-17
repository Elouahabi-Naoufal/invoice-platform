import { execSync } from "child_process";

interface DeployConfig {
  subdomain: string;
  domain: string;
  supportKey: string;
}

export async function createTenantDeployment(config: DeployConfig): Promise<string> {
  const templateId = process.env.DOKPLOY_TEMPLATE_APPLICATION_ID;
  if (!templateId) throw new Error("DOKPLOY_TEMPLATE_APPLICATION_ID must be set");

  const appName = `invora-${config.subdomain}`;

  try {
    // Create a new application from the template
    const createCmd = `dokploy application create --name "${appName}" --appName "${appName}" --environmentId 5kWR0hvIaN2tF8RxqU_rI --serverId --sourceType github --json 2>&1`;
    const createOut = execSync(createCmd, { timeout: 30000 }).toString().trim();
    console.info(`[dokploy] create output: ${createOut}`);

    // Set domain
    execSync(`dokploy domain create --applicationId "${templateId}" --domain "${config.domain}"`, { timeout: 15000 });

    // Trigger deployment
    const deployCmd = `dokploy application deploy --applicationId "${templateId}" --title "Auto-deploy: ${config.subdomain}" --json 2>&1`;
    const deployOut = execSync(deployCmd, { timeout: 300000 }).toString().trim();
    console.info(`[dokploy] deploy output: ${deployOut}`);

    return templateId;
  } catch (e) {
    console.error(`[dokploy] failed: ${e instanceof Error ? e.message : String(e)}`);
    throw new Error(`Dokploy deployment failed for ${config.subdomain}`);
  }
}