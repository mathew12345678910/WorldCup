'use client'

import { motion } from 'framer-motion'

export type PickStep = 'groups' | 'specials' | 'novelty' | 'knockout' | 'done'

const STEPS: { key: PickStep; label: string }[] = [
  { key: 'groups', label: 'Groups' },
  { key: 'specials', label: 'Specials' },
  { key: 'novelty', label: 'Novelty' },
  { key: 'knockout', label: 'Knockout' },
  { key: 'done', label: 'All done ✓' },
]

interface ProgressBarProps {
  currentStep: PickStep
  completedSteps: PickStep[]
}

export function ProgressBar({ currentStep, completedSteps }: ProgressBarProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStep)

  return (
    <div className="w-full">
      <div className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key)
          const isCurrent = step.key === currentStep
          const isPast = index < currentIndex

          return (
            <div key={step.key} className="flex items-center flex-1 min-w-0">
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor:
                      isCompleted || isPast
                        ? '#10b981'
                        : isCurrent
                        ? '#1d4ed8'
                        : '#374151',
                    borderColor:
                      isCompleted || isPast
                        ? '#10b981'
                        : isCurrent
                        ? '#3b82f6'
                        : '#4b5563',
                  }}
                  transition={{ duration: 0.25 }}
                  className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-medium"
                >
                  {isCompleted || isPast ? (
                    <svg
                      className="w-3.5 h-3.5 text-gray-950"
                      fill="none"
                      viewBox="0 0 16 16"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M2.5 8.5l3.5 3.5 7-7"
                      />
                    </svg>
                  ) : (
                    <span
                      className={
                        isCurrent ? 'text-white' : 'text-gray-500'
                      }
                    >
                      {index + 1}
                    </span>
                  )}
                </motion.div>
                <span
                  className={`text-xs font-medium whitespace-nowrap ${
                    isCurrent
                      ? 'text-white'
                      : isCompleted || isPast
                      ? 'text-emerald-400'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mb-5 bg-gray-700 relative overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ scaleX: isPast || isCompleted ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="absolute inset-0 bg-emerald-500 origin-left"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
