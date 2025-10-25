// src/components/ReceiptCorrectionModal.jsx
import React, { useState, useEffect } from 'react';
import './ReceiptCorrectionModal.css';

const ReceiptCorrectionModal = ({ detectedItems = [], onClose, onConfirm }) => {
    // Initialize state with unique IDs for editing/keying
    const [items, setItems] = useState(() =>
        detectedItems.map((item, index) => ({ id: index, name: item }))
    );
    const [newItemName, setNewItemName] = useState('');

    // Handle changes to individual item inputs
    const handleItemChange = (id, newName) => {
        setItems(currentItems =>
            currentItems.map(item =>
                item.id === id ? { ...item, name: newName } : item
            )
        );
    };

    // Handle removing an item
    const handleRemoveItem = (id) => {
        setItems(currentItems => currentItems.filter(item => item.id !== id));
    };

    // Handle adding a new item manually
    const handleAddItem = (e) => {
        e.preventDefault(); // Prevent form submission if wrapped in form
        const trimmedName = newItemName.trim();
        if (trimmedName) {
            setItems(currentItems => [
                ...currentItems,
                { id: Date.now(), name: trimmedName } // Use timestamp for unique temp ID
            ]);
            setNewItemName(''); // Clear input field
        }
    };

    // Handle confirmation -> sends back only the names
    const handleConfirm = () => {
        const finalItemNames = items
            .map(item => item.name.trim()) // Trim whitespace
            .filter(Boolean); // Filter out any empty strings
        onConfirm(finalItemNames);
        onClose(); // Close modal after confirming
    };

    return (
        <div className="modal-overlay correction-modal-overlay">
            <div className="modal-content correction-modal-content">
                <h2>Confirm Receipt Items</h2>
                <p>Please review and correct the items detected from your receipt before adding them to your pantry.</p>

                {items.length > 0 ? (
                    <ul className="correction-item-list">
                        {items.map((item) => (
                            <li key={item.id} className="correction-item">
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => handleItemChange(item.id, e.target.value)}
                                    className="item-input"
                                    placeholder="Enter item name"
                                />
                                <button
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="remove-item-btn"
                                    title="Remove Item"
                                >
                                    &times;
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="no-items-message">No items detected or added yet.</p>
                )}


                <form onSubmit={handleAddItem} className="add-item-form">
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Add another item manually..."
                        className="add-item-input"
                    />
                    <button type="submit" className="add-item-btn">Add</button>
                </form>

                <div className="modal-actions correction-modal-actions">
                    <button onClick={onClose} className="modal-btn cancel-btn">Cancel</button>
                    <button onClick={handleConfirm} className="modal-btn primary confirm-btn">
                        Add {items.filter(i => i.name.trim()).length} Items to Pantry
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReceiptCorrectionModal;