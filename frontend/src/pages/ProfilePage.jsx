// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AuthForm.css';
import './ProfilePage.css';

// --- UPDATED: Sorted the list alphabetically ---
const DIETARY_RESTRICTIONS = [
  "Dairy-Free",
  "Egg Allergy",
  "Fish Allergy",
  "Gluten-Free",
  "Halal",
  "Keto",
  "Kosher",
  "Low-Carb",
  "Low-Fat",
  "Low-Sodium",
  "No Red Meat",
  "Paleo",
  "Peanut Allergy",
  "Pescatarian",
  "Shellfish Allergy",
  "Soy Allergy",
  "Tree Nut Allergy",
  "Vegan",
  "Vegetarian",
  "Wheat Allergy",
];

const ProfilePage = () => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    household_size: 2,
    dietary_restrictions: [],
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      axios.get('http://127.0.0.1:8000/users/me')
        .then(response => {
          const userData = {
            dietary_restrictions: [], 
            ...response.data
          };
          setFormData(userData);
        })
        .catch(error => {
          console.error("Error fetching user profile:", error);
        })
        .finally(() => {
            setIsLoading(false);
        });
    } else {
        setIsLoading(false);
    }
  }, [token]);

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
    };

    axios.put('http://127.0.0.1:8000/users/me', dataToUpdate)
      .then(response => {
        setFormData(response.data);
        setMessage('Profile updated successfully!');
      })
      .catch(error => {
        setMessage('Failed to update profile. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="auth-container">
      <h1>My Profile</h1>
      {isLoading ? <p>Loading profile...</p> : (
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email</label>
          <input type="email" name="email" value={formData.email} disabled />

          <label htmlFor="household_size">Household Size</label>
          <input type="number" name="household_size" value={formData.household_size} onChange={handleInputChange} min="1" required />

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
      )}
    </div>
  );
};

export default ProfilePage;