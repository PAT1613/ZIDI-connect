import { Toaster } from 'react-hot-toast';

export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: '13px',
            borderRadius: '8px',
            background: '#0f172a',
            color: '#f8fafc',
          },
          success: { iconTheme: { primary: '#0f766e', secondary: '#f8fafc' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#f8fafc' } },
        }}
      />
    </>
  );
}
