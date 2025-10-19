// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './Page.css';
import './ProfilePage.css';

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Pescatarian", "Keto", "Paleo"
];
const CUISINE_OPTIONS = [
  "Italian", "Mexican", "Chinese", "Indian", "Japanese", "Thai", "French", "Greek", "Spanish", "Mediterranean"
];
const SKILL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

function ProfilePage() {
  const { userProfile, fetchUserProfile, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    dietary_restrictions: [],
    other_dietary: '',
    preferred_cuisines: [],
    other_cuisine: '',
    cooking_skill: 'Beginner',
    adult_count: 1,
    child_count: 0,
    weekly_budget: 0,
    has_budget: false
  });

  useEffect(() => {
    if (userProfile) {
      const savedDietary = userProfile.dietary_restrictions?.split(', ').filter(Boolean) || [];
      const savedCuisines = userProfile.preferred_cuisines?.split(', ').filter(Boolean) || [];

      setFormData({
        email: userProfile.email || '',
        cooking_skill: userProfile.cooking_skill || 'Beginner',
        adult_count: userProfile.adult_count || 1,
        child_count: userProfile.child_count || 0,
        weekly_budget: userProfile.weekly_budget || 0,
        has_budget: !!userProfile.weekly_budget,
        dietary_restrictions: savedDietary.filter(d => DIETARY_OPTIONS.includes(d)),
        other_dietary: savedDietary.find(d => !DIETARY_OPTIONS.includes(d)) || '',
        preferred_cuisines: savedCuisines.filter(c => CUISINE_OPTIONS.includes(c)),
        other_cuisine: savedCuisines.find(c => !CUISINE_OPTIONS.includes(c)) || ''
      });
    }
  }, [userProfile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox' && (name === 'dietary_restrictions' || name === 'preferred_cuisines')) {
      setFormData(prev => ({
        ...prev,
        [name]: checked
          ? [...prev[name], value]
          : prev[name].filter(item => item !== value)
      }));
    } else if (name === 'has_budget') {
      setFormData(prev => ({
        ...prev,
        has_budget: checked,
        weekly_budget: checked ? (prev.weekly_budget < 10 ? 100 : prev.weekly_budget) : 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalDietary = [...formData.dietary_restrictions];
    if (formData.other_dietary) {
      finalDietary.push(formData.other_dietary);
    }

    const finalCuisines = [...formData.preferred_cuisines];
    if (formData.other_cuisine) {
      finalCuisines.push(formData.other_cuisine);
    }

    const payload = {
      email: formData.email,
      dietary_restrictions: finalDietary.join(', '),
      preferred_cuisines: finalCuisines.join(', '),
      cooking_skill: formData.cooking_skill,
      adult_count: parseInt(formData.adult_count) || 1,
      child_count: parseInt(formData.child_count) || 0,
      weekly_budget: formData.has_budget ? parseInt(formData.weekly_budget) : null
    };

    try {
      await axios.put('/users/me', payload);
      toast.success('Profile updated successfully!');
      fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile.');
    }
  };

  if (isLoading) {
    // Use app-container here too
    return <div className="app-container">Loading profile...</div>;
  }

  return (
    // --- USE app-container HERE ---
    <div className="app-container">
      <div className="page-header">
        <h1>Your Profile</h1>
        <p>Manage your account details and preferences here.</p>
      </div>
      <form onSubmit={handleSubmit} className="profile-form">

        <div className="form-section">
          <h3>Account</h3>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Household</h3>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="adult_count">Adults</label>
              <input
                type="number"
                id="adult_count"
                name="adult_count"
                value={formData.adult_count}
                onChange={handleChange}
                className="form-input"
                min="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="child_count">Children</label>
              <input
                type="number"
                id="child_count"
                name="child_count"
                value={formData.child_count}
                onChange={handleChange}
                className="form-input"
                min="0"
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>Budget</h3>
          <div className="form-group">
            <label className="checkbox-label" htmlFor="has_budget">
              <input
                type="checkbox"
                id="has_budget"
                name="has_budget"
                checked={formData.has_budget}
                onChange={handleChange}
              />
              Set a weekly budget
            </label>
          </div>
          {formData.has_budget && (
            <div className="form-group">
              <label htmlFor="weekly_budget">Weekly Budget ($)</label>
              <input
                type="range"
                id="weekly_budget"
                name="weekly_budget"
                min="10"
                max="1000"
                step="10"
                value={formData.weekly_budget}
                onChange={handleChange}
                className="form-slider"
              />
              <span className="slider-value">${formData.weekly_budget}</span>
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>Dietary Restrictions</h3>
          <div className="checkbox-grid">
            {DIETARY_OPTIONS.map(option => (
              <label key={option} className="checkbox-label">
                <input
                  type="checkbox"
                  name="dietary_restrictions"
                  value={option}
                  checked={formData.dietary_restrictions.includes(option)}
                  onChange={handleChange}
                />
                {option}
              </label>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="other_dietary">Other Restrictions</label>
            <input
              type="text"
              id="other_dietary"
              name="other_dietary"
              placeholder="e.g., Soy-Free"
              value={formData.other_dietary}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Preferred Cuisines</h3>
          <div className="checkbox-grid">
            {CUISINE_OPTIONS.map(option => (
              <label key={option} className="checkbox-label">
                <input
                  type="checkbox"
                  name="preferred_cuisines"
                  value={option}
                  checked={formData.preferred_cuisines.includes(option)}
                  onChange={handleChange}
                />
                {option}
              </label>
            ))}
          </div>
          <div className="form-group">
            <label htmlFor="other_cuisine">Other Cuisines</label>
            <input
              type="text"
              id="other_cuisine"
              name="other_cuisine"
              placeholder="e.g., Korean"
              value={formData.other_cuisine}
              onChange={handleChange}
              className="form-input"
            />
          </div>
        </div>

        <div className="form-section">
          <h3>Cooking Skill</h3>
          <div className="form-group">
            <select
              id="cooking_skill"
              name="cooking_skill"
              value={formData.cooking_skill}
              onChange={handleChange}
              className="form-input"
            >
              {SKILL_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="profile-save-btn">Save Changes</button>
      </form>
    </div>
  );
}

export default ProfilePage;