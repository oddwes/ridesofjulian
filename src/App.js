import Header from "./components/Header";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { BikeTrails } from "./components/BikeTrails"

function App() {
  return (
    <div className="App">
      <BikeTrails />
      <Header />
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
