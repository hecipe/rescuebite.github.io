import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PlaceholderPageProps {
  title: string
  phase: number
  description?: string
}

export default function PlaceholderPage({ title, phase, description }: PlaceholderPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="text-4xl mb-3">🛠️</div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        {description || `Trang này thuộc Giai đoạn ${phase} của dự án RescueBite và đang được xây dựng.`}
      </p>
      <div className="mt-6">
        <Link to="/discover">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Về trang Khám phá
          </Button>
        </Link>
      </div>
    </div>
  )
}
