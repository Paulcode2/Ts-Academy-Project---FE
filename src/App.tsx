import { Navigate, Route, Routes } from 'react-router'
import './App.css'
import Login from './pages/login/login'
import Dashboard from './pages/dashboard/dashboard'
import Warehouse from './pages/Warehouses/warehouse'
import Transfers from './pages/transfers/transfers'
import Users from './pages/users/users' 
import ProtectedRoute from './pages/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path='/login' element={<Login />} />
      <Route path='/warehouses' element={<ProtectedRoute><Warehouse /></ProtectedRoute>} />
      <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path='/transfers' element={<ProtectedRoute><Transfers /></ProtectedRoute>} />
      <Route path='/users' element={<ProtectedRoute><Users /></ProtectedRoute>} />
    </Routes>
  )
}

export default App
