import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const count = await prisma.user.count();
  return <LoginForm mode="register" singleUserClosed={count > 0} />;
}
