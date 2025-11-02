// src/components/OnboardingModal.jsx

import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import './OnboardingModal.css';

// Re-using the constants from ProfilePage to stay consistent
const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Nut-Free", "Pescatarian", "Keto", "Paleo"
];
const CUISINE_OPTIONS = [
  "Italian", "Mexican", "Chinese", "Indian", "Japanese", "Thai", "French", "Greek", "Spanish", "Mediterranean"
];
const SKILL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

const OnboardingModal = ({ onClose }) => {
  const { userProfile, fetchUserProfile } = useAuth();
  const [step, setStep] = useState(1);
  
  // --- State to hold all the data ---
  const [profileData, setProfileData] = useState({
    postcode: "", // <-- NEW FIELD
    adult_count: userProfile?.adult_count || 1,
    child_count: userProfile?.child_count || 0,
    has_budget: false,
    weekly_budget: 100, // Default slider start
    dietary_restrictions: [],
    other_dietary: "",
    // --- NEW: State to hold only custom-added items ---
    custom_dietary: [], 
    preferred_cuisines: [],
    other_cuisine: "",
    // --- NEW: State to hold only custom-added items ---
    custom_cuisines: [],
    cooking_skill: userProfile?.cooking_skill || "Beginner",
  });

  const [error, setError] = useState("");

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // FIX: Only run this block for the array checkboxes
    if (type === 'checkbox' && (name === 'dietary_restrictions' || name === 'preferred_cuisines')) {
      // Handle array fields (dietary, cuisines)
      setProfileData(prev => ({
        ...prev,
        [name]: checked 
          ? [...prev[name], value] 
          : prev[name].filter(item => item !== value)
      }));
    } else if (name === 'has_budget') {
      // Handle the budget toggle
      setProfileData(prev => ({
        ...prev,
        has_budget: checked,
        weekly_budget: checked ? (prev.weekly_budget < 10 ? 100 : prev.weekly_budget) : 0
      }));
    } else {
      // Handle all other fields (like text inputs)
      setProfileData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseInt(value) || 0 : value
      }));
    }
  };

  const handleHouseholdChange = (type, amount) => {
    setProfileData(prev => ({
      ...prev,
      [type]: Math.max(0, prev[type] + amount)
    }));
  };

  // --- NEW: Function to add a custom item ---
  const handleAddCustomItem = (type) => {
    if (type === 'dietary') {
      const item = profileData.other_dietary.trim();
      if (item && !profileData.custom_dietary.includes(item) && !profileData.dietary_restrictions.includes(item)) {
        setProfileData(prev => ({
          ...prev,
          custom_dietary: [...prev.custom_dietary, item],
          other_dietary: "" // Clear the input
        }));
      }
    } else if (type === 'cuisine') {
      const item = profileData.other_cuisine.trim();
      if (item && !profileData.custom_cuisines.includes(item) && !profileData.preferred_cuisines.includes(item)) {
        setProfileData(prev => ({
          ...prev,
          custom_cuisines: [...prev.custom_cuisines, item],
          other_cuisine: "" // Clear the input
        }));
      }
    }
  };

  // --- NEW: Function to remove a custom item ---
  const handleRemoveCustomItem = (type, itemToRemove) => {
    if (type === 'dietary') {
      setProfileData(prev => ({
        ...prev,
        custom_dietary: prev.custom_dietary.filter(item => item !== itemToRemove)
      }));
    } else if (type === 'cuisine') {
      setProfileData(prev => ({
        ...prev,
        custom_cuisines: prev.custom_cuisines.filter(item => item !== itemToRemove)
      }));
    }
  };


  const handleSubmit = async () => {
    setError("");
    // Combine standard, custom, and any final text
    const finalDietary = [
      ...profileData.dietary_restrictions, 
      ...profileData.custom_dietary,
      profileData.other_dietary // Add any text left in the box
    ].filter(Boolean); // Filter out empty strings
    
    const finalCuisines = [
      ...profileData.preferred_cuisines, 
      ...profileData.custom_cuisines,
      profileData.other_cuisine
    ].filter(Boolean);

    const payload = {
      postcode: profileData.postcode || null, // <-- NEW FIELD IN PAYLOAD
      adult_count: profileData.adult_count,
      child_count: profileData.child_count,
      weekly_budget: profileData.has_budget ? profileData.weekly_budget : null,
      dietary_restrictions: finalDietary.join(', '),
      preferred_cuisines: finalCuisines.join(', '),
      cooking_skill: profileData.cooking_skill,
      has_completed_onboarding: true, // This is the all-important flag!
    };

    try {
      await axios.put('/users/me', payload);
      toast.success("Profile setup complete! Welcome!");
      await fetchUserProfile(); // Re-fetch the user to get the new data
      onClose(); // This will be passed from DashboardPage
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError("Failed to save profile. Please try again.");
      toast.error("Failed to save profile. Please try again.");
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <StepWelcome onNext={handleNext} />;
      case 2: return <StepLocation data={profileData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />; // <-- NEW STEP
      case 3: return <StepHousehold data={profileData} onChange={handleHouseholdChange} onNext={handleNext} onBack={handleBack} />;
      case 4: return <StepBudget data={profileData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />;
      case 5: return <StepDietary data={profileData} onChange={handleChange} onAdd={handleAddCustomItem} onRemove={handleRemoveCustomItem} onNext={handleNext} onBack={handleBack} />;
      case 6: return <StepCuisines data={profileData} onChange={handleChange} onAdd={handleAddCustomItem} onRemove={handleRemoveCustomItem} onNext={handleNext} onBack={handleBack} />;
      case 7: return <StepSkill data={profileData} onChange={handleChange} onNext={handleNext} onBack={handleBack} />;
      case 8: return <StepReview data={profileData} onBack={handleBack} onSubmit={handleSubmit} error={error} />;
      default: return null;
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content onboarding-modal">
        {renderStep()}
      </div>
    </div>
  );
};

// --- Sub-components for each step ---

const StepWelcome = ({ onNext }) => (
  <div className="modal-step step-welcome">
    <h2>Welcome to The Local Catalogue!</h2> {/* <-- Updated Name */}
    <p>Let's set up your profile to get the most personalized recipes and find specials from stores near you.</p>
    <button onClick={onNext} className="modal-btn primary">Let's Get Started</button>
  </div>
);

// --- NEW STEP COMPONENT ---
const StepLocation = ({ data, onChange, onNext, onBack }) => (
  <div className="modal-step">
    <h3>Step 1: Your Location</h3>
    <p>What's your postcode? This helps us find specials from local businesses right in your neighbourhood.</p>
    <div className="form-group" style={{ padding: '1rem 0' }}>
      <label htmlFor="postcode">Postcode</label>
      <input
        type="text"
        id="postcode"
        name="postcode"
        className="modal-input"
        value={data.postcode}
        onChange={onChange}
        placeholder="e.g. 3025"
        maxLength="4"
      />
    </div>
    <div className="modal-nav">
      <button onClick={onBack} className="modal-btn">Back</button>
      <button onClick={onNext} className="modal-btn primary" disabled={!data.postcode}>Next</button>
    </div>
  </div>
);


const StepHousehold = ({ data, onChange, onNext, onBack }) => (
  <div className="modal-step">
    <h3>Step 2: Household</h3> {/* <-- Updated Step Number */}
    <p>How many people are you typically cooking for?</p>
    <div className="household-counter">
      <label>Adults</label>
      <div className="counter-controls">
        <button onClick={() => onChange('adult_count', -1)} disabled={data.adult_count <= 0}>-</button>
        <span>{data.adult_count}</span>
        <button onClick={() => onChange('adult_count', 1)}>+</button>
      </div>
    </div>
    <div className="household-counter">
      <label>Children</label>
      <div className="counter-controls">
        <button onClick={() => onChange('child_count', -1)} disabled={data.child_count <= 0}>-</button>
        <span>{data.child_count}</span>
        <button onClick={() => onChange('child_count', 1)}>+</button>
      </div>
    </div>
    <div className="modal-nav">
      <button onClick={onBack} className="modal-btn">Back</button> {/* <-- Added Back Button */}
      <button onClick={onNext} className="modal-btn primary" disabled={data.adult_count === 0 && data.child_count === 0}>Next</button>
    </div>
  </div>
);

const StepBudget = ({ data, onChange, onNext, onBack }) => (
  <div className="modal-step">
    <h3>Step 3: Budget</h3> {/* <-- Updated Step Number */}
    <p>Do you have a weekly food budget you'd like to stick to?</p>
    <div className="toggle-switch">
      <label className="switch">
        <input type="checkbox" name="has_budget" checked={data.has_budget} onChange={onChange} />
        <span className="slider round"></span>
      </label>
      <span>{data.has_budget ? "Yes" : "No"}</span>
    </div>

    {data.has_budget && (
      <div className="budget-slider">
        <label htmlFor="weekly_budget">Weekly Budget: ${data.weekly_budget}</label>
        <input
          type="range"
          id="weekly_budget"
          name="weekly_budget"
          min="10"
          max="1000"
          step="10"
          value={data.weekly_budget}
          onChange={onChange}
        />
        <div className="slider-labels">
          <span>$10</span>
          <span>$1000</span>
        </div>
      </div>
    )}
    <div className="modal-nav">
      <button onClick={onBack} className="modal-btn">Back</button>
      <button onClick={onNext} className="modal-btn primary">Next</button>
    </div>
  </div>
);

// --- UPDATED ---
const StepDietary = ({ data, onChange, onAdd, onRemove, onNext, onBack }) => (
  <div className="modal-step">
    <h3>Step 4: Dietary Needs</h3> {/* <-- Updated Step Number */}
    <p>Please select any dietary restrictions.</p>
    <div className="checkbox-grid">
      {DIETARY_OPTIONS.map(option => (
        <label key={option} className="checkbox-label">
          <input
            type="checkbox"
            name="dietary_restrictions"
            value={option}
            checked={data.dietary_restrictions.includes(option)}
            onChange={onChange}
          />
          {option}
        </label>
      ))}
    </div>
    
    <div className="input-add-group">
      <input
        type="text"
        name="other_dietary"
        placeholder="Other (e.g., Soy-Free...)"
        className="modal-input"
        value={data.other_dietary}
        onChange={onChange}
        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd('dietary'))}
      />
      <button onClick={() => onAdd('dietary')} className="modal-btn-add">Add</button>
    </div>

    {data.custom_dietary.length > 0 && (
      <div className="tags-container">
        {data.custom_dietary.map(item => (
          <span key={item} className="tag">
            {item}
            <button onClick={() => onRemove('dietary', item)}>&times;</button>
          </span>
        ))}
      </div>
    )}

    <div className="modal-nav">
      <button onClick={onBack} className="modal-btn">Back</button>
      <button onClick={onNext} className="modal-btn primary">Next</button>
    </div>
  </div>
);

