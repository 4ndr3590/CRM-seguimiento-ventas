'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  Activity,
  AlertCircle,
  Database,
  ArrowRight,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await login(email, password);
      if (!res.success) {
        setError(res.error || 'Credenciales inválidas.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden select-none">
      {/* Decorative Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 mb-2">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            CRM SEGUIMIENTO VENTAS
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Plataforma de administración y trazabilidad completa del ciclo de clientes vendidos en tiempo real.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-5">
          <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>Inicio de Sesión</span>
            </h2>
            <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              En Línea
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-950/80 border border-rose-800/80 text-rose-300 p-3 rounded-xl text-xs flex items-start gap-2.5 animate-fade-in shadow-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Email Field */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@crmventas.com"
                  autoComplete="email"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-10 py-2.5 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword(!mostrarPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 transition"
                  tabIndex={-1}
                >
                  {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={cargando || !email.trim() || !password.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition disabled:opacity-50 mt-4"
            >
              {cargando ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-2 text-center text-[11px] text-slate-500">
            Acceso estrictamente reservado para usuarios autorizados.
          </div>
        </div>

        {/* Footer Security Pill */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          <span>Sincronización en tiempo real protegida por Firebase Cloud Firestore</span>
        </div>
      </div>
    </div>
  );
};
