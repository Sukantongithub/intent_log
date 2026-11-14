import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, description }) => {
  return (
    <div className="card card-hover" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontWeight: 500, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </p>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--text-main)' }}>
          {value ?? 0}
        </h2>
        {description && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
            {description}
          </p>
        )}
      </div>

      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: `${color}18`,
        border: `1px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        <Icon size={26} />
      </div>
    </div>
  );
};

export default StatCard;
