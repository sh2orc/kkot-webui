interface LoadingProps {
  text?: string;
  className?: string;
  fullScreen?: boolean;
}

export default function Loading({ text = 'Loading...', className = '', fullScreen = true }: LoadingProps) {
  const baseClasses = fullScreen 
    ? `min-h-screen flex items-center justify-center bg-gray-50`
    : `flex-1 flex items-center justify-center`;
    
  return (
    <div className={`${baseClasses} ${className}`}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
} 