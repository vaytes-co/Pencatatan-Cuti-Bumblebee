import type { ReactNode } from 'react'

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'violet'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  dot?: boolean
}

function Badge({
  children,
  variant = 'default',
  dot = true,
}: BadgeProps) {
  const variants: Record<
    BadgeVariant,
    {
      container: string
      dot: string
    }
  > = {
    default: {
      container: 'bg-slate-100 text-slate-600',
      dot: 'bg-slate-400',
    },

    success: {
      container: 'bg-emerald-50 text-emerald-700',
      dot: 'bg-emerald-500',
    },

    warning: {
      container: 'bg-amber-50 text-amber-700',
      dot: 'bg-amber-500',
    },

    danger: {
      container: 'bg-red-50 text-red-700',
      dot: 'bg-red-500',
    },

    info: {
      container: 'bg-blue-50 text-blue-700',
      dot: 'bg-blue-500',
    },

    violet: {
      container: 'bg-violet-50 text-violet-700',
      dot: 'bg-violet-500',
    },
  }

  const current = variants[variant]

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full
        px-2.5 py-1
        text-xs font-semibold
        ${current.container}
      `}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${current.dot}`}
        />
      )}

      {children}
    </span>
  )
}

export default Badge