import ForgotPasswordForm from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-semibold">Forgot password</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your registered email and we’ll send a reset link.
      </p>

      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
