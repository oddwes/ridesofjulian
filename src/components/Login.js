import '../styling/strava.css';

import { isLoggedIn, login } from '../utils/StravaUtil';

import { Navigate } from 'react-router-dom';
import strava_logo from '../assets/images/strava-logo.svg';

const Login = () => {
  const loginButton = (
    <div className="flex justify-center">
      <button className="border rounded p-3 drop-shadow-md" onClick={login} type="button">
        <img src={strava_logo} width="50" height="50" alt="strava_logo" />
        <span className="font-bold text-xl"> Login</span>
      </button>
    </div>
  );

  return isLoggedIn() ? <Navigate replace to="/" /> : loginButton;
};

export default Login;
