const CF_API = "https://api.cloudflare.com/client/v4";

function cfHeaders() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN not set");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function createDnsRecord(subdomain: string, target: string) {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!zoneId) throw new Error("CLOUDFLARE_ZONE_ID not set");
  const name = `${subdomain}.${process.env.CLOUDFLARE_DOMAIN || "invora.app"}`;
  const res = await fetch(`${CF_API}/zones/${zoneId}/dns_records`, {
    method: "POST",
    headers: cfHeaders(),
    body: JSON.stringify({ type: "CNAME", name, content: target, ttl: 120, proxied: true }),
  });
  const body = await res.json();
  if (!body.success) throw new Error(`Cloudflare DNS error: ${body.errors?.[0]?.message || JSON.stringify(body.errors)}`);
  return body.result;
}