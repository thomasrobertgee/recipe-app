// src/pages/SupplierDashboardPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import SupplierOnboardingModal from '../components/SupplierOnboardingModal'; // <-- NEW IMPORT
import './Page.css';
import './SupplierDashboardPage.css';

const SupplierDashboardPage = () => {
    const { userProfile } = useAuth();
    const [specials, setSpecials] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('specials'); // 'specials' or 'profile'

    // --- State for specials form ---
    const [specialFormData, setSpecialFormData] = useState({
        ingredient_name: '',
        price: '',
        category: '',
        expiry_date: ''
    });

    // --- State for profile form ---
    const [profileData, setProfileData] = useState({
        business_name: '',
        address: '',
        postcode: '',
        logo_url: '',
        business_type: '',
        description: '',
        opening_hours: '',
    });
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    
    // --- NEW: State for Quick-Add ---
    const [previousItems, setPreviousItems] = useState([]);
    const [isQuickAddLoading, setIsQuickAddLoading] = useState(true);
    // --- END NEW ---


    // --- State for analytics ---
    const [analytics, setAnalytics] = useState({
        totalViews: 0,
        totalSaves: 0,
    });
    // --- END NEW ---

    // --- Fetch specials and calculate analytics ---
    const fetchSpecials = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/supplier/specials');
            setSpecials(res.data);

            // Calculate analytics
            let views = 0;
            let saves = 0;
            res.data.forEach(special => {
                views += special.view_count || 0;
                saves += special.save_count || 0;
            });
            setAnalytics({ totalViews: views, totalSaves: saves });

        } catch (error) {
            console.error("Error fetching supplier specials:", error);
            // *** BUG FIX: Check for 401 (unauthorized) first, but DO NOT toast other errors ***
            if (!error.response || error.response.status !== 401) {
                // toast.error("Could not load your specials."); // <-- REMOVED THIS LINE
            }
        } finally {
            setIsLoading(false);
        }
    }, []);
    // --- END UPDATED ---

    // --- Fetch supplier profile ---
    const fetchProfile = useCallback(async () => {
        setIsProfileLoading(true);
        try {
            const res = await axios.get('/api/supplier/profile');
            // Set form data, ensuring nulls are converted to empty strings for controlled inputs
            setProfileData({
                business_name: res.data.business_name || '',
                address: res.data.address || '',
                postcode: res.data.postcode || '',
                logo_url: res.data.logo_url || '',
                business_type: res.data.business_type || '',
                description: res.data.description || '',
                opening_hours: res.data.opening_hours || '',
            });
        } catch (error) {
            console.error("Error fetching supplier profile:", error);
            // *** BUG FIX: Check for 401 (unauthorized) first, but DO NOT toast other errors ***
            if (!error.response || error.response.status !== 401) {
                // toast.error("Could not load your profile data."); // <-- REMOVED THIS LINE
            }
        } finally {
            setIsProfileLoading(false);
        }
    }, []);
    // --- END NEW ---

    // --- NEW: Fetch previous items for Quick-Add ---
    const fetchPreviousItems = useCallback(async () => {
        setIsQuickAddLoading(true);
        try {
            const res = await axios.get('/api/supplier/previous-items');
            setPreviousItems(res.data);
        } catch (error) {
             console.error("Error fetching previous items:", error);
             // *** BUG FIX: Check for 401 (unauthorized) first, but DO NOT toast other errors ***
             if (!error.response || error.response.status !== 401) {
                // toast.error("Could not load previous items."); // <-- REMOVED THIS LINE
             }
        } finally {
            setIsQuickAddLoading(false);
        }
    }, []);
    // --- END NEW ---


    useEffect(() => {
        // --- BUG FIX: Don't fetch data if onboarding isn't complete ---
        if (!userProfile || !userProfile.has_completed_onboarding) {
            return; // Stop here, user is in the onboarding modal
        }
        // --- END BUG FIX ---

        // Fetch data for the active tab
        if (activeTab === 'specials') {
            fetchSpecials();
            fetchPreviousItems(); // <-- NEW: Fetch items when specials tab is active
        } else if (activeTab === 'profile') {
            fetchProfile();
        }
    }, [activeTab, fetchSpecials, fetchProfile, fetchPreviousItems, userProfile]); // <-- Added userProfile dependency

    // --- NEW: ONBOARDING CHECK ---
    // This must come AFTER all hooks (useState, useEffect, etc.)
    
    // 1. Show loading screen while profile is being fetched
    if (!userProfile) {
        return (
            <div className="app-container supplier-dashboard">
                <div className="page-header">
                    <h1>Supplier Dashboard</h1>
                </div>
                <p>Loading your profile...</p>
            </div>
        );
    }

    // 2. If profile is loaded and onboarding is not complete, show the modal
    if (userProfile.has_completed_onboarding === false) {
        // The modal will handle its own logic. On success, it refreshes
        // the userProfile in context, which will cause this component
        // to re-render, pass this check, and show the dashboard.
        return <SupplierOnboardingModal onComplete={() => {}} />;
    }
    // --- END NEW ONBOARDING CHECK ---

    // --- Helper to get default expiry date (7 days from now) ---
    const getDefaultExpiryDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    };
    // --- END NEW ---

    // --- Handle specials form input changes ---
    const handleSpecialFormChange = (e) => {
        const { name, value } = e.target;
        setSpecialFormData(prev => ({ ...prev, [name]: value }));
    };
    // --- END UPDATED ---

     // --- Handle profile form input changes ---
    const handleProfileFormChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };
    // --- END NEW ---

    // --- Handle specials form submission ---
    const handleSpecialFormSubmit = async (e) => {
        e.preventDefault();
        if (!specialFormData.ingredient_name || !specialFormData.price) {
            toast.warn("Please enter at least an item name and price.");
            return;
        }

        // Use default expiry if not set
        const expiry = specialFormData.expiry_date || getDefaultExpiryDate();

        try {
            const res = await axios.post('/api/supplier/specials', {
                ingredient_name: specialFormData.ingredient_name,
                price: specialFormData.price,
                store: userProfile?.supplier_profile?.business_name || 'My Store', // Store name is set by backend
                category: specialFormData.category || 'Other', // Default category if empty
                expiry_date: expiry // <-- NEW: Send expiry date
            });
            
            // Check if item was updated or added
            const existingIndex = specials.findIndex(s => s.id === res.data.id);
            if (existingIndex > -1) {
                 // Update existing item in state
                 setSpecials(prev => prev.map(s => s.id === res.data.id ? res.data : s));
                 toast.success(`"${res.data.ingredient_name}" price updated!`);
            } else {
                // Add new item to state
                setSpecials(prev => [res.data, ...prev]);
                toast.success(`"${res.data.ingredient_name}" added to specials!`);
            }
            
            // Clear form
            setSpecialFormData({
                ingredient_name: '',
                price: '',
                category: '',
                expiry_date: ''
            });
            
            // --- NEW: Refresh previous items list if a new item was added ---
            const isNew = !previousItems.some(item => item.name.toLowerCase() === res.data.ingredient_name.toLowerCase());
            if (isNew) {
                fetchPreviousItems();
            }
            // --- END NEW ---

        } catch (error) {
            console.error("Error adding special:", error);
            toast.error(error.response?.data?.detail || "Failed to add special.");
        }
    };
    // --- END UPDATED ---

    // --- Handle profile form submission ---
    const handleProfileFormSubmit = async (e) => {
        e.preventDefault();
        
        // Filter out empty strings and send them as null
        const payload = {};
        for (const [key, value] of Object.entries(profileData)) {
            payload[key] = value.trim() === '' ? null : value.trim();
        }
        
        if (!payload.business_name) {
             toast.warn("Business name is required.");
             return;
        }

        const saveToast = toast.loading("Saving profile...");
        try {
            const res = await axios.put('/api/supplier/profile', payload);
            // Update state with potentially corrected data from backend
            setProfileData({
                business_name: res.data.business_name || '',
                address: res.data.address || '',
                postcode: res.data.postcode || '',
                logo_url: res.data.logo_url || '',
                business_type: res.data.business_type || '',
                description: res.data.description || '',
                opening_hours: res.data.opening_hours || '',
            });
            toast.update(saveToast, { render: "Profile saved successfully!", type: "success", isLoading: false, autoClose: 3000 });
        } catch (error) {
             console.error("Error saving profile:", error);
             toast.update(saveToast, { render: error.response?.data?.detail || "Failed to save profile.", type: "error", isLoading: false, autoClose: 5000 });
        }
    };
    // --- END NEW ---

    const handleDelete = async (specialId, specialName) => {
        if (!window.confirm(`Are you sure you want to delete the special for "${specialName}"?`)) {
            return;
        }
        try {
            await axios.delete(`/api/supplier/specials/${specialId}`);
            setSpecials(prev => prev.filter(s => s.id !== specialId));
            toast.info(`"${specialName}" removed from specials.`);
            // Note: We don't refresh the previous items list here,
            // as they might want to re-add it next week.
        } catch (error) {
            console.error("Error deleting special:", error);
            toast.error(error.response?.data?.detail || "Failed to delete special.");
        }
    };

    // --- NEW: Handle Quick-Add click ---
    const handleQuickAddClick = (item) => {
        setSpecialFormData({
            ingredient_name: item.name,
            category: item.category || '',
            price: '', // Clear price
            expiry_date: '' // Clear expiry
        });
        // Optional: scroll to the form
        document.getElementById('ingredient_name')?.focus();
    };
    // --- END NEW ---

    // --- Render Profile Tab Content ---
    const renderProfileTab = () => (
        <div className="profile-tab-content">
            <form onSubmit={handleProfileFormSubmit} className="profile-form dashboard-module">
                <h3>Your "Digital Storefront"</h3>
                <p>This information will be shown to customers on the "Local Suppliers" discovery page.</p>

                {isProfileLoading ? (
                    <p>Loading profile...</p>
                ) : (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="business_name">Business Name</label>
                                <input
                                    type="text"
                                    name="business_name"
                                    id="business_name"
                                    value={profileData.business_name}
                                    onChange={handleProfileFormChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="business_type">Business Type</label>
                                <input
                                    type="text"
                                    name="business_type"
                                    id="business_type"
                                    placeholder="e.g., Butcher, Baker, Greengrocer"
                                    value={profileData.business_type}
                                    onChange={handleProfileFormChange}
                                />
                            </div>
                        </div>

                         <div className="form-group">
                            <label htmlFor="description">Short Description</label>
                            <textarea
                                name="description"
                                id="description"
                                rows="3"
                                placeholder="Tell customers what makes your business special."
                                value={profileData.description}
                                onChange={handleProfileFormChange}
                            ></textarea>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="address">Address</label>
                                <input
                                    type="text"
                                    name="address"
                                    id="address"
                                    placeholder="e.g., 123 Main St, Suburb"
                                    value={profileData.address}
                                    onChange={handleProfileFormChange}
                                />
                            </div>
                             <div className="form-group">
                                <label htmlFor="postcode">Postcode</label>
                                <input
                                    type="text"
                                    name="postcode"
                                    id="postcode"
                                    placeholder="e.g., 3000"
                                    value={profileData.postcode}
                                    onChange={handleProfileFormChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="opening_hours">Opening Hours</label>
                            <input
                                type="text"
                                name="opening_hours"
                                id="opening_hours"
                                placeholder="e.g., Mon-Fri: 9am - 5pm, Sat: 9am - 1pm"
                                value={profileData.opening_hours}
                                onChange={handleProfileFormChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="logo_url">Logo URL</label>
                            <input
                                type="text"
                                name="logo_url"
                                id="logo_url"
                                placeholder="e.g., https://your-website.com/logo.png"
                                value={profileData.logo_url}
                                onChange={handleProfileFormChange}
                            />
                        </div>
                        
                        <button type="submit" className="btn btn-primary">Save Profile</button>
                    </>
                )}
            </form>
        </div>
    );
    // --- END NEW ---

    // --- UPDATED: Render Specials Tab Content ---
    const renderSpecialsTab = () => (
         <div className="specials-tab-content">
            {/* Analytics Module */}
             <div className="analytics-module dashboard-module">
                <h2>Your Analytics</h2>
                <div className="analytics-grid">
                    <div className="analytics-stat">
                        <span className="analytics-value">{analytics.totalViews}</span>
                        <span className="analytics-label">Total Special Views</span>
                    </div>
                    <div className="analytics-stat">
                        <span className="analytics-value">{analytics.totalSaves}</span>
                        <span className="analytics-label">Total List Adds</span>
                    </div>
                </div>
                <p className="analytics-info">
                    These are the total views and adds across all your active specials.
                </p>
            </div>

            <div className="supplier-specials-layout">
                {/* Main Column */}
                <div className="supplier-main-column">
                    {/* Manage Specials Form */}
                    <form onSubmit={handleSpecialFormSubmit} className="special-form dashboard-module">
                        <h3>Add/Update a Special</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="ingredient_name">Item Name</label>
                                <input
                                    type="text"
                                    name="ingredient_name"
                                    id="ingredient_name"
                                    placeholder="e.g., Rump Steak"
                                    value={specialFormData.ingredient_name}
                                    onChange={handleSpecialFormChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="price">Price</label>
                                <input
                                    type="text"
                                    name="price"
                                    id="price"
                                    placeholder="e.g., $19.99/kg"
                                    value={specialFormData.price}
                                    onChange={handleSpecialFormChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="form-row">
                                <div className="form-group">
                                <label htmlFor="category">Category</label>
                                <input
                                    type="text"
                                    name="category"
                                    id="category"
                                    placeholder="e.g., Meat & Seafood (optional)"
                                    value={specialFormData.category}
                                    onChange={handleSpecialFormChange}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="expiry_date">Active Until (optional)</label>
                                <input
                                    type="date"
                                    name="expiry_date"
                                    id="expiry_date"
                                    value={specialFormData.expiry_date}
                                    onChange={handleSpecialFormChange}
                                    min={new Date().toISOString().split('T')[0]} // Set min date to today
                                />
                                <small>Defaults to 7 days if left blank.</small>
                            </div>
                        </div>
                        <button type="submit" className="btn btn-primary">Save Special</button>
                    </form>

                    {/* Specials List */}
                    <div className="specials-list-container dashboard-module">
                        <h3>Your Active Specials</h3>
                        {isLoading ? (
                            <p>Loading specials...</p>
                        ) : specials.length === 0 ? (
                            <p>You have no active specials. Add one above to get started!</p>
                        ) : (
                            <ul className="supplier-specials-list">
                                {specials.map(special => (
                                    <li key={special.id} className="supplier-special-item">
                                        <div className="special-info">
                                            <span className="special-name">{special.ingredient_name}</span>
                                            <span className="special-price">{special.price}</span>
                                            <span className="special-category">{special.category || 'N/A'}</span>
                                            <span className="special-expiry">
                                                Expires: {special.expiry_date ? new Date(special.expiry_date + 'T00:00:00').toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(special.id, special.ingredient_name)}
                                            className="delete-special-btn"
                                        >
                                            &times;
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
                
                {/* --- NEW: Quick-Add Sidebar --- */}
                <aside className="supplier-sidebar">
                    <div className="quick-add-module dashboard-module">
                        <h3>Quick-Add Previous Item</h3>
                        {isQuickAddLoading ? (
                            <p>Loading...</p>
                        ) : previousItems.length === 0 ? (
                            <p>No previous items found. Once you add a new special, it will appear here.</p>
                        ) : (
                            <div className="quick-add-list">
                                {previousItems.map(item => (
                                    <button
                                        key={item.ingredient_id}
                                        className="quick-add-btn"
                                        onClick={() => handleQuickAddClick(item)}
                                        title={`Pre-fill: ${item.name}`}
                                    >
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>
                {/* --- END NEW --- */}
            </div>
         </div>
    );
    // --- END UPDATED ---


    return (
        <div className="app-container supplier-dashboard">
            <div className="page-header">
                <h1>Supplier Dashboard</h1>
                {userProfile && <p>Welcome, {userProfile.email}</p>}
            </div>

            {/* --- NEW: Tab Navigation --- */}
            <div className="dashboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'specials' ? 'active' : ''}`}
                    onClick={() => setActiveTab('specials')}
                >
                    Manage Specials
                </button>
                <button
                    className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    My Profile
                </button>
            </div>
            {/* --- END NEW --- */}


            <div className="dashboard-layout">
                <div className="dashboard-main">
                    {/* --- NEW: Conditional Tab Rendering --- */}
                    {activeTab === 'specials' && renderSpecialsTab()}
                    {activeTab === 'profile' && renderProfileTab()}
                    {/* --- END NEW --- */}
                </div>
            </div>
        </div>
    );
};

export default SupplierDashboardPage;