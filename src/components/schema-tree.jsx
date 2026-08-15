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

function getActiveCategory(groups, activeKey) {
  return groups.find((category) => (
    category.children?.some((page) => HP_FIELD_CATALOG.getCategoryKey(page) === activeKey)
  )) || groups[0] || null;
}

function moveFocus(event, refs, currentIndex, itemCount, onSelect) {
  let nextIndex = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = Math.min(itemCount - 1, currentIndex + 1);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1);
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = itemCount - 1;
  if (nextIndex === null) return;
  event.preventDefault();
  onSelect(nextIndex);
  refs.current[nextIndex]?.focus();
}

export function SchemaTree({ groups, activeKey, state, defaultState = {}, onSelect }) {
  const statsByKey = useMemo(
    () => buildTreeStats(groups, state, defaultState),
    [defaultState, groups, state]
  );
  const itemRefs = useRef([]);
  const activeCategory = getActiveCategory(groups, activeKey);
  const activeIndex = Math.max(0, groups.indexOf(activeCategory));

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, groups.length);
  }, [groups.length]);

  return (
    <aside id="builderCategories" className="anita-tree" aria-label="HP Colors sections">
      <div className="anita-tree-header">SETTINGS</div>
      <div className="anita-tree-list" role="listbox" aria-label="HP Colors sections">
        {groups.map((category, index) => {
          const key = HP_FIELD_CATALOG.getCategoryKey(category);
          const isActive = category === activeCategory;
          const stats = statsByKey.get(key) || { isModified: false, visibleCount: 0 };
          return (
            <button
              key={key}
              ref={(node) => { itemRefs.current[index] = node; }}
              type="button"
              role="option"
              tabIndex={index === activeIndex ? 0 : -1}
              className={`anita-tree-item anita-tree-item--main${isActive ? ' is-active' : ''}${stats.isModified ? ' is-modified' : ''}`}
              aria-selected={isActive}
              onClick={() => onSelect(category.children[0])}
              onKeyDown={(event) => moveFocus(event, itemRefs, index, groups.length, (nextIndex) => onSelect(groups[nextIndex].children[0]))}
            >
              <span className="anita-category-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="anita-tree-label">{category.name}</span>
              {stats.isModified ? <span className="anita-mod-dot" aria-label="Modified" /> : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

export function SchemaTabs({ groups, activeKey, onSelect }) {
  const activeCategory = getActiveCategory(groups, activeKey);
  const pages = activeCategory?.children || [];
  const itemRefs = useRef([]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, pages.length);
  }, [pages.length]);

  return (
    <nav className="anita-tab-strip" role="tablist" aria-label={`${activeCategory?.name || 'Settings'} pages`}>
      {pages.map((page, index) => {
        const key = HP_FIELD_CATALOG.getCategoryKey(page);
        const isActive = key === activeKey;
        return (
          <button
            key={key}
            ref={(node) => { itemRefs.current[index] = node; }}
            type="button"
            role="tab"
            tabIndex={isActive ? 0 : -1}
            className={isActive ? 'anita-tab is-active' : 'anita-tab'}
            aria-selected={isActive}
            onClick={() => onSelect(page)}
            onKeyDown={(event) => moveFocus(event, itemRefs, index, pages.length, (nextIndex) => onSelect(pages[nextIndex]))}
          >
            {page.name}
          </button>
        );
      })}
    </nav>
  );
}
