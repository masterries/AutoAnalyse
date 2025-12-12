import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';
import { parsePower, parseAge, calculateKmPerYear, formatCurrency, formatNumber } from '../utils/calculations';
import styles from './Charts.module.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function PriceMileageChart({ vehicles }) {
  const { theme } = useTheme();

  const data = useMemo(() => {
    const active = vehicles.filter(v => v.is_active === 1);
    const inactive = vehicles.filter(v => v.is_active === 0);

    return {
      datasets: [
        {
          label: 'Active Listings',
          data: active.map(v => ({ x: v.mileage, y: v.price, vehicle: v })),
          backgroundColor: 'rgba(99, 102, 241, 0.6)',
          borderColor: 'rgba(99, 102, 241, 1)',
          pointRadius: 6,
          pointHoverRadius: 8,
        },
        {
          label: 'Sold',
          data: inactive.map(v => ({ x: v.mileage, y: v.price, vehicle: v })),
          backgroundColor: 'rgba(239, 68, 68, 0.4)',
          borderColor: 'rgba(239, 68, 68, 0.8)',
          pointRadius: 5,
          pointHoverRadius: 7,
        }
      ]
    };
  }, [vehicles]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme === 'dark' ? '#94a3b8' : '#475569',
          font: { family: 'Inter' }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const v = context.raw.vehicle;
            return [
              v.title,
              `Price: ${formatCurrency(v.price)}`,
              `Mileage: ${formatNumber(v.mileage)} km`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Mileage (km)',
          color: theme === 'dark' ? '#94a3b8' : '#475569',
        },
        ticks: {
          color: theme === 'dark' ? '#64748b' : '#94a3b8',
          callback: (value) => formatNumber(value)
        },
        grid: {
          color: theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Price (€)',
          color: theme === 'dark' ? '#94a3b8' : '#475569',
        },
        ticks: {
          color: theme === 'dark' ? '#64748b' : '#94a3b8',
          callback: (value) => formatCurrency(value)
        },
        grid: {
          color: theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)'
        }
      }
    }
  };

  return (
    <motion.div
      className={styles.chartCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className={styles.chartTitle}>Price vs Mileage</h3>
      <div className={styles.chartContainer}>
        <Scatter data={data} options={options} />
      </div>
    </motion.div>
  );
}

