"use client"

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { exchangeWahooToken } from '../utils/WahooUtil';
import { LoadingSpinner } from './LoadingSpinner';

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
          alert('Old tokens revoked. Please try logging in again.');
        }
        router.push(returnPath);
      }
    }
    getTokens();
  }, [router, searchParams]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <LoadingSpinner />
    </div>
  );
};

export default WahooRedirect;

