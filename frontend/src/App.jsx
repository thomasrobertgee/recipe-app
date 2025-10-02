// src/App.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify'; // Import from react-toastify
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import SpecialsPage from './pages/SpecialsPage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import './App.css';

function App() {
  return (
    <div>
      {/* Replace Toaster with ToastContainer */}
      <ToastContainer position="top-center" autoClose={5000} hideProgressBar={false} />
      <Navbar />
      <main className="app-container">
        <Routes>
          {/* (Routes are unchanged) */}
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/specials" element={<SpecialsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Routes>
      </main>
    </div>
  );
}

export default App;