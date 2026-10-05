import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: ReactNode
}

function Input({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}

        <input
          id={id}
          className={`
            h-11 w-full rounded-xl
            border
            bg-white
            px-4
            text-sm text-slate-900
            outline-none
            transition-all
            placeholder:text-slate-400
            ${
              icon
                ? 'pl-11'
                : ''
            }
            ${
              error
                ? 'border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-500/10'
                : 'border-slate-200 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10'
            }
            ${className}
          `}
          {...props}
        />
      </div>

      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}

export default Input