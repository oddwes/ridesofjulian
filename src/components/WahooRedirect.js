"use client"

import { exchangeWahooToken } from '../utils/WahooUtil';
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
        await exchangeWahooToken(authCode);
        router.push(returnPath);
      } catch (error) {
        console.error('Error getting Wahoo tokens:', error);
        if (error.message === 'TOO_MANY_TOKENS') {
          alert('Too many Wahoo tokens exist. Please:\n1. Open browser DevTools (F12)\n2. Go to Application > Local Storage\n3. Clear all wahoo_* entries\n4. Try logging in again\n\nIf this persists, contact Wahoo support to manually revoke tokens.');
        }
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

