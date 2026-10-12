import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================================
// LOADING SPINNER
// ============================================================
export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <Loader2 className={cn("h-6 w-6 animate-spin text-green-600", className)} />
  )
}

export function LoadingPage() {
  return (
    <div className="flex h-48 items-center justify-center">
      <LoadingSpinner className="h-8 w-8" />
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================
interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = "🍃", title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 text-5xl">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-slate-700">{title}</h3>
      {description && <p className="mb-4 text-sm text-slate-500 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ============================================================
// ERROR BANNER
// ============================================================
interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
      <span className="text-xl">⚠️</span>
      <div className="flex-1">
        <p className="text-sm font-medium">Đã xảy ra lỗi</p>
        <p className="text-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg px-3 py-1 text-sm font-medium hover:bg-red-100 transition-colors"
        >
          Thử lại
        </button>
      )}
    </div>
  )
}

// ============================================================
// STATUS CHIP (order status)
// ============================================================
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants"

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
      ORDER_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"
    )}>
      {ORDER_STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ============================================================
// LOADING SKELETON
// ============================================================
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-slate-200", className)} />
  )
}

export function BagCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-white p-4 space-y-3">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  )
}

// ============================================================
// TOAST-LIKE INLINE MESSAGE
// ============================================================
interface InlineAlertProps {
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

const alertStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
}

const alertIcons = {
  success: '✅',
  error: '❌',
  info: 'ℹ️',
  warning: '⚠️',
}

export function InlineAlert({ type, message }: InlineAlertProps) {
  return (
    <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-sm", alertStyles[type])}>
      <span>{alertIcons[type]}</span>
      <span>{message}</span>
    </div>
  )
}
