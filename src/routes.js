import { createBrowserRouter, redirect } from "react-router-dom";

import Calendar from "./components/Calendar";
import Home from "./components/Home";
import Login from "./components/Login";
import StravaRedirect from "./components/StravaRedirect";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/strava_redirect/exchange_token",
    element: <StravaRedirect />,
  },
  {
    path: "*",
    loader: () => { return redirect('/')}
  }
]);