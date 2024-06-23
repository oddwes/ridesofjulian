import { getAtheleteStats, getAthlete, getAthleteActivities, isLoggedIn } from "../utils/StravaUtil"
import { useEffect, useState } from "react"

import { Navigate } from "react-router-dom"

const Home = () => {
  const [athlete, setAthlete] = useState()
  const [athleteActivities, setAthleteActivities] = useState([{}])

  const loadAthlete = async () => {
    const response = await getAthlete()
    setAthlete(response)
  }

  const loadAthleteActivities = async () => {
    const response = await getAthleteActivities()
    setAthleteActivities(response)
    console.log(response)
  }

  const getTotalTime = () => {
    let totalRideTime = athleteActivities.map((activity) => activity.elapsed_time).reduce((partialSum, a) => partialSum + a, 0)
    return totalRideTime / 3600
  }

  const getTotalDistance = () => {
    let totalRideDistance = athleteActivities.map((activity) => activity.distance).reduce((partialSum, a) => partialSum + a, 0)
    return totalRideDistance / 1000
  }

  useEffect(() => {
    loadAthlete()
    loadAthleteActivities()
  }, [])

  return (
    <>
      <h1>HOMEPAGE</h1>
      <h2>Hello {athlete?.firstname}</h2>
      <h2>Total ride time this year: {getTotalTime()} hours</h2>
      <h2>Total ride time this year: {getTotalDistance()} KMs</h2>
      {
        athleteActivities.map((activity) => {
          return (
            <pre key={activity.id}>
              {JSON.stringify(activity, null, 0)}
            </pre>
          )
        })
      }
      {!isLoggedIn() && <Navigate replace to="/login" />}
    </>
  )
}

export default Home