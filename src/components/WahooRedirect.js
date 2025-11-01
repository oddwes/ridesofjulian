"use client"

import { WAHOO_ACCESS_TOKEN_KEY, WAHOO_REFRESH_TOKEN_KEY, WAHOO_TOKEN_EXPIRY_KEY, exchangeWahooToken } from '../utils/WahooUtil';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const WahooRedirect = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function getTokens() {
      const authCode = searchParams.get('code');
      const returnPath = searchParams.get('state') || '/';
      
      if (!authCode) {
        router.push(returnPath);
        return;
      }

      try {
        const tokens = await exchangeWahooToken(authCode);
        localStorage.setItem(WAHOO_ACCESS_TOKEN_KEY, tokens.access_token);
        localStorage.setItem(WAHOO_REFRESH_TOKEN_KEY, tokens.refresh_token);
        localStorage.setItem(WAHOO_TOKEN_EXPIRY_KEY, tokens.expires_at);
        router.push(returnPath);
      } catch (error) {
        console.error('Error getting Wahoo tokens:', error);
        router.push(returnPath);
      }
    }
    getTokens();
  }, [router, searchParams]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
};

export default WahooRedirect;

