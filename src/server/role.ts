/**
 * Application role. One codebase, deployed as different roles:
 *
 *   full   (default) — everything (legacy single-instance mode)
 *   hub              — admin console + public register/sign-in (one container)
 *   admin            — admin console + hub API only
 *   router           — public register + sign-in lookup + landing only
 *   tenant           — the pure invoicing app (no admin, no register)
 *
 * Set with the APP_ROLE environment variable.
 */
export type AppRole = "full" | "hub" | "admin" | "router" | "tenant";

export function appRole(): AppRole {
  const r = process.env.APP_ROLE?.trim().toLowerCase();
  return r === "hub" || r === "admin" || r === "router" || r === "tenant" ? r : "full";
}

export const isTenant = () => appRole() === "tenant";
export const isAdmin = () => appRole() === "admin";
export const isRouter = () => appRole() === "router";
export const isHub = () => appRole() === "hub";
export const isFull = () => appRole() === "full";

/** True when the admin console should be reachable on this deployment. */
export const adminEnabled = () => {
  const r = appRole();
  return r === "full" || r === "admin" || r === "hub";
};

/** True when public registration / sign-in routing should be reachable. */
export const routerEnabled = () => {
  const r = appRole();
  return r === "full" || r === "router" || r === "hub";
};

/** True when the invoicing app should be reachable. */
export const tenantAppEnabled = () => {
  const r = appRole();
  return r === "full" || r === "tenant";
};

/** True when this deployment presents the "find your workspace" sign-in. */
export const lookupSignIn = () => {
  const r = appRole();
  return r === "router" || r === "hub";
};