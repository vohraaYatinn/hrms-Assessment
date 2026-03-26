import { useEffect, useState, type ReactNode } from 'react'
import { fetchBackendHealth } from '../../backend/api.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

const QUICK_HEALTH_MS = 10_000
const WAKE_HEALTH_MS = 55_000
const RETRY_PAUSE_MS = 3000

type Phase = 'checking' | 'waking' | 'ready'

export function BackendWakeGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [elapsedSec, setElapsedSec] = useState(0)

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsedSec((s) => s + 1)
    }, 1000)

    let cancelled = false

    async function waitPause() {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, RETRY_PAUSE_MS)
      })
    }

    async function run() {
      if (await fetchBackendHealth(QUICK_HEALTH_MS)) {
        if (!cancelled) setPhase('ready')
        return
      }
      if (cancelled) return
      setPhase('waking')

      while (!cancelled) {
        if (await fetchBackendHealth(WAKE_HEALTH_MS)) {
          if (!cancelled) setPhase('ready')
          return
        }
        if (cancelled) return
        await waitPause()
      }
    }

    void run()

    return () => {
      cancelled = true
      window.clearInterval(tick)
    }
  }, [])

  if (phase === 'ready') {
    return children
  }

  const title =
    phase === 'checking' ? 'Connecting to HRMS' : 'Waking the HRMS server'
  const description =
    phase === 'checking'
      ? 'Checking whether the API is reachable.'
      : 'The API is hosted on Render and may be asleep. Starting it can take up to a minute. Please wait — we are pinging the server until it responds.'

  return (
    <div className="flex min-h-[100svh] items-center justify-center bg-[linear-gradient(180deg,#f8faff_0%,#f0f4fc_100%)] p-6">
      <Card className="w-full max-w-md border-[#2b418c]/20 shadow-lg">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <Spinner className="size-8 text-[#2b418c]" />
            <CardTitle className="text-xl text-[#1a2654]">{title}</CardTitle>
          </div>
          <CardDescription className="text-base leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-2xl font-semibold tabular-nums text-[#2b418c]">
            {elapsedSec}s
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Elapsed time — you can leave this tab open.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
