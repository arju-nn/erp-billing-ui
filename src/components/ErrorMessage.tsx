interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export default function ErrorMessage({ message, onRetry, title = 'Something went wrong' }: ErrorMessageProps) {
  return (
    <div className="alert alert-error" role="alert">
      <div>
        <strong>{title}</strong>
        <div>{message}</div>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}