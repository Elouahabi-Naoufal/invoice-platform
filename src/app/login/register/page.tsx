import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const count = await prisma.user.count();
  const multiuser = process.env.ALLOW_MULTIUSER === "1";
  return <LoginForm mode="register" singleUserClosed={count > 0 && !multiuser} />;
}
