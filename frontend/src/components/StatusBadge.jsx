import React from 'react';

const StatusBadge = ({ status }) => {
  const getBadgeClass = (statusStr) => {
    const s = (statusStr || '').toLowerCase();
    if (s === 'completed') return 'badge-completed';
    if (s === 'pending') return 'badge-pending';
    if (s === 'in progress' || s === 'inprogress') return 'badge-in-progress';
    if (s === 'delayed') return 'badge-delayed';
    if (s === 'unmentioned' || s === 'unclear') return 'badge-unmentioned';
    return 'badge-pending';
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      <span className="badge-dot" />
      <span>{status || 'Pending'}</span>
    </span>
  );
};

export default StatusBadge;
