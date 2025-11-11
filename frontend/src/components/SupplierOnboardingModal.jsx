// src/components/SupplierOnboardingModal.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
// Import the shared modal styles
import './OnboardingModal.css'; 
// Import the specific supplier modal styles
import './SupplierOnboardingModal.css'; 

const BUSINESS_TYPE_OPTIONS = [
    "Greengrocer",
    "Butcher",
    "Bakery",
    "Deli",
    "Fishmonger",
    "Farmer's Market",
    "Other"
];

/**
 * A multi-step modal to guide new suppliers through setting up their profile
 * immediately after their first login.
 */
const SupplierOnboardingModal = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [profileData, setProfileData] = useState({
        business_name: '',
        postcode: '',
        address: '',
        business_type: '',
        description: '',
        opening_hours: '',
    });

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // This hook will now work correctly
    const { refreshUserProfile } = useAuth();

    const handleNext = () => setStep(s => s + 1);
    const handleBack = () => setStep(s => s - 1);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // --- Validation (can be expanded) ---
        if (!profileData.business_name.trim()) {
            setError("Business Name is required.");
            setStep(2); // Send user back to the step with the error
            return;
        }
        if (!profileData.postcode.trim()) {
            setError("Postcode is required.");
            setStep(2); // Send user back to the step with the error
            return;
        }

        setIsLoading(true);

        // Prepare payload, converting empty strings to null
        const payload = {
            business_name: profileData.business_name,
            postcode: profileData.postcode,
            address: profileData.address || null,
            business_type: profileData.business_type || null,
            description: profileData.description || null,
            opening_hours: profileData.opening_hours || null,
        };

        try {
            // 1. Create the new SupplierProfile
            await axios.post('/api/supplier/profile', payload);

            // 2. Update the User's 'has_completed_onboarding' flag
            await axios.put('/users/me', { has_completed_onboarding: true });

            // 3. Refresh the user profile in AuthContext (BUG FIXED)
            await refreshUserProfile();

            toast.success("Welcome! Your profile is all set up.");

            // 4. Tell the parent to close the modal
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

    const renderStep = () => {
        switch (step) {
            case 1:
                return <StepWelcome onNext={handleNext} />;
            case 2:
                return (
                    <StepDetails
                        data={profileData}
                        onChange={handleChange}
                        onNext={handleNext}
                        onBack={handleBack}
                        error={error}
                    />
                );
            case 3:
                return (
                    <StepProfile
                        data={profileData}
                        onChange={handleChange}
                        onBack={handleBack}
                        onSubmit={handleFinalSubmit}
                        isLoading={isLoading}
                        error={error}
                    />
                );
            default:
                return null;
        }
    };

    return (
        // Use the shared overlay class from OnboardingModal.css
        <div className="modal-overlay">
            {/* Use the shared content class + supplier-specific class */}
            <div className="modal-content supplier-onboarding-modal">
                {renderStep()}
            </div>
        </div>
    );
};

// --- Sub-components for each step ---

const StepWelcome = ({ onNext }) => (
    <div className="modal-step step-welcome">
        <h2>Welcome to The Local Catalogue!</h2>
        <p>Let's set up your public "Digital Storefront" so customers can find you.</p>
        <button onClick={onNext} className="modal-btn primary">Let's Get Started</button>
    </div>
);

const StepDetails = ({ data, onChange, onNext, onBack, error }) => (
    <div className="modal-step">
        <h3>Step 1: Your Business</h3>
        <p>This essential info helps customers find you.</p>
        {error && (error.includes("Name") || error.includes("Postcode")) && <p className="modal-error">{error}</p>}

        <div className="form-group">
            <label htmlFor="business_name">Business Name*</label>
            <input
                type="text"
                id="business_name"
                name="business_name"
                value={data.business_name}
                onChange={onChange}
                className="modal-input"
            />
        </div>

        <div className="form-group">
            <label htmlFor="postcode">Postcode*</label>
            <input
                type="text"
                id="postcode"
                name="postcode"
                placeholder="e.g. 3000"
                value={data.postcode}
                onChange={onChange}
                className="modal-input"
            />
        </div>

        <div className="form-group">
            <label htmlFor="address">Address (Optional)</label>
            <input
                type="text"
                id="address"
                name="address"
                placeholder="e.g. 123 Main St, Suburb"
                value={data.address}
                onChange={onChange}
                className="modal-input"
            />
        </div>

        <div className="form-group">
            <label htmlFor="business_type">Business Type (Optional)</label>
            <select
                id="business_type"
                name="business_type"
                value={data.business_type}
                onChange={onChange}
                className="modal-input"
            >
                <option value="">Select a type...</option>
                {BUSINESS_TYPE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
        <div className="modal-nav">
            <button onClick={onBack} className="modal-btn" disabled={true} style={{ visibility: 'hidden' }}>Back</button>
            <button onClick={onNext} className="modal-btn primary" disabled={!data.business_name || !data.postcode}>Next</button>
        </div>
    </div>
);

const StepProfile = ({ data, onChange, onBack, onSubmit, isLoading, error }) => (
    <div className="modal-step">
        <h3>Step 2: Your Profile</h3>
        <p>Add extra details to help customers get to know you.</p>
        {error && !(error.includes("Name") || error.includes("Postcode")) && <p className="modal-error">{error}</p>}

        <div className="form-group">
            <label htmlFor="description">Short Description (Optional)</label>
            <textarea
                id="description"
                name="description"
                rows="3"
                placeholder="e.g. Family-owned butcher specializing in local produce."
                value={data.description}
                onChange={onChange}
                className="modal-input"
            />
        </div>

        <div className="form-group">
            <label htmlFor="opening_hours">Opening Hours (Optional)</label>
            <input
                type="text"
                id="opening_hours"
                name="opening_hours"
                placeholder="e.g. Mon-Fri: 9am-5pm"
                value={data.opening_hours}
                onChange={onChange}
                className="modal-input"
            />
        </div>

        <div className="modal-nav">
            <button onClick={onBack} className="modal-btn">Back</button>
            <button onClick={onSubmit} className="modal-btn primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Get Started'}
            </button>
        </div>
    </div>
);


export default SupplierOnboardingModal;