import { useMemo } from 'preact/hooks';
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

export function SchemaTree({ groups, activeKey, state, defaultState = {}, onSelect }) {
  const statsByKey = useMemo(
    () => buildTreeStats(groups, state, defaultState),
    [defaultState, groups, state]
  );

  return (
    <aside className="anita-tree" aria-label="Schema categories">
      <div className="anita-tree-header">Categories</div>
      <div className="tree-scroll">
        <div className="anita-tree-list">
          {groups.map((group) => (
            <TreeItem
              key={HP_FIELD_CATALOG.getCategoryKey(group)}
              group={group}
              activeKey={activeKey}
              state={state}
              statsByKey={statsByKey}
              onSelect={onSelect}
              depth={0}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}

function TreeItem({ group, activeKey, statsByKey, onSelect, depth }) {
  const key = HP_FIELD_CATALOG.getCategoryKey(group);
  const isActive = key === activeKey;
  const stats = statsByKey.get(key) || { isModified: false, visibleCount: 0 };

  const depthClass = depth === 0 ? 'anita-tree-item--main' : 'anita-tree-item--sub';
  const activeClass = isActive ? ' is-active' : '';
  const modifiedClass = stats.isModified ? ' is-modified' : '';

  return (
    <>
      <button
        type="button"
        className={`anita-tree-item ${depthClass}${activeClass}${modifiedClass}`}
        aria-current={isActive ? 'true' : undefined}
        onClick={() => onSelect(group)}
      >
        <span className="anita-tree-label">{group.name}</span>
        {stats.isModified && <span className="anita-mod-dot" />}
        <span className="anita-count">{stats.visibleCount}</span>
      </button>
      {group.children?.length ? (
        <div className="anita-tree-children">
          {group.children.map((child) => (
            <TreeItem
              key={HP_FIELD_CATALOG.getCategoryKey(child)}
              group={child}
              activeKey={activeKey}
              statsByKey={statsByKey}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
