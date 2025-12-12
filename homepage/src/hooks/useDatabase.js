import { useState, useEffect, useCallback } from 'react';
import initSqlJs from 'sql.js';

export function useDatabase() {
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDatabase() {
      try {
        setLoading(true);
        setError(null);

        const SQL = await initSqlJs({
          locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });

        // Try multiple paths for the database file
        const dbPaths = [
          '../scrapper/data/autoscout_data.db',
          '/AutoAnalyse/scrapper/data/autoscout_data.db',
          'scrapper/data/autoscout_data.db',
          './scrapper/data/autoscout_data.db'
        ];

        let buffer = null;
        for (const path of dbPaths) {
          try {
            const response = await fetch(path);
            if (response.ok) {
              buffer = await response.arrayBuffer();
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (!buffer) {
          throw new Error('Could not load database from any path');
        }

        const database = new SQL.Database(new Uint8Array(buffer));
        setDb(database);
      } catch (err) {
        console.error('Database loading error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDatabase();
  }, []);

  const executeQuery = useCallback((sql, params = []) => {
    if (!db) return [];
    try {
      const results = db.exec(sql, params);
      if (results.length === 0) return [];

      const { columns, values } = results[0];
      return values.map(row => {
        const obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });
    } catch (err) {
      console.error('Query error:', err);
      return [];
    }
  }, [db]);

  const getMakesAndModels = useCallback(() => {
    return executeQuery(`
      SELECT make, model, COUNT(*) as count
      FROM listings
      GROUP BY make, model
      ORDER BY make, model
    `);
  }, [executeQuery]);

  const getActiveListings = useCallback((make, model) => {
    if (!make || !model) return [];
    return executeQuery(`
      SELECT * FROM listings
      WHERE make = ? AND model = ? AND is_active = 1
      ORDER BY price ASC
    `, [make, model]);
  }, [executeQuery]);

  const getAllListings = useCallback((make, model) => {
    if (!make || !model) return [];
    return executeQuery(`
      SELECT * FROM listings
      WHERE make = ? AND model = ?
      ORDER BY price ASC
    `, [make, model]);
  }, [executeQuery]);

  const getSoldListings = useCallback((make, model) => {
    if (!make || !model) return [];
    return executeQuery(`
      SELECT * FROM listings
      WHERE make = ? AND model = ? AND is_active = 0
      ORDER BY updated_at DESC
    `, [make, model]);
  }, [executeQuery]);

  const getPriceHistory = useCallback((listingId) => {
    if (!listingId) return [];
    return executeQuery(`
      SELECT * FROM price_history
      WHERE listing_id = ?
      ORDER BY change_date DESC
    `, [listingId]);
  }, [executeQuery]);

  const getAllPriceHistory = useCallback((make, model) => {
    if (!make || !model) return [];
    return executeQuery(`
      SELECT * FROM price_history
      WHERE make = ? AND model = ?
      ORDER BY change_date DESC
    `, [make, model]);
  }, [executeQuery]);

  const searchListings = useCallback((query, includeInactive = true) => {
    if (!query || query.length < 2) return [];
    const searchTerm = `%${query}%`;
    const activeCondition = includeInactive ? '' : 'AND is_active = 1';
    return executeQuery(`
      SELECT * FROM listings
      WHERE (title LIKE ? OR make LIKE ? OR model LIKE ? OR location LIKE ?)
      ${activeCondition}
      ORDER BY is_active DESC, price ASC
      LIMIT 100
    `, [searchTerm, searchTerm, searchTerm, searchTerm]);
  }, [executeQuery]);

  const getMarketStats = useCallback((make, model) => {
    if (!make || !model) return null;
    const results = executeQuery(`
      SELECT
        COUNT(*) as total,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(mileage) as avg_mileage,
        MIN(mileage) as min_mileage,
        MAX(mileage) as max_mileage
      FROM listings
      WHERE make = ? AND model = ? AND is_active = 1
    `, [make, model]);
    return results[0] || null;
  }, [executeQuery]);

  const getRecentPriceChanges = useCallback((limit = 20) => {
    return executeQuery(`
      SELECT ph.*, l.url, l.is_active
      FROM price_history ph
      LEFT JOIN listings l ON ph.listing_id = l.listing_id
      ORDER BY ph.change_date DESC
      LIMIT ?
    `, [limit]);
  }, [executeQuery]);

  const getMarketTrends = useCallback((make, model) => {
    if (!make || !model) return [];
    return executeQuery(`
      SELECT
        date(scraped_date) as date,
        COUNT(*) as count,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM listings
      WHERE make = ? AND model = ?
      GROUP BY date(scraped_date)
      ORDER BY date ASC
    `, [make, model]);
  }, [executeQuery]);

  return {
    db,
    loading,
    error,
    executeQuery,
    getMakesAndModels,
    getActiveListings,
    getAllListings,
    getSoldListings,
    getPriceHistory,
    getAllPriceHistory,
    searchListings,
    getMarketStats,
    getRecentPriceChanges,
    getMarketTrends
  };
}
