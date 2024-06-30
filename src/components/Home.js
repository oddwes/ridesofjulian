import { Col, Container, Row } from "react-bootstrap"
import { getAthleteActivities, isLoggedIn } from "../utils/StravaUtil"
import { useEffect, useState } from "react"

import Calendar from "./Calendar"
import Loading from "./Loading"
import ReactSelect from "react-select"
import Totals from "./Totals"
import dayjs from "dayjs"
import { useNavigate } from "react-router-dom"

const Home = () => {
  const yearOptions = [
    { value: 2024, label: 2024 },
    { value: 2023, label: 2023 },
    { value: 2022, label: 2022 },
    { value: 2021, label: 2021 },
    { value: 2020, label: 2020 },
    { value: 2019, label: 2019 },
  ]

  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [athleteActivities, setAthleteActivities] = useState([{}])
  const [selectedYear, setSelectedYear] = useState(yearOptions[0])

  useEffect(() => {
    if(isLoggedIn()) {
      async function loadAthleteActivities() {
        const response = await getAthleteActivities(selectedYear.value)
        response.sort((a,b) => dayjs(b.start_date) - dayjs(a.start_date))

        setAthleteActivities(response)
        setIsLoading(false)
      }
      loadAthleteActivities()
    } else {
      navigate('/login')
    }
  }, [navigate, selectedYear])

  const start = selectedYear.value === dayjs().year()
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
        <Row>
          <Col xs={10}>
            <Calendar start={start} activities={athleteActivities} />
          </Col>
          <Col xs={2}>
            <Totals athleteActivities={athleteActivities} />
          </Col>
        </Row>
      }
    </Container>
  )
}

export default Home