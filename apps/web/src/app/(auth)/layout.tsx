import { Inter } from 'next/font/google'
import '../globals.css'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

const inter = Inter({ subsets: ['latin'] })

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
            <div className="text-center">
              <h1 className="text-3xl font-extrabold text-gray-900">
                TaskQuest
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Your gamified productivity journey begins here
              </p>
            </div>
            {children}
          </div>
        </main>
      </body>
    </html>
  )
}
