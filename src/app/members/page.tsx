import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { safeFindMany } from "@/lib/safe";
import { MemberForm, MemberRowActions } from "@/components/MemberForm";

export default async function MembersPage() {
  let ownerId = "";
  let role = "VIEWER";
  try {
    const actor = await requireActor();
    ownerId = actor.ownerId;
    role = actor.role;
  } catch {
    redirect("/login");
  }
  const [members, payroll] = await Promise.all([
    safeFindMany(() => prisma.member.findMany({ where: { ownerId }, orderBy: { role: "desc" } }), []),
    safeFindMany(() => prisma.employee.findMany({ where: { ownerId, memberId: { not: null } }, select: { memberId: true } }), []),
  ]);
  const onPayroll = new Set(payroll.map((e) => e.memberId));
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <div>
      <div className="mb-5">
        <h1 className="page-title">Team</h1>
        <p className="meta mt-1">Invite colleagues — they create their own login from the invite link. VIEWER is read-only, ADMIN manages invoices. App access and payroll are independent; optionally link a member to a payroll record.</p>
      </div>
      {role === "VIEWER" ? (
        <div className="card mb-4 p-4 text-sm text-ink-500">You have read-only access; only owners/admins can invite members.</div>
      ) : (
        <div className="card mb-4 p-4"><h2 className="mb-2 font-semibold">Invite member</h2><MemberForm /></div>
      )}
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 px-4 py-2.5 dark:border-white/10"><span className="section-title">Members ({members.length})</span></div>
        {members.length === 0 ? <p className="p-4 text-sm text-ink-500">No members yet — you are the owner.</p> : (
          <table className="tbl">
            <thead><tr><th>Email</th><th>Role</th><th>Invited</th><th>Status</th><th>Invite link</th><th>Payroll</th><th></th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.email}</td>
                  <td><span className="badge">{m.role}</span></td>
                  <td className="tabular-nums text-ink-500">{new Date(m.invitedAt).toLocaleDateString()}</td>
                  <td>{m.revokedAt ? <span className="badge badge-amber">Revoked</span> : m.acceptedAt ? <span className="badge badge-emerald">Active</span> : <span className="badge">Invited</span>}</td>
                  <td className="text-ink-500">
                    {m.inviteToken ? (
                      <code className="rounded bg-ink-100 px-1 text-[11px] dark:bg-white/10">{`${appUrl}/invite/${m.inviteToken}`}</code>
                    ) : "—"}
                  </td>
                  <td>
                    {onPayroll.has(m.id) ? (
                      <span className="badge badge-emerald">On payroll</span>
                    ) : (
                      <Link href={`/payroll?member=${m.id}`} className="text-[12px] text-brand-600 hover:underline">Add to payroll</Link>
                    )}
                  </td>
                  <td className="text-right">{!m.revokedAt && <MemberRowActions id={m.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
