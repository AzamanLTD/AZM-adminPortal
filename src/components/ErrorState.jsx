import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/forge';

/**
 * Reusable error state for when a query or mutation fails.
 * Shows a message and optional retry button.
 */
export default function ErrorState({ message = 'Something went wrong.', onRetry, compact = false }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-bad py-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>{message}</span>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="h-7 px-2 text-xs">
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="w-10 h-10 text-bad/60 mb-3" />
      <p className="text-ink-2 text-sm mb-3">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}
