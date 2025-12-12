import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, TrendingUp, Calendar, DollarSign,
  ChevronDown, ExternalLink, Search, Filter
} from 'lucide-react';
import { PriceHistoryChart } from './Charts';
import {
  formatCurrency, formatDate, formatPercentage, formatRelativeTime, capitalize
} from '../utils/calculations';
import styles from './PriceHistoryView.module.css';

export function PriceHistoryView({ priceHistory, onVehicleClick }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filterType, setFilterType] = useState('all');
  const [expandedVehicle, setExpandedVehicle] = useState(null);

  // Group price history by vehicle
  const groupedHistory = useMemo(() => {
    const groups = {};
    priceHistory.forEach(item => {
      if (!groups[item.listing_id]) {
        groups[item.listing_id] = {
          listing_id: item.listing_id,
          make: item.make,
          model: item.model,
          title: item.title,
          changes: [],
          totalDrop: 0,
          totalDropPercent: 0,
          firstPrice: null,
          lastPrice: null
        };
      }
      groups[item.listing_id].changes.push(item);
    });

    // Calculate totals
    Object.values(groups).forEach(group => {
      group.changes.sort((a, b) => new Date(a.change_date) - new Date(b.change_date));
      if (group.changes.length > 0) {
        group.firstPrice = group.changes[0].price_old;
        group.lastPrice = group.changes[group.changes.length - 1].price_new;
        group.totalDrop = group.firstPrice - group.lastPrice;
        group.totalDropPercent = (group.totalDrop / group.firstPrice) * 100;
      }
    });

    return Object.values(groups);
  }, [priceHistory]);

  // Filter and sort
  const filteredHistory = useMemo(() => {
    let result = [...groupedHistory];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(g =>
        g.title?.toLowerCase().includes(query) ||
        g.make?.toLowerCase().includes(query) ||
        g.model?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType === 'drops') {
      result = result.filter(g => g.totalDrop > 0);
    } else if (filterType === 'increases') {
      result = result.filter(g => g.totalDrop < 0);
    }

    // Sort
    if (sortBy === 'date') {
      result.sort((a, b) => {
        const dateA = new Date(a.changes[a.changes.length - 1]?.change_date || 0);
        const dateB = new Date(b.changes[b.changes.length - 1]?.change_date || 0);
        return dateB - dateA;
      });
    } else if (sortBy === 'amount') {
      result.sort((a, b) => b.totalDrop - a.totalDrop);
    } else if (sortBy === 'percent') {
      result.sort((a, b) => b.totalDropPercent - a.totalDropPercent);
    } else if (sortBy === 'changes') {
      result.sort((a, b) => b.changes.length - a.changes.length);
    }

    return result;
  }, [groupedHistory, searchQuery, sortBy, filterType]);

  // Stats summary
  const stats = useMemo(() => {
    const totalDrops = groupedHistory.filter(g => g.totalDrop > 0).length;
    const totalIncreases = groupedHistory.filter(g => g.totalDrop < 0).length;
    const avgDrop = groupedHistory.length > 0
      ? groupedHistory.reduce((sum, g) => sum + g.totalDrop, 0) / groupedHistory.length
      : 0;
    const maxDrop = Math.max(...groupedHistory.map(g => g.totalDrop), 0);

    return { totalDrops, totalIncreases, avgDrop, maxDrop };
  }, [groupedHistory]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Price History & Fluctuations</h2>
        <p className={styles.subtitle}>
          Track price changes across all vehicles to find the best deals
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <TrendingDown className={styles.statIconGreen} size={24} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.totalDrops}</span>
            <span className={styles.statLabel}>Price Drops</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <TrendingUp className={styles.statIconRed} size={24} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>{stats.totalIncreases}</span>
            <span className={styles.statLabel}>Price Increases</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <DollarSign className={styles.statIconBlue} size={24} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatCurrency(stats.avgDrop)}</span>
            <span className={styles.statLabel}>Avg. Change</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <DollarSign className={styles.statIconPurple} size={24} />
          <div className={styles.statContent}>
            <span className={styles.statValue}>{formatCurrency(stats.maxDrop)}</span>
            <span className={styles.statLabel}>Biggest Drop</span>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filters}>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={styles.select}
          >
            <option value="all">All Changes</option>
            <option value="drops">Price Drops Only</option>
            <option value="increases">Price Increases Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={styles.select}
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="percent">Sort by Percentage</option>
            <option value="changes">Sort by # Changes</option>
          </select>
        </div>
      </div>

      <div className={styles.historyList}>
        <AnimatePresence>
          {filteredHistory.map((vehicle, index) => (
            <motion.div
              key={vehicle.listing_id}
              className={styles.vehicleCard}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.03 }}
            >
              <div
                className={styles.vehicleHeader}
                onClick={() => setExpandedVehicle(
                  expandedVehicle === vehicle.listing_id ? null : vehicle.listing_id
                )}
              >
                <div className={styles.vehicleInfo}>
                  <h3 className={styles.vehicleTitle}>{vehicle.title}</h3>
                  <span className={styles.vehicleMakeModel}>
                    {capitalize(vehicle.make)} {capitalize(vehicle.model)}
                  </span>
                </div>

                <div className={styles.vehicleStats}>
                  <div className={styles.priceChange}>
                    {vehicle.totalDrop > 0 ? (
                      <TrendingDown className={styles.trendDown} size={20} />
                    ) : vehicle.totalDrop < 0 ? (
                      <TrendingUp className={styles.trendUp} size={20} />
                    ) : null}
                    <span className={vehicle.totalDrop > 0 ? styles.dropAmount : styles.increaseAmount}>
                      {formatCurrency(Math.abs(vehicle.totalDrop))}
                    </span>
                    <span className={vehicle.totalDrop > 0 ? styles.dropPercent : styles.increasePercent}>
                      ({formatPercentage(vehicle.totalDrop > 0 ? vehicle.totalDropPercent : -vehicle.totalDropPercent)})
                    </span>
                  </div>

                  <div className={styles.changeCount}>
                    {vehicle.changes.length} change{vehicle.changes.length !== 1 ? 's' : ''}
                  </div>

                  <ChevronDown
                    className={`${styles.chevron} ${expandedVehicle === vehicle.listing_id ? styles.chevronOpen : ''}`}
                    size={20}
                  />
                </div>
              </div>

              <AnimatePresence>
                {expandedVehicle === vehicle.listing_id && (
                  <motion.div
                    className={styles.vehicleDetails}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.priceJourney}>
                      <div className={styles.pricePoint}>
                        <span className={styles.priceLabel}>First Seen</span>
                        <span className={styles.priceValue}>{formatCurrency(vehicle.firstPrice)}</span>
                      </div>
                      <div className={styles.priceArrow}>→</div>
                      <div className={styles.pricePoint}>
                        <span className={styles.priceLabel}>Current</span>
                        <span className={styles.priceValue}>{formatCurrency(vehicle.lastPrice)}</span>
                      </div>
                    </div>

                    <div className={styles.changesList}>
                      {vehicle.changes.map((change, i) => (
                        <div key={i} className={styles.changeItem}>
                          <Calendar size={14} />
                          <span className={styles.changeDate}>
                            {formatDate(change.change_date)}
                          </span>
                          <span className={styles.changeOldPrice}>
                            {formatCurrency(change.price_old)}
                          </span>
                          <span className={styles.changeArrow}>→</span>
                          <span className={styles.changeNewPrice}>
                            {formatCurrency(change.price_new)}
                          </span>
                          <span className={change.price_difference < 0 ? styles.dropAmount : styles.increaseAmount}>
                            ({change.price_difference < 0 ? '-' : '+'}{formatCurrency(Math.abs(change.price_difference))})
                          </span>
                        </div>
                      ))}
                    </div>

                    {vehicle.changes.length >= 2 && (
                      <div className={styles.chartWrapper}>
                        <PriceHistoryChart priceHistory={vehicle.changes} />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredHistory.length === 0 && (
          <div className={styles.emptyState}>
            <Calendar size={48} />
            <h3>No Price History Found</h3>
            <p>No vehicles match your search criteria or there is no price history data available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
