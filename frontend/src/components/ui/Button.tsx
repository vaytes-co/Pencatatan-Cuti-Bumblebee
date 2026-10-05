import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'danger'
  | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  loading?: boolean
  icon?: ReactNode
}

function Button({
  children,
  variant = 'primary',
  loading = false,
  icon,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary:
      'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/15 hover:from-violet-700 hover:to-indigo-700',

    secondary:
      'bg-slate-100 text-slate-700 hover:bg-slate-200',

    outline:
      'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300',

    danger:
      'bg-red-500 text-white shadow-lg shadow-red-500/15 hover:bg-red-600',

    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex h-11 items-center justify-center gap-2
        rounded-xl px-4
        text-sm font-semibold
        transition-all duration-200
        active:scale-[0.98]
        disabled:cursor-not-allowed
        disabled:opacity-60
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={17} className="animate-spin" />
          Memproses...
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
}

export default Button