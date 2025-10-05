// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthForm.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const params = new URLSearchParams();
    params.append('username', formData.username);
    params.append('password', formData.password);
    axios.post('http://127.0.0.1:8000/token', params)
      .then(response => {
        setIsLoading(false);
        login(response.data.access_token);
        navigate('/dashboard'); // Redirect to dashboard
      })
      .catch(err => {
        setIsLoading(false);
        if (err.response?.data?.detail) {
          setError(err.response.data.detail);
        } else {
          setError('An unexpected error occurred. Please try again.');
        }
      });
  };

  return (
    <div className="auth-container">
      <h1>Log In</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <input type="email" name="username" placeholder="Email Address" value={formData.username} onChange={handleInputChange} required />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleInputChange} required />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging In...' : 'Log In'}
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
};
export default LoginPage;