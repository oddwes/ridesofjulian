"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ProfileButton } from './ProfileButton';
import { PlusCircle, Menu } from 'lucide-react';
import { addWorkoutAPI } from '@/lib/api/workouts';

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isCreating, setIsCreating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  const navItems = [
    { label: 'Calendar', href: '/' },
    { label: 'Coach', href: '/coach' },
  ];

  return (
    <>
      <div className="py-6 relative">
        <div
          className="md:hidden flex items-center gap-3"
          style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }}
        >
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-slate-800/60"
          >
            <Menu className="text-blue-600" size={26} />
          </button>
          {pathname === '/' && (
            <button 
              onClick={handleAddWorkout} 
              disabled={isCreating}
              className="w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="text-blue-600 hover:text-blue-700" size={32} />
            </button>
          )}
        </div>
        <Link href="/" className="text-center block text-2xl cursor-pointer">
          TRAINHARD
        </Link>
        <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}>
          <ProfileButton />
        </div>
      </div>

      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          className="absolute inset-0 bg-black/40"
          onClick={() => setIsSidebarOpen(false)}
        />
        <div
          className={`absolute inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-800 p-6 flex flex-col justify-between transform transition-transform duration-200 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div>
            <div className="mb-6">
              <span className="text-sm font-semibold text-slate-400">Navigate</span>
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`block py-2 text-base ${
                      active ? 'text-blue-400 font-semibold' : 'text-slate-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Link
            href="/profile"
            onClick={() => setIsSidebarOpen(false)}
            className={`mt-6 block py-2 text-base ${
              pathname === '/profile' ? 'text-blue-400 font-semibold' : 'text-slate-100'
            }`}
          >
            Profile
          </Link>
        </div>
      </div>
    </>
  )
}

export default Header