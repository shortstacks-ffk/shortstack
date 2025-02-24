interface LoadingStateProps {
    items?: number;
    className?: string;
  }
  
  export function LoadingState({ items = 3, className }: LoadingStateProps) {
    return (
      <div className={`animate-pulse space-y-6 ${className}`}>
        <div className="h-8 w-48 bg-gray-200 rounded"></div>
        <div className="space-y-4">
          {Array.from({ length: items }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded w-full"></div>
          ))}
        </div>
      </div>
    );
  }