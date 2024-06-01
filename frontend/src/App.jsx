
import { Home } from './pages/Home'
import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
  Routes
} from 'react-router-dom'
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Layout from './views/Layout';
import { Play } from './pages/Play';
import { SocketProvider } from './context/SocketContext';
import { Listen } from './pages/Listen';
function App() {


  const router = createBrowserRouter(
    createRoutesFromElements(

      <Route path='/' element={<Layout />}>
        <Route path="" element={<Home />}>
          <Route path="play" element={<Play />} />
          <Route path='listen' element={<Listen />} />
        </Route>
      </Route>
    )
  )

  return (
    <SocketProvider>

      <div>
        <ToastContainer />
        <RouterProvider router={router} />

      </div>
    </SocketProvider>
  );
}

export default App