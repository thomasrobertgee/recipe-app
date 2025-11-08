// src/components/dashboard/FeaturedSupplier.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardModule.css';
import './FeaturedSupplier.css';

const FeaturedSupplier = ({ supplier }) => {
    if (!supplier) {
        // Don't render anything if there is no featured supplier
        return null;
    }

    return (
        <div className="dashboard-module featured-supplier-module">
            <h3>Featured Local Shop</h3>
            <div className="featured-supplier-card">
                <img
                    src={supplier.logo_url || 'https://via.placeholder.com/80'}
                    alt={`${supplier.business_name} logo`}
                    className="featured-supplier-logo"
                />
                <div className="featured-supplier-info">
                    <h4>{supplier.business_name}</h4>
                    {supplier.business_type && (
                        <span className="supplier-type">{supplier.business_type}</span>
                    )}
                    <p>{supplier.description}</p>
                    <Link to={`/supplier/${supplier.id}`} className="btn btn-secondary btn-small">
                        View Profile & Specials
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default FeaturedSupplier;