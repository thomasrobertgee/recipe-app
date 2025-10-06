// src/components/ShoppingList.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { calculateRecipeCost } from '../utils/priceUtils';
import './ShoppingList.css';

const ShoppingList = ({ allSpecials }) => {
    const { selectedRecipes } = useAuth();
    const { closeSidebar } = useUI();
    const [checkedItems, setCheckedItems] = useState(() => JSON.parse(localStorage.getItem('checkedItems') || '[]'));

    useEffect(() => { localStorage.setItem('checkedItems', JSON.stringify(checkedItems)); }, [checkedItems]);

    const { lineItems, totalCost } = useMemo(() => {
        if (!allSpecials || selectedRecipes.length === 0) return { lineItems: [], totalCost: 0 };
        const shoppingListMap = new Map();
        selectedRecipes.forEach(recipe => {
            recipe.ingredients.forEach(ingredient => {
                const key = ingredient.name.toLowerCase();
                const special = allSpecials.find(s => s.ingredient_name.toLowerCase().includes(key));
                if (special && !shoppingListMap.has(special.ingredient_name)) {
                     shoppingListMap.set(special.ingredient_name, { name: special.ingredient_name, priceString: special.price });
                }
            });
        });
        const uniqueItems = Array.from(shoppingListMap.values());
        const total = selectedRecipes.reduce((sum, recipe) => sum + calculateRecipeCost(recipe, allSpecials), 0);
        return { lineItems: uniqueItems, totalCost: total };
    }, [selectedRecipes, allSpecials]);

    const handleCheckItem = (itemName) => {
        const key = itemName.toLowerCase();
        if (checkedItems.includes(key)) { setCheckedItems(checkedItems.filter(item => item !== key)); } 
        else { setCheckedItems([...checkedItems, key]); }
    };

    return (
        <div className="shopping-list-container">
            <div className="shopping-list-header">
                <h2>Shopping List</h2>
                {/* --- THIS IS THE CHANGE --- */}
                <button onClick={closeSidebar} className="minimize-btn">Minimize</button>
            </div>
            {lineItems.length === 0 ? (<p>Select recipes to start your list.</p>) : (
                <>
                    <ul>
                        {lineItems.map(item => {
                            const isChecked = checkedItems.includes(item.name.toLowerCase());
                            return (
                                <li key={item.name} className={isChecked ? 'checked' : ''}>
                                    <label className="checkbox-label">
                                        <input type="checkbox" checked={isChecked} onChange={() => handleCheckItem(item.name)} />
                                        <strong>{item.name}</strong>
                                    </label>
                                    <div className="item-details"><span className="item-price">{item.priceString}</span></div>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="total-cost-section">
                        <strong>Total Estimated Cost:</strong>
                        <span>${totalCost.toFixed(2)}</span>
                    </div>
                </>
            )}
        </div>
    );
};
export default ShoppingList;