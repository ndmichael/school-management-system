// src/lib/utils/profiles.ts
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function findProfileById(id: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data;
}

export async function createProfile(
  authUserId: string,
  app: any // your application row
) {
  const { error } = await supabaseAdmin.from("profiles").insert({
    id: authUserId,
    main_role: "student",
    first_name: app.first_name,
    middle_name: app.middle_name ?? null,
    last_name: app.last_name,
    email: app.email,
    phone: app.phone ?? null,
    gender: app.gender ?? null,
    date_of_birth: app.date_of_birth ?? null,
    religion: null,
    nin: null,
    address: null,
    state_of_origin: null,
    lga_of_origin: null,
  });

  if (error) {
    throw new Error(error.message || "Failed to create profile");
  }
}

export async function ensureProfileExists(
  authUserId: string,
  application: any
) {
  const profile = await findProfileById(authUserId);

  if (!profile) {
    await createProfile(authUserId, application);
    return { created: true };
  }

  return { created: false };
}
