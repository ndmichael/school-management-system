'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Save, ToggleLeft, ToggleRight } from 'lucide-react';

type GradeLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

type OfferingInfo = {
  id: string;
  semester: string;
  is_published: boolean | null;
  session_id: string;
  program_id: string | null;
  level: string | null;
  courses: { code: string; title: string; credits: number };
  sessions: { name: string };
};

type EligibleStudentRow = {
  profile_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
};

type ExistingResultRow = {
  id: string;
  student_profile_id: string;
  ca_score: number | null;
  exam_score: number | null;
  total_score: number | null;
  grade_letter: GradeLetter;
  grade_points: number;
};

type RowModel = {
  student_profile_id: string;
  full_name: string;
  email: string;
  ca_score: number | '';
  exam_score: number | '';
  total_score: number;
  grade_letter: GradeLetter;
  grade_points: number;
};

const supabase = createClient();

/* ---------- grading rules ---------- */
const computeGrade = (total: number): { letter: GradeLetter; points: number } => {
  if (total >= 70) return { letter: 'A', points: 4.0 };
  if (total >= 60) return { letter: 'B', points: 3.0 };
  if (total >= 50) return { letter: 'C', points: 2.0 };
  if (total >= 45) return { letter: 'D', points: 1.0 };
  if (total >= 40) return { letter: 'E', points: 0.0 };
  return { letter: 'F', points: 0.0 };
};

