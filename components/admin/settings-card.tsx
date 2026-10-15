import type { ReactNode } from "react"

interface SettingsCardProps {
  icon?: ReactNode
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

export function SettingsCard({ icon, title, description, children, footer }: SettingsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        {icon && (
          <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          {description && <p className="text-sm text-neutral-500">{description}</p>}
        </div>
      </div>
      {children}
      {footer && <div className="mt-6 pt-4 border-t border-neutral-100">{footer}</div>}
    </div>
  )
}

export function SettingsButton({
  loading,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={
        className ||
        "flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-[var(--color-primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition"
      }
    >
      {loading && <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
      {children}
    </button>
  )
}
