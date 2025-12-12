import { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Car, Euro, Gauge, Calendar, TrendingDown, Zap, BarChart3
} from 'lucide-react';

import { ThemeProvider } from './context/ThemeContext';
import { useDatabase } from './hooks/useDatabase';
import { Header } from './components/Header';
import { ModelSelector } from './components/ModelSelector';
import { Filters } from './components/Filters';
import { VehicleCard } from './components/VehicleCard';
import { StatsCard } from './components/StatsCard';
import { PriceHistoryView } from './components/PriceHistoryView';
import { SearchResults } from './components/SearchResults';
import { Loading, LoadingGrid } from './components/Loading';
import {
  PriceMileageChart,
  PriceByAgeChart,
  MileageDistributionChart,
  MarketTrendChart
} from './components/Charts';
import {
  parsePower, parseAge, calculateKmPerYear, calculatePricePerPS,
  calculateScore, formatCurrency, formatNumber, median
} from './utils/calculations';

import './App.css';

const defaultFilters = {
  priceMin: '',
  priceMax: '',
  mileageMin: '',
  mileageMax: '',
  ageMin: '',
  ageMax: '',
  powerMin: '',
  powerMax: '',
  kmPerYearMax: '',
  pricePerPSMax: '',
  showInactive: true
};

function AppContent() {
  const {
    loading, error,
    getMakesAndModels, getAllListings, getMarketStats,
    getAllPriceHistory, searchListings, getMarketTrends
  } = useDatabase();

  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [filters, setFilters] = useState(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // Fetch data
  const makesAndModels = useMemo(() => {
    if (loading) return [];
    return getMakesAndModels();
  }, [loading, getMakesAndModels]);

  const allListings = useMemo(() => {
    if (loading || !selectedMake || !selectedModel) return [];
    return getAllListings(selectedMake, selectedModel);
  }, [loading, selectedMake, selectedModel, getAllListings]);

  const stats = useMemo(() => {
    if (loading || !selectedMake || !selectedModel) return null;
    return getMarketStats(selectedMake, selectedModel);
  }, [loading, selectedMake, selectedModel, getMarketStats]);

  const priceHistory = useMemo(() => {
    if (loading || !selectedMake || !selectedModel) return [];
    return getAllPriceHistory(selectedMake, selectedModel);
  }, [loading, selectedMake, selectedModel, getAllPriceHistory]);

  const marketTrends = useMemo(() => {
    if (loading || !selectedMake || !selectedModel) return [];
    return getMarketTrends(selectedMake, selectedModel);
  }, [loading, selectedMake, selectedModel, getMarketTrends]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return allListings.filter(v => {
      // Active/Inactive filter
      if (!filters.showInactive && v.is_active !== 1) return false;

      // Price filter
      if (filters.priceMin && v.price < parseFloat(filters.priceMin)) return false;
      if (filters.priceMax && v.price > parseFloat(filters.priceMax)) return false;

      // Mileage filter
      if (filters.mileageMin && v.mileage < parseFloat(filters.mileageMin)) return false;
      if (filters.mileageMax && v.mileage > parseFloat(filters.mileageMax)) return false;

      // Age filter
      const age = parseAge(v.first_registration);
      if (age !== null) {
        if (filters.ageMin && age < parseFloat(filters.ageMin)) return false;
        if (filters.ageMax && age > parseFloat(filters.ageMax)) return false;
      }

      // Power filter
      const power = parsePower(v.power);
      if (power !== null) {
        if (filters.powerMin && power < parseFloat(filters.powerMin)) return false;
        if (filters.powerMax && power > parseFloat(filters.powerMax)) return false;
      }

      // KM per year filter
      const kmPerYear = calculateKmPerYear(v.mileage, age);
      if (kmPerYear !== null && filters.kmPerYearMax) {
        if (kmPerYear > parseFloat(filters.kmPerYearMax)) return false;
      }

      // Price per PS filter
      const pricePerPS = calculatePricePerPS(v.price, power);
      if (pricePerPS !== null && filters.pricePerPSMax) {
        if (pricePerPS > parseFloat(filters.pricePerPSMax)) return false;
      }

      return true;
    });
  }, [allListings, filters]);

  // Calculate scores for vehicles
  const vehiclesWithScores = useMemo(() => {
    return filteredVehicles.map(v => ({
      ...v,
      score: calculateScore(v, stats)
    })).sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [filteredVehicles, stats]);

  // Calculate extended stats
  const extendedStats = useMemo(() => {
    if (!stats || filteredVehicles.length === 0) return null;

    const prices = filteredVehicles.map(v => v.price).filter(p => p != null);
    const mileages = filteredVehicles.map(v => v.mileage).filter(m => m != null);
    const activeCount = filteredVehicles.filter(v => v.is_active === 1).length;
    const soldCount = filteredVehicles.filter(v => v.is_active === 0).length;

    return {
      ...stats,
      median_price: median(prices),
      median_mileage: median(mileages),
      activeCount,
      soldCount,
      totalCount: filteredVehicles.length
    };
  }, [stats, filteredVehicles]);

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    if (query && query.length >= 2) {
      const results = searchListings(query, true);
      setSearchResults(results);
    } else {
      setSearchResults(null);
    }
  }, [searchListings]);

  // Handle model selection
  const handleModelSelect = useCallback((make, model) => {
    setSelectedMake(make);
    setSelectedModel(model);
    setFilters(defaultFilters);
  }, []);

  if (loading) {
    return <Loading message="Loading vehicle database..." />;
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-content">
          <Car size={48} />
          <h2>Database Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        onSearch={handleSearch}
        onNavigate={setActiveSection}
        activeSection={activeSection}
      />

      <main className="main-content">
        <div className="container">
          {/* Model Selector - Always visible */}
          <section className="section">
            <ModelSelector
              makesAndModels={makesAndModels}
              selectedMake={selectedMake}
              selectedModel={selectedModel}
              onSelect={handleModelSelect}
            />
          </section>

          {/* Dashboard Section */}
          {activeSection === 'dashboard' && selectedMake && selectedModel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="dashboard"
            >
              {/* Stats Cards */}
              {extendedStats && (
                <section className="stats-grid">
                  <StatsCard
                    title="Active Listings"
                    value={extendedStats.activeCount}
                    subtitle={`${extendedStats.soldCount} sold`}
                    icon={Car}
                    color="var(--color-accent-primary)"
                  />
                  <StatsCard
                    title="Average Price"
                    value={formatCurrency(extendedStats.avg_price)}
                    subtitle={`Median: ${formatCurrency(extendedStats.median_price)}`}
                    icon={Euro}
                    color="var(--color-success)"
                  />
                  <StatsCard
                    title="Average Mileage"
                    value={`${formatNumber(extendedStats.avg_mileage)} km`}
                    subtitle={`${formatCurrency(extendedStats.min_price)} - ${formatCurrency(extendedStats.max_price)}`}
                    icon={Gauge}
                    color="var(--color-warning)"
                  />
                  <StatsCard
                    title="Price Changes"
                    value={priceHistory.length}
                    subtitle="Recorded price drops"
                    icon={TrendingDown}
                    color="var(--color-info)"
                  />
                </section>
              )}

              {/* Filters */}
              <section className="section">
                <Filters
                  filters={filters}
                  onChange={setFilters}
                  stats={stats}
                />
              </section>

              {/* Vehicle Grid */}
              <section className="section">
                <div className="section-header">
                  <h2 className="section-title">
                    {vehiclesWithScores.length} Vehicles
                  </h2>
                  <span className="section-subtitle">
                    Sorted by best value score
                  </span>
                </div>

                {vehiclesWithScores.length > 0 ? (
                  <div className="vehicle-grid">
                    {vehiclesWithScores.map((vehicle, index) => (
                      <VehicleCard
                        key={vehicle.listing_id || vehicle.id}
                        vehicle={vehicle}
                        score={vehicle.score}
                        index={index}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Car size={48} />
                    <h3>No vehicles match your filters</h3>
                    <p>Try adjusting your filter criteria</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {/* Market Analysis Section */}
          {activeSection === 'market' && selectedMake && selectedModel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="market-analysis"
            >
              <section className="charts-grid">
                <PriceMileageChart vehicles={allListings} />
                <PriceByAgeChart vehicles={allListings} />
                <MileageDistributionChart vehicles={allListings} />
                {marketTrends.length > 0 && (
                  <MarketTrendChart trends={marketTrends} />
                )}
              </section>
            </motion.div>
          )}

          {/* Price History Section */}
          {activeSection === 'history' && selectedMake && selectedModel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <PriceHistoryView priceHistory={priceHistory} />
            </motion.div>
          )}

          {/* Empty State - No model selected */}
          {!selectedMake && (
            <motion.div
              className="welcome-state"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="welcome-icon">
                <BarChart3 size={64} />
              </div>
              <h2>Welcome to AutoAnalyse</h2>
              <p>
                Select a brand and model above to explore the Luxembourg car market.
                <br />
                Analyze prices, track fluctuations, and find the best deals.
              </p>
              <div className="feature-cards">
                <div className="feature-card">
                  <Euro size={24} />
                  <h3>Price Analysis</h3>
                  <p>Compare prices and find the best value vehicles</p>
                </div>
                <div className="feature-card">
                  <TrendingDown size={24} />
                  <h3>Price History</h3>
                  <p>Track price drops and market trends over time</p>
                </div>
                <div className="feature-card">
                  <Zap size={24} />
                  <h3>Smart Scoring</h3>
                  <p>Our algorithm ranks vehicles by overall value</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>
            AutoAnalyse - Luxembourg Car Market Intelligence
          </p>
          <p className="footer-subtitle">
            Data updated daily from AutoScout24 Luxembourg
          </p>
        </div>
      </footer>

      {/* Search Results Modal */}
      <AnimatePresence>
        {searchResults && (
          <SearchResults
            results={searchResults}
            onClose={() => setSearchResults(null)}
            stats={stats}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
