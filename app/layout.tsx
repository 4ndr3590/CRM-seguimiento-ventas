import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'CRM Seguimiento de Ventas | Gestión Integral y Trazabilidad',
  description:
    'CRM para administración del ciclo completo de seguimiento de clientes vendidos con trazabilidad histórica en Firebase Firestore y dashboard ejecutivo en tiempo real.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased selection:bg-blue-600 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
