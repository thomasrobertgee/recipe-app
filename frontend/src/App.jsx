// src/App.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import SpecialsPage from './pages/SpecialsPage';
import './App.css';

function App() {
  return (
    <div>
      <Navbar />
      <main className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/specials" element={<SpecialsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;