export function PriceByAgeChart({ vehicles }) {
  const { theme } = useTheme();

  const data = useMemo(() => {
    const ageGroups = {};
    vehicles.forEach(v => {
      const age = parseAge(v.first_registration);
      if (age !== null) {
        const ageYear = Math.floor(age);
        if (!ageGroups[ageYear]) {
          ageGroups[ageYear] = [];
        }
        ageGroups[ageYear].push(v.price);
      }
    });

    const labels = Object.keys(ageGroups).sort((a, b) => a - b);
    const avgPrices = labels.map(age => {
      const prices = ageGroups[age];
      return prices.reduce((a, b) => a + b, 0) / prices.length;
    });

    return {
      labels: labels.map(age => `${age} yr`),
      datasets: [{
        label: 'Average Price',
        data: avgPrices,
        backgroundColor: 'rgba(99, 102, 241, 0.7)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        borderRadius: 8,
      }]
    };
  }, [vehicles]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Avg: ${formatCurrency(context.parsed.y)}`
        }
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Vehicle Age',
          color: theme === 'dark' ? '#94a3b8' : '#475569',
        },
        ticks: { color: theme === 'dark' ? '#64748b' : '#94a3b8' },
        grid: { display: false }
      },
      y: {
        title: {
          display: true,
          text: 'Average Price (€)',
          color: theme === 'dark' ? '#94a3b8' : '#475569',
        },
        ticks: {
          color: theme === 'dark' ? '#64748b' : '#94a3b8',
          callback: (value) => formatCurrency(value)
        },
        grid: {
          color: theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)'
        }
      }
    }
  };

  return (
    <motion.div
      className={styles.chartCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h3 className={styles.chartTitle}>Price by Vehicle Age</h3>
      <div className={styles.chartContainer}>
        <Bar data={data} options={options} />
      </div>
    </motion.div>
  );
}

export function MileageDistributionChart({ vehicles }) {
  const { theme } = useTheme();

  const data = useMemo(() => {
    const categories = {
      'Low (<10k km/yr)': 0,
      'Normal (10-15k km/yr)': 0,
      'Above Average (15-20k km/yr)': 0,
      'High (>20k km/yr)': 0
    };

    vehicles.forEach(v => {
      const age = parseAge(v.first_registration);
      const kmPerYear = calculateKmPerYear(v.mileage, age);
      if (kmPerYear !== null) {
        if (kmPerYear < 10000) categories['Low (<10k km/yr)']++;
        else if (kmPerYear < 15000) categories['Normal (10-15k km/yr)']++;
        else if (kmPerYear < 20000) categories['Above Average (15-20k km/yr)']++;
        else categories['High (>20k km/yr)']++;
      }
    });

    return {
      labels: Object.keys(categories),
      datasets: [{
        data: Object.values(categories),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgba(16, 185, 129, 1)',
          'rgba(99, 102, 241, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 2,
      }]
    };
  }, [vehicles]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: theme === 'dark' ? '#94a3b8' : '#475569',
          font: { family: 'Inter', size: 11 },
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.parsed} vehicles (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <motion.div
      className={styles.chartCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className={styles.chartTitle}>Mileage Distribution (km/year)</h3>
      <div className={styles.chartContainerSmall}>
        <Doughnut data={data} options={options} />
      </div>
    </motion.div>
  );
}

export function PriceHistoryChart({ priceHistory }) {
  const { theme } = useTheme();

  const data = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return null;

    const sortedHistory = [...priceHistory].sort(
      (a, b) => new Date(a.change_date) - new Date(b.change_date)
    );

    const labels = sortedHistory.map(h =>
      new Date(h.change_date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    );

    const prices = sortedHistory.map(h => h.price_new);

    return {
      labels,
      datasets: [{
        label: 'Price',
        data: prices,
        borderColor: 'rgba(99, 102, 241, 1)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(99, 102, 241, 1)',
      }]
    };
  }, [priceHistory]);

  if (!data) return null;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => formatCurrency(context.parsed.y)
        }
      }
    },
    scales: {
      x: {
        ticks: { color: theme === 'dark' ? '#64748b' : '#94a3b8' },
        grid: { display: false }
      },
      y: {
        ticks: {
          color: theme === 'dark' ? '#64748b' : '#94a3b8',
          callback: (value) => formatCurrency(value)
        },
        grid: {
          color: theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)'
        }
      }
    }
  };

  return (
    <motion.div
      className={styles.chartCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className={styles.chartTitle}>Price History</h3>
      <div className={styles.chartContainer}>
        <Line data={data} options={options} />
      </div>
    </motion.div>
  );
}

export function MarketTrendChart({ trends }) {
  const { theme } = useTheme();

  const data = useMemo(() => {
    if (!trends || trends.length === 0) return null;

    const labels = trends.map(t =>
      new Date(t.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    );

    return {
      labels,
      datasets: [
        {
          label: 'Average Price',
          data: trends.map(t => t.avg_price),
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: true,
          yAxisID: 'y',
          tension: 0.4,
        },
        {
          label: 'Listings Count',
          data: trends.map(t => t.count),
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          yAxisID: 'y1',
          tension: 0.4,
        }
      ]
    };
  }, [trends]);

  if (!data) return null;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: theme === 'dark' ? '#94a3b8' : '#475569',
          font: { family: 'Inter' }
        }
      },
    },
    scales: {
      x: {
        ticks: { color: theme === 'dark' ? '#64748b' : '#94a3b8' },
        grid: { display: false }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Avg Price (€)',
          color: theme === 'dark' ? '#94a3b8' : '#475569',
        },
        ticks: {
          color: theme === 'dark' ? '#64748b' : '#94a3b8',
          callback: (value) => formatCurrency(value)
        },
        grid: {
          color: theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Count',
          color: theme === 'dark' ? '#94a3b8' : '#475569',
        },
        ticks: { color: theme === 'dark' ? '#64748b' : '#94a3b8' },
        grid: { drawOnChartArea: false },
      },
    }
  };

  return (
    <motion.div
      className={styles.chartCard}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className={styles.chartTitle}>Market Trend Over Time</h3>
      <div className={styles.chartContainer}>
        <Line data={data} options={options} />
      </div>
    </motion.div>
  );
}