export default function AcademicStaffGradeSheetPage() {
  const router = useRouter();
  const { offeringId } = useParams<{ offeringId: string }>();

  const [offering, setOffering] = useState<OfferingInfo | null>(null);
  const [rows, setRows] = useState<RowModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [togglingPublish, setTogglingPublish] = useState(false);

  /* ---------- load data ---------- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: offeringData } = await supabase
        .from('course_offerings')
        .select(`
          id, semester, is_published, session_id, program_id, level,
          courses!inner ( code, title, credits ),
          sessions!inner ( name )
        `)
        .eq('id', offeringId)
        .maybeSingle()
        .returns<OfferingInfo>();

      if (!offeringData) {
        setLoading(false);
        return;
      }
      setOffering(offeringData);

      let studentsQuery = supabase
        .from('students')
        .select(`profile_id, profiles!inner ( first_name, last_name, email )`)
        .eq('course_session_id', offeringData.session_id);

      if (offeringData.program_id) studentsQuery = studentsQuery.eq('program_id', offeringData.program_id);
      if (offeringData.level) studentsQuery = studentsQuery.eq('level', offeringData.level);

      const { data: students } = await studentsQuery.returns<EligibleStudentRow[]>();

      const { data: existing } = await supabase
        .from('results')
        .select(`
          id, student_profile_id, ca_score, exam_score,
          total_score, grade_letter, grade_points
        `)
        .eq('course_offering_id', offeringId)
        .returns<ExistingResultRow[]>();

      const map = new Map(existing?.map(r => [r.student_profile_id, r]));

      const merged: RowModel[] = (students ?? []).map(s => {
        const ex = map.get(s.profile_id);
        const total =
          (ex?.ca_score ?? 0) + (ex?.exam_score ?? 0);

        const grade = computeGrade(total);

        return {
          student_profile_id: s.profile_id,
          full_name: `${s.profiles.first_name} ${s.profiles.last_name}`,
          email: s.profiles.email,
          ca_score: ex?.ca_score ?? '',
          exam_score: ex?.exam_score ?? '',
          total_score: total,
          grade_letter: grade.letter,
          grade_points: grade.points,
        };
      });

      setRows(merged);
      setLoading(false);
    };

    load();
  }, [offeringId]);

  /* ---------- handlers ---------- */
  const updateScore = (
    studentId: string,
    field: 'ca_score' | 'exam_score',
    value: number | ''
  ) => {
    setRows(prev =>
      prev.map(r => {
        if (r.student_profile_id !== studentId) return r;

        const ca = field === 'ca_score' ? value : r.ca_score;
        const exam = field === 'exam_score' ? value : r.exam_score;

        const total =
          (typeof ca === 'number' ? ca : 0) +
          (typeof exam === 'number' ? exam : 0);

        const grade = computeGrade(total);

        return {
          ...r,
          ca_score: ca,
          exam_score: exam,
          total_score: total,
          grade_letter: grade.letter,
          grade_points: grade.points,
        };
      })
    );
  };

 const saveGrades = async () => {
    if (!offering) return;

    setSaving(true);

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const enteredBy = user?.id ?? null;

    const payload = rows
        .filter(r => r.ca_score !== '' || r.exam_score !== '')
        .map(r => ({
        course_offering_id: offering.id,
        student_profile_id: r.student_profile_id,
        ca_score: r.ca_score === '' ? null : r.ca_score,
        exam_score: r.exam_score === '' ? null : r.exam_score,
        total_score: r.total_score,
        grade_letter: r.grade_letter,
        grade_points: r.grade_points,
        entered_by: enteredBy,
        }));

    if (payload.length === 0) {
        setSaving(false);
        alert('No grades to save.');
        return;
    }

    const { error } = await supabase
        .from('results')
        .upsert(payload, { onConflict: 'course_offering_id,student_profile_id' });

    if (error) alert(error.message);

    setSaving(false);
    };


  const togglePublish = async () => {
    if (!offering) return;
    const next = !offering.is_published;
    setTogglingPublish(true);
    setOffering({ ...offering, is_published: next });

    const { error } = await supabase
      .from('course_offerings')
      .update({ is_published: next })
      .eq('id', offering.id);

    if (error) alert(error.message);
    setTogglingPublish(false);
  };

  if (loading) return <div className="py-16 text-center text-gray-600">Loading grade sheet…</div>;
  if (!offering) return <div className="py-16 text-center text-gray-600">Offering not found.</div>;

  return (
    <div className="space-y-6">
      {/* Back buttons */}
      <div className="flex gap-2">
        <button onClick={() => router.back()} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Link href="/dashboard/academic_staff/results" className="btn-secondary">
          Results
        </Link>
        <Link href="/dashboard/academic_staff/results/grade-submission" className="btn-secondary">
          Grade Submission
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200">
        <h2 className="text-2xl font-bold">
          {offering.courses.code} — {offering.courses.title}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {offering.sessions.name} • {offering.semester}
        </p>

        <button
          onClick={togglePublish}
          disabled={togglingPublish}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold
          bg-gray-100 hover:bg-gray-200"
        >
          {offering.is_published ? <ToggleRight /> : <ToggleLeft />}
          {offering.is_published ? 'Published' : 'Unpublished'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 text-left">Student</th>
              <th className="px-6 py-4 text-left">Email</th>
              <th className="px-6 py-4 text-left">CA</th>
              <th className="px-6 py-4 text-left">Exam</th>
              <th className="px-6 py-4 text-left">Total</th>
              <th className="px-6 py-4 text-left">Grade</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(r => (
              <tr key={r.student_profile_id}>
                <td className="px-6 py-4 font-medium">{r.full_name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{r.email}</td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={r.ca_score}
                    onChange={e =>
                      updateScore(
                        r.student_profile_id,
                        'ca_score',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="w-20 input"
                  />
                </td>
                <td className="px-6 py-4">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={r.exam_score}
                    onChange={e =>
                      updateScore(
                        r.student_profile_id,
                        'exam_score',
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="w-20 input"
                  />
                </td>
                <td className="px-6 py-4 font-semibold">{r.total_score}</td>
                <td className="px-6 py-4 font-semibold">
                  {r.grade_letter} ({r.grade_points.toFixed(1)})
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={saveGrades}
        disabled={saving}
        className="btn-primary"
      >
        <Save className="w-4 h-4" /> Save grades
      </button>
    </div>
  );
}
