// src/pages/SignUpPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import api from '../api'; // Import the api instance
import './AuthForm.css';

const SignUpPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth(); // We only need the login function from context
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Step 1: Register the new user
            await api.post('/register', { email, password });

            // Step 2: Immediately log the new user in to get a token
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const tokenResponse = await api.post('/token', formData, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            // Step 3: Use the context's login function to set the token globally
            if (tokenResponse.data.access_token) {
                login(tokenResponse.data.access_token);
                navigate('/dashboard');
                toast.success('Sign up successful! Welcome!');
            } else {
                // This case should ideally not be hit if registration works
                throw new Error("Signup succeeded but failed to log in.");
            }

        } catch (error) {
            const errorMessage = error.response?.data?.detail || 'An error occurred during sign up.';
            toast.error(errorMessage);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>Sign Up</h2>
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                    />
                </div>
                <button type="submit">Sign Up</button>
            </form>
        </div>
    );
};

export default SignUpPage;