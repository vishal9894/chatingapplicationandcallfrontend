import React from 'react'
import { Route, Routes } from 'react-router-dom'
import HomeLayout from './layout/HomeLayout'
import Home from './pages/Home'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<HomeLayout />}/> 
        <Route index element={<Home />}/>
      </Routes>
    </div>
  )
}

export default App