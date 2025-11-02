// frontend/src/pages/SupplierSignUpPage.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AuthForm.css'; // Reusing your existing auth form styling

const SupplierSignUpPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [address, setAddress] = useState('');
    const [postcode, setPostcode] = useState(''); // <-- NEW STATE
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setError(null);
        setLoading(true);

        const registrationData = {
            user: {
                email: email,
                password: password
            },
            profile: {
                business_name: businessName,
                address: address || null,
                postcode: postcode || null // <-- NEW FIELD IN PAYLOAD
            }
        };

        try {
            // We use axios directly here, not a context function
            // --- FIX: Use relative path for API call ---
            await axios.post('/register/supplier', registrationData);
            
            toast.success("Registration successful! Please log in.");
            navigate('/login');

        } catch (err) {
            console.error("Supplier registration failed:", err.response);
            const errorMessage = err.response?.data?.detail || "An unknown error occurred. Please try again.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        // --- Reusing the structure from SignUpPage.jsx ---
        <div className="auth-container">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Supplier Registration</h2>
                <p style={{ textAlign: 'center', marginTop: '-1rem', color: '#555' }}>
                    Create an account for your business to post local specials.
                </p>
                
                {/* --- Business Information Section --- */}
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
                <div className="form-group">
                    <label htmlFor="address">Address (Optional)</label>
                    <input
                        type="text"
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>
                {/* --- NEW POSTCODE FIELD --- */}
                <div className="form-group">
                    <label htmlFor="postcode">Postcode (Optional)</label>
                    <input
                        type="text"
                        id="postcode"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                        placeholder="e.g. 3025"
                    />
                </div>

                {/* --- Account Credentials Section --- */}
                <div className="auth-divider">
                    <span>Account Details</span>
                </div>
                
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
                
                {error && <p className="auth-error">{error}</p>}
                
                <button type="submit" className="auth-button" disabled={loading}>
                    {loading ? "Registering..." : "Create Account"}
                </button>
                
                <p className="auth-switch">
                    Already have an account? <Link to="/login">Log In</Link>
                </p>
            </form>
        </div>
    );
};

export default SupplierSignUpPage;