import {  Route, Routes } from 'react-router'
import './App.css'
import Login from './pages/login/login'
import Dashboard from './pages/dashboard/dashboard'
import Warehouse from './pages/Warehouses/warehouse'
import ProtectedRoute from './pages/ProtectedRoute'

function App() {
  

  return (
      <Routes>
        <Route path='/login' element={<Login/>}/>
        <Route path='/warehouses' element={<ProtectedRoute><Warehouse/></ProtectedRoute>}/>
        <Route path='/dashboard' element={<ProtectedRoute><Dashboard/></ProtectedRoute>}/>
      </Routes>
   
  )
}

export default App
