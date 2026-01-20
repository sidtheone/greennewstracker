import './Error.css';

interface ErrorProps {
  message?: string;
  onRetry?: () => void;
}

export function Error({ message = 'Something went wrong. Please try again later.', onRetry }: ErrorProps) {
  return (
    <div className="error">
      <div className="error-icon" aria-hidden="true">⚠️</div>
      <h2 className="error-title">Error</h2>
      <p className="error-message">{message}</p>
      {onRetry && (
        <button className="error-retry" onClick={onRetry} aria-label="Retry">
          Try Again
        </button>
      )}
    </div>
  );
}
