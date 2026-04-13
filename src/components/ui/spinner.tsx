import { cn } from "@/lib/utils"

interface SpinnerProps {
  size?: "md" | "sm"
  className?: string
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin border-b-2 border-foreground",
        size === "md" ? "h-12 w-12" : "h-8 w-8",
        className
      )}
    />
  )
}
