import { getAthlete, isLoggedIn } from "../utils/StravaUtil"
import { useEffect, useState } from "react"

import { Navigate } from "react-router-dom"

const Home = () => {
  const [athlete, setAthlete] = useState()

  const loadAthlete = async () => {
    const response = await getAthlete()
    setAthlete(response)
  }

  useEffect(() => {
    loadAthlete()
  }, [])

  return (
    <>
      <h1>THE BEST STRAVA DASHBOARD EVER</h1>
      <h2>Hello {athlete?.firstname}</h2>
      {!isLoggedIn() && <Navigate replace to="/login" />}
    </>
  )
}

export default Home