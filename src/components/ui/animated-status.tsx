'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react'

export interface AnimatedStatusProps {
  status: 'Ready' | 'Pending' | 'Failed' | 'Error' | 'Unknown' | string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
}

export function AnimatedStatus({ 
  status, 
  size = 'md', 
  showIcon = true, 
  className 
}: AnimatedStatusProps) {
  const getStatusConfig = () => {
    const normalizedStatus = status.toLowerCase()
    
    switch (normalizedStatus) {
      case 'ready':
      case 'running':
        return {
          variant: 'default' as const,
          icon: CheckCircle,
          className: 'bg-status-ready text-status-ready-foreground',
          iconClass: 'text-status-ready-foreground',
          animation: ''
        }
      case 'pending':
      case 'creating':
      case 'updating':
        return {
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-status-pending text-status-pending-foreground',
          iconClass: 'text-status-pending-foreground',
          animation: 'animate-pulse'
        }
      case 'failed':
      case 'error':
        return {
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-status-error text-status-error-foreground',
          iconClass: 'text-status-error-foreground',
          animation: ''
        }
      default:
        return {
          variant: 'outline' as const,
          icon: AlertCircle,
          className: 'bg-status-unknown text-status-unknown-foreground',
          iconClass: 'text-status-unknown-foreground',
          animation: ''
        }
    }
  }

  const config = getStatusConfig()
  const StatusIcon = config.icon

  const sizeClasses = {
    sm: 'h-4 px-1.5 text-xs',
    md: 'h-5 px-2 text-xs', 
    lg: 'h-6 px-2.5 text-sm'
  }

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-3.5 w-3.5'
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        sizeClasses[size],
        config.className,
        config.animation,
        'inline-flex items-center gap-1 font-medium transition-all duration-200',
        className
      )}
    >
      {showIcon && (
        <StatusIcon 
          className={cn(
            iconSizes[size],
            config.iconClass,
            config.animation
          )} 
        />
      )}
      {status}
    </Badge>
  )
}

// Predefined status components for common use cases
export function ReadyStatus({ size, className }: Omit<AnimatedStatusProps, 'status'>) {
  return <AnimatedStatus status="Ready" size={size} className={className} />
}

export function PendingStatus({ size, className }: Omit<AnimatedStatusProps, 'status'>) {
  return <AnimatedStatus status="Pending" size={size} className={className} />
}

export function FailedStatus({ size, className }: Omit<AnimatedStatusProps, 'status'>) {
  return <AnimatedStatus status="Failed" size={size} className={className} />
}

export function ErrorStatus({ size, className }: Omit<AnimatedStatusProps, 'status'>) {
  return <AnimatedStatus status="Error" size={size} className={className} />
}