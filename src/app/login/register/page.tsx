import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { isTenant } from "@/server/role";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (isTenant()) redirect("/login");
  const count = await prisma.user.count().catch(() => 0);
  const multiuser = process.env.ALLOW_MULTIUSER === "1";
  return <LoginForm mode="register" singleUserClosed={count > 0 && !multiuser} />;
}