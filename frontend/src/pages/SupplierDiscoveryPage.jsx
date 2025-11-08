// src/pages/SupplierDiscoveryPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom'; // For linking to supplier detail page
import './Page.css';
import './SupplierDiscoveryPage.css'; // New CSS file

const SupplierDiscoveryPage = () => {
    const { 
        userProfile,
        followedSupplierIds, // <-- NEW
        followSupplier,      // <-- NEW
        unfollowSupplier     // <-- NEW
    } = useAuth();
    const [suppliers, setSuppliers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setIsLoading(true);
        axios.get('/api/suppliers')
            .then(response => {
                setSuppliers(response.data);
                setError(null);
            })
            .catch(err => {
                console.error("Error fetching suppliers:", err);
                if (err.response?.status === 401) {
                    // Auth error, already handled by interceptor
                } else if (err.response?.status === 404) {
                    setError("Could not find supplier information.");
                } else {
                    setError("An error occurred while fetching local suppliers.");
                    if (!err.response || err.response.status !== 401) {
                        toast.error("Could not load suppliers.");
                    }
                }
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []); // Runs once on page load

    // --- NEW: Follow button handler ---
    const handleFollowToggle = (e, supplierId) => {
        e.preventDefault(); // Stop the Link navigation
        e.stopPropagation(); // Stop event bubbling
        
        if (followedSupplierIds.has(supplierId)) {
            unfollowSupplier(supplierId);
        } else {
            followSupplier(supplierId);
        }
    };
    // --- END NEW ---

    if (isLoading) {
        return <div className="app-container"><p className="loading-message">Loading local suppliers...</p></div>;
    }

    if (error) {
        return <div className="app-container"><p className="error-message">{error}</p></div>;
    }

    if (!userProfile?.postcode) {
        return (
            <div className="app-container">
                <div className="page-header">
                    <h1>Local Suppliers</h1>
                </div>
                <div className="supplier-profile-notice">
                    <p>Please <Link to="/profile">set your postcode</Link> in your profile to find local suppliers in your area.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container supplier-discovery-page">
            <div className="page-header">
                <h1>Local Suppliers Near {userProfile.postcode}</h1>
            </div>

            {suppliers.length === 0 ? (
                <p>No local suppliers are registered in your area yet. Check back soon!</p>
            ) : (
                <div className="supplier-list">
                    {suppliers.map(supplier => {
                        // --- NEW: Check if followed ---
                        const isFollowed = followedSupplierIds.has(supplier.id);
                        // --- END NEW ---

                        return (
                        <Link to={`/supplier/${supplier.id}`} key={supplier.id} className="supplier-card-link">
                            <div className="supplier-card">
                                <div className="supplier-card-header">
                                    <img
                                        src={supplier.logo_url || 'https://via.placeholder.com/80'} // Default placeholder
                                        alt={`${supplier.business_name} logo`}
                                        className="supplier-logo"
                                    />
                                    <div className="supplier-card-title">
                                        <h3>{supplier.business_name}</h3>
                                        {supplier.business_type && (
                                            <span className="supplier-type">{supplier.business_type}</span>
                                        )}
                                    </div>
                                </div>
                                <div className="supplier-card-body">
                                    {supplier.description && (
                                        <p className="supplier-description">{supplier.description}</p>
                                    )}
                                    {supplier.address && (
                                        <p className="supplier-info"><strong>Address:</strong> {supplier.address}</p>
                                    )}
                                    {supplier.opening_hours && (
                                        <p className="supplier-info"><strong>Hours:</strong> {supplier.opening_hours}</p>
                                    )}
                                </div>
                                <div className="supplier-card-footer">
                                    {/* --- UPDATED: Follow button --- */}
                                    <button 
                                        className={`btn btn-small ${isFollowed ? 'btn-secondary' : 'btn-primary'}`}
                                        onClick={(e) => handleFollowToggle(e, supplier.id)}
                                    >
                                        {isFollowed ? '✓ Following' : '+ Follow'}
                                    </button>
                                    {/* --- END UPDATED --- */}
                                    <span className="btn btn-secondary btn-small">View Specials</span>
                                </div>
                            </div>
                        </Link>
                    )})}
                </div>
            )}
        </div>
    );
};

export default SupplierDiscoveryPage;