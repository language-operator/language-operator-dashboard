import { NextRequest } from 'next/server'

export interface SSEWatchOptions {
  onConnect?: () => Promise<void>
  onCleanup?: () => void
  heartbeatInterval?: number
}

export interface SSEWatchController {
  stream: ReadableStream
  sendEvent: (data: unknown, event?: string) => boolean
  isActive: () => boolean
}

/**
 * Creates a safe SSE (Server-Sent Events) watch stream that handles:
 * - Controller state tracking to prevent writes to closed streams
 * - Automatic cleanup on client disconnect
 * - Graceful error handling with try-catch guards
 * - Optional heartbeat with automatic cleanup
 *
 * This prevents the "Controller is already closed" errors that cause server crashes.
 */
export function createSSEWatchStream(
  request: NextRequest,
  options: SSEWatchOptions = {}
): SSEWatchController {
  let isStreamActive = true
  const encoder = new TextEncoder()
  let sendEventFn: ((data: unknown, event?: string) => boolean) | null = null
  let cleanupFn: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (data: unknown, event?: string): boolean => {
        // Guard: Don't write if stream is inactive
        if (!isStreamActive) {
          return false
        }

        try {
          const eventData = `${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`
          controller.enqueue(encoder.encode(eventData))
          return true
        } catch (error) {
          // Catch ERR_INVALID_STATE and other controller errors
          console.error('⚠️  Failed to send SSE event:', error)
          isStreamActive = false
          return false
        }
      }

      // Store sendEvent for external access
      sendEventFn = sendEvent

      // Send initial connection event
      sendEvent({ type: 'connected', timestamp: new Date().toISOString() }, 'connection')

      // Optional heartbeat with automatic cleanup
      let heartbeatInterval: NodeJS.Timeout | null = null
      if (options.heartbeatInterval) {
        heartbeatInterval = setInterval(() => {
          const sent = sendEvent({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          }, 'heartbeat')

          // Stop heartbeat if send fails (stream closed)
          if (!sent && heartbeatInterval) {
            clearInterval(heartbeatInterval)
            heartbeatInterval = null
          }
        }, options.heartbeatInterval)
      }

      // Handle client disconnect (browser tab closed, navigation, etc.)
      request.signal.addEventListener('abort', () => {
        console.log('🛑 SSE client disconnected')
        isStreamActive = false

        // Clear heartbeat
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }

        // Call cleanup hook
        if (options.onCleanup) {
          try {
            options.onCleanup()
          } catch (error) {
            console.error('Error in SSE cleanup hook:', error)
          }
        }

        // Close controller safely
        try {
          controller.close()
        } catch (e) {
          // Already closed, ignore
        }
      })

      // Call onConnect hook if provided
      if (options.onConnect) {
        options.onConnect().catch(error => {
          console.error('Error in SSE connect hook:', error)
          sendEvent({
            type: 'error',
            message: error instanceof Error ? error.message : 'Connection failed',
            timestamp: new Date().toISOString()
          }, 'error')
        })
      }

      // Store cleanup function for cancel via outer closure variable
      cleanupFn = () => {
        isStreamActive = false
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
        if (options.onCleanup) {
          try {
            options.onCleanup()
          } catch (error) {
            console.error('Error in SSE cleanup:', error)
          }
        }
      }
    },

    cancel() {
      console.log('🛑 SSE stream cancelled')
      isStreamActive = false

      // Call stored cleanup if available
      if (cleanupFn) {
        try {
          cleanupFn()
        } catch (error) {
          console.error('Error in stream cancel cleanup:', error)
        }
      }
    }
  })

  return {
    stream,
    sendEvent: (data: unknown, event?: string) => {
      if (!sendEventFn) {
        console.error('⚠️  sendEvent called before stream initialization')
        return false
      }
      return sendEventFn(data, event)
    },
    isActive: () => isStreamActive
  }
}
