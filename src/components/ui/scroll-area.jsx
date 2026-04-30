import React from 'react';

export function ScrollArea({ className = '', ...props }) { return <div className={`overflow-auto ${className}`} {...props} />; }
