import { AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useHRMS } from '@/lib/store'

export function InitialDataBanner() {
  const { initialDataStatus, initialDataError, retryInitialData } = useHRMS()

  if (initialDataStatus !== 'error' || !initialDataError) {
    return null
  }

  return (
    <div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 sm:px-6">
      <Alert variant="destructive" className="border-destructive/30 bg-white/90">
        <AlertCircle className="text-destructive" />
        <AlertTitle>Connection problem</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-destructive/90">{initialDataError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 shrink-0 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => retryInitialData()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  )
}
