import { Col, Row } from "react-bootstrap"
import { Rings } from "react-loader-spinner"

const Loading = () => {
  return (
    <h2>
      <Row className="justify-content-md-center align-items-center">
        <Col xs={1}>
          <Rings
            visible={true}
            height="80"
            width="80"
            color="#FC5201"
            ariaLabel="rings-loading"
            wrapperStyle={{}}
            wrapperClass=""
          />
        </Col>
        {/* <Col xs={1}>loading...</Col> */}
      </Row>
    </h2>
  )
}

export default Loading