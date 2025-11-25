'use client'

import { Auth } from '@supabase/auth-ui-react'
import { createBrowserClient } from '@supabase/ssr'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export default function AuthPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return (
    <div className="h-full grow flex flex-col justify-center items-center overflow-hidden p-8">
      <div className="w-full max-w-md">
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            style: {
              button: {
                justifyContent: 'center',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }
            }
          }}
          providers={['google']}
          view="sign_in"
          showLinks={false}
          socialLayout="vertical"
          onlyThirdPartyProviders={true}
          redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/auth/callback`}
        />
      </div>
    </div>
  )
}


