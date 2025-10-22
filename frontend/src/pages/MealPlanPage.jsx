// src/pages/MealPlanPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import RecipeTile from '../components/RecipeTile';
import { toast } from 'react-toastify';
import {
    DndContext,
    closestCenter,
    useDraggable,
    useDroppable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
// --- *** Import price utils *** ---
import { getSimplePrice, findBestSpecialMatch } from '../utils/priceUtils';
import './MealPlanPage.css';
import '../pages/Page.css'; // Re-use common page styles

const weekDays = [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" ];

const getISODateForDay = (dayName) => {
    const today = new Date();
    const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
    const targetDayIndex = weekDays.indexOf(dayName);
    if (targetDayIndex === -1) return null;
    let dayDifference = targetDayIndex - currentDayIndex;
    if (dayDifference < 0) dayDifference += 7;
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + dayDifference);
    return targetDate.toISOString().split('T')[0];
};

function DraggableRecipeTile({ recipe }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `recipe-${recipe.id}`, data: { recipe } });
    const style = { transform: CSS.Transform.toString(transform), zIndex: 100, cursor: 'grab' };
    return <div ref={setNodeRef} style={style} {...listeners} {...attributes}><RecipeTile recipe={recipe} /></div>;
}

function DroppableDay({ day, children }) {
    const { isOver, setNodeRef } = useDroppable({ id: `day-${day}`, data: { day } });
    const style = { backgroundColor: isOver ? '#e8f5e9' : '#fdfdfd', border: isOver ? '2px dashed #4caf50' : '1px dashed #ddd' };
    return <div ref={setNodeRef} className="calendar-day" style={style}><h3>{day}</h3><div className="day-recipe-list">{children.length > 0 ? children : <p>Drop recipes here</p>}</div></div>;
}

