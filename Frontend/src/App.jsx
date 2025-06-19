
import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import Layout from './components/Layout'
import New1Map from './Pages/NewMaps/New1Map';
import NewMapView2 from './Pages/NewMaps/NewMapView2'
import './App.css'
import './theme.css'

const libraries = ['places', 'maps'];

function App() {
return (
  <LoadScript googleMapsApiKey="AIzaSyA5bq2ACWz_-BDfsSE5DhgWT3lIhXDRGH0" libraries={libraries}>
      <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<New1Map />} />
              <Route path="/NewMapView2" element={<NewMapView2 />} />
            </Routes>
          </Layout>
      </Router>
</LoadScript>
  )
}

export default App
