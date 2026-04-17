import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  width?: number | string;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, subtitle, children, width, footer }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="g-modal-overlay" onClick={onClose}>
      <div className="g-modal" style={{ width: width || 680 }} onClick={e => e.stopPropagation()}>
        <div className="g-modal-head">
          <div>
            <h2 className="g-modal-title">{title}</h2>
            {subtitle && <p className="g-modal-sub">{subtitle}</p>}
          </div>
          <button className="g-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="g-modal-body">{children}</div>
        {footer && <div className="g-modal-foot">{footer}</div>}
      </div>

      <style>{`
        .g-modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 9000; backdrop-filter: blur(4px);
          animation: gmo-in .15s ease-out;
        }
        @keyframes gmo-in { from { opacity: 0; } to { opacity: 1; } }

        .g-modal {
          background: var(--surface-lowest, #fff);
          border-radius: 16px;
          max-width: calc(100vw - 2rem);
          max-height: 94vh;
          display: flex; flex-direction: column;
          box-shadow: 0 24px 48px -12px rgba(0,0,0,.2);
          animation: gmb-in .2s ease-out;
        }
        @keyframes gmb-in { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }

        .g-modal-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--surface-variant, #e2e8f0);
          flex-shrink: 0;
        }
        .g-modal-title { font-size: 1.125rem; font-weight: 800; }
        .g-modal-sub { font-size: .8rem; color: var(--on-surface-muted, #64748b); margin-top: 2px; }
        .g-modal-close {
          background: var(--surface-low, #f1f4ff); border: none; border-radius: 8px;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--on-surface-muted, #64748b); flex-shrink: 0;
          transition: background .15s;
        }
        .g-modal-close:hover { background: var(--surface-variant, #e2e8f0); }

        .g-modal-body {
          padding: 1.25rem 1.5rem;
          overflow-y: auto; flex: 1;
        }

        .g-modal-foot {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--surface-variant, #e2e8f0);
          display: flex; justify-content: flex-end; gap: .625rem;
          flex-shrink: 0;
        }

        /* Shared form grid inside modal */
        .g-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .875rem; }
        .g-form-grid .full { grid-column: 1 / -1; }
        .g-field { display: flex; flex-direction: column; gap: .25rem; }
        .g-field label {
          font-size: .7rem; font-weight: 700; color: var(--on-surface-muted, #64748b);
          text-transform: uppercase; letter-spacing: .03em;
        }
        .g-field input, .g-field select, .g-field textarea {
          padding: .6rem .875rem; border: 1.5px solid var(--surface-variant, #e2e8f0);
          border-radius: 8px; font-size: .85rem; font-family: inherit;
          outline: none; background: var(--surface-lowest, #fff);
          transition: border-color .15s;
        }
        .g-field input:focus, .g-field select:focus, .g-field textarea:focus {
          border-color: var(--primary-indigo, #1e40af);
        }
        .g-field textarea { resize: vertical; min-height: 70px; }
        .g-field select { cursor: pointer; }

        .g-btn {
          padding: .6rem 1.25rem; border-radius: 10px; font-weight: 700;
          font-size: .8125rem; cursor: pointer; display: inline-flex;
          align-items: center; gap: .375rem; border: none; transition: all .15s;
        }
        .g-btn.primary {
          background: var(--signature-gradient, linear-gradient(135deg, #1e40af, #2563eb));
          color: #fff;
        }
        .g-btn.primary:disabled { opacity: .5; cursor: not-allowed; }
        .g-btn.secondary {
          background: var(--surface-low, #f1f4ff);
          color: var(--on-surface-muted, #64748b);
        }

        @media (max-width: 640px) {
          .g-modal { width: calc(100vw - 1rem) !important; }
          .g-form-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
