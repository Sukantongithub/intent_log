import React from 'react';

const PriorityBadge = ({ priority }) => {
  const getBadgeClass = (priorityStr) => {
    const p = (priorityStr || '').toLowerCase();
    if (p === 'high') return 'badge-priority-high';
    if (p === 'medium') return 'badge-priority-medium';
    if (p === 'low') return 'badge-priority-low';
    return 'badge-priority-medium';
  };

  return (
    <span className={`badge ${getBadgeClass(priority)}`}>
      {priority || 'Medium'}
    </span>
  );
};

export default PriorityBadge;
