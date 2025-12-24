import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ResendEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
};

async function sendViaResend(to: string, inviteLink: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing RESEND_FROM");

  const payload: ResendEmailPayload = {
    from,
    to: [to],
    subject: "Complete your account setup",
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;color:#111">
        <h2 style="margin:0 0 12px">Set up your account</h2>
        <p style="margin:0 0 16px">
          Click below to set your password and complete setup.
        </p>
        <p style="margin:0 0 24px">
          <a href="${inviteLink}" style="display:inline-block;background:#111;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:600">
            Set password
          </a>
        </p>
      </div>
    `,
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend send failed: ${res.status} ${text}`);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const redirectTo = "https://www.sykhealthtech.com.ng/api/auth/confirm?next=/set-password";


    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email,
      options: { redirectTo },
    });

    const inviteLink = !linkErr ? linkData?.properties?.action_link ?? null : null;

    if (!inviteLink) {
      return NextResponse.json(
        { error: linkErr?.message ?? "Failed to generate invite link" },
        { status: 400 }
      );
    }

    await sendViaResend(email, inviteLink);

    return NextResponse.json({ success: true, inviteEmailSent: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
