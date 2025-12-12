import { motion } from 'framer-motion';
import { Car, Database } from 'lucide-react';
import styles from './Loading.module.css';

export function Loading({ message = 'Loading database...' }) {
  return (
    <div className={styles.container}>
      <motion.div
        className={styles.content}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className={styles.iconWrapper}
          animate={{
            rotate: [0, 10, -10, 0],
            y: [0, -10, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <Car size={48} />
        </motion.div>

        <div className={styles.loadingBar}>
          <motion.div
            className={styles.loadingProgress}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </div>

        <motion.p
          className={styles.message}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {message}
        </motion.p>

        <div className={styles.hint}>
          <Database size={14} />
          <span>Initializing SQL.js engine...</span>
        </div>
      </motion.div>
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className={styles.card}>
      <div className={`${styles.skeleton} ${styles.skeletonTitle}`} />
      <div className={`${styles.skeleton} ${styles.skeletonSubtitle}`} />
      <div className={styles.skeletonRow}>
        <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
        <div className={`${styles.skeleton} ${styles.skeletonStat}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.skeletonButton}`} />
    </div>
  );
}

export function LoadingGrid({ count = 6 }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <LoadingCard key={i} />
      ))}
    </div>
  );
}
