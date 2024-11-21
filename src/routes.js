import { createBrowserRouter, redirect } from 'react-router-dom';

import Home from './components/Home';
import Login from './components/Login';
import StravaRedirect from './components/StravaRedirect';
import { Workouts } from './components/workouts/Workouts';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/workouts',
    element: <Workouts />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/exchange_token',
    element: <StravaRedirect />
  },
  {
    path: '*',
    loader: () => {
      return redirect('/');
    }
  }
]);
