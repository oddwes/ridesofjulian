"use client";

import { ProfileButton } from './ProfileButton';

const Header = () => {
  return (
    <div className="py-6 relative">
      <p className="text-center text-2xl">TRAINHARD</p>
      <div style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)' }}>
        <ProfileButton />
      </div>
    </div>
  )
}

export default Header