// src/pages/SupplierSignUpPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AuthForm.css';

const SupplierSignUpPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [address, setAddress] = useState('');
    // --- NEW: Postcode state ---
    const [postcode, setPostcode] = useState('');
    // --- END NEW ---
    
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

        if (!businessName) {
             setError("Business name is required");
             return;
        }
        
        // --- NEW: Postcode validation ---
        if (!postcode) {
             setError("Postcode is required");
             return;
        }
        // --- END NEW ---

        setIsLoading(true);
        try {
            const payload = {
                user: {
                    email,
                    password
                },
                profile: {
                    business_name: businessName,
                    address: address || null,
                    postcode: postcode, // <-- NEW: Send postcode
                    // Other profile fields (logo_url, etc.) are optional
                    // and can be filled in on their profile page
                }
            };
            
            await axios.post('/register/supplier', payload);
            
            toast.success("Supplier account created! Please log in.");
            navigate('/login');

        } catch (err) {
            console.error("Supplier signup error:", err);
            setError(err.response?.data?.detail || "An unknown error occurred.");
            toast.error(err.response?.data?.detail || "Signup failed.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-form-container">
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

                <hr className="form-divider" />
                
                <div className="form-group">
                    <label htmlFor="businessName">Business Name</label>
                    <input
                        type="text"
                        id="businessName"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required
                    />
                </div>
                
                {/* --- NEW: Postcode Field --- */}
                <div className="form-group">
                    <label htmlFor="postcode">Postcode</label>
                    <input
                        type="text"
                        id="postcode"
                        placeholder="e.g. 3000"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        required
                    />
                </div>
                {/* --- END NEW --- */}

                <div className="form-group">
                    <label htmlFor="address">Address (Optional)</label>
                    <input
                        type="text"
                        id="address"
                        placeholder="e.g. 123 Main St, Suburb"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                </button>

                <div className="form-footer">
                    <p>Already have an account? <Link to="/login">Log In</Link></p>
                    <p>Are you a home cook? <Link to="/signup">Sign up here</Link></p>
                </div>
            </form>
        </div>
    );
};

export default SupplierSignUpPage;