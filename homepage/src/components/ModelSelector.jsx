import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Car } from 'lucide-react';
import { capitalize } from '../utils/calculations';
import styles from './ModelSelector.module.css';

export function ModelSelector({ makesAndModels, selectedMake, selectedModel, onSelect }) {
  const makes = useMemo(() => {
    const makeMap = {};
    makesAndModels.forEach(item => {
      if (!makeMap[item.make]) {
        makeMap[item.make] = [];
      }
      makeMap[item.make].push({ model: item.model, count: item.count });
    });
    return makeMap;
  }, [makesAndModels]);

  const handleMakeChange = (e) => {
    const make = e.target.value;
    onSelect(make, '');
  };

  const handleModelChange = (e) => {
    const model = e.target.value;
    onSelect(selectedMake, model);
  };

  const selectedMakeModels = selectedMake ? makes[selectedMake] || [] : [];
  const totalCount = useMemo(() => {
    if (!selectedMake || !selectedModel) return 0;
    const item = makesAndModels.find(m => m.make === selectedMake && m.model === selectedModel);
    return item?.count || 0;
  }, [makesAndModels, selectedMake, selectedModel]);

  return (
    <motion.div
      className={styles.selector}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.field}>
        <label className={styles.label}>
          <Car size={16} />
          Brand
        </label>
        <div className={styles.selectWrapper}>
          <select
            value={selectedMake}
            onChange={handleMakeChange}
            className={styles.select}
          >
            <option value="">Select a brand</option>
            {Object.keys(makes).sort().map(make => (
              <option key={make} value={make}>
                {capitalize(make)} ({makes[make].reduce((sum, m) => sum + m.count, 0)})
              </option>
            ))}
          </select>
          <ChevronDown className={styles.selectIcon} size={18} />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Model</label>
        <div className={styles.selectWrapper}>
          <select
            value={selectedModel}
            onChange={handleModelChange}
            className={styles.select}
            disabled={!selectedMake}
          >
            <option value="">Select a model</option>
            {selectedMakeModels.sort((a, b) => a.model.localeCompare(b.model)).map(item => (
              <option key={item.model} value={item.model}>
                {capitalize(item.model)} ({item.count})
              </option>
            ))}
          </select>
          <ChevronDown className={styles.selectIcon} size={18} />
        </div>
      </div>

      {totalCount > 0 && (
        <div className={styles.count}>
          <span className={styles.countValue}>{totalCount}</span>
          <span className={styles.countLabel}>listings</span>
        </div>
      )}
    </motion.div>
  );
}
