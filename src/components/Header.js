"use client";

import { ProfileButton } from './ProfileButton';

const Header = () => {
  return (
    <div className="py-6 relative">
      <a href="/" className="text-center block text-2xl cursor-pointer">
        TRAINHARD
      </a>
      <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}>
        <ProfileButton />
      </div>
    </div>
  )
}

export default Header