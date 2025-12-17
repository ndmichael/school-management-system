import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import type { Readable } from 'node:stream';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type ResultRow = {
  grade_letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  grade_points: number;
  course_offerings: {
    semester: 'first' | 'second';
    sessions: { name: string };
    courses: { code: string; title: string; credits: number };
  };
};

export async function GET(): Promise<NextResponse> {
  // ✅ Next.js 14: cookies() is async in many setups → await it
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: () => {}, // not needed for GET
        remove: () => {}, // not needed for GET
      },
    }
  );

  // 🔒 RLS enforced here (student only sees their own published results)
  const { data: results, error } = await supabase
    .from('results')
    .select(`
      grade_letter,
      grade_points,
      course_offerings!inner (
        semester,
        courses!inner ( code, title, credits ),
        sessions!inner ( name )
      )
    `)
    .returns<ResultRow[]>();

  if (error || !results || results.length === 0) {
    return new NextResponse('No results available', { status: 404 });
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('error', () => {});

  // Header
  const first = results[0];
  doc.fontSize(18).text('Student Academic Results', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Session: ${first.course_offerings.sessions.name}`);
  doc.text(`Semester: ${first.course_offerings.semester}`);
  doc.moveDown();

  // Body
  results.forEach((r, i) => {
    doc
      .fontSize(10)
      .text(
        `${i + 1}. ${r.course_offerings.courses.code} — ${r.course_offerings.courses.title}`
      )
      .text(
        `Credits: ${r.course_offerings.courses.credits} | Grade: ${r.grade_letter} | GP: ${r.grade_points.toFixed(
          1
        )}`
      )
      .moveDown(0.5);
  });

  doc.end();

  // Wait until PDF is fully generated
  await new Promise<void>((resolve, reject) => {
    (doc as unknown as Readable).on('end', () => resolve());
    (doc as unknown as Readable).on('error', reject);
  });

  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="results.pdf"',
    },
  });
}
