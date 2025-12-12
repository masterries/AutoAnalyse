import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/calculations';
import styles from './Filters.module.css';

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

export function Filters({ filters, onChange, stats }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange(defaultFilters);
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== '' && value !== true && key !== 'showInactive'
  ).length;

  return (
    <motion.div
      className={styles.filters}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        className={styles.toggleButton}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Filter size={18} />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className={styles.badge}>{activeFilterCount}</span>
        )}
        <ChevronDown
          size={18}
          className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
        />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className={styles.panel}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.grid}>
              <div className={styles.filterGroup}>
                <label className={styles.label}>Price Range (€)</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    placeholder={stats ? formatNumber(stats.min_price) : 'Min'}
                    value={filters.priceMin}
                    onChange={(e) => handleChange('priceMin', e.target.value)}
                    className={styles.input}
                  />
                  <span className={styles.rangeSeparator}>-</span>
                  <input
                    type="number"
                    placeholder={stats ? formatNumber(stats.max_price) : 'Max'}
                    value={filters.priceMax}
                    onChange={(e) => handleChange('priceMax', e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.label}>Mileage (km)</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    placeholder={stats ? formatNumber(stats.min_mileage) : 'Min'}
                    value={filters.mileageMin}
                    onChange={(e) => handleChange('mileageMin', e.target.value)}
                    className={styles.input}
                  />
                  <span className={styles.rangeSeparator}>-</span>
                  <input
                    type="number"
                    placeholder={stats ? formatNumber(stats.max_mileage) : 'Max'}
                    value={filters.mileageMax}
                    onChange={(e) => handleChange('mileageMax', e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.label}>Age (years)</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.ageMin}
                    onChange={(e) => handleChange('ageMin', e.target.value)}
                    className={styles.input}
                  />
                  <span className={styles.rangeSeparator}>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.ageMax}
                    onChange={(e) => handleChange('ageMax', e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.label}>Power (PS)</label>
                <div className={styles.rangeInputs}>
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.powerMin}
                    onChange={(e) => handleChange('powerMin', e.target.value)}
                    className={styles.input}
                  />
                  <span className={styles.rangeSeparator}>-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.powerMax}
                    onChange={(e) => handleChange('powerMax', e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.label}>Max km/year</label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={filters.kmPerYearMax}
                  onChange={(e) => handleChange('kmPerYearMax', e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.label}>Max €/PS</label>
                <input
                  type="number"
                  placeholder="e.g. 200"
                  value={filters.pricePerPSMax}
                  onChange={(e) => handleChange('pricePerPSMax', e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button
                className={`${styles.toggleInactive} ${filters.showInactive ? styles.active : ''}`}
                onClick={() => handleChange('showInactive', !filters.showInactive)}
              >
                {filters.showInactive ? <Eye size={16} /> : <EyeOff size={16} />}
                {filters.showInactive ? 'Showing sold cars' : 'Hiding sold cars'}
              </button>

              <button className={styles.resetButton} onClick={handleReset}>
                <RefreshCw size={16} />
                Reset Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