function MealPlanPage() {
    const { userProfile, savedRecipes, fetchSavedRecipes, handleSelectRecipe, selectedRecipes } = useAuth();
    const [mealPlan, setMealPlan] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // --- *** Add state for allSpecials *** ---
    const [allSpecials, setAllSpecials] = useState([]);

    // --- *** Re-add useEffect for fetching specials *** ---
    useEffect(() => {
        axios.get('/api/prices/today')
            .then(response => setAllSpecials(response.data))
            .catch(error => console.error("Could not fetch specials for Meal Plan page", error));
    }, []);

    useEffect(() => {
        if (savedRecipes.length === 0) fetchSavedRecipes();
        fetchMealPlan();
    }, [fetchSavedRecipes, savedRecipes.length]); // Added fetchSavedRecipes dependency

    const fetchMealPlan = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get('/api/meal-plan');
            setMealPlan(res.data); setError(null);
        } catch (err) {
            console.error("Error fetching meal plan:", err);
            setError("Could not load meal plan."); toast.error("Could not load meal plan.");
        } finally { setIsLoading(false); }
    };

    const mealPlanByDate = useMemo(() => {
        return mealPlan.reduce((acc, entry) => {
            const parts = entry.plan_date.split('-');
            if (parts.length !== 3) return acc;
            const year = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1, day = parseInt(parts[2], 10);
            const entryDate = new Date(Date.UTC(year, month, day));
            const utcDay = entryDate.getUTCDay();
            const dayIndex = utcDay === 0 ? 6 : utcDay - 1;
            const dayName = weekDays[dayIndex];
            if (!dayName) return acc;
            if (!acc[dayName]) acc[dayName] = [];
            acc[dayName].push(entry);
            return acc;
        }, {});
    }, [mealPlan]);

    // --- *** NEW: Calculate ingredients and cost for the current plan *** ---
    const planDetails = useMemo(() => {
        if (!mealPlan || mealPlan.length === 0) {
            return { planIngredients: [], planCost: 0 };
        }

        const itemsMap = new Map();
        let calculatedCost = 0;

        mealPlan.forEach(({ recipe }) => { // Assume quantity is 1 for plan items
            recipe.ingredients.forEach(ingredient => {
                const special = findBestSpecialMatch(ingredient.name, allSpecials);
                const existingItem = itemsMap.get(ingredient.ingredient_id);

                if (existingItem) {
                    existingItem.count += 1; // Increment count for each recipe it appears in
                    existingItem.recipeTitles.add(recipe.title);
                } else {
                    itemsMap.set(ingredient.ingredient_id, {
                        id: ingredient.ingredient_id,
                        name: ingredient.name,
                        priceString: special ? special.price : null,
                        store: special ? special.store : null,
                        count: 1,
                        recipeTitles: new Set([recipe.title]),
                    });
                }
            });
        });

        const planIngredients = Array.from(itemsMap.values()).sort((a,b) => a.name.localeCompare(b.name));

        calculatedCost = planIngredients.reduce((total, item) => {
            if (item.priceString) {
                // Cost calculation assumes 1 unit per recipe occurrence
                return total + (getSimplePrice(item.priceString) * item.count);
            }
            return total;
        }, 0);

        return { planIngredients, planCost: calculatedCost };

    }, [mealPlan, allSpecials]);
    // --- *** END NEW CALCULATION *** ---

    const handleDragEnd = async (event) => { /* ... (no changes needed here) ... */
        const { active, over } = event;
        if (!over || !over.id.startsWith('day-') || !active.id.startsWith('recipe-')) return;
        const droppedRecipe = active.data.current?.recipe;
        const targetDay = over.data.current?.day;
        if (!droppedRecipe || !targetDay) return;
        const targetDate = getISODateForDay(targetDay);
        if (!targetDate) return;
        try {
            const res = await axios.post('/api/meal-plan', { recipe_id: droppedRecipe.id, plan_date: targetDate });
            setMealPlan(prevPlan => [...prevPlan, res.data]);
            toast.success(`${droppedRecipe.title} added to ${targetDay}`);
        } catch (err) { console.error("Error adding:", err); toast.error(err.response?.data?.detail || "Could not add."); }
    };

    const handleDeleteRecipe = async (entryId, recipeTitle) => { /* ... (no changes needed here) ... */
        if (!window.confirm(`Remove ${recipeTitle}?`)) return;
        try {
            await axios.delete(`/api/meal-plan/${entryId}`);
            setMealPlan(prevPlan => prevPlan.filter(entry => entry.id !== entryId));
            toast.info(`${recipeTitle} removed.`);
        } catch (err) { console.error("Error deleting:", err); toast.error("Could not remove."); }
    };

    const handleAddPlanToShoppingList = () => { /* ... (no changes needed here) ... */
        if (mealPlan.length === 0) { toast.info("Plan empty."); return; }
        const currentIds = new Set(selectedRecipes.map(item => item.recipe.id));
        let added = 0;
        mealPlan.forEach(entry => { if (!currentIds.has(entry.recipe.id)) { handleSelectRecipe(entry.recipe); added++; } });
        if (added > 0) toast.success(`Added ${added} recipe(s) to shopping list!`);
        else toast.info("All plan recipes already in list.");
    };

    const isOverBudget = userProfile?.weekly_budget && planDetails.planCost > userProfile.weekly_budget;

    return (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <div className="page-container meal-plan-page">
                <header className="page-header">
                    <h1>My Meal Plan</h1>
                    <button onClick={handleAddPlanToShoppingList} className="add-plan-to-list-btn" disabled={mealPlan.length === 0}>
                        Add Meal Plan to Shopping List
                    </button>
                    <p>Drag recipes onto the calendar. Click button above to add ingredients to main list.</p>
                </header>

                {error && <p className="error-message">{error}</p>}

                <div className="meal-plan-layout">
                    {/* Column 1: Saved Recipes */}
                    <aside className="meal-plan-recipes-list">
                        <h2>My Saved Recipes</h2>
                        <div className="recipes-container">
                            {isLoading && <p>Loading...</p>}
                            {savedRecipes.length > 0 ? (
                                savedRecipes.map(recipe => <DraggableRecipeTile key={recipe.id} recipe={recipe} />)
                            ) : (!isLoading && <p>No saved recipes.</p>)}
                        </div>
                    </aside>

                    {/* Column 2: Calendar */}
                    <main className="meal-plan-calendar">
                        <h2>This Week's Plan</h2>
                        <div className="calendar-grid">
                            {weekDays.map(day => (
                                <DroppableDay key={day} day={day}>
                                    {(mealPlanByDate[day] || []).map(entry => (
                                        <div key={entry.id} className="planned-recipe-tile">
                                            <RecipeTile recipe={entry.recipe} />
                                            <button onClick={() => handleDeleteRecipe(entry.id, entry.recipe.title)} className="delete-plan-item-btn" title="Remove">&times;</button>
                                        </div>
                                    ))}
                                </DroppableDay>
                            ))}
                        </div>
                    </main>

                    {/* Column 3: Plan Info - Updated */}
                    <aside className="meal-plan-info-column">
                        <h2>Plan Info</h2>
                        {userProfile?.weekly_budget && (
                            <div className={`budget-tracker ${isOverBudget ? 'over-budget' : ''}`}>
                                <strong>Budget: ${userProfile.weekly_budget.toFixed(2)}</strong> /
                                <span> Est. Cost: ${planDetails.planCost.toFixed(2)}</span>
                                {isOverBudget && <span className="budget-warning"> (Over Budget!)</span>}
                            </div>
                        )}
                        {/* --- *** Display Calculated Plan Ingredients *** --- */}
                        {planDetails.planIngredients.length > 0 ? (
                            <ul className="plan-ingredients-list">
                                {planDetails.planIngredients.map(item => (
                                    <li key={item.id} className="plan-ingredient-item">
                                        <span className="plan-ingredient-name">{item.name} {item.count > 1 ? `(${item.count})` : ''}</span>
                                        <span className="plan-ingredient-price">
                                            {item.priceString ? `$${getSimplePrice(item.priceString).toFixed(2)}` : 'N/A'}
                                            {item.store && <span className="plan-ingredient-store"> @ {item.store}</span>}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>Add recipes to the plan to see ingredients here.</p>
                        )}
                         {/* --- *** END Ingredient Display *** --- */}
                    </aside>
                </div>
            </div>
        </DndContext>
    );
}

export default MealPlanPage;