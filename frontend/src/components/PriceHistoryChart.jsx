// frontend/src/components/PriceHistoryChart.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './PriceHistoryChart.css';
import { getSimplePrice } from '../utils/priceUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PriceHistoryChart = ({ ingredient, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ingredient) {
      axios.get(`http://127.0.0.1:8000/api/ingredient/${ingredient.ingredient_id}/price-history`)
        .then(response => {
          setHistory(response.data.reverse()); // Reverse to show oldest first
          setLoading(false);
        })
        .catch(error => {
          console.error("Error fetching price history:", error);
          setLoading(false);
        });
    }
  }, [ingredient]);

  const chartData = {
    labels: history.map(item => new Date(item.date_recorded).toLocaleDateString()),
    datasets: [
      {
        label: `Price History for ${ingredient.ingredient_name}`,
        data: history.map(item => getSimplePrice(item.price)),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Price History for ${ingredient.ingredient_name}`,
        font: {
          size: 16,
        }
      },
    },
    scales: {
      y: {
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(2);
          }
        }
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="price-history-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        {loading ? (
          <p>Loading price history...</p>
        ) : history.length > 0 ? (
          <Line options={chartOptions} data={chartData} />
        ) : (
          <p>No price history available for this item.</p>
        )}
      </div>
    </div>
  );
};

export default PriceHistoryChart;