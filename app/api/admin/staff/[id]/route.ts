import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Json = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function strTrim(v: unknown): string | null {
  const s = str(v);
  if (!s) return null;
  const t = s.trim();
  return t ? t : null;
}

function isoNow(): string {
  return new Date().toISOString();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFileRef(v: unknown): v is { bucket: string; path: string } {
  return (
    isRecord(v) &&
    typeof v.bucket === "string" &&
    v.bucket.trim().length > 0 &&
    typeof v.path === "string" &&
    v.path.trim().length > 0
  );
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { data, error } = await supabaseAdmin
    .from("staff")
    .select(
      `
        *,
        profiles:profile_id(*),
        departments(*),
        staff_documents(*)
      `
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  return NextResponse.json({ staff: data });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await context.params;

  const body = (await req.json()) as Json;

  const { data: staffRow, error: staffLoadErr } = await supabaseAdmin
    .from("staff")
    .select("id, profile_id")
    .eq("id", staffId)
    .single();

  if (staffLoadErr) {
    return NextResponse.json({ error: staffLoadErr.message }, { status: 400 });
  }
  if (!staffRow) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const profileId = staffRow.profile_id as string;

  const profileBody = isRecord(body.profiles) ? body.profiles : body;
  const profileUpdate: Record<string, unknown> = {};

  const first_name = strTrim(profileBody.first_name ?? profileBody.firstName);
  const middle_name = strTrim(profileBody.middle_name ?? profileBody.middleName);
  const last_name = strTrim(profileBody.last_name ?? profileBody.lastName);
  const email = strTrim(profileBody.email)?.toLowerCase();
  const phone = strTrim(profileBody.phone);
  const gender = strTrim(profileBody.gender);
  const date_of_birth = strTrim(
    profileBody.date_of_birth ?? profileBody.dateOfBirth
  );
  const nin = strTrim(profileBody.nin);
  const address = strTrim(profileBody.address);
  const state_of_origin = strTrim(
    profileBody.state_of_origin ?? profileBody.stateOfOrigin
  );
  const lga_of_origin = strTrim(
    profileBody.lga_of_origin ?? profileBody.lgaOfOrigin
  );
  const religion = strTrim(profileBody.religion);
  const main_role = strTrim(profileBody.main_role ?? profileBody.mainRole);

  if (first_name !== null) profileUpdate.first_name = first_name;
  if (middle_name !== null) profileUpdate.middle_name = middle_name;
  if (last_name !== null) profileUpdate.last_name = last_name;
  if (email !== null) profileUpdate.email = email;
  if (phone !== null) profileUpdate.phone = phone;
  if (gender !== null) profileUpdate.gender = gender;
  if (date_of_birth !== null) profileUpdate.date_of_birth = date_of_birth;
  if (nin !== null) profileUpdate.nin = nin;
  if (address !== null) profileUpdate.address = address;
  if (state_of_origin !== null) profileUpdate.state_of_origin = state_of_origin;
  if (lga_of_origin !== null) profileUpdate.lga_of_origin = lga_of_origin;
  if (religion !== null) profileUpdate.religion = religion;
  if (main_role !== null) profileUpdate.main_role = main_role;

  if (
    profileBody.avatar_file !== undefined ||
    profileBody.avatarFile !== undefined
  ) {
    const avatar = profileBody.avatar_file ?? profileBody.avatarFile;

    if (avatar === null) {
      profileUpdate.avatar_file = null;
    } else if (isFileRef(avatar)) {
      profileUpdate.avatar_file = avatar;
    } else {
      return NextResponse.json(
        { error: "avatar_file must be a valid file ref with bucket and path" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(profileUpdate).length > 0) {
    profileUpdate.updated_at = isoNow();

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", profileId);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }
  }

  const staffUpdate: Record<string, unknown> = {};

  const designation = strTrim(body.designation);
  const specialization = strTrim(body.specialization);
  const department_id = strTrim(body.department_id ?? body.departmentId);
  const hire_date = strTrim(body.hire_date ?? body.hireDate);
  const status = strTrim(body.status);
  const bank_name = strTrim(body.bank_name ?? body.bankName);
  const account_number = strTrim(body.account_number ?? body.accountNumber);
  const unit = strTrim(body.unit);

  if (designation !== null) staffUpdate.designation = designation;
  if (specialization !== null) staffUpdate.specialization = specialization;
  if (department_id !== null) staffUpdate.department_id = department_id;
  if (hire_date !== null) staffUpdate.hire_date = hire_date;
  if (status !== null) staffUpdate.status = status;
  if (bank_name !== null) staffUpdate.bank_name = bank_name;
  if (account_number !== null) staffUpdate.account_number = account_number;
  if (unit !== null) staffUpdate.unit = unit;

  if (body.signature_file !== undefined || body.signatureFile !== undefined) {
    const signature = body.signature_file ?? body.signatureFile;

    if (signature === null) {
      staffUpdate.signature_file = null;
    } else if (isFileRef(signature)) {
      staffUpdate.signature_file = signature;
    } else {
      return NextResponse.json(
        { error: "signature_file must be a valid file ref with bucket and path" },
        { status: 400 }
      );
    }
  }

  if (Object.keys(staffUpdate).length > 0) {
    staffUpdate.updated_at = isoNow();

    const { error: staffErr } = await supabaseAdmin
      .from("staff")
      .update(staffUpdate)
      .eq("id", staffId);

    if (staffErr) {
      return NextResponse.json({ error: staffErr.message }, { status: 400 });
    }
  }

  if (Array.isArray(body.qualification_documents) && body.qualification_documents.length > 0) {
    const docsPayload = body.qualification_documents
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => {
        const file = isRecord(item.file) ? item.file : null;

        return {
          staff_id: staffId,
          doc_type: strTrim(item.doc_type) ?? "qualification",
          bucket: file && typeof file.bucket === "string" ? file.bucket.trim() : "",
          path: file && typeof file.path === "string" ? file.path.trim() : "",
          original_name: strTrim(item.original_name),
          mime_type: strTrim(item.mime_type),
        };
      })
      .filter((doc) => doc.bucket && doc.path);

    if (docsPayload.length > 0) {
      const { error: docsErr } = await supabaseAdmin
        .from("staff_documents")
        .insert(docsPayload);

      if (docsErr) {
        return NextResponse.json({ error: docsErr.message }, { status: 400 });
      }
    }
  }

  const { data: updated, error: reloadErr } = await supabaseAdmin
    .from("staff")
    .select(
      `
        *,
        profiles:profile_id(*),
        departments(*),
        staff_documents(*)
      `
    )
    .eq("id", staffId)
    .single();

  if (reloadErr) {
    return NextResponse.json({ error: reloadErr.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, staff: updated });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: staffId } = await context.params;

  const { data: staff, error: staffFetchErr } = await supabaseAdmin
    .from("staff")
    .select("id, profile_id")
    .eq("id", staffId)
    .single();

  if (staffFetchErr || !staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const { error: staffErr } = await supabaseAdmin
    .from("staff")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", staff.id);

  if (staffErr) {
    return NextResponse.json({ error: staffErr.message }, { status: 400 });
  }

  await supabaseAdmin
    .from("profiles")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", staff.profile_id);

  const { error: banErr } = await supabaseAdmin.auth.admin.updateUserById(
    staff.profile_id,
    { ban_duration: "8760h" }
  );

  if (banErr) {
    return NextResponse.json(
      { error: `Staff deleted but failed to ban auth user: ${banErr.message}` },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}