// src/App.jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import SpecialsPage from './pages/SpecialsPage';
import SignUpPage from './pages/SignUpPage'; // Import SignUpPage
import LoginPage from './pages/LoginPage';   // Import LoginPage
import './App.css';

function App() {
  return (
    <div>
      <Navbar />
      <main className="app-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/specials" element={<SpecialsPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;