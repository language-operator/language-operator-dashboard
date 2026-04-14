import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface FilterBarProps {
  children: React.ReactNode
}

export function FilterBar({ children }: FilterBarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
