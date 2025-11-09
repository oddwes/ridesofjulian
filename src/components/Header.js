"use client";

import { ProfileButton } from './ProfileButton';
import Link from 'next/link';

const Header = () => {
  return (
    <div className="py-6 relative">
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