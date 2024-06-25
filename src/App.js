import { RouterProvider } from "react-router-dom";
import { router } from "./routes";

function App() {
  return (
    <div className="App">
      <h1 style={{padding: '20px', textAlign: 'center', color: 'white', backgroundColor: '#FC5201'}}>RIDESOFJULIAN</h1>
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
