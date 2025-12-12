import { motion } from 'framer-motion';
import styles from './StatsCard.module.css';

export function StatsCard({ title, value, subtitle, icon: Icon, color, trend }) {
  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
    >
      <div className={styles.iconWrapper} style={{ '--accent-color': color }}>
        <Icon size={24} />
      </div>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        <span className={styles.value}>{value}</span>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        {trend !== undefined && (
          <span className={`${styles.trend} ${trend >= 0 ? styles.trendUp : styles.trendDown}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
    </motion.div>
  );
}
