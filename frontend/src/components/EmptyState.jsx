import React from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const EmptyState = ({
  title = 'No data found',
  description = 'There are no items to display at this time.',
  actionText,
  actionLink,
  icon: Icon = FolderOpen
}) => {
  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '4rem 2rem',
      textAlign: 'center',
      gap: '1rem',
      backgroundColor: 'rgba(30, 41, 59, 0.4)',
      borderStyle: 'dashed'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: 'var(--primary-light)',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--primary)'
      }}>
        <Icon size={32} />
      </div>

      <div style={{ maxWidth: '400px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.35rem' }}>
          {title}
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-dim)', margin: 0 }}>
          {description}
        </p>
      </div>

      {actionText && actionLink && (
        <Link to={actionLink} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
          <Plus size={16} />
          <span>{actionText}</span>
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
