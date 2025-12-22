'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { ProgramCard, ProgramModal } from '@/components/shared'

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

export default function ProgramsPage() {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [loadError, setLoadError] = useState('')

  const [programs, setPrograms] = useState<Program[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState<string>('All')
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const ac = new AbortController()

    async function load() {
      setLoadState('loading')
      setLoadError('')
      try {
        const res = await fetch('/api/programs/public', { signal: ac.signal })
        if (!res.ok) throw new Error(`Failed to load programs (${res.status})`)

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

        setPrograms(out)
        setLoadState('success')
      } catch (e: unknown) {
        if (ac.signal.aborted) return
        const msg = e instanceof Error ? e.message : 'Failed to load programs'
        setLoadError(msg)
        setLoadState('error')
      }
    }

    void load()
    return () => ac.abort()
  }, [])

  const levels = useMemo(() => {
    const set = new Set<string>()
    for (const p of programs) {
      if (p.level && p.level !== '—') set.add(p.level)
    }
    return ['All', ...Array.from(set).sort()]
  }, [programs])

  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return programs.filter((program) => {
      const matchesSearch =
        q.length === 0 ||
        program.title.toLowerCase().includes(q) ||
        program.description.toLowerCase().includes(q)

      const matchesLevel = selectedLevel === 'All' || program.level === selectedLevel
      return matchesSearch && matchesLevel
    })
  }, [programs, searchQuery, selectedLevel])

  const handleProgramClick = (program: Program) => {
    setSelectedProgram(program)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedProgram(null)
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-white to-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary-600 to-secondary-600 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-\[size:32px_32px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:px-8 lg:px-12">
          <div className="max-w-3xl">
            <h1 className="mb-4 text-4xl font-bold lg:text-5xl">Our Programs</h1>
            <p className="text-lg leading-relaxed text-primary-100">
              Discover our comprehensive range of healthcare programs designed to launch your career
              in the medical field.
            </p>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg
            className="relative block h-12 w-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
              className="fill-white"
            />
          </svg>
        </div>
      </section>

      {/* Search/Filter */}
      <section className="relative z-10 mx-auto -mt-8 max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-200 py-3 pl-12 pr-4 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-3">
                <Filter className="h-5 w-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-600">Level:</span>
              </div>

              {levels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedLevel(level)}
                  className={`rounded-xl px-6 py-3 text-sm font-medium transition-all ${
                    selectedLevel === level
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {loadState === 'error' && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">{loadError}</p>
            </div>
          )}
        </div>
      </section>

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12">
        <div className="mb-8">
          {loadState === 'loading' ? (
            <p className="text-gray-600">Loading programs…</p>
          ) : (
            <p className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredPrograms.length}</span>{' '}
              programs
            </p>
          )}
        </div>

        {loadState === 'loading' ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredPrograms.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPrograms.map((program) => (
              <div
                key={program.id}
                onClick={() => handleProgramClick(program)}
                className="cursor-pointer"
              >
                <ProgramCard {...program} />
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Search className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-900">No programs found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </section>

      <ProgramModal program={selectedProgram} isOpen={isModalOpen} onClose={closeModal} />
    </main>
  )
}
