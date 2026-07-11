"use client";

import Link from "next/link";
import {
  useActionState,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import { Input } from "@/components/shared/Input";
import { Button } from "@/components/ui/button";
import {
  loginAction,
  type LoginResult,
} from "./actions";

const initialState: LoginResult = {
  success: false,
  error: "",
};

const EXPIRED_LINK_ERRORS = new Set([
  "invalid_link",
  "otp_expired",
  "invite_invalid_or_expired",
  "link_invalid_or_expired",
]);

interface AccountNotice {
  title: string;
  description: string;
}

function subscribeToHashChange(
  callback: () => void,
): () => void {
  window.addEventListener("hashchange", callback);

  return () => {
    window.removeEventListener(
      "hashchange",
      callback,
    );
  };
}

function getHashErrorCode(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const hash = window.location.hash;
  const rawHash = hash.startsWith("#")
    ? hash.slice(1)
    : hash;

  const params = new URLSearchParams(rawHash);

  return (
    params.get("error_code") ?? ""
  ).trim();
}

function getServerHashErrorCode(): string {
  return "";
}

function getAccountNotice(
  errorCode: string,
): AccountNotice | null {
  switch (errorCode) {
    case "student_suspended":
      return {
        title: "Student account suspended",
        description:
          "Your account has been suspended. Contact the administration for assistance.",
      };

    case "student_dismissed":
      return {
        title: "Student account dismissed",
        description:
          "Your student account can no longer access the system. Contact the administration.",
      };

    case "student_withdrawn":
      return {
        title: "Student account withdrawn",
        description:
          "Your student record is marked as withdrawn. Contact the administration.",
      };

    case "student_graduated":
      return {
        title: "Graduate access unavailable",
        description:
          "Access for graduated students is not currently available.",
      };

    case "student_record_missing":
      return {
        title: "Student record not found",
        description:
          "Your login account is not linked to a student record. Contact the administration.",
      };

    case "student_inactive":
      return {
        title: "Student account inactive",
        description:
          "Your student account is not active. Contact the administration.",
      };

    case "staff_suspended":
      return {
        title: "Staff account suspended",
        description:
          "Your account has been suspended. Contact the administration for assistance.",
      };

    case "staff_resigned":
      return {
        title: "Staff account resigned",
        description:
          "This account is marked as resigned and can no longer access the system.",
      };

    case "staff_terminated":
      return {
        title: "Staff account terminated",
        description:
          "This account has been terminated and can no longer access the system.",
      };

    case "staff_retired":
      return {
        title: "Staff account retired",
        description:
          "This account is marked as retired and can no longer access the system.",
      };

    case "staff_record_missing":
      return {
        title: "Staff record not found",
        description:
          "Your login account is not linked to a staff record. Contact the administration.",
      };

    case "staff_inactive":
      return {
        title: "Staff account inactive",
        description:
          "Your staff account is not active. Contact the administration.",
      };

    case "account_invalid":
      return {
        title: "Account unavailable",
        description:
          "Your account profile could not be verified. Contact the administration.",
      };

    default:
      return null;
  }
}

export default function LoginClient() {
  const searchParams = useSearchParams();

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [capsOn, setCapsOn] = useState(false);

  const [
    state,
    formAction,
    isPending,
  ] = useActionState(
    loginAction,
    initialState,
  );

  const errorMessage =
    state?.error?.trim() ?? "";

  const urlError = (
    searchParams.get("error") ?? ""
  ).trim();

  const hashErrorCode = useSyncExternalStore(
    subscribeToHashChange,
    getHashErrorCode,
    getServerHashErrorCode,
  );

  const isExpired =
    EXPIRED_LINK_ERRORS.has(urlError) ||
    hashErrorCode === "otp_expired";

  const accountNotice =
    getAccountNotice(urlError);

  const passwordSuccessMessage =
    searchParams.get("set") === "success"
      ? "Your password has been set successfully. You can now sign in."
      : searchParams.get("reset") === "success"
        ? "Your password has been reset successfully. You can now sign in."
        : "";

  const [
    resendEmail,
    setResendEmail,
  ] = useState(() =>
    (
      searchParams.get("email") ?? ""
    ).trim(),
  );

  const [
    resendLoading,
    setResendLoading,
  ] = useState(false);

  const [
    resendSubmitted,
    setResendSubmitted,
  ] = useState(false);

  const [
    resendError,
    setResendError,
  ] = useState("");

  async function resendInvite() {
    const email =
      resendEmail.trim().toLowerCase();

    if (!email) {
      return;
    }

    setResendLoading(true);
    setResendSubmitted(false);
    setResendError("");

    try {
      const response = await fetch(
        "/api/auth/resend-invite",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        },
      );

      const json = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        setResendError(
          json &&
            typeof json.error === "string"
            ? json.error
            : "Failed to resend setup link.",
        );

        return;
      }

      setResendSubmitted(true);
      setResendEmail("");
    } catch (error) {
      console.error(
        "[RESEND_INVITE_ERROR]",
        error,
      );

      setResendError(
        "Unable to send the setup link. Please try again.",
      );
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-xl shadow-slate-100/60">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary-600 via-primary-500 to-secondary-500" />

        <div className="border-b border-slate-100 bg-linear-to-r from-slate-50 to-white p-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign in
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Access your dashboard securely
          </p>
        </div>

        <form
          action={formAction}
          className="space-y-5 p-6 sm:p-8"
        >
          {passwordSuccessMessage && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-semibold text-green-800">
                Password updated
              </p>

              <p className="mt-0.5 text-xs text-green-700">
                {passwordSuccessMessage}
              </p>
            </div>
          )}

          {accountNotice && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">
                {accountNotice.title}
              </p>

              <p className="mt-0.5 text-xs text-red-700/80">
                {accountNotice.description}
              </p>
            </div>
          )}

          {isExpired && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-900">
                Your setup link is invalid or has
                expired.
              </p>

              <p className="mt-0.5 text-xs text-amber-900/80">
                If you have already set your password,
                sign in below. Otherwise, enter your
                email to receive a fresh setup link.
              </p>

              <div className="mt-3 space-y-2">
                <Input
                  label="Email"
                  type="email"
                  value={resendEmail}
                  onChange={(event) => {
                    setResendEmail(
                      event.currentTarget.value,
                    );

                    if (resendError) {
                      setResendError("");
                    }
                  }}
                  disabled={
                    resendLoading || isPending
                  }
                  required
                  trailingIcon={
                    <Mail className="h-4 w-4" />
                  }
                />

                <Button
                  type="button"
                  onClick={() =>
                    void resendInvite()
                  }
                  disabled={
                    resendLoading ||
                    isPending ||
                    !resendEmail.trim()
                  }
                  className={[
                    "w-full rounded-xl px-5 py-6 text-sm font-semibold text-white",
                    "bg-linear-to-r from-primary-600 via-primary-600 to-secondary-500",
                    "shadow-lg shadow-primary-500/20",
                    "hover:shadow-xl hover:shadow-primary-500/30",
                    "active:scale-[0.99]",
                    "disabled:pointer-events-none disabled:opacity-60",
                  ].join(" ")}
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Resend setup link"
                  )}
                </Button>

                {resendSubmitted && (
                  <p className="text-xs text-amber-900/80">
                    If an account exists for that email
                    and onboarding is still pending, a
                    fresh setup link has been sent.
                  </p>
                )}

                {resendError && (
                  <p className="text-xs font-medium text-red-700">
                    {resendError}
                  </p>
                )}
              </div>
            </div>
          )}

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
            trailingIcon={
              <Mail className="h-4 w-4" />
            }
            disabled={isPending}
          />

          <div className="space-y-2">
            <Input
              label="Password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={isPending}
              onKeyUp={(event) => {
                if (
                  typeof event.getModifierState ===
                  "function"
                ) {
                  setCapsOn(
                    event.getModifierState(
                      "CapsLock",
                    ),
                  );
                }
              }}
              onBlur={() => setCapsOn(false)}
              trailingIcon={
                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current,
                    )
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={isPending}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              }
            />

            <div className="flex items-center justify-between">
              {capsOn ? (
                <p className="text-xs font-medium text-amber-700">
                  Caps Lock is on
                </p>
              ) : (
                <span />
              )}

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-primary-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">
                {errorMessage}
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className={[
              "w-full rounded-xl px-5 py-6 text-sm font-semibold text-white",
              "bg-linear-to-r from-primary-600 via-primary-600 to-secondary-500",
              "shadow-lg shadow-primary-500/20",
              "hover:shadow-xl hover:shadow-primary-500/30",
              "active:scale-[0.99]",
              "disabled:pointer-events-none disabled:opacity-60",
            ].join(" ")}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                Sign in
              </>
            )}
          </Button>

          <div className="pt-1 text-center">
            <span className="text-xs text-slate-500">
              Having trouble? Contact your
              administrator
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}