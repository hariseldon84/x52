'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@taskquest/ui';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic client-side validation
    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email before logging in. Check your inbox.');
        } else {
          throw error;
        }
      }
      
      if (data?.user) {
        // Success - redirect to dashboard or intended URL
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if user needs to complete profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('onboarded')
            .eq('id', user.id)
            .single();

          if (profileError || !profile?.onboarded) {
            router.push('/onboarding');
          } else {
            router.push('/dashboard');
          }
          router.refresh();
        }
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during login. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        if (error.message.includes('OAuth error')) {
          throw new Error('Unable to sign in with Google. Please try again.');
        }
        throw error;
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during Google login');
      console.error('Google OAuth error:', error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Sign in to your account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Or{' '}
          <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
            create a new account
          </Link>
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        <div className="space-y-4 rounded-md shadow-sm">
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Email address"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Password"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="remember-me" className="block ml-2 text-sm text-gray-700">
              Keep me signed in
            </label>
          </div>

          <div className="text-sm">
            <Link 
              href="/forgot-password" 
              className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline"
              onClick={(e) => {
                if (loading) e.preventDefault();
              }}
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            type="submit"
            className="flex justify-center w-full px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 mr-2 -ml-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </>
            ) : 'Sign in'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-500 bg-white">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.28426 53.749 C -8.52426 55.049 -9.21652 56.159 -10.0802 56.929 L -10.1062 56.929 L -6.086 60.139 L -6.11596 60.139 C -4.97176 61.199 -3.407 61.839 -1.634 61.839 C 1.876 61.839 4.746 58.969 4.746 55.239 C 4.746 54.479 4.65596 53.749 4.496 53.039 L 4.496 53.019 L 0.865 50.019 L 0.815 50.019 C -0.075 51.629 -1.334 52.969 -2.964 53.809 L -2.984 53.799 C -3.044 53.489 -3.264 52.929 -3.264 51.509 Z" transform="translate(0, 0)" />
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.816 60.149 L -10.086 57.119 C -11.146 58.089 -12.574 58.739 -14.114 58.739 C -16.944 58.739 -19.334 56.699 -20.084 54.019 L -24.074 54.019 L -24.074 57.289 C -22.084 61.239 -18.134 63.239 -14.754 63.239 Z" transform="translate(0, 0)" />
                <path fill="#FBBC05" d="M -20.084 54.019 C -20.444 52.809 -20.644 51.529 -20.644 50.239 C -20.644 48.949 -20.444 47.669 -20.084 46.459 L -20.084 43.189 L -24.074 42.109 C -25.244 44.519 -25.864 47.299 -25.864 50.239 C -25.864 53.179 -25.244 55.959 -24.074 58.369 L -20.084 54.019 Z" transform="translate(0, 0)" />
                <path fill="#EA4335" d="M -14.754 41.739 C -12.444 41.739 -10.384 42.629 -8.786 44.169 L -5.63596 41.129 C -8.33596 38.579 -12.274 37.239 -14.754 37.239 C -18.134 37.239 -22.084 39.239 -24.074 43.189 L -20.084 46.459 C -19.334 43.779 -16.944 41.739 -14.754 41.739 Z" transform="translate(0, 0)" />
              </g>
            </svg>
            {loading ? 'Signing in...' : 'Continue with Google'}
          </Button>
        </div>
      </form>

      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 text-gray-500 bg-white">Or continue with</span>
        </div>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          onClick={handleGoogleLogin}
          variant="outline"
          className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loading}
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
              <path
                fill="#4285F4"
                d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.28426 53.749 C -8.52426 55.229 -9.21677 56.479 -10.0802 57.329 L -10.0735 60.898 L -6.164 60.898 C -3.722 58.423 -2.5 55.119 -2.5 51.509 C -2.5 51.329 -2.5 51.149 -2.5 50.969 C -2.5 50.809 -2.5 50.659 -2.5 50.509 L -3.264 51.509 Z"
              />
              <path
                fill="#34A853"
                d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.164 60.898 L -10.0735 57.329 C -11.2435 58.049 -12.714 58.489 -14.754 58.489 C -17.564 58.489 -20.044 56.899 -20.944 54.689 L -24.954 54.689 L -25.054 58.359 C -22.554 63.169 -18.194 63.239 -14.754 63.239 Z"
              />
              <path
                fill="#FBBC05"
                d="M -20.944 54.689 C -21.464 53.039 -21.464 51.239 -20.944 49.589 L -20.944 45.919 L -25.054 45.919 C -26.944 49.539 -26.944 54.689 -25.054 58.359 L -20.944 54.689 Z"
              />
              <path
                fill="#EA4335"
                d="M -14.754 44.529 C -12.984 44.529 -11.404 45.149 -10.0735 46.179 L -6.164 42.609 C -8.804 41.339 -11.514 40.259 -14.754 40.259 C -18.194 40.259 -22.554 41.929 -25.054 46.079 L -20.944 49.589 C -20.044 47.369 -17.564 45.779 -14.754 45.779"
              />
            </g>
          </svg>
          {loading ? 'Signing in with Google...' : 'Sign in with Google'}
        </Button>
      </div>
    </div>
  );
}
