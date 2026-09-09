import LoginForm from "@/components/LoginForm";
import { prisma } from "@/lib/prisma";

export default async function LoginPage() {
  const count = await prisma.user.count();
  return <LoginForm mode="login" singleUserClosed={count > 0} />;
}
