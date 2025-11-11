// src/pages/SupplierLoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
// --- UPDATED: Import ONLY the new standalone CSS file ---
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
            await login(email, password);
            toast.success("Logged in successfully!");
        } catch (err) {
            console.error("Supplier login error:", err);
            const errorMessage = err.response?.data?.detail || "Incorrect email or password.";
            setError(errorMessage);
            toast.error(errorMessage);
            setIsLoading(false); 
        }
    };

    return (
        // --- UPDATED: Use ONLY the new container class ---
        <div className="supplier-auth-container">
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