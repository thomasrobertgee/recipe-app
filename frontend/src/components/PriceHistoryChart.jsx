// src/components/PriceHistoryChart.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { toast } from 'react-toastify';
// --- *** FIX: Import 'parsePrice' instead of 'getSimplePrice' *** ---
import { parsePrice } from '../utils/priceUtils';
// --- *** END FIX *** ---
import './PriceHistoryChart.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PriceHistoryChart = ({ ingredientId, ingredientName, onClose }) => {
  const [chartData, setChartData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const processHistoryData = (history) => {
    // Sort by date ascending
    const sortedHistory = [...history].sort((a, b) => new Date(a.date_recorded) - new Date(b.date_recorded));
    
    const labels = sortedHistory.map(item => new Date(item.date_recorded).toLocaleDateString());
    // --- *** FIX: Use 'parsePrice' here *** ---
    const data = sortedHistory.map(item => parsePrice(item.price));
    // --- *** END FIX *** ---
    
    // Group by store
    const datasets = {};
    sortedHistory.forEach((item, index) => {
      const store = item.store || 'Other';
      if (!datasets[store]) {
        // Create dataset for this store
        datasets[store] = {
          label: store,
          data: new Array(labels.length).fill(null), // Fill with nulls
          // Simple color hashing based on store name
          borderColor: `hsl(${store.length * 20 % 360}, 70%, 50%)`,
          backgroundColor: `hsl(${store.length * 20 % 360}, 70%, 50%, 0.5)`,
          tension: 0.1,
          spanGaps: true, // Connect lines over null points
        };
      }
      // Add data at the correct index
      datasets[store].data[index] = data[index];
    });

    return {
      labels,
      datasets: Object.values(datasets),
    };
  };

  useEffect(() => {
    if (!ingredientId) return;
    setIsLoading(true);
    axios.get(`/api/ingredient/${ingredientId}/price-history`)
      .then(response => {
        if (response.data && response.data.length > 0) {
          const processedData = processHistoryData(response.data);
          setChartData(processedData);
        } else {
          toast.info("No price history found for this item.");
          setChartData(null); // No data to show
        }
      })
      .catch(error => {
        console.error("Error fetching price history:", error);
        if (!error.response || error.response.status !== 401) {
             toast.error("Could not load price history.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [ingredientId]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Price History for ${ingredientName}`,
        font: { size: 16 }
      },
      tooltip: {
         callbacks: {
            label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                    label += ': ';
                }
                if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                }
                return label;
            }
         }
      }
    },
    scales: {
        y: {
            beginAtZero: false, // Don't force y-axis to start at 0
            ticks: {
                // Format y-axis ticks as currency
                callback: function(value, index, values) {
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                }
            }
        }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container price-history-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        {isLoading && <p>Loading chart...</p>}
        {!isLoading && !chartData && <p>No price history available to display.</p>}
        {!isLoading && chartData && (
          <div className="chart-wrapper">
            <Line options={options} data={chartData} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceHistoryChart;