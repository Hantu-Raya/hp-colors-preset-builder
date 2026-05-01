import React from 'react';
import { ScrollArea } from './ui/scroll-area.jsx';
import { countVisibleGroupFields, getCategoryKey } from '../hpFormModel.js';

function groupHasModifiedFields(group, state, defaultState) {
  const ownModified = (group.fields || []).some(
    (field) => String(state?.[field.id]) !== String(defaultState?.[field.id])
  );
  if (ownModified) return true;
  return (group.children || []).some(
    (child) => groupHasModifiedFields(child, state, defaultState)
  );
}

export function SchemaTree({ groups, activeKey, state, defaultState = {}, onSelect }) {
  return (
    <aside className="anita-tree" aria-label="Schema categories">
      <div className="anita-tree-header">Categories</div>
      <ScrollArea className="tree-scroll">
        <div className="anita-tree-list">
          {groups.map((group) => (
            <TreeItem
              key={getCategoryKey(group)}
              group={group}
              activeKey={activeKey}
              state={state}
              defaultState={defaultState}
              onSelect={onSelect}
              depth={0}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

function TreeItem({ group, activeKey, state, defaultState, onSelect, depth }) {
  const key = getCategoryKey(group);
  const isActive = key === activeKey;
  const isModified = groupHasModifiedFields(group, state, defaultState);
  const visibleCount = countVisibleGroupFields(group, state);

  const depthClass = depth === 0 ? 'anita-tree-item--main' : 'anita-tree-item--sub';
  const activeClass = isActive ? ' is-active' : '';
  const modifiedClass = isModified ? ' is-modified' : '';

  return (
    <>
      <button
        type="button"
        className={`anita-tree-item ${depthClass}${activeClass}${modifiedClass}`}
        aria-current={isActive ? 'true' : undefined}
        onClick={() => onSelect(group)}
      >
        <span className="anita-tree-label">{group.name}</span>
        {isModified && <span className="anita-mod-dot" />}
        <span className="anita-count">{visibleCount}</span>
      </button>
      {group.children?.length ? (
        <div className="anita-tree-children">
          {group.children.map((child) => (
            <TreeItem
              key={getCategoryKey(child)}
              group={child}
              activeKey={activeKey}
              state={state}
              defaultState={defaultState}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}