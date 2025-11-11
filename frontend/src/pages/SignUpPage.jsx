// src/pages/SignUpPage.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './AuthForm.css';

function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // <-- NEW: Add isLoading
    const { loginWithGoogle, loginWithToken } = useAuth(); // <-- Get loginWithToken
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError('');
        setIsLoading(true); // <-- NEW: Set loading
        try {
            const res = await axios.post('/register', { email, password });
            
            // --- UPDATED LOGIC ---
            // Call the new function. It will handle saving the token,
            // fetching the profile, and navigating to the correct dashboard.
            await loginWithToken(res.data.access_token);
            // toast.success is now handled inside loginWithToken
            // navigate() is now handled inside loginWithToken
            // --- END UPDATED LOGIC ---

        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to sign up.');
            setIsLoading(false); // <-- NEW: Set loading false on error
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            // --- FIX: Pass the credential string, not the whole object ---
            await loginWithGoogle(credentialResponse.credential);
            // --- END FIX ---
            // Navigation and toast are handled by loginWithGoogle
        } catch (err) {
            // loginWithGoogle will toast, just set local error
            setError("Google sign up failed. Please try again.");
        }
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
                
                {/* --- NEW: Disable button on loading --- */}
                <button type="submit" className="auth-button" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                </button>

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