/**
 * Tenant domain/URL construction. Single source of truth.
 *
 * The template is env-driven so the hosting scheme can change without code edits.
 * `{slug}` is replaced with the tenant slug.
 *
 * Default uses a FIRST-LEVEL subdomain (`{slug}-invoice.example.com`) because
 * Cloudflare's free Universal SSL covers `*.example.com` (one level) but NOT
 * `*.invoice.example.com` (two levels).
 */
export function tenantDomain(slug: string): string {
  const template = process.env.TENANT_DOMAIN_TEMPLATE || "{slug}-invoice.naoufalelouahabi.com";
  return template.replaceAll("{slug}", slug);
}

export function tenantUrl(slug: string, deploymentUrl?: string | null): string {
  return deploymentUrl || `https://${tenantDomain(slug)}`;
}