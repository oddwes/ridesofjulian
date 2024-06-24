import { Navigate, useNavigate } from "react-router-dom"
import { getAthlete, getAthleteActivities, isLoggedIn } from "../strava/StravaUtil"
import { useEffect, useState } from "react"

const Home = () => {
  const navigate = useNavigate()

  const [athlete, setAthlete] = useState()
  const [athleteActivities, setAthleteActivities] = useState([{}])
  const [selectedYear, setSelectedYear] = useState(2024)

  const loadAthlete = async () => {
    const response = await getAthlete()
    setAthlete(response)
  }

  const loadAthleteActivities = async () => {
    const response = await getAthleteActivities(selectedYear)
    setAthleteActivities(response)
  }

  const getTotalTime = () => {
    let totalRideTime = athleteActivities.map((activity) => activity.moving_time).reduce((partialSum, a) => partialSum + a, 0)
    return (totalRideTime / 3600).toFixed(2)
  }

  const getTotalDistance = () => {
    let totalRideDistance = athleteActivities.map((activity) => activity.distance).reduce((partialSum, a) => partialSum + a, 0)
    return (totalRideDistance / 1000).toFixed(2)
  }

  useEffect(() => {
    if(isLoggedIn()) {
      loadAthlete()
      loadAthleteActivities()
    } else {
      navigate('/login')
    }
  }, [selectedYear])

  return (
    <>
      <h1 style={{padding: '20px', textAlign: 'center', color: 'white', backgroundColor: '#FC5201'}}>RIDESOFJULIAN</h1>
      <h2>Hello {athlete?.firstname}</h2>
      <select
        default={selectedYear}
        onChange={e => setSelectedYear(e.target.value)}
      >
        <option value='2024'>2024</option>
        <option value='2023'>2023</option>
        <option value='2022'>2022</option>
        <option value='2021'>2021</option>
        <option value='2020'>2020</option>
      </select>
      <h2>Total ride time: {getTotalTime()} hours</h2>
      <h2>Total distance: {getTotalDistance()} KMs</h2>
      <h2>Ride count: {athleteActivities.length}</h2>
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