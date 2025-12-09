// src/lib/utils/users.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function findAuthUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) throw new Error(error.message);

  return data.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
}

export function generateTempPassword() {
  const base = Math.random().toString(36).slice(-10);
  return base + "Aa1!";
}

export async function createAuthUser(
  email: string,
  fullName: string
) {
  const tempPassword = generateTempPassword();

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { fullName, role: "student" },
  });

  if (error || !data?.user) {
    throw new Error(error?.message || "Failed to create auth user");
  }

  return {
    user: data.user,
    tempPassword,
  };
}

export async function findOrCreateAuthUser(
  email: string,
  fullName: string
) {
  const existing = await findAuthUserByEmail(email);

  if (existing) {
    return { user: existing, createdNew: false, tempPassword: undefined };
  }

  const { user, tempPassword } = await createAuthUser(email, fullName);

  return { user, createdNew: true, tempPassword };
}
