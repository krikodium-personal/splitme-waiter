import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';

const LoginPage: React.FC<{ onLoginSuccess: (waiter: any, restaurant: any) => void }> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const emailNormalized = email.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailNormalized,
        password,
      });

      if (authError) {
        const msg = authError.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos. Revisa que el usuario exista en Supabase Auth y que waiters.user_id esté vinculado.'
          : authError.message;
        throw new Error(msg);
      }
      if (!authData.user) throw new Error('No se pudo recuperar la información del usuario.');

      const { data: waiter, error: waiterError } = await supabase
        .from('waiters')
        .select('id, restaurant_id, full_name, nickname, profile_photo_url')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (waiterError) throw new Error('Error al consultar mesero.');
      if (!waiter) {
        await supabase.auth.signOut();
        throw new Error('No tienes acceso como mesero. Contacta al administrador.');
      }

      const { data: restaurant, error: restError } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('id', waiter.restaurant_id)
        .single();

      if (restError || !restaurant) {
        await supabase.auth.signOut();
        throw new Error('Restaurante no encontrado.');
      }

      onLoginSuccess(waiter, restaurant);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg mb-6">
            S
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">
            Splitme <span className="text-indigo-500">Meseros</span>
          </h1>
          <p className="text-gray-500 text-xs mt-2 font-medium uppercase tracking-widest">
            Acceso Meseros
          </p>
        </div>

        <div className="bg-white border border-gray-100 p-8 rounded-3xl shadow-sm">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Email</label>
              <div className="relative mt-1">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mesero@restaurante.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Contraseña</label>
              <div className="relative mt-1">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3.5 pl-12 pr-12 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-3 text-rose-600">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-xs font-bold">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-md hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              Entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
