import React from 'react';
import { Button } from './ui/button.jsx';
import { ScrollArea } from './ui/scroll-area.jsx';
import { Separator } from './ui/separator.jsx';
import { countVisibleGroupFields, getCategoryKey, getCategoryPathLabel } from '../hpFormModel.js';

export function SchemaTree({ groups, activeKey, state, onSelect }) {
  return <ScrollArea className="tree-scroll">{groups.map((group) => <TreeNode key={getCategoryKey(group)} group={group} activeKey={activeKey} state={state} onSelect={onSelect} depth={0} />)}</ScrollArea>;
}

function TreeNode({ group, activeKey, state, onSelect, depth }) {
  const key = getCategoryKey(group);
  const active = key === activeKey;
  return <div className="tree-node"><Button type="button" variant={active ? 'default' : 'ghost'} className="w-full justify-between" onClick={() => onSelect(group)}><span>{getCategoryPathLabel(group)}</span><span>{countVisibleGroupFields(group, state)}</span></Button>{group.children?.length ? <div className="tree-children">{group.children.map((child) => <TreeNode key={getCategoryKey(child)} group={child} activeKey={activeKey} state={state} onSelect={onSelect} depth={depth + 1} />)}</div> : null}{depth === 0 ? <Separator /> : null}</div>;
}
