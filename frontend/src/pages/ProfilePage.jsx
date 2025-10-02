// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './AuthForm.css';
import './ProfilePage.css'; // New stylesheet for checkbox layout

const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Pescatarian"];
const ALLERGY_OPTIONS = ["Peanuts", "Tree Nuts", "Milk", "Eggs", "Soy", "Wheat", "Fish", "Shellfish"];

const ProfilePage = () => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    household_size: 2,
    dietary_requirements: [],
    allergies: [],
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      axios.get('http://127.0.0.1:8000/users/me')
        .then(response => {
          setFormData(response.data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error("Error fetching user profile:", error);
          setIsLoading(false);
        });
    }
  }, [token]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    const currentValues = formData[name];

    if (checked) {
      // Add the value to the array if it's not already there
      setFormData({ ...formData, [name]: [...currentValues, value] });
    } else {
      // Remove the value from the array
      setFormData({ ...formData, [name]: currentValues.filter(item => item !== value) });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    
    const dataToUpdate = {
      household_size: parseInt(formData.household_size, 10),
      dietary_requirements: formData.dietary_requirements,
      allergies: formData.allergies,
    };

    axios.put('http://127.0.0.1:8000/users/me', dataToUpdate)
      .then(response => {
        setIsLoading(false);
        setFormData(response.data);
        setMessage('Profile updated successfully!');
      })
      .catch(error => {
        setIsLoading(false);
        setMessage('Failed to update profile. Please try again.');
      });
  };

  return (
    <div className="auth-container">
      <h1>My Profile</h1>
      {isLoading && !formData.email ? <p>Loading profile...</p> : (
        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="email">Email</label>
          <input type="email" name="email" value={formData.email} disabled />

          <label htmlFor="household_size">Household Size</label>
          <input type="number" name="household_size" value={formData.household_size} onChange={handleInputChange} min="1" required />

          <fieldset>
            <legend>Dietary Requirements</legend>
            <div className="checkbox-group">
              {DIETARY_OPTIONS.map(option => (
                <label key={option} className="checkbox-label">
                  <input type="checkbox" name="dietary_requirements" value={option} checked={formData.dietary_requirements.includes(option)} onChange={handleCheckboxChange} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
          
          <fieldset>
            <legend>Allergies</legend>
            <div className="checkbox-group">
              {ALLERGY_OPTIONS.map(option => (
                <label key={option} className="checkbox-label">
                  <input type="checkbox" name="allergies" value={option} checked={formData.allergies.includes(option)} onChange={handleCheckboxChange} />
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