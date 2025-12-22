'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { SectionHeader, ProgramCard } from '@/components/shared'
import { ProgramModal } from '@/components/shared'

type Program = {
  id: string
  title: string
  description: string
  duration: string
  students: number
  level: string
  featured: boolean
  features: string[]
  image: string
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function toTitleCase(s: string): string {
  return s
    .replace(/_/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

function programImageFromTitle(title: string): string {
  const q = encodeURIComponent(`healthcare technology ${title}`)
  return `https://source.unsplash.com/featured/1200x800/?${q}`
}

function normalizeProgram(row: unknown): Program | null {
  if (!isRecord(row)) return null

  const idRaw = row.id
  const id =
    typeof idRaw === 'string' ? idRaw : typeof idRaw === 'number' ? String(idRaw) : ''

  const titleRaw = row.title ?? row.name
  const title = typeof titleRaw === 'string' ? titleRaw.trim() : ''
  if (!id || !title) return null

  const description = typeof row.description === 'string' ? row.description : ''
  const duration = typeof row.duration === 'string' && row.duration.trim() ? row.duration : '—'
  const students =
    typeof row.students === 'number' && Number.isFinite(row.students) ? row.students : 0

  const levelRaw = row.level ?? row.type
  const level =
    typeof levelRaw === 'string' && levelRaw.trim() ? toTitleCase(levelRaw) : '—'

  const featured = typeof row.featured === 'boolean' ? row.featured : false

  const features = Array.isArray(row.features)
    ? row.features.filter((x): x is string => typeof x === 'string')
    : []

  const imageRaw = row.image ?? row.image_url
  const image =
    typeof imageRaw === 'string' && imageRaw.trim()
      ? imageRaw
      : programImageFromTitle(title)

  return { id, title, description, duration, students, level, featured, features, image }
}

export function ProgramsOverview() {
  const [state, setState] = useState<LoadState>('idle')
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)


  useEffect(() => {
    const ac = new AbortController()

    async function load() {
      setState('loading')
      try {
        const res = await fetch('/api/programs/public?limit=6', { signal: ac.signal })
        if (!res.ok) throw new Error('Failed to load programs')

        const json: unknown = await res.json()
        const arr: unknown[] = Array.isArray(json)
          ? json
          : isRecord(json) && Array.isArray(json.programs)
            ? json.programs
            : []

        const out: Program[] = []
        for (const row of arr) {
          const p = normalizeProgram(row)
          if (p) out.push(p)
        }

        setPrograms(out.slice(0, 6))
        setState('success')
      } catch {
        if (!ac.signal.aborted) setState('error')
      }
    }

    void load()
    return () => ac.abort()
  }, [])

  return (
    <section className="bg-linear-to-b from-white to-gray-50 px-6 py-24 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          badge="Our Programs"
          title="Explore Healthcare Programs"
          description="Choose from our comprehensive range of accredited health technology programs designed to prepare you for a successful healthcare career."
          centered
        />

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {state === 'loading' ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
            ))
          ) : programs.length ? (
            programs.map((program) => 
            <ProgramCard 
              key={program.id} 
              {...program} 
              onSelect={() => {
                setSelectedProgram(program)
                setIsModalOpen(true)
              }}
            />)
          ) : (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-6 text-center">
              <p className="text-sm text-gray-700">
                {state === 'error'
                  ? 'Programs are temporarily unavailable. Please refresh.'
                  : 'No programs available yet.'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-8 py-4 font-semibold text-white transition-colors hover:bg-gray-800"
          >
            <span>View All Programs</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <ProgramModal
        program={selectedProgram}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProgram(null)
        }}
      />

    </section>
  )
}
