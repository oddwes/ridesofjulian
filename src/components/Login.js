import '../styling/strava.css';

import { isLoggedIn, login } from "../utils/StravaUtil"

import { Navigate } from 'react-router-dom';
import strava_logo from "../assets/images/strava-logo.svg"

const Login = () => {
  const loginButton =
    <button className="strava-button" onClick={login}>
      <img src={strava_logo} width="50" height="50" alt="strava logo"/>
      <span style={{fontWeight: "bold"}}>Login</span>
    </button>

  return (
    isLoggedIn() ? <Navigate replace to="/" /> : loginButton
  )
}

export default Login