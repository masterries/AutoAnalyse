// Parse power string to get PS value
export function parsePower(powerStr) {
  if (!powerStr) return null;
  const match = powerStr.match(/(\d+)\s*PS/i) || powerStr.match(/(\d+)\s*kW/i);
  if (!match) return null;
  const value = parseInt(match[1]);
  if (powerStr.toLowerCase().includes('kw')) {
    return Math.round(value * 1.36); // Convert kW to PS
  }
  return value;
}

// Parse registration date to get age in years
export function parseAge(registrationStr) {
  if (!registrationStr) return null;
  const match = registrationStr.match(/(\d{2})-(\d{4})/);
  if (!match) return null;
  const month = parseInt(match[1]);
  const year = parseInt(match[2]);
  const regDate = new Date(year, month - 1);
  const now = new Date();
  const ageMs = now - regDate;
  return ageMs / (1000 * 60 * 60 * 24 * 365.25);
}

// Calculate km per year
export function calculateKmPerYear(mileage, age) {
  if (!mileage || !age || age <= 0) return null;
  return Math.round(mileage / age);
}

// Calculate price per PS
export function calculatePricePerPS(price, power) {
  if (!price || !power || power <= 0) return null;
  return Math.round(price / power);
}

// Calculate vehicle score (simplified version)
export function calculateScore(vehicle, stats) {
  if (!vehicle || !stats) return null;

  const power = parsePower(vehicle.power);
  const age = parseAge(vehicle.first_registration);
  const mileage = vehicle.mileage || 0;
  const price = vehicle.price || 0;

  if (!age || age <= 0 || !price || price <= 0) return null;

  let score = 50; // Base score

  // Price factor (lower is better)
  if (stats.avg_price) {
    const priceDiff = (stats.avg_price - price) / stats.avg_price;
    score += priceDiff * 20;
  }

  // Mileage factor (lower is better, considering age)
  const kmPerYear = calculateKmPerYear(mileage, age);
  if (kmPerYear !== null) {
    const avgKmPerYear = 15000; // Average km per year
    const kmDiff = (avgKmPerYear - kmPerYear) / avgKmPerYear;
    score += kmDiff * 15;
  }

  // Age factor (newer is slightly better, but good value can overcome)
  if (age < 3) score += 5;
  else if (age > 10) score -= 5;

  // Power factor (if available)
  if (power) {
    const pricePerPS = calculatePricePerPS(price, power);
    if (pricePerPS < 150) score += 10;
    else if (pricePerPS < 200) score += 5;
    else if (pricePerPS > 300) score -= 5;
  }

  // Normalize score to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

// Get score color
export function getScoreColor(score) {
  if (score >= 80) return 'var(--color-score-excellent)';
  if (score >= 60) return 'var(--color-score-good)';
  if (score >= 40) return 'var(--color-score-average)';
  return 'var(--color-score-poor)';
}

// Get score label
export function getScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Average';
  return 'Poor';
}

// Format currency
export function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(value);
}

// Format number with thousands separator
export function formatNumber(value) {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('de-DE').format(Math.round(value));
}

// Format percentage
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

// Format date
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

// Format relative time
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Capitalize string
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Generate brand color
export function getBrandColor(make) {
  const colors = {
    audi: '#bb0a30',
    bmw: '#0066b1',
    'mercedes-benz': '#00adef',
    volkswagen: '#001e50',
    default: '#6366f1'
  };
  return colors[make?.toLowerCase()] || colors.default;
}

// Calculate median
export function median(arr) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Calculate standard deviation
export function stdDev(arr) {
  if (!arr || arr.length === 0) return null;
  const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
}
