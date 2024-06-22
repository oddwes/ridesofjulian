import '../styling/strava.css';

import { login } from "../utils/StravaUtil"
import strava_logo from "../assets/images/strava-logo.svg"

const Login = () => {
  return (
    <div className="vertical-center">
      <button className="strava-button" onClick={login}>
        <img src={strava_logo} width="50" height="50" alt="strava logo"/>
        <span style={{fontWeight: "bold"}}>Login</span>
      </button>
    </div>
  )
}

export default Login