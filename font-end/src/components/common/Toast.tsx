import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  danger?: boolean;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  confirm: (title: string, message: string, onConfirm: () => void, opts?: { confirmLabel?: string; danger?: boolean }) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, title: '', message: '', onConfirm: () => {} });

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ctx: ToastContextType = {
    toast: addToast,
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    warning: (msg) => addToast('warning', msg),
    info: (msg) => addToast('info', msg),
    confirm: (title, message, onConfirm, opts) => {
      setConfirmState({ open: true, title, message, onConfirm, confirmLabel: opts?.confirmLabel, danger: opts?.danger });
    },
  };

  const handleConfirm = () => {
    confirmState.onConfirm();
    setConfirmState(prev => ({ ...prev, open: false }));
  };

  const ICONS = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
  const COLORS = { success: '#059669', error: '#dc2626', warning: '#d97706', info: '#2563eb' };
  const BGS = { success: '#d1fae5', error: '#fee2e2', warning: '#fef3c7', info: '#dbeafe' };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container */}
      <div className="t-container">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className="t-toast" style={{ background: BGS[t.type], borderLeft: `4px solid ${COLORS[t.type]}` }}>
              <Icon size={18} color={COLORS[t.type]} />
              <span className="t-msg">{t.message}</span>
              <button className="t-close" onClick={() => removeToast(t.id)}><X size={14} /></button>
            </div>
          );
        })}
      </div>

      {/* Confirm dialog */}
      {confirmState.open && (
        <div className="t-confirm-overlay" onClick={() => setConfirmState(prev => ({ ...prev, open: false }))}>
          <div className="t-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="t-confirm-icon" style={{ background: confirmState.danger ? '#fee2e2' : '#dbeafe' }}>
              {confirmState.danger ? <AlertTriangle size={24} color="#dc2626" /> : <Info size={24} color="#2563eb" />}
            </div>
            <h3 className="t-confirm-title">{confirmState.title}</h3>
            <p className="t-confirm-msg">{confirmState.message}</p>
            <div className="t-confirm-actions">
              <button className="t-btn-cancel" onClick={() => setConfirmState(prev => ({ ...prev, open: false }))}>Hủy</button>
              <button className={`t-btn-confirm ${confirmState.danger ? 'danger' : ''}`} onClick={handleConfirm}>
                {confirmState.confirmLabel || 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .t-container {
          position: fixed; top: 1.25rem; right: 1.25rem; z-index: 10000;
          display: flex; flex-direction: column; gap: .5rem; max-width: 400px;
        }
        .t-toast {
          display: flex; align-items: center; gap: .625rem;
          padding: .75rem 1rem; border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
          animation: t-slide-in .25s ease-out;
        }
        @keyframes t-slide-in { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: none; } }
        .t-msg { flex: 1; font-size: .85rem; font-weight: 600; color: #1e293b; }
        .t-close { background: none; border: none; cursor: pointer; color: #94a3b8; padding: 2px; display: flex; }

        .t-confirm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 10001; backdrop-filter: blur(4px);
          animation: t-fade .15s ease-out;
        }
        @keyframes t-fade { from { opacity: 0; } to { opacity: 1; } }
        .t-confirm-box {
          background: #fff; border-radius: 16px; padding: 2rem; width: 400px; max-width: calc(100vw - 2rem);
          text-align: center; box-shadow: 0 24px 48px -12px rgba(0,0,0,.2);
          animation: t-pop .2s ease-out;
        }
        @keyframes t-pop { from { opacity: 0; transform: scale(.95); } to { opacity: 1; transform: none; } }
        .t-confirm-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; }
        .t-confirm-title { font-size: 1.125rem; font-weight: 800; margin-bottom: .375rem; }
        .t-confirm-msg { font-size: .875rem; color: #64748b; line-height: 1.5; margin-bottom: 1.5rem; }
        .t-confirm-actions { display: flex; gap: .625rem; justify-content: center; }
        .t-btn-cancel {
          padding: .625rem 1.5rem; border-radius: 10px; border: 1.5px solid #e2e8f0;
          background: #fff; font-weight: 700; font-size: .85rem; cursor: pointer; color: #64748b;
        }
        .t-btn-confirm {
          padding: .625rem 1.5rem; border-radius: 10px; border: none;
          background: linear-gradient(135deg, #1A237E, #7C4DFF); color: #fff;
          font-weight: 700; font-size: .85rem; cursor: pointer;
        }
        .t-btn-confirm.danger { background: linear-gradient(135deg, #dc2626, #ef4444); }
      `}</style>
    </ToastContext.Provider>
  );
}
