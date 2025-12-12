import { motion } from 'framer-motion';
import {
  Calendar, Gauge, Fuel, Zap, MapPin, ExternalLink,
  TrendingDown, TrendingUp, Clock, Tag
} from 'lucide-react';
import {
  parsePower, parseAge, calculateKmPerYear, calculatePricePerPS,
  formatCurrency, formatNumber, getScoreColor, getScoreLabel,
  capitalize, formatRelativeTime
} from '../utils/calculations';
import styles from './VehicleCard.module.css';

export function VehicleCard({ vehicle, score, index = 0, onClick, showPriceHistory }) {
  const power = parsePower(vehicle.power);
  const age = parseAge(vehicle.first_registration);
  const kmPerYear = calculateKmPerYear(vehicle.mileage, age);
  const pricePerPS = calculatePricePerPS(vehicle.price, power);
  const isActive = vehicle.is_active === 1;

  const handleClick = () => {
    if (onClick) onClick(vehicle);
  };

  return (
    <motion.article
      className={`${styles.card} ${!isActive ? styles.cardInactive : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={handleClick}
      whileHover={{ y: -4, boxShadow: 'var(--shadow-xl)' }}
    >
      {!isActive && (
        <div className={styles.soldBadge}>
          <Tag size={14} />
          Sold
        </div>
      )}

      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{vehicle.title}</h3>
          <span className={styles.brand}>
            {capitalize(vehicle.make)} {capitalize(vehicle.model)}
          </span>
        </div>
        {score !== null && score !== undefined && (
          <div
            className={styles.score}
            style={{ '--score-color': getScoreColor(score) }}
          >
            <span className={styles.scoreValue}>{score}</span>
            <span className={styles.scoreLabel}>{getScoreLabel(score)}</span>
          </div>
        )}
      </div>

      <div className={styles.price}>
        <span className={styles.priceValue}>{formatCurrency(vehicle.price)}</span>
        {pricePerPS && (
          <span className={styles.pricePerPS}>
            {formatNumber(pricePerPS)} €/PS
          </span>
        )}
      </div>

      <div className={styles.specs}>
        <div className={styles.spec}>
          <Gauge className={styles.specIcon} size={16} />
          <span>{formatNumber(vehicle.mileage)} km</span>
        </div>

        <div className={styles.spec}>
          <Calendar className={styles.specIcon} size={16} />
          <span>{vehicle.first_registration || '-'}</span>
        </div>

        {power && (
          <div className={styles.spec}>
            <Zap className={styles.specIcon} size={16} />
            <span>{power} PS</span>
          </div>
        )}

        <div className={styles.spec}>
          <Fuel className={styles.specIcon} size={16} />
          <span>{vehicle.fuel_type || '-'}</span>
        </div>
      </div>

      {kmPerYear && (
        <div className={styles.kmPerYear}>
          <Clock size={14} />
          <span>~{formatNumber(kmPerYear)} km/year</span>
          {kmPerYear < 10000 ? (
            <span className={styles.lowMileage}>Low mileage</span>
          ) : kmPerYear > 25000 ? (
            <span className={styles.highMileage}>High mileage</span>
          ) : null}
        </div>
      )}

      {vehicle.location && (
        <div className={styles.location}>
          <MapPin size={14} />
          <span>{vehicle.location}</span>
        </div>
      )}

      {showPriceHistory && vehicle.price_history && vehicle.price_history.length > 0 && (
        <div className={styles.priceHistory}>
          <span className={styles.priceHistoryTitle}>Price Changes:</span>
          {vehicle.price_history.slice(0, 3).map((change, i) => (
            <div key={i} className={styles.priceChange}>
              {change.price_difference < 0 ? (
                <TrendingDown size={14} className={styles.priceDown} />
              ) : (
                <TrendingUp size={14} className={styles.priceUp} />
              )}
              <span className={change.price_difference < 0 ? styles.priceDown : styles.priceUp}>
                {formatCurrency(Math.abs(change.price_difference))}
              </span>
              <span className={styles.priceChangeDate}>
                {formatRelativeTime(change.change_date)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.footer}>
        {vehicle.updated_at && (
          <span className={styles.lastSeen}>
            Updated: {formatRelativeTime(vehicle.updated_at)}
          </span>
        )}
        <a
          href={vehicle.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.viewLink}
          onClick={(e) => e.stopPropagation()}
        >
          View Listing
          <ExternalLink size={14} />
        </a>
      </div>
    </motion.article>
  );
}
