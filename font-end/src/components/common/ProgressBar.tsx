interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  height?: string;
  label?: string;
}

export const ProgressBar = ({ 
  progress, 
  color = 'var(--signature-gradient)', 
  height = '8px',
  label
}: ProgressBarProps) => {
  return (
    <div className="progress-container">
      {label && <div className="progress-label">{label}</div>}
      <div className="progress-track" style={{ height }}>
        <div 
          className="progress-fill" 
          style={{ 
            width: `${progress}%`, 
            background: color.includes('gradient') ? color : color 
          }} 
        />
      </div>
      <style>{`
        .progress-container {
          width: 100%;
        }
        .progress-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--on-surface-muted);
          margin-bottom: 0.5rem;
          text-align: right;
          text-transform: uppercase;
        }
        .progress-track {
          width: 100%;
          background: var(--surface-low);
          border-radius: 100px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          border-radius: 100px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );
};
