import RegisterForm from "@/components/RegisterForm";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 px-4 dark:bg-[#101828]">
      <div className="w-full max-w-[420px]">
        <div className="card p-8">
          <div className="mb-4 flex items-center gap-2.5">
            <img src="/invora-mark.png" alt="" className="h-9 w-9" />
            <span className="text-xl font-semibold tracking-tight">Invora</span>
          </div>
          <h1 className="page-title mb-1">Get started</h1>
          <p className="meta mb-6">Register your business — your account will be reviewed.</p>
          <RegisterForm />
          <p className="meta mt-5 text-center">
            <a href="/login" className="font-medium text-brand-600 hover:text-brand-700">Already have an account? Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}