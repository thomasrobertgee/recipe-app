// src/components/ShoppingList.jsx

import React, { useState, useEffect, useMemo } from 'react';
import './ShoppingList.css';

const getSimplePrice = (priceString) => {
    if (!priceString) return 0;
    const match = priceString.match(/\$(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
};

const ShoppingList = ({ selectedRecipes, allSpecials }) => {
    const [checkedItems, setCheckedItems] = useState(() => {
        const saved = localStorage.getItem('checkedItems');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('checkedItems', JSON.stringify(checkedItems));
    }, [checkedItems]);

    const { lineItems, totalCost } = useMemo(() => {
        if (!allSpecials || selectedRecipes.length === 0) return { lineItems: [], totalCost: 0 };
        
        const shoppingListMap = new Map();
        
        selectedRecipes.forEach(recipe => {
            recipe.ingredients.forEach(ingredient => {
                const key = ingredient.name.toLowerCase();
                const special = allSpecials.find(s => s.ingredient_name.toLowerCase().includes(key));
                
                if (special && !shoppingListMap.has(special.ingredient_name)) {
                     shoppingListMap.set(special.ingredient_name, {
                        name: special.ingredient_name,
                        priceString: special.price,
                        cost: getSimplePrice(special.price),
                     });
                }
            });
        });
        
        const uniqueItems = Array.from(shoppingListMap.values());
        const total = uniqueItems.reduce((sum, item) => sum + item.cost, 0);

        return { lineItems: uniqueItems, totalCost: total };
    }, [selectedRecipes, allSpecials]);

    const handleCheckItem = (itemName) => {
        const key = itemName.toLowerCase();
        if (checkedItems.includes(key)) {
            setCheckedItems(checkedItems.filter(item => item !== key));
        } else {
            setCheckedItems([...checkedItems, key]);
        }
    };

    return (
        <div className="shopping-list-container">
            <h2>Shopping List</h2>
            {lineItems.length === 0 ? (<p>Select some recipes to get started!</p>) : (
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
                                    <div className="item-details">
                                        <span className="item-price">{item.priceString}</span>
                                    </div>
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