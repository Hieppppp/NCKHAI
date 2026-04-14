import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name || undefined);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Đăng ký thất bại. Vui lòng thử lại.');
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
          <h2 style={styles.heroTitle}>Tham gia hệ thống nghiên cứu</h2>
          <p style={styles.heroDesc}>
            Đăng ký tài khoản để truy cập đầy đủ các tính năng quản lý
            nghiên cứu khoa học và công cụ AI hỗ trợ.
          </p>
          <div style={styles.roleList}>
            <p style={styles.roleListTitle}>Vai trò sau khi đăng ký:</p>
            <div style={styles.roleItem}>
              <div style={styles.roleBadge}>Sinh viên</div>
              <span>Đăng ký đề tài, nộp bài, theo dõi tiến độ</span>
            </div>
            <p style={styles.roleNote}>
              Quản trị viên có thể nâng cấp vai trò của bạn sau khi xác minh.
            </p>
          </div>
        </div>
      </div>

      <div style={styles.rightPanel}>
        <div style={styles.formWrapper}>
          <h2 style={styles.formTitle}>Tạo tài khoản</h2>
          <p style={styles.formSub}>Điền thông tin bên dưới để đăng ký</p>

          {error && (
            <div style={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Họ và tên</label>
              <div style={styles.inputWrapper}>
                <User size={18} color="var(--on-surface-muted)" style={styles.inputIcon} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  style={styles.input}
                />
              </div>
            </div>

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
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Xác nhận mật khẩu</label>
              <div style={styles.inputWrapper}>
                <Lock size={18} color="var(--on-surface-muted)" style={styles.inputIcon} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-signature" style={styles.submitBtn}>
              {loading ? <Loader2 size={20} className="spin" /> : null}
              {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>

          <p style={styles.switchText}>
            Đã có tài khoản?{' '}
            <Link to="/login" style={styles.link}>Đăng nhập</Link>
          </p>
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
  roleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  roleListTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    opacity: 0.7,
  },
  roleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: '0.9rem',
  },
  roleBadge: {
    background: 'rgba(255,255,255,0.2)',
    padding: '4px 12px',
    borderRadius: 6,
    fontSize: '0.8rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  roleNote: {
    fontSize: '0.8rem',
    opacity: 0.65,
    fontStyle: 'italic',
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
    gap: 18,
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
};
