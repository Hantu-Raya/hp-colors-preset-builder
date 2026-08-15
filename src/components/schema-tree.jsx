import { useEffect, useMemo, useRef } from 'preact/hooks';
import { HP_FIELD_CATALOG } from '../hpSchema.js';

function buildTreeStats(groups, state, defaultState) {
  const statsByKey = new Map();
  const walk = (group) => {
    let isModified = false;
    let visibleCount = 0;
    for (const field of group.fields || []) {
      if (String(state?.[field.id]) !== String(defaultState?.[field.id])) isModified = true;
      if (HP_FIELD_CATALOG.isFieldVisible(field, state)) visibleCount += 1;
    }
    for (const child of group.children || []) {
      const childStats = walk(child);
      if (childStats.isModified) isModified = true;
      visibleCount += childStats.visibleCount;
    }
    const stats = { isModified, visibleCount };
    statsByKey.set(HP_FIELD_CATALOG.getCategoryKey(group), stats);
    return stats;
  };
  for (const group of groups || []) walk(group);
  return statsByKey;
}

function flattenTree(groups) {
  const items = [];
  const visit = (group, depth) => {
    items.push({ group, depth });
    for (const child of group.children || []) visit(child, depth + 1);
  };
  for (const group of groups || []) visit(group, 0);
  return items;
}

export function SchemaTree({ groups, activeKey, state, defaultState = {}, onSelect }) {
  const statsByKey = useMemo(
    () => buildTreeStats(groups, state, defaultState),
    [defaultState, groups, state]
  );
  const items = useMemo(() => flattenTree(groups), [groups]);
  const itemRefs = useRef([]);
  const activeIndex = Math.max(0, items.findIndex(({ group }) => HP_FIELD_CATALOG.getCategoryKey(group) === activeKey));

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items.length]);

  const handleKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowDown') nextIndex = Math.min(items.length - 1, index + 1);
    if (event.key === 'ArrowUp') nextIndex = Math.max(0, index - 1);
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    onSelect(items[nextIndex].group);
    itemRefs.current[nextIndex]?.focus();
  };

  return (
    <aside id="builderCategories" className="anita-tree" aria-label="Schema categories">
      <div className="anita-tree-header">Categories</div>
      <div className="tree-scroll">
        <div className="anita-tree-list" role="listbox" aria-label="Schema categories">
          {items.map(({ group, depth }, index) => {
            const key = HP_FIELD_CATALOG.getCategoryKey(group);
            const isActive = key === activeKey;
            const stats = statsByKey.get(key) || { isModified: false, visibleCount: 0 };
            const depthClass = depth === 0 ? 'anita-tree-item--main' : 'anita-tree-item--sub';
            return (
              <button
                key={key}
                ref={(node) => { itemRefs.current[index] = node; }}
                type="button"
                role="option"
                tabIndex={index === activeIndex ? 0 : -1}
                className={`anita-tree-item ${depthClass}${isActive ? ' is-active' : ''}${stats.isModified ? ' is-modified' : ''}`}
                aria-selected={isActive}
                onClick={() => onSelect(group)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <span className="anita-tree-label" style={{ '--tree-depth': depth }}>{group.name}</span>
                {stats.isModified && <span className="anita-mod-dot" aria-label="Modified" />}
                <span className="anita-count">{stats.visibleCount}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
