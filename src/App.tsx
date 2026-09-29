import { Route, Routes } from 'react-router'
import './App.css'
import Login from './pages/login/login'
import Dashboard from './pages/dashboard/dashboard'

function App() {
  

  return (
    <>
      <Routes>
        <Route path='/login' element={<Login/>}/>
        <Route path='/' element={<Dashboard/>}/>
      </Routes>
    </>
  )
}

export default App
