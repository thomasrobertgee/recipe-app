// src/pages/SupplierSignUpPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
// --- UPDATED: Import the new supplier auth CSS ---
import './SupplierAuth.css';

const SupplierSignUpPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // --- REMOVED: businessName, address, postcode states ---
    
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // --- REMOVED: Validation for businessName and postcode ---

        setIsLoading(true);
        try {
            const payload = {
                user: {
                    email,
                    password
                }
                // --- REMOVED: profile object ---
            };
            
            await axios.post('/register/supplier', payload);
            
            toast.success("Supplier account created! Please log in.");
            // --- UPDATED: Navigate to supplier login page ---
            navigate('/portal/login');

        } catch (err) {
            console.error("Supplier signup error:", err);
            setError(err.response?.data?.detail || "An unknown error occurred.");
            toast.error(err.response?.data?.detail || "Signup failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        // --- UPDATED: Add the new wrapper class ---
        <div className="auth-form-container supplier-auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Create Your Supplier Account</h2>
                <p>Start listing your specials and reach local customers.</p>
                
                {error && <div className="error-message">{error}</div>}

                <div className="form-group">
                    <label htmlFor="email">Email Address</label>
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
                        minLength="8"
                        required
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

                {/* --- REMOVED: Divider and profile fields (businessName, postcode, address) --- */}
                
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                </button>

                <div className="form-footer">
                    {/* --- UPDATED: Link to supplier login page --- */}
                    <p>Already have an account? <Link to="/portal/login">Log In</Link></p>
                    <p>Are you a home cook? <Link to="/signup">Sign up here</Link></p>
                </div>
            </form>
        </div>
    );
};

export default SupplierSignUpPage;