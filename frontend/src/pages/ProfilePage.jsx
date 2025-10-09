// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AuthForm.css';
import './ProfilePage.css';
import './Page.css'; // Import the new shared styles


const DIETARY_RESTRICTIONS = [
  "Dairy-Free", "Egg Allergy", "Fish Allergy", "Gluten-Free", "Halal", "Keto",
  "Kosher", "Low-Carb", "Low-Fat", "Low-Sodium", "No Red Meat", "Paleo",
  "Peanut Allergy", "Pescatarian", "Shellfish Allergy", "Soy Allergy",
  "Tree Nut Allergy", "Vegan", "Vegetarian", "Wheat Allergy",
];

const ProfilePage = () => {
  const { userProfile, setUserProfile } = useAuth();
  const [formData, setFormData] = useState(userProfile || {
    email: '',
    household_size: 2,
    dietary_restrictions: [],
    weekly_budget: '',
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setFormData(userProfile || {});
  }, [userProfile]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    const currentValues = formData[name] || [];
    if (checked) {
      setFormData({ ...formData, [name]: [...currentValues, value] });
    } else {
      setFormData({ ...formData, [name]: currentValues.filter(item => item !== value) });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    
    const dataToUpdate = {
      household_size: parseInt(formData.household_size, 10),
      dietary_restrictions: formData.dietary_restrictions || [],
      weekly_budget: formData.weekly_budget ? parseFloat(formData.weekly_budget) : null,
    };

    axios.put('http://127.0.0.1:8000/users/me', dataToUpdate)
      .then(response => {
        setUserProfile(response.data);
        setMessage('Profile updated successfully!');
      })
      .catch(error => setMessage('Failed to update profile. Please try again.'))
      .finally(() => setIsLoading(false));
  };

  if (!userProfile) {
    return <div className="app-container"><p>Loading profile...</p></div>;
  }

  return (
    <div className="app-container">
      {/* --- Standardized page header --- */}
      <div className="page-header">
        <h1>My Profile</h1>
      </div>

      {/* --- Form now in its own styled container --- */}
      <div className="profile-form-container">
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email</label>
          <input type="email" name="email" value={formData.email} disabled />

          <label htmlFor="household_size">Household Size</label>
          <input type="number" name="household_size" value={formData.household_size} onChange={handleInputChange} min="1" required />

          <label htmlFor="weekly_budget">Weekly Budget ($)</label>
          <input type="number" name="weekly_budget" placeholder="e.g., 150.00" value={formData.weekly_budget || ''} onChange={handleInputChange} min="0" step="0.01" />

          <fieldset>
            <legend>Dietary Restrictions</legend>
            <div className="checkbox-group">
              {DIETARY_RESTRICTIONS.map(option => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    name="dietary_restrictions"
                    value={option}
                    checked={(formData.dietary_restrictions || []).includes(option)}
                    onChange={handleCheckboxChange}
                  />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Update Profile'}
          </button>
          {message && <p className={message.includes('success') ? 'success-message' : 'error-message'}>{message}</p>}
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;