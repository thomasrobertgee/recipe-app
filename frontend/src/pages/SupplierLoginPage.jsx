// src/pages/SupplierLoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
// --- UPDATED: Import the new supplier auth CSS ---
import './SupplierAuth.css';

const SupplierLoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // The login function from AuthContext will handle the API call
            // and role-based navigation.
            await login(email, password);
            
            // Note: The redirect is handled inside the AuthContext's login
            // function, which will send suppliers to /portal/dashboard.
            toast.success("Logged in successfully!");

        } catch (err) {
            console.error("Supplier login error:", err);
            const errorMessage = err.response?.data?.detail || "Incorrect email or password.";
            setError(errorMessage);
            toast.error(errorMessage);
            setIsLoading(false); // Only set to false on error
        }
        // No finally block, as loading should remain true during navigation
    };

    return (
        // --- UPDATED: Add the new wrapper class ---
        <div className="auth-form-container supplier-auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Supplier Portal Login</h2>
                <p>Welcome back! Manage your specials and view analytics.</p>
                
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
                        required
                    />
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Logging In...' : 'Log In'}
                </button>

                <div className="form-footer">
                    <p>New to the platform? <Link to="/portal/signup">Create an Account</Link></p>
                    <p>Are you a home cook? <Link to="/login">Login here</Link></p>
                </div>
            </form>
        </div>
    );
};

export default SupplierLoginPage;