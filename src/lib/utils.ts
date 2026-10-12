import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format VND currency */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Format a date/time in Vietnamese locale */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm dd/MM/yyyy', { locale: vi })
}

/** Format a time */
export function formatTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm', { locale: vi })
}

/** Format relative time (e.g. "2 giờ trước") */
export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { locale: vi, addSuffix: true })
}

/** Format pickup window "HH:mm – HH:mm" */
export function formatPickupWindow(start: string | Date, end: string | Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

/** Compute discount percentage */
export function discountPct(price: number, retailMin: number): number {
  if (retailMin <= 0) return 0
  return Math.round((1 - price / retailMin) * 100)
}

/** Get initials from a full name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/** Generate a gradient background from a store name (deterministic) */
export function storeGradient(name: string): string {
  const gradients = [
    'from-green-400 to-emerald-600',
    'from-orange-400 to-amber-600',
    'from-pink-400 to-rose-600',
    'from-purple-400 to-violet-600',
    'from-sky-400 to-blue-600',
    'from-teal-400 to-cyan-600',
    'from-yellow-400 to-orange-500',
    'from-lime-400 to-green-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Parse Supabase error into a Vietnamese user-facing message */
export function parseError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message
    // Supabase returns the error detail in the message
    if (msg.includes('PGRST')) return 'Lỗi cơ sở dữ liệu. Vui lòng thử lại.'
    return msg
  }
  return 'Đã xảy ra lỗi. Vui lòng thử lại.'
}
