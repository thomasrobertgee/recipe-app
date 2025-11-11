// src/components/SupplierOnboardingModal.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import './SupplierOnboardingModal.css'; // We will create this file next

/**
 * A modal to guide new suppliers through setting up their profile
 * immediately after their first login.
 */
const SupplierOnboardingModal = ({ onComplete }) => {
    const [businessName, setBusinessName] = useState('');
    const [postcode, setPostcode] = useState('');
    const [address, setAddress] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [description, setDescription] = useState('');
    const [openingHours, setOpeningHours] = useState('');
    
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { refreshUserProfile } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // --- Validation ---
        if (!businessName.trim()) {
            setError("Business Name is required.");
            return;
        }
        if (!postcode.trim()) {
            setError("Postcode is required.");
            return;
        }

        setIsLoading(true);
        
        const profileData = {
            business_name: businessName,
            postcode: postcode,
            address: address || null,
            business_type: businessType || null,
            description: description || null,
            opening_hours: openingHours || null,
        };

        try {
            // 1. Create the new SupplierProfile for the logged-in user
            //    This is a NEW endpoint we must create in the backend.
            await axios.post('/api/supplier/profile', profileData);
            
            // 2. Update the User's 'has_completed_onboarding' flag
            await axios.put('/users/me', { has_completed_onboarding: true });

            // 3. Refresh the user profile in AuthContext
            await refreshUserProfile();
            
            toast.success("Welcome! Your profile is all set up.");
            
            // 4. Tell the parent (SupplierDashboardPage) to close the modal
            if (onComplete) {
                onComplete();
            }

        } catch (err) {
            console.error("Supplier onboarding error:", err);
            const errMsg = err.response?.data?.detail || "An unknown error occurred.";
            setError(errMsg);
            toast.error(errMsg);
            setIsLoading(false); // Only stop loading if there's an error
        }
    };

    // --- Business Type Options ---
    const businessTypeOptions = [
        "Greengrocer",
        "Butcher",
        "Bakery",
        "Deli",
        "Fishmonger",
        "Farmer's Market",
        "Other"
    ];

    return (
        <div className="modal-backdrop">
            <div className="modal-content supplier-onboarding-modal">
                <div className="modal-header">
                    <h2>Welcome to the Supplier Portal!</h2>
                    <p>Let's set up your public "Digital Storefront".</p>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    {error && <div className="error-message">{error}</div>}
                    
                    <div className="form-group">
                        <label htmlFor="businessName">Business Name*</label>
                        <input
                            type="text"
                            id="businessName"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="postcode">Postcode*</label>
                        <input
                            type="text"
                            id="postcode"
                            placeholder="e.g. 3000"
                            value={postcode}
                            onChange={(e) => setPostcode(e.target.value)}
                        />
                    </div>
                    
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

                    <div className="form-group">
                        <label htmlFor="businessType">Business Type (Optional)</label>
                        <select
                            id="businessType"
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                        >
                            <option value="">Select a type...</option>
                            {businessTypeOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Short Description (Optional)</label>
                        <textarea
                            id="description"
                            rows="3"
                            placeholder="e.g. Family-owned butcher specializing in local produce."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="openingHours">Opening Hours (Optional)</label>
                        <input
                            type="text"
                            id="openingHours"
                            placeholder="e.g. Mon-Fri: 9am-5pm"
                            value={openingHours}
                            onChange={(e) => setOpeningHours(e.target.value)}
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Get Started'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SupplierOnboardingModal;