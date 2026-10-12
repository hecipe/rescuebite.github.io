import { useState, useRef, useCallback } from 'react'
import { CheckCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SwipeSliderProps {
  label?: string
  onConfirm: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}

export function SwipeSlider({
  label = 'Vuốt để xác nhận nhận túi',
  onConfirm,
  disabled = false,
  loading = false,
  className,
}: SwipeSliderProps) {
  const [progress, setProgress] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const startX = useRef(0)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled || loading || confirmed) return
    dragging.current = true
    startX.current = e.clientX
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [disabled, loading, confirmed])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !trackRef.current) return
    const track = trackRef.current
    const trackWidth = track.offsetWidth
    const thumbWidth = 56
    const maxTravel = trackWidth - thumbWidth - 8
    const dx = e.clientX - startX.current
    const pct = Math.max(0, Math.min(100, (dx / maxTravel) * 100))
    setProgress(pct)

    if (pct >= 95) {
      dragging.current = false
      setProgress(100)
      setConfirmed(true)
      setTimeout(() => onConfirm(), 300)
    }
  }, [onConfirm])

  const handlePointerUp = useCallback(() => {
    if (!confirmed) {
      dragging.current = false
      setProgress(0)
    }
  }, [confirmed])

  return (
    <div
      ref={trackRef}
      className={cn(
        'relative flex h-14 select-none items-center rounded-2xl overflow-hidden',
        confirmed ? 'bg-emerald-500' : 'bg-slate-200',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* Track fill */}
      <div
        className="absolute inset-y-0 left-0 bg-emerald-400/40 transition-none rounded-2xl"
        style={{ width: `${progress}%` }}
      />

      {/* Label */}
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center text-sm font-semibold transition-opacity',
          confirmed ? 'text-white' : 'text-slate-500',
          progress > 40 && !confirmed && 'opacity-0'
        )}
      >
        {confirmed ? (
          <span className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" /> Đã xác nhận!
          </span>
        ) : loading ? 'Đang xử lý...' : label}
      </span>

      {/* Thumb */}
      {!confirmed && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute left-1 flex h-12 w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-xl bg-white shadow-md transition-none z-10"
          style={{ transform: `translateX(calc(${progress}% * (100% - 56px) / 100))` }}
        >
          <ChevronRight className="h-6 w-6 text-green-700" />
        </div>
      )}
    </div>
  )
}
