import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (process.env.APP_MODE === "hub") redirect("/register");
  const count = await prisma.user.count().catch(() => 0);
  const multiuser = process.env.ALLOW_MULTIUSER === "1";
  return <LoginForm mode="register" singleUserClosed={count > 0 && !multiuser} />;
}
