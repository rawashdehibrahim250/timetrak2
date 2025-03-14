import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      navigate('/welcome');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-xl bg-primary-100">
            <LogIn className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-display font-semibold text-neutral-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-neutral-600">
            Sign in to your TimeTrack Pro account
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="form-label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="form-input mt-1"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="form-input mt-1"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>

            <div className="text-sm text-center">
              <Link
                to="/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Don't have an account? Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}