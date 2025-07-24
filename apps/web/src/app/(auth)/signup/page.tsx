'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check if email already exists
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            // Add any additional user metadata here
            signup_date: new Date().toISOString(),
          },
        },
      });

      if (signUpError) {
        // Handle specific error cases
        if (signUpError.message.includes('already registered')) {
          throw new Error('This email is already registered. Please try logging in instead.');
        } else if (signUpError.message.includes('password')) {
          throw new Error('Please choose a strong password (min 6 characters, must be strong)');
        } else {
          throw signUpError;
        }
      }
      
      if (user) {
        // Show success message with more details
        setError(null);
        alert(`Success! Please check your email (${email}) for the verification link to complete your registration.`);
        router.push('/login');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Create your account</h2>
        <p className="mt-2 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <form className="mt-8 space-y-6" onSubmit={handleSignup}>
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
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Password (min 6 characters)"
            />
          </div>
        </div>

        <div>
          <Button
            type="submit"
            className="flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </div>
      </form>

      <div className="relative mt-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 text-gray-500 bg-white">Or sign up with</span>
        </div>
      </div>

      <div className="mt-6">
        <Button
          type="button"
          onClick={() => {
            setLoading(true);
            supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: `${window.location.origin}/auth/callback`,
              },
            });
          }}
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
          {loading ? 'Signing up with Google...' : 'Sign up with Google'}
        </Button>
      </div>

      <div className="mt-4 space-y-2 text-xs text-center text-gray-500">
        <p>
          By signing up, you agree to our{' '}
          <a href="/terms" className="font-medium text-indigo-600 hover:text-indigo-500">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="font-medium text-indigo-600 hover:text-indigo-500">
            Privacy Policy
          </a>
          .
        </p>
        <p>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
