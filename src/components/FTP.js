import { createContext, useContext } from "react"
import { Button, Form, InputGroup } from "react-bootstrap"

export const FtpContext = createContext(0)

export const FTP = ({ setFtp }) => {
  const ftp = useContext(FtpContext)

  return (
    <InputGroup className="mb-3">
      <Form.Control
        id="ftp_input"
        placeholder={ftp}
        type="number"
        style={{'-webkit-appearance': 'none',margin: 0}}
      />
      <Button
        variant="secondary"
        id="button-addon2"
        onClick={() => setFtp(document.getElementById('ftp_input').value)}
      >
        Set
      </Button>
    </InputGroup>
  )
}