// --- UPDATED ---
const StepCuisines = ({ data, onChange, onAdd, onRemove, onNext, onBack }) => (
  <div className="modal-step">
    <h3>Step 5: Tastes</h3> {/* <-- Updated Step Number */}
    <p>What are your favorite cuisines?</p>
    <div className="checkbox-grid">
      {CUISINE_OPTIONS.map(option => (
        <label key={option} className="checkbox-label">
          <input
            type="checkbox"
            name="preferred_cuisines"
            value={option}
            checked={data.preferred_cuisines.includes(option)}
            onChange={onChange}
          />
          {option}
        </label>
      ))}
    </div>
    
    <div className="input-add-group">
      <input
        type="text"
        name="other_cuisine"
        placeholder="Other (e.g., Korean...)"
        className="modal-input"
        value={data.other_cuisine}
        onChange={onChange}
        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), onAdd('cuisine'))}
      />
      <button onClick={() => onAdd('cuisine')} className="modal-btn-add">Add</button>
    </div>

    {data.custom_cuisines.length > 0 && (
      <div className="tags-container">
        {data.custom_cuisines.map(item => (
          <span key={item} className="tag">
            {item}
            <button onClick={() => onRemove('cuisine', item)}>&times;</button>
          </span>
        ))}
      </div>
    )}

    <div className="modal-nav">
      <button onClick={onBack} className="modal-btn">Back</button>
      <button onClick={onNext} className="modal-btn primary">Next</button>
    </div>
  </div>
);

