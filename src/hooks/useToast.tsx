import { useState, useCallback, useEffect } from 'react';

interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

export const useToast = () => {
  const [toast, setToast] = useState<ToastOptions | null>(null);

  const showToast = useCallback(({ message, type = 'success', duration = 3000 }: ToastOptions) => {
    setToast({ message, type, duration });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        hideToast();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  const ToastContainer = () => {
    if (!toast) return null;

    let alertClass = 'alert';
    switch (toast.type) {
      case 'success':
        alertClass += ' alert-success';
        break;
      case 'error':
        alertClass += ' alert-error';
        break;
      case 'warning':
        alertClass += ' alert-warning';
        break;
      case 'info':
        alertClass += ' alert-info';
        break;
      default:
        alertClass += ' alert-success';
    }

    return (
      <div className="toast toast-top toast-center z-[1000]">
        <div className={`${alertClass} shadow-lg`}>
          {toast.type === 'success' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {toast.type === 'warning' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          {toast.type === 'info' && (
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      </div>
    );
  };

  return { showToast, hideToast, ToastContainer };
};
