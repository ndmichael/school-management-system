'use client'

import Image from 'next/image'
import { useEffect, useId, useRef } from 'react'
import { X, Clock, Users, Award, CheckCircle2, Calendar, GraduationCap } from 'lucide-react'
import { PrimaryButton } from './PrimaryButton'

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

interface ProgramModalProps {
  program: Program | null
  isOpen: boolean
  onClose: () => void
}

export function ProgramModal({ program, isOpen, onClose }: ProgramModalProps) {
  const titleId = useId()
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtnRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen || !program) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative mx-auto w-full max-w-4xl rounded-3xl bg-white shadow-2xl animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>

            <div className="relative h-64 overflow-hidden rounded-t-3xl">
              <Image
                src={program.image}
                alt={program.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 896px"
                priority
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
              {program.featured && (
                <div className="absolute left-6 top-6 rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white">
                  Most Popular
                </div>
              )}
            </div>

            <div className="space-y-6 p-8">
              <div>
                <h2 id={titleId} className="mb-4 text-3xl font-bold text-gray-900">
                  {program.title}
                </h2>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary-600" />
                    <span className="font-medium">{program.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary-600" />
                    <span className="font-medium">{program.students} Students</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary-600" />
                    <span className="font-medium">{program.level}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-bold text-gray-900">About This Program</h3>
                <p className="leading-relaxed text-gray-600">{program.description}</p>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-bold text-gray-900">What You will Learn</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(program.features ?? []).map((feature, index) => (
                    <div key={`${program.id}-feature-${index}`} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-secondary-600" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="rounded-xl bg-primary-50 p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-primary-600" />
                    <h4 className="font-semibold text-gray-900">Start Date</h4>
                  </div>
                  <p className="text-sm text-gray-600">Next intake: Contact admissions</p>
                </div>

                <div className="rounded-xl bg-secondary-50 p-4">
                  <div className="mb-2 flex items-center gap-3">
                    <GraduationCap className="h-5 w-5 text-secondary-600" />
                    <h4 className="font-semibold text-gray-900">Certification</h4>
                  </div>
                  <p className="text-sm text-gray-600">Nationally Recognized {program.level}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-4">
                <PrimaryButton href="/apply">Apply Now</PrimaryButton>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border-2 border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
