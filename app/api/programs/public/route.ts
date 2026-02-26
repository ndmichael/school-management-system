import { NextResponse, type NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

type ProgramRow = {
  id: string
  name: string
  description: string | null
  features: string[] | null
  image_url: string | null
  type: string
  level: string
  duration: number | null
  is_active: boolean
}

type ProgramDTO = {
  id: string
  title: string
  description: string
  duration: string
  students: string
  level: string
  type: string
  featured: boolean
  features: string[]
  image: string
}

type ErrorResponse = { error: string }

function toTitleCase(s: string): string {
  return s.replace(/_/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseLimit(req: NextRequest): number | null {
  const raw = req.nextUrl.searchParams.get('limit')
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  const i = Math.floor(n)
  if (i <= 0) return null
  return Math.min(i, 50)
}

function placeholderImage(): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return ''
  return `${base}/storage/v1/object/public/programs/placeholder.jpg`
}

function normalize(row: ProgramRow): ProgramDTO {
  const image = row.image_url?.trim() ? row.image_url : placeholderImage()

  return {
    id: row.id,
    title: row.name,
    description: row.description ?? '',
    duration: row.duration ? `${row.duration} Years` : '—',
    students: 'TBA',
    level: row.level,          // Cert / ND / HND
    type: toTitleCase(row.type), // Certificate / Diploma / Higher Diploma
    featured: false,
    features: Array.isArray(row.features) ? row.features : [],
    image:
      image ||
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&q=80',
  }
}

export async function GET(req: NextRequest) {
  try {
    const limit = parseLimit(req)

    let q = supabaseAdmin
      .from('programs')
      .select(
        'id,name,description,features,image_url,type,level,duration,is_active'
      )
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (limit) q = q.limit(limit)

    const { data, error } = await q
    if (error) {
      return NextResponse.json<ErrorResponse>(
        { error: error.message },
        { status: 400 }
      )
    }

    const rows = (data ?? []) as ProgramRow[]
    return NextResponse.json<ProgramDTO[]>(
      rows.map(normalize),
      { status: 200 }
    )
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unexpected server error'
    return NextResponse.json<ErrorResponse>(
      { error: message },
      { status: 500 }
    )
  }
}