import React from 'react';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import { User, Calendar, Clock } from 'lucide-react';

const TaskCard = ({ task, onStatusChange }) => {
  return (
    <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
          {task.task}
        </h4>
        <PriorityBadge priority={task.priority} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <User size={14} color="var(--primary)" />
          <span>{task.person || 'Unassigned'}</span>
        </div>
        {task.deadline && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Calendar size={14} color="var(--status-pending)" />
            <span>{task.deadline}</span>
          </div>
        )}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--border-color)'
      }}>
        <StatusBadge status={task.status} />

        {onStatusChange && (
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value)}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              backgroundColor: '#0f172a',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: 'var(--radius-sm)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Delayed">Delayed</option>
          </select>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
