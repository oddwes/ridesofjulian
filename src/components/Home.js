import { Navigate, useNavigate } from "react-router-dom"
import { getAthlete, getAthleteActivities, isLoggedIn } from "../strava/StravaUtil"
import { useEffect, useState } from "react"

const Home = () => {
  const navigate = useNavigate()

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
    if(isLoggedIn()) {
      loadAthlete()
      loadAthleteActivities()
    } else {
      navigate('/login')
    }
  }, [])

  return (
    <>
      <h1 style={{padding: '20px', 'text-align': 'center', color: 'white', 'background-color': '#FC5201'}}>RIDESOFJULIAN</h1>
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
    </>
  )
}

export default Home