const StepSkill = ({ data, onChange, onNext, onBack }) => (
  <div className="modal-step">
    <h3>Step 6: Cooking Skill</h3> {/* <-- Updated Step Number */}
    <p>How would you rate your cooking skill?</p>
    <div className="radio-group">
      {SKILL_OPTIONS.map(option => (
        <label key={option} className={`radio-label ${data.cooking_skill === option ? 'selected' : ''}`}>
          <input
            type="radio"
            name="cooking_skill"
            value={option}
            checked={data.cooking_skill === option}
            onChange={onChange}
          />
          {option}
        </label>
      ))}
    </div>
    <div className="modal-nav">
      <button onClick={onBack} className="modal-btn">Back</button>
      <button onClick={onNext} className="modal-btn primary">Next</button>
    </div>
  </div>
);

// --- UPDATED ---
const StepReview = ({ data, onBack, onSubmit, error }) => {
  const dietary = [...data.dietary_restrictions, ...data.custom_dietary].filter(Boolean).join(', ') || "None";
  const cuisines = [...data.preferred_cuisines, ...data.custom_cuisines].filter(Boolean).join(', ') || "None";
  
  return (
    <div className="modal-step">
      <h3>Final Step: Review</h3> {/* <-- Updated Step Number */}
      <p>Does this all look correct?</p>
      <div className="review-summary">
        <p><strong>Your Postcode:</strong> {data.postcode}</p> {/* <-- NEW FIELD */}
        <p><strong>Household:</strong> {data.adult_count} Adults, {data.child_count} Children</p>
        <p><strong>Budget:</strong> {data.has_budget ? `$${data.weekly_budget} / week` : "No budget set"}</p>
        <p><strong>Dietary Needs:</strong> {dietary}</p>
        <p><strong>Cuisines:</strong> {cuisines}</p>
        <p><strong>Skill Level:</strong> {data.cooking_skill}</p>
      </div>
      {error && <p className="modal-error">{error}</p>}
      <div className="modal-nav">
        <button onClick={onBack} className="modal-btn">Back</button>
        <button onClick={onSubmit} className="modal-btn primary">Looks Good, Save!</button>
      </div>
    </div>
  );
};

export default OnboardingModal;