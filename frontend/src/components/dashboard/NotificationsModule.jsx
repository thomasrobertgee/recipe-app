// src/components/dashboard/NotificationsModule.jsx
import React, { useState } from 'react';
// --- REMOVED: axios and toast imports ---
import './DashboardModule.css'; // Use shared styles

// --- Placeholder Data ---
const placeholderNotifications = [
    { id: 1, message: "Low Stock: Olive Oil running low!", timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), type: "low_stock" },
    { id: 2, message: "Chicken Breast is on special at Coles!", timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), type: "new_special" },
    { id: 3, message: "Your favorite butcher added Lamb Chops.", timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), type: "supplier_update" },
    { id: 4, message: "Welcome! Don't forget to set your budget.", timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), type: "general" },
];
// --- End Placeholder Data ---

const NotificationsModule = () => {
    // --- Use placeholder data initially ---
    const [notifications, setNotifications] = useState(placeholderNotifications);
    // --- isLoading is no longer needed for placeholder ---
    // const [isLoading, setIsLoading] = useState(true);

    // --- REMOVED: fetchNotifications and useEffect ---

    // --- UPDATED: Simple dismiss function ---
    const dismissNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        // We can add a toast confirmation if desired
        // toast.info("Notification dismissed.");
    };

    return (
        <div className="dashboard-module notifications-module">
            <h2>Notifications</h2>
            {/* --- Updated logic for placeholder data --- */}
            {notifications.length === 0 ? (
                <p>No new notifications.</p>
            ) : (
                <ul className="notifications-list">
                    {notifications.map(notification => (
                        <li key={notification.id} className={`notification-item type-${notification.type || 'general'}`}>
                            <div className="notification-content">
                                <span className="notification-message">{notification.message}</span>
                                {notification.timestamp && (
                                    <span className="notification-timestamp">
                                        {/* Format timestamp more nicely */}
                                        {new Date(notification.timestamp).toLocaleString([], {
                                            dateStyle: 'short',
                                            timeStyle: 'short'
                                        })}
                                    </span>
                                )}
                            </div>
                            <div className="notification-actions">
                                {/* --- UPDATED: Use dismiss button --- */}
                                <button onClick={() => dismissNotification(notification.id)} className="dismiss-btn" title="Dismiss">×</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {/* Optional link */}
            {/* <div className="module-footer">
                <Link to="/notifications" className="module-link">View All Notifications →</Link>
            </div> */}
        </div>
    );
};

export default NotificationsModule;