// RescueBite Logo component - CSS/SVG, no external assets

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
}

const sizes = {
  sm: { icon: 28, text: 'text-base' },
  md: { icon: 36, text: 'text-xl' },
  lg: { icon: 48, text: 'text-3xl' },
}

export function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2 select-none">
      {/* SVG Icon: leaf + bag */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="RescueBite logo"
      >
        {/* Bag body */}
        <rect x="8" y="16" width="24" height="20" rx="4" fill="#F97316" />
        {/* Bag handle */}
        <path
          d="M14 16V12a6 6 0 0 1 12 0v4"
          stroke="#EA580C"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Leaf */}
        <path
          d="M26 10 C30 6, 36 8, 34 14 C32 20, 24 20, 22 16 C20 12, 22 14, 26 10Z"
          fill="#1A6639"
        />
        <path
          d="M26 10 L30 16"
          stroke="#15532E"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Smile on bag */}
        <path
          d="M16 26 Q20 30 24 26"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <span className={`font-bold text-green-700 ${s.text}`}>
            Rescue<span className="text-orange-500">Bite</span>
          </span>
          {size === 'lg' && (
            <span className="text-xs text-slate-500 font-normal">Túi thức ăn bất ngờ</span>
          )}
        </div>
      )}
    </div>
  )
}
