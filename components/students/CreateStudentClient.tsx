"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { Textarea } from "@/components/shared/Textarea";
import { Button } from "@/components/ui/button";

type Program = {
  id: string;
  name: string;
  code?: string | null;
  department_id: string | null;
  departments?: { name: string | null } | null;
};

type Session = { id: string; name: string };

type CreateStudentBody = {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  email: string;

  phone: string | null;
  gender: string | null;
  date_of_birth: string | null;

  state_of_origin: string | null;
  lga_of_origin: string | null;
  nin: string | null;
  religion: string | null;
  address: string | null;

  program_id: string;
  session_id: string;
  level: string | null;

  admission_type: "fresh" | "direct_entry";
  previous_school: string | null;
  previous_qualification: string | null;

  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_status: string | null;
};

type ProgramsResp = { programs: Program[]; error?: string };
type SessionsResp = { sessions: Session[]; error?: string };

type Props = { onCreated?: () => void };

function toStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function clean(v: string): string | null {
  const t = v.trim();
  return t.length ? t : null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function CreateStudentClient({ onCreated }: Props) {
  // dropdown data
  const [programs, setPrograms] = useState<Program[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // form state
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");

  const [stateOfOrigin, setStateOfOrigin] = useState("");
  const [lga, setLga] = useState("");
  const [nin, setNin] = useState("");
  const [religion, setReligion] = useState("islam");
  const [address, setAddress] = useState("");

  const [programId, setProgramId] = useState("");
  const [sessionId, setSessionId] = useState("");

  // "level" -> "Class Applied For"
  const [classAppliedFor, setClassAppliedFor] = useState("");

  const [admissionType, setAdmissionType] = useState<"fresh" | "direct_entry">("fresh");
  const [prevSchool, setPrevSchool] = useState("");
  const [prevQual, setPrevQual] = useState("");

  const [gFirst, setGFirst] = useState("");
  const [gLast, setGLast] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gStatus, setGStatus] = useState("father");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadLookups() {
      try {
        setLoadingLookups(true);

        const [pRes, sRes] = await Promise.all([
          fetch("/api/programs", { cache: "no-store" }),
          fetch("/api/admin/sessions", { cache: "no-store" }),
        ]);

        const pJson = (await pRes.json().catch(() => null)) as ProgramsResp | null;
        const sJson = (await sRes.json().catch(() => null)) as SessionsResp | null;

        if (!pRes.ok) throw new Error(pJson?.error ?? "Failed to load programs");
        if (!sRes.ok) throw new Error(sJson?.error ?? "Failed to load sessions");

        if (cancelled) return;

        setPrograms(Array.isArray(pJson?.programs) ? pJson!.programs : []);
        setSessions(Array.isArray(sJson?.sessions) ? sJson!.sessions : []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load form data");
      } finally {
        if (!cancelled) setLoadingLookups(false);
      }
    }

    loadLookups();
    return () => {
      cancelled = true;
    };
  }, []);

  type ProgramGroup = { deptName: string; programs: Program[] };

  const groupedPrograms = useMemo<ProgramGroup[]>(() => {
    const map = new Map<string, ProgramGroup>();

    for (const p of programs) {
      const deptName = p.departments?.name?.trim() || "Other";
      const key = `${p.department_id ?? "other"}:${deptName}`;

      const group = map.get(key) ?? { deptName, programs: [] };
      group.programs.push(p);
      map.set(key, group);
    }

    const groups = Array.from(map.values());
    for (const g of groups) {
      g.programs.sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups.sort((a, b) => a.deptName.localeCompare(b.deptName));
  }, [programs]);

  const canSubmit = useMemo(() => {
    if (saving) return false;
    if (!clean(firstName) || !clean(lastName)) return false;

    const em = clean(email)?.toLowerCase() ?? "";
    if (!em.includes("@") || !em.includes(".")) return false;

    if (!isUuid(programId) || !isUuid(sessionId)) return false;

    if (admissionType === "direct_entry") {
      if (!clean(prevSchool) || !clean(prevQual)) return false;
    }

    return true;
  }, [saving, firstName, lastName, email, programId, sessionId, admissionType, prevSchool, prevQual]);

  async function submit() {
    if (!canSubmit) return;

    const body: CreateStudentBody = {
      first_name: clean(firstName) ?? "",
      middle_name: clean(middleName),
      last_name: clean(lastName) ?? "",
      email: (clean(email) ?? "").toLowerCase(),

      phone: clean(phone),
      gender: clean(gender),
      date_of_birth: clean(dob),

      state_of_origin: clean(stateOfOrigin),
      lga_of_origin: clean(lga),
      nin: clean(nin),
      religion: clean(religion),
      address: clean(address),

      program_id: programId,
      session_id: sessionId,
      level: clean(classAppliedFor),

      admission_type: admissionType,
      previous_school: admissionType === "direct_entry" ? clean(prevSchool) : null,
      previous_qualification: admissionType === "direct_entry" ? clean(prevQual) : null,

      guardian_first_name: clean(gFirst),
      guardian_last_name: clean(gLast),
      guardian_phone: clean(gPhone),
      guardian_status: clean(gStatus),
    };

    try {
      setSaving(true);

      const res = await fetch("/api/students/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = (await res.json().catch(() => null)) as { error?: string; matricNo?: string; warning?: string } | null;

      if (!res.ok) throw new Error(json?.error ?? "Failed to create student");

      toast.success(`Student created${json?.matricNo ? ` (${json.matricNo})` : ""}. Invite queued.`);
      if (json?.warning) toast.warn(json.warning);

      // reset minimal fields
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setGender("");
      setDob("");

      setStateOfOrigin("");
      setLga("");
      setNin("");
      setReligion("islam");
      setAddress("");

      setProgramId("");
      setSessionId("");
      setClassAppliedFor("");

      setAdmissionType("fresh");
      setPrevSchool("");
      setPrevQual("");

      setGFirst("");
      setGLast("");
      setGPhone("");
      setGStatus("father");

      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create student");
    } finally {
      setSaving(false);
    }
  }

  if (loadingLookups) {
    return <div className="text-gray-600">Loading form…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Personal */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Personal Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="First name *" value={firstName} onChange={(e) => setFirstName(toStr(e.target.value))} />
          <Input label="Middle name" value={middleName} onChange={(e) => setMiddleName(toStr(e.target.value))} />
          <Input label="Last name *" value={lastName} onChange={(e) => setLastName(toStr(e.target.value))} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Email *" value={email} onChange={(e) => setEmail(toStr(e.target.value))} />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(toStr(e.target.value))} />
          <Select
            label="Gender"
            value={gender}
            onChange={(v) => setGender(v)}
            options={[
              { label: "Select gender", value: "" },
              { label: "Male", value: "male" },
              { label: "Female", value: "female" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(toStr(e.target.value))} />
          <Input label="NIN" value={nin} onChange={(e) => setNin(toStr(e.target.value))} />
          <Select
            label="Religion"
            value={religion}
            onChange={(v) => setReligion(v)}
            options={[
              { label: "Islam", value: "islam" },
              { label: "Christianity", value: "christianity" },
              { label: "Other", value: "other" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input label="State of origin" value={stateOfOrigin} onChange={(e) => setStateOfOrigin(toStr(e.target.value))} />
          <Input label="LGA of origin" value={lga} onChange={(e) => setLga(toStr(e.target.value))} />
        </div>

        <Textarea label="Address" value={address} onChange={(e) => setAddress(toStr(e.target.value))} />
      </div>

      {/* Academic */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Academic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Program grouped by department (optgroup) */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Program *</label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="w-full border rounded-xl px-3 py-3 text-sm bg-white"
            >
              <option value="">Select program</option>
              {groupedPrograms.map((g) => (
                <optgroup key={g.deptName} label={g.deptName}>
                  {g.programs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <Select
            label="Admission Session *"
            value={sessionId}
            onChange={(v) => setSessionId(v)}
            options={[
              ...sessions.map((s) => ({ label: s.name, value: s.id })),
            ]}
          />

          <Input
            label="Class Applied For (optional)"
            placeholder="ND1, ND2, DIPLOMA"
            value={classAppliedFor}
            onChange={(e) => setClassAppliedFor(toStr(e.target.value))}
          />
        </div>

        <Select
          label="Admission type"
          value={admissionType}
          onChange={(v) => setAdmissionType(v === "direct_entry" ? "direct_entry" : "fresh")}
          options={[
            { label: "Fresh admission", value: "fresh" },
            { label: "Direct entry", value: "direct_entry" },
          ]}
        />

        {admissionType === "direct_entry" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Previous school *" value={prevSchool} onChange={(e) => setPrevSchool(toStr(e.target.value))} />
            <Input
              label="Previous qualification *"
              value={prevQual}
              onChange={(e) => setPrevQual(toStr(e.target.value))}
            />
          </div>
        )}
      </div>

      {/* Guardian */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold">Guardian (optional)</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Guardian first name" value={gFirst} onChange={(e) => setGFirst(toStr(e.target.value))} />
          <Input label="Guardian last name" value={gLast} onChange={(e) => setGLast(toStr(e.target.value))} />
          <Input label="Guardian phone" value={gPhone} onChange={(e) => setGPhone(toStr(e.target.value))} />
        </div>

        <Select
          label="Guardian status"
          value={gStatus}
          onChange={(v) => setGStatus(v)}
          options={[
            { label: "Father", value: "father" },
            { label: "Mother", value: "mother" },
            { label: "Guardian", value: "guardian" },
          ]}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <Button onClick={submit} disabled={!canSubmit} className="bg-admin-600 hover:bg-admin-700">
          {saving ? "Creating…" : "Create & Send Invite"}
        </Button>
      </div>
    </div>
  );
}
