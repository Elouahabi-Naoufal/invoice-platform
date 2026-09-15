import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { MemberForm, MemberRowActions } from "@/components/MemberForm";

export default async function MembersPage() {
  try { await requireUser(); } catch { redirect("/login"); }
  const u = await prisma.user.findFirst({ where: { email: (await requireUser()).email } as never });
  if (!u) redirect("/login");
  const members = await prisma.member.findMany({ where: { ownerId: u.id }, orderBy: { role: "desc" } });
  return (
    <div>
      <div className="mb-5"><h1 className="page-title">Team</h1><p className="meta mt-1">Invite colleagues — email and role are yours to set. VIEWER reads, ADMIN manages; owner is you.</p></div>
      <div className="card mb-4 p-4"><h2 className="font-semibold mb-2">Invite member</h2><MemberForm onDone={() => {}} /></div>
      <div className="card overflow-hidden">
        <div className="border-b border-ink-200 dark:border-white/10 px-4 py-2.5"><span className="section-title">Members ({members.length})</span></div>
        {members.length === 0 ? <p className="p-4 text-sm text-ink-500">No members yet — you are the owner.</p> : (
          <table className="tbl">
            <thead><tr><th>Email</th><th>Role</th><th>Invited</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}><td className="font-medium">{m.email}</td><td><span className="badge">{m.role}</span></td><td className="tabular-nums text-ink-500">{new Date(m.invitedAt).toLocaleDateString()}</td><td>{m.revokedAt ? <span className="badge badge-amber">Revoked</span> : m.acceptedAt ? <span className="badge badge-emerald">Active</span> : <span className="badge">Invited</span>}</td><td className="text-right">{!m.revokedAt && <MemberRowActions id={m.id} />}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
