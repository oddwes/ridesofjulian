"use client"

import { useMediaQuery } from '../hooks/useMediaQuery'
import DesktopHome from './DesktopHome'
import MobileHome from './MobileHome'

const Home = () => {
  const isMobile = useMediaQuery('(max-width: 768px)')
  
  return isMobile ? <MobileHome /> : <DesktopHome />
}

export default Home

