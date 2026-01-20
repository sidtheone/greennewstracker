import './Loading.css';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
}

export function Loading({ size = 'medium', message }: LoadingProps) {
  return (
    <div className={`loading loading-${size}`}>
      <div className="loading-spinner" aria-label="Loading" role="status">
        <svg className="loading-svg" viewBox="0 0 50 50">
          <circle
            className="loading-circle"
            cx="25"
            cy="25"
            r="20"
            fill="none"
            strokeWidth="4"
          />
        </svg>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
}
