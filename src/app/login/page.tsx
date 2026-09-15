import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const count = await prisma.user.count();
  return <LoginForm mode="login" singleUserClosed={count > 0} />;
}
