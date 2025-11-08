// src/pages/MealPlanPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RecipeCard from '../components/RecipeCard'; // For drag-and-drop
import './Page.css';
import './MealPlanPage.css';
// --- FIX: Removed broken import for 'findBestSpecialMatch' ---
import { parsePrice } from '../utils/priceUtils';
// --- END FIX ---

// Helper functions for dnd-kit
const getWeekDays = (startDate) => {
    const days = [];
    let currentDate = new Date(startDate);
    for (let i = 0; i < 7; i++) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
};

const formatDateISO = (date) => date.toISOString().split('T')[0];

const MealPlanPage = () => {
    // Note: 'allSpecials' is not currently passed in props, this logic was unfinished.
    // We get 'savedRecipes' and 'handleSelectRecipe' from useAuth()
    const { userProfile, savedRecipes, handleSelectRecipe } = useAuth();
    const [mealPlan, setMealPlan] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const today = new Date();
        today.setDate(today.getDate() - today.getDay()); // Start from Sunday
        return today;
    });

    const weekDays = useMemo(() => getWeekDays(currentWeekStart), [currentWeekStart]);

    // --- FIX: Incomplete totalCost logic removed ---
    // The broken logic for `findBestSpecialMatch` was here.
    // const totalCost = useMemo(() => { ... }, [mealPlan, allSpecials]);
    // --- END FIX ---


    const fetchMealPlan = () => {
        setIsLoading(true);
        axios.get('/api/meal-plan')
            .then(res => setMealPlan(res.data))
            .catch(err => {
                console.error("Error fetching meal plan:", err);
                if (!err.response || err.response.status !== 401) {
                    toast.error("Could not load meal plan.");
                }
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchMealPlan();
    }, []);

    const handleDrop = async (event) => {
        const { active, over } = event;
        // Check if active.data.current exists and has the recipe
        if (!over || !active.data.current || !active.data.current.recipe) {
             console.warn("Drag drop cancelled: No active recipe data found.");
             return;
        }

        const recipe = active.data.current.recipe;
        const [dayStr, mealType] = over.id.split('-'); // e.g., "2023-10-27-Dinner"

        const newEntry = {
            recipe_id: recipe.id,
            plan_date: dayStr,
            meal_type: mealType,
            use_for_leftovers: false, // Default value
        };

        try {
            const res = await axios.post('/api/meal-plan', newEntry);
            setMealPlan(prev => [...prev, res.data]);
            toast.success(`Added "${recipe.title}" to ${mealType}`);
        } catch (error) {
            console.error("Error adding to meal plan:", error);
            toast.error(error.response?.data?.detail || "Could not add to meal plan.");
        }
    };

    const handleRemoveFromPlan = async (entryId, recipeTitle) => {
         try {
            await axios.delete(`/api/meal-plan/${entryId}`);
            setMealPlan(prev => prev.filter(entry => entry.id !== entryId));
            toast.info(`Removed "${recipeTitle}" from meal plan.`);
        } catch (error) {
            console.error("Error removing from meal plan:", error);
            toast.error("Could not remove item.");
        }
    };

    const addAllToShoppingList = () => {
        // --- FIX: Filter by current week ---
        const weekStartISO = formatDateISO(weekDays[0]);
        const weekEndISO = formatDateISO(weekDays[6]);

        const recipesInWeek = mealPlan
            .filter(entry => {
                return entry.plan_date >= weekStartISO && entry.plan_date <= weekEndISO;
            })
            // TODO: Add logic for leftovers
            .map(entry => entry.recipe);
        
        if (recipesInWeek.length === 0) {
            toast.info("No recipes in the current week to add.");
            return;
        }

        // Add each recipe to the shopping list
        recipesInWeek.forEach(recipe => handleSelectRecipe(recipe));
        toast.success(`Added ${recipesInWeek.length} planned meals to shopping list!`);
        // --- END FIX ---
    };

    // --- All the DND-Kit component definitions ---
    const DraggableRecipe = ({ recipe }) => {
        const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
            id: `recipe-${recipe.id}`,
            data: { recipe } // Attach the full recipe object to the active drag data
        });
        const style = {
            transform: CSS.Transform.toString(transform),
            transition,
        };
        // Use a simplified tile for dragging
        return (
            <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="draggable-recipe-tile">
                {recipe.title}
            </div>
        );
    };

    const DroppableDaySlot = ({ day, mealType }) => {
        const { setNodeRef } = useSortable({
             id: `${formatDateISO(day)}-${mealType}`
        });

        const entriesForSlot = mealPlan.filter(entry =>
            entry.plan_date === formatDateISO(day) && entry.meal_type === mealType
        );

        return (
            <div ref={setNodeRef} className="day-slot-droppable">
                <h4>{mealType}</h4>
                <div className="slot-content">
                    {entriesForSlot.length > 0 ? (
                        entriesForSlot.map(entry => (
                            <div key={entry.id} className="planned-meal-tile">
                                <span>{entry.recipe.title}</span>
                                <button
                                    onClick={() => handleRemoveFromPlan(entry.id, entry.recipe.title)}
                                    className="remove-meal-btn"
                                >
                                    &times;
                                </button>
                            </div>
                        ))
                    ) : (
                        <span className="drop-placeholder">Drop recipe here</span>
                    )}
                </div>
            </div>
        );
    };

    const sensors = useSensors(
        useSensor(PointerSensor)
        // Add KeyboardSensor if needed for accessibility
    );


    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDrop}>
            <div className="app-container meal-plan-page">
                <div className="page-header meal-plan-header">
                    <h1>Weekly Meal Plan</h1>
                    <div className="meal-plan-controls">
                        <button onClick={addAllToShoppingList} className="btn btn-primary">
                            Add Week to Shopping List
                        </button>
                        {/* --- REMOVED: Broken totalCost display --- */}
                    </div>
                </div>

                <div className="meal-plan-layout">
                    {/* Sidebar for Draggable Recipes */}
                    <SortableContext
                        items={savedRecipes.map(r => `recipe-${r.id}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        <aside className="recipe-sidebar">
                            <h3>Drag Your Saved Recipes</h3>
                            <div className="draggable-recipe-list">
                                {isLoading ? ( // Use the meal plan loading state
                                    <p>Loading...</p>
                                ) : (
                                    savedRecipes.length > 0 ? (
                                        savedRecipes.map(recipe => (
                                            <DraggableRecipe key={recipe.id} recipe={recipe} />
                                        ))
                                    ) : (
                                        <p>You have no saved recipes to plan with.</p>
                                    )
                                )}
                            </div>
                        </aside>
                    </SortableContext>

                    {/* Main Weekly Calendar */}
                    <main className="meal-plan-calendar">
                         <div className="week-navigation">
                            <button onClick={() => setCurrentWeekStart(d => new Date(d.setDate(d.getDate() - 7)))}>
                                &larr; Previous Week
                            </button>
                            <span>
                                {weekDays[0].toLocaleDateString()} - {weekDays[6].toLocaleDateString()}
                            </span>
                            <button onClick={() => setCurrentWeekStart(d => new Date(d.setDate(d.getDate() + 7)))}>
                                Next Week &rarr;
                            </button>
                        </div>
                        <SortableContext
                             items={weekDays.flatMap(day => [
                                `${formatDateISO(day)}-Lunch`,
                                `${formatDateISO(day)}-Dinner`
                            ])}
                            strategy={verticalListSortingStrategy} // Not really sorting, just identifying
                        >
                            <div className="calendar-grid">
                                {weekDays.map(day => (
                                    <div key={day.toISOString()} className="calendar-day-cell">
                                        <div className="day-header">
                                            <strong>{day.toLocaleDateString('en-US', { weekday: 'long' })}</strong>
                                            <span className="day-date">{day.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                        <DroppableDaySlot day={day} mealType="Lunch" />
                                        <DroppableDaySlot day={day} mealType="Dinner" />
                                    </div>
                                ))}
                            </div>
                        </SortableContext>
                    </main>
                </div>
            </div>
        </DndContext>
    );
};

export default MealPlanPage;