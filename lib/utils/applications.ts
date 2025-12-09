// src/lib/utils/applications.ts
import { findOrCreateAuthUser } from "./users";
import { ensureProfileExists } from "./profiles";
import { ensureStudentExists } from "./students";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function acceptApplication(application: any) {
  const fullName = `${application.first_name} ${
    application.middle_name ? application.middle_name + " " : ""
  }${application.last_name}`;

  // 1️⃣ Create or reuse auth user
  const { user, createdNew, tempPassword } = await findOrCreateAuthUser(
    application.email,
    fullName
  );

  try {
    // 2️⃣ Create or confirm profile
    await ensureProfileExists(user.id, application);

    // 3️⃣ Create or confirm student
    const { id: studentId } = await ensureStudentExists(
      user.id,
      application
    );

    // 4️⃣ Update application record
    const { error: appUpdateErr } = await supabaseAdmin
      .from("applications")
      .update({
        status: "accepted",
        reviewed_by: "SYSTEM",
        reviewed_date: new Date().toISOString(),
        rejection_reason: null,
        student_id: studentId,
        converted_to_student: true,
      })
      .eq("id", application.id);

    if (appUpdateErr) throw new Error(appUpdateErr.message);

    return {
      user,
      studentId,
      createdNewUser: createdNew,
      tempPassword,
    };
  } catch (err) {
    // rollback newly created auth user in case of failure
    if (createdNew) {
      await supabaseAdmin.auth.admin.deleteUser(user.id);
    }

    throw err;
  }
}
