import { Col, Container, Row } from "react-bootstrap"
import { getAthlete, getAthleteActivities, isLoggedIn } from "../utils/StravaUtil"
import { useEffect, useState } from "react"

import Calendar from "./Calendar"
import Loading from "./Loading"
import ReactSelect from "react-select"
import dayjs from "dayjs"
import { useNavigate } from "react-router-dom"

const Home = () => {
  const yearOptions = [
    { value: '2024', label: 2024 },
    { value: '2023', label: 2023 },
    { value: '2022', label: 2022 },
    { value: '2021', label: 2021 },
    { value: '2020', label: 2020 },
    { value: '2019', label: 2019 },
  ]

  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [athleteActivities, setAthleteActivities] = useState([{}])
  const [selectedYear, setSelectedYear] = useState(yearOptions[0])

  const loadAthleteActivities = async () => {
    const response = await getAthleteActivities(selectedYear.value)
    response.sort((a,b) => dayjs(b.start_date) - dayjs(a.start_date))

    setAthleteActivities(response)
    setIsLoading(false)
  }

  const getTotalTime = () => {
    let totalRideTime = athleteActivities.map((activity) => activity.moving_time).reduce((partialSum, a) => partialSum + a, 0)
    return (totalRideTime / 3600).toFixed(2)
  }

  const getTotalDistance = () => {
    let totalRideDistance = athleteActivities.map((activity) => activity.distance).reduce((partialSum, a) => partialSum + a, 0)
    return (totalRideDistance / 1000).toFixed(2)
  }

  const getTotalElevation = () => {
    return athleteActivities.map((activity) => activity.total_elevation_gain).reduce((partialSum, a) => partialSum + a, 0)
  }

  useEffect(() => {
    if(isLoggedIn()) {
      loadAthleteActivities()
    } else {
      navigate('/login')
    }
  }, [selectedYear])

  const start = selectedYear.value == dayjs().year()
    ? dayjs()
    : dayjs(`${selectedYear.value}-12-31`)

  return (
    <Container fluid>
      <Row className="justify-content-md-center">
        <Col xs={1} style={{padding:'10px'}}>
          <ReactSelect
            options={yearOptions}
            value={selectedYear}
            onChange={e => {
              setIsLoading(true)
              setSelectedYear(e)
            }}
          />
        </Col>
      </Row>
      {isLoading && <Loading />}
      {!isLoading &&
        <>
          <Row>
            <Col><h2 style={{textAlign: 'center'}}>Total ride time: {getTotalTime()} hours</h2></Col>
            <Col><h2 style={{textAlign: 'center'}}>Total distance: {getTotalDistance()} km</h2></Col>
            <Col><h2 style={{textAlign: 'center'}}>Total elevation: {getTotalElevation()} m</h2></Col>
            <Col><h2 style={{textAlign: 'center'}}>Ride count: {athleteActivities.length}</h2></Col>
          </Row>
          <Calendar start={start} activities={athleteActivities} />
        </>
      }
    </Container>
  )
}

export default Home