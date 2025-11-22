"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ProfileButton } from './ProfileButton';
import { PlusCircle } from 'lucide-react';
import { addWorkoutAPI } from '@/lib/api/workouts';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isCreating, setIsCreating] = useState(false);

  const handleAddWorkout = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const newWorkoutId = await addWorkoutAPI({ datetime: new Date().toISOString() });
      router.push(`/workout/${newWorkoutId}`);
    } catch (error) {
      console.error('Error creating workout:', error);
      setIsCreating(false);
    }
  };

  return (
    <div className="py-6 relative">
      {pathname === '/' && (
        <div className="md:hidden" style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }}>
          <button 
            onClick={handleAddWorkout} 
            disabled={isCreating}
            className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusCircle className="text-blue-600 hover:text-blue-700" size={32} />
          </button>
        </div>
      )}
      <Link href="/" className="text-center block text-2xl cursor-pointer">
        TRAINHARD
      </Link>
      <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}>
        <ProfileButton />
      </div>
    </div>
  )
}

export default Header