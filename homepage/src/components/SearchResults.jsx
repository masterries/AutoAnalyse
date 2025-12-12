import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, SlidersHorizontal, Grid, List } from 'lucide-react';
import { VehicleCard } from './VehicleCard';
import { calculateScore } from '../utils/calculations';
import styles from './SearchResults.module.css';

export function SearchResults({ results, onClose, stats }) {
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('relevance');

  const sortedResults = useMemo(() => {
    const resultsWithScores = results.map(v => ({
      ...v,
      score: calculateScore(v, stats)
    }));

    switch (sortBy) {
      case 'price_asc':
        return [...resultsWithScores].sort((a, b) => a.price - b.price);
      case 'price_desc':
        return [...resultsWithScores].sort((a, b) => b.price - a.price);
      case 'mileage_asc':
        return [...resultsWithScores].sort((a, b) => a.mileage - b.mileage);
      case 'score':
        return [...resultsWithScores].sort((a, b) => (b.score || 0) - (a.score || 0));
      case 'newest':
        return [...resultsWithScores].sort((a, b) =>
          new Date(b.scraped_date) - new Date(a.scraped_date)
        );
      default:
        return resultsWithScores;
    }
  }, [results, sortBy, stats]);

  const activeCount = results.filter(r => r.is_active === 1).length;
  const soldCount = results.filter(r => r.is_active === 0).length;

  return (
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={styles.container}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
      >
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Search size={24} className={styles.headerIcon} />
            <div>
              <h2 className={styles.title}>Search Results</h2>
              <p className={styles.subtitle}>
                {results.length} vehicles found
                <span className={styles.countBadge}>{activeCount} active</span>
                {soldCount > 0 && (
                  <span className={styles.countBadgeSold}>{soldCount} sold</span>
                )}
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.controls}>
          <div className={styles.sortSelect}>
            <SlidersHorizontal size={16} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={styles.select}
            >
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="mileage_asc">Mileage: Low to High</option>
              <option value="score">Best Score</option>
              <option value="newest">Newest First</option>
            </select>
          </div>

          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${viewMode === 'grid' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'list' ? styles.viewButtonActive : ''}`}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <div className={`${styles.results} ${viewMode === 'list' ? styles.resultsList : ''}`}>
          <AnimatePresence>
            {sortedResults.map((vehicle, index) => (
              <VehicleCard
                key={vehicle.listing_id || vehicle.id}
                vehicle={vehicle}
                score={vehicle.score}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>

        {results.length === 0 && (
          <div className={styles.emptyState}>
            <Search size={48} />
            <h3>No Results Found</h3>
            <p>Try adjusting your search query or filters.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
