import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sun, Moon, Car, Search, TrendingUp, BarChart3,
  Menu, X, Github, Database
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import styles from './Header.module.css';

export function Header({ onSearch, onNavigate, activeSection }) {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'market', label: 'Market Analysis', icon: TrendingUp },
    { id: 'history', label: 'Price History', icon: Database },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <motion.div
          className={styles.logo}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Car className={styles.logoIcon} />
          <span className={styles.logoText}>
            Auto<span className={styles.logoAccent}>Analyse</span>
          </span>
        </motion.div>

        <nav className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ''}`}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeSection === item.id ? styles.navItemActive : ''}`}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.actions}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <Search className={styles.searchIcon} size={18} />
            <input
              type="text"
              placeholder="Search cars..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </form>

          <motion.button
            className={styles.themeToggle}
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.button>

          <a
            href="https://github.com/masterries/AutoAnalyse"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.githubLink}
            aria-label="View on GitHub"
          >
            <Github size={20} />
          </a>

          <button
            className={styles.mobileMenuToggle}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
    </header>
  );
}
