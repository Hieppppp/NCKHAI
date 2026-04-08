interface StatusBadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'subtle';
  className?: string;
}

export const StatusBadge = ({ label, variant = 'subtle', className = '' }: StatusBadgeProps) => {
  const getStyles = () => {
    switch (variant) {
      case 'primary': return { bg: '#6366f120', color: '#6366f1' };
      case 'success': return { bg: '#10b98120', color: '#10b981' };
      case 'warning': return { bg: '#f59e0b20', color: '#f59e0b' };
      case 'error': return { bg: '#ef444420', color: '#ef4444' };
      default: return { bg: '#f1f5f9', color: '#64748b' };
    }
  };

  const { bg, color } = getStyles();

  return (
    <span 
      className={`status-badge ${className}`}
      style={{ backgroundColor: bg, color: color }}
    >
      {label}
      <style>{`
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          white-space: nowrap;
        }
      `}</style>
    </span>
  );
};
