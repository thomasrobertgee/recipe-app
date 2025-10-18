// src/pages/SignUpPage.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google'; // <-- IMPORT
import { useAuth } from '../context/AuthContext'; // <-- IMPORT
import { toast } from 'react-toastify';
import './AuthForm.css';

function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { loginWithGoogle } = useAuth(); // <-- GET THE FUNCTION
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    try {
      await axios.post('http://127.0.0.1:8000/register', { email, password });
      toast.success('Sign up successful! Please log in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sign up.');
    }
  };

  // --- NEW: ADD GOOGLE HANDLERS ---
  const handleGoogleSuccess = (credentialResponse) => {
    // This same function works for both login and signup
    loginWithGoogle(credentialResponse);
  };

  const handleGoogleError = () => {
    console.error("Google Login Failed");
    setError("Google sign up failed. Please try again.");
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Sign Up</h2>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="8"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        
        {error && <p className="auth-error">{error}</p>}
        
        <button type="submit" className="auth-button">Sign Up</button>

        {/* --- NEW: ADD DIVIDER AND BUTTON --- */}
        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="google-login-container">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
            theme="outline"
            size="large"
            width="100%"
          />
        </div>
        
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </form>
    </div>
  );
}

export default SignUpPage;