import Link from "next/link";
import { getInvite } from "@/server/members";
import AcceptInviteForm from "@/components/AcceptInviteForm";

export default async function InvitePage({ params }: { params: { token: string } }) {
  let invite: Awaited<ReturnType<typeof getInvite>> = null;
  try {
    invite = await getInvite(params.token);
  } catch {
    invite = null;
  }

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="card p-6">
        <h1 className="page-title mb-1">Team invite</h1>
        {!invite ? (
          <>
            <p className="text-[13px] text-ink-500 dark:text-stone-400">
              This invite is invalid, already used, or revoked.
            </p>
            <Link href="/login" className="btn-outline btn-sm mt-4 inline-flex">Go to login</Link>
          </>
        ) : (
          <>
            <p className="mb-4 text-[13px] text-ink-500 dark:text-stone-400">
              You were invited to <strong className="text-ink-950 dark:text-stone-100">{invite.orgName}</strong> as{" "}
              <strong className="text-ink-950 dark:text-stone-100">{invite.role}</strong>. Create your login to continue.
            </p>
            <AcceptInviteForm token={params.token} email={invite.email} />
          </>
        )}
      </div>
    </div>
  );
}
