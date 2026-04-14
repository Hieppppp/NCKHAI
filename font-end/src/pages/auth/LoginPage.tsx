import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GraduationCap, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.leftPanel}>
        <div style={styles.brandContent}>
          <div style={styles.logoRow}>
            <GraduationCap size={48} color="#fff" />
            <div>
              <h1 style={styles.brandTitle}>NCKH AI</h1>
              <p style={styles.brandSub}>Digital Curator</p>
            </div>
          </div>
          <h2 style={styles.heroTitle}>Hệ thống Quản lý Nghiên cứu Khoa học</h2>
          <p style={styles.heroDesc}>
            Nền tảng số hóa toàn diện cho hoạt động nghiên cứu khoa học,
            tích hợp trí tuệ nhân tạo hỗ trợ đánh giá và phân tích.
          </p>
          <div style={styles.featureList}>
            {['Quản lý đề tài & dự án', 'Đánh giá AI tự động', 'Phân quyền linh hoạt'].map((f) => (
              <div key={f} style={styles.featureItem}>
                <div style={styles.featureDot} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          <h2 style={styles.formTitle}>Đăng nhập</h2>
          <p style={styles.formSub}>Nhập thông tin tài khoản để tiếp tục</p>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <div style={styles.inputWrapper}>
                <Mail size={18} color="var(--on-surface-muted)" style={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Mật khẩu</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} color="var(--on-surface-muted)" style={styles.inputIcon} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-signature" style={styles.submitBtn}>
              {loading ? <Loader2 size={20} className="spin" /> : null}
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p style={styles.switchText}>
            Chưa có tài khoản?{' '}
            <Link to="/register" style={styles.link}>Đăng ký ngay</Link>
          </p>

          <div style={styles.demoBox}>
            <p style={styles.demoTitle}>Tài khoản demo</p>
            <div style={styles.demoGrid}>
              {[
                { role: 'Admin', email: 'admin@nckhai.vn', pass: 'admin123' },
                { role: 'Giảng viên', email: 'lecturer@nckhai.vn', pass: 'lecturer123' },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  style={styles.demoBtn}
                  onClick={() => { setEmail(d.email); setPassword(d.pass); }}
                >
                  <span style={styles.demoBtnRole}>{d.role}</span>
                  <span style={styles.demoBtnEmail}>{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  leftPanel: {
    flex: '0 0 480px',
    background: 'var(--signature-gradient)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
  },
  brandContent: {
    color: '#fff',
    maxWidth: 400,
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    marginBottom: 40,
  },
  brandTitle: {
    fontSize: '1.5rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
  },
  brandSub: {
    fontSize: '0.875rem',
    opacity: 0.8,
  },
  heroTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.3,
    marginBottom: 16,
  },
  heroDesc: {
    fontSize: '0.95rem',
    opacity: 0.85,
    lineHeight: 1.6,
    marginBottom: 32,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: '0.95rem',
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.6)',
    flexShrink: 0,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    background: 'var(--surface)',
  },
  formWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  formTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: 'var(--on-surface)',
    marginBottom: 8,
  },
  formSub: {
    color: 'var(--on-surface-muted)',
    marginBottom: 24,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: '#fef2f2',
    color: 'var(--error)',
    borderRadius: 10,
    fontSize: '0.875rem',
    marginBottom: 16,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--on-surface)',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '12px 14px 12px 44px',
    border: '1.5px solid var(--surface-variant)',
    borderRadius: 10,
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    outline: 'none',
    transition: 'border-color 0.2s',
    background: 'var(--surface-lowest)',
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '1rem',
    marginTop: 4,
  },
  switchText: {
    textAlign: 'center',
    color: 'var(--on-surface-muted)',
    fontSize: '0.875rem',
    marginTop: 20,
  },
  link: {
    color: 'var(--primary-violet)',
    fontWeight: 600,
    textDecoration: 'none',
  },
  demoBox: {
    marginTop: 32,
    padding: 16,
    background: 'var(--surface-low)',
    borderRadius: 12,
  },
  demoTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--on-surface-muted)',
    marginBottom: 10,
  },
  demoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
  },
  demoBtn: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '10px 12px',
    background: 'var(--surface-lowest)',
    border: '1.5px solid var(--surface-variant)',
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  demoBtnRole: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--primary-indigo)',
  },
  demoBtnEmail: {
    fontSize: '0.75rem',
    color: 'var(--on-surface-muted)',
  },
};
