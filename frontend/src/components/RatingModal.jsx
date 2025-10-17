// src/components/RatingModal.jsx
import React, { useState } from 'react';
import StarRating from './StarRating';
import './RatingModal.css'; // Ensure the CSS is imported

const RatingModal = ({ recipeTitle, onClose, onSubmit }) => {
    const [rating, setRating] = useState(0);

    const handleSubmit = () => {
        if (rating > 0) {
            onSubmit(rating);
        }
    };

    return (
        <div className="rating-modal-overlay" onClick={onClose}>
            <div className="rating-modal-content" onClick={(e) => e.stopPropagation()}>
                <h3>Rate this recipe</h3>
                <p>{recipeTitle}</p>
                <div className="rating-modal-stars">
                    <StarRating rating={rating} onRate={setRating} />
                </div>
                <div className="rating-modal-actions">
                    <button onClick={onClose} className="cancel-rating-btn">Cancel</button>
                    <button onClick={handleSubmit} className="submit-rating-btn" disabled={rating === 0}>
                        Submit Rating
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RatingModal;