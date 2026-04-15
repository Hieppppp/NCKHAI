import { useState, useEffect } from 'react';
import {
  Settings, Save, Loader2, Bell, Monitor, Globe, BookOpen,
  Shield, Server, Database, HardDrive, Users, FileText,
  Library, CheckCircle, Info,
} from 'lucide-react';
import { useToast } from '../components/common/Toast';
import { settingsService } from '../services/settingsService';
import { useAuth } from '../contexts/AuthContext';
import { Role, RoleLabels } from '../types';

interface Config { id: number; key: string; value: string; type: string; group: string; label: string; description?: string; }
interface SysInfo { version: string; database: string; aiEngine: string; storage: string; stats: { users: number; works: number; publications: number; library: number }; }

const GROUP_LABELS: Record<string, { label: string; icon: typeof Settings }> = {
  general: { label: 'Thông tin chung', icon: Globe },
  research: { label: 'Nghiên cứu khoa học', icon: BookOpen },
  notification: { label: 'Thông báo', icon: Bell },
  display: { label: 'Hiển thị', icon: Monitor },
};

export default function SettingsPage() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(Role.ADMIN);
  const { success: showSuccess, error: showError } = useToast();

  const [tab, setTab] = useState<'profile' | 'notifications' | 'system' | 'info'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // System configs (admin)
  const [configs, setConfigs] = useState<Config[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // User preferences
  const [prefs, setPrefs] = useState<Record<string, string>>({});

  // Notification settings
  const [notifSettings, setNotifSettings] = useState({
    emailNotifications: true, workflowUpdates: true, committeeAlerts: true,
    deadlineReminders: true, systemAnnouncements: true,
  });

  // System info
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);

  useEffect(() => { loadTab(); }, [tab]);

  const loadTab = async () => {
    setLoading(true);
    try {
      if (tab === 'profile') {
        setPrefs(await settingsService.getUserPreferences());
      } else if (tab === 'notifications') {
        setNotifSettings(await settingsService.getNotificationSettings());
      } else if (tab === 'system' && isAdmin) {
        const c = await settingsService.getSystemConfigs();
        setConfigs(c);
        const vals: Record<string, string> = {};
        c.forEach((cfg: Config) => { vals[cfg.key] = cfg.value; });
        setEditedValues(vals);
      } else if (tab === 'info') {
        setSysInfo(await settingsService.getSystemInfo());
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleSaveSystemConfigs = async () => {
    setSaving(true);
    try {
      const changed = configs.filter(c => editedValues[c.key] !== c.value).map(c => ({ key: c.key, value: editedValues[c.key] }));
      if (changed.length === 0) { showSuccess('Không có thay đổi'); setSaving(false); return; }
      await settingsService.updateSystemConfigs(changed);
      showSuccess(`Đã lưu ${changed.length} cấu hình`);
      loadTab();
    } catch { showError('Lưu cấu hình thất bại'); }
    setSaving(false);
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await settingsService.setUserPreferences({
        'notify.email': String(notifSettings.emailNotifications),
        'notify.workflow': String(notifSettings.workflowUpdates),
        'notify.committee': String(notifSettings.committeeAlerts),
        'notify.deadline': String(notifSettings.deadlineReminders),
        'notify.system': String(notifSettings.systemAnnouncements),
      });
      showSuccess('Đã lưu cài đặt thông báo');
    } catch { showError('Lưu thất bại'); }
    setSaving(false);
  };

  const handleSavePrefs = async () => {
    setSaving(true);
    try {
      await settingsService.setUserPreferences(prefs);
      showSuccess('Đã lưu tùy chỉnh');
    } catch { showError('Lưu thất bại'); }
    setSaving(false);
  };

  const tabs = [
    { key: 'profile', label: 'Tùy chỉnh cá nhân', icon: Settings },
    { key: 'notifications', label: 'Thông báo', icon: Bell },
    ...(isAdmin ? [{ key: 'system', label: 'Cấu hình hệ thống', icon: Shield }] : []),
    { key: 'info', label: 'Thông tin hệ thống', icon: Info },
  ];

  // Group configs by group
  const groupedConfigs: Record<string, Config[]> = {};
  configs.forEach(c => {
    if (!groupedConfigs[c.group]) groupedConfigs[c.group] = [];
    groupedConfigs[c.group].push(c);
  });

  return (
    <div className="st">
      {/* Hero */}
      <section className="st-hero">
        <div>
          <h1>Cài đặt</h1>
          <p>Quản lý cấu hình hệ thống, thông báo và tùy chỉnh cá nhân</p>
        </div>
      </section>

      <div className="st-layout">
        {/* Sidebar tabs */}
        <aside className="st-sidebar">
          {tabs.map(t => (
            <button key={t.key} className={`st-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key as any)}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
          <div className="st-user-card">
            <div className="st-user-avatar">{(user?.name || 'U')[0].toUpperCase()}</div>
            <div><span className="st-user-name">{user?.name}</span><span className="st-user-role">{user ? RoleLabels[user.role] : ''}</span></div>
          </div>
        </aside>

        {/* Content */}
        <main className="st-content">
          {loading ? (
            <div className="st-loading"><Loader2 size={32} className="st-spin" color="var(--primary-indigo)" /></div>
          ) : tab === 'profile' ? (
            /* ─── PROFILE PREFERENCES ─── */
            <div className="surface-card st-card">
              <h2 className="st-card-title"><Settings size={18} /> Tùy chỉnh cá nhân</h2>
              <p className="st-card-desc">Các tùy chỉnh áp dụng riêng cho tài khoản của bạn</p>

              <div className="st-form">
                <div className="st-field">
                  <label>Ngôn ngữ hiển thị</label>
                  <select value={prefs['display.language'] || 'vi'} onChange={e => setPrefs({ ...prefs, 'display.language': e.target.value })}>
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div className="st-field">
                  <label>Số mục hiển thị / trang</label>
                  <select value={prefs['display.items_per_page'] || '10'} onChange={e => setPrefs({ ...prefs, 'display.items_per_page': e.target.value })}>
                    <option value="10">10</option><option value="20">20</option><option value="50">50</option>
                  </select>
                </div>
                <div className="st-field">
                  <label>Định dạng ngày</label>
                  <select value={prefs['display.date_format'] || 'DD/MM/YYYY'} onChange={e => setPrefs({ ...prefs, 'display.date_format': e.target.value })}>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
                <div className="st-field">
                  <label>Trang mặc định sau đăng nhập</label>
                  <select value={prefs['display.default_page'] || '/dashboard'} onChange={e => setPrefs({ ...prefs, 'display.default_page': e.target.value })}>
                    <option value="/dashboard">Bảng điều khiển</option>
                    <option value="/projects">Quản lý đề tài</option>
                    <option value="/publications">Công bố khoa học</option>
                    <option value="/library">Thư viện số</option>
                  </select>
                </div>
              </div>

              <div className="st-save-row">
                <button className="st-save-btn" onClick={handleSavePrefs} disabled={saving}>
                  {saving ? <Loader2 size={15} className="st-spin" /> : <Save size={15} />} Lưu tùy chỉnh
                </button>
              </div>
            </div>

          ) : tab === 'notifications' ? (
            /* ─── NOTIFICATION SETTINGS ─── */
            <div className="surface-card st-card">
              <h2 className="st-card-title"><Bell size={18} /> Cài đặt Thông báo</h2>
              <p className="st-card-desc">Tùy chỉnh loại thông báo bạn muốn nhận</p>

              <div className="st-toggles">
                {[
                  { key: 'emailNotifications', label: 'Thông báo qua email', desc: 'Nhận email khi có thông báo quan trọng' },
                  { key: 'workflowUpdates', label: 'Cập nhật quy trình', desc: 'Thông báo khi đề tài thay đổi trạng thái' },
                  { key: 'committeeAlerts', label: 'Thông báo hội đồng', desc: 'Khi được bổ nhiệm vào hội đồng hoặc có phiếu đánh giá mới' },
                  { key: 'deadlineReminders', label: 'Nhắc nhở deadline', desc: 'Tự động nhắc trước khi đến hạn nộp' },
                  { key: 'systemAnnouncements', label: 'Thông báo hệ thống', desc: 'Cập nhật từ quản trị viên và hệ thống' },
                ].map(item => (
                  <div key={item.key} className="st-toggle-row">
                    <div className="st-toggle-info">
                      <span className="st-toggle-label">{item.label}</span>
                      <span className="st-toggle-desc">{item.desc}</span>
                    </div>
                    <button
                      className={`st-toggle ${notifSettings[item.key as keyof typeof notifSettings] ? 'on' : 'off'}`}
                      onClick={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key as keyof typeof notifSettings] })}
                    >
                      <div className="st-toggle-knob" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="st-save-row">
                <button className="st-save-btn" onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? <Loader2 size={15} className="st-spin" /> : <Save size={15} />} Lưu cài đặt thông báo
                </button>
              </div>
            </div>

          ) : tab === 'system' && isAdmin ? (
            /* ─── SYSTEM CONFIG (Admin) ─── */
            <div>
              {Object.entries(groupedConfigs).map(([group, cfgs]) => {
                const gi = GROUP_LABELS[group] || { label: group, icon: Settings };
                return (
                  <div key={group} className="surface-card st-card st-config-card">
                    <h2 className="st-card-title"><gi.icon size={18} /> {gi.label}</h2>
                    <div className="st-config-grid">
                      {cfgs.map(c => (
                        <div key={c.key} className="st-config-field">
                          <label>{c.label}</label>
                          {c.description && <span className="st-config-desc">{c.description}</span>}
                          {c.type === 'boolean' ? (
                            <button
                              className={`st-toggle ${editedValues[c.key] === 'true' ? 'on' : 'off'}`}
                              onClick={() => setEditedValues({ ...editedValues, [c.key]: editedValues[c.key] === 'true' ? 'false' : 'true' })}
                            >
                              <div className="st-toggle-knob" />
                            </button>
                          ) : c.type === 'number' ? (
                            <input type="number" value={editedValues[c.key] || ''} onChange={e => setEditedValues({ ...editedValues, [c.key]: e.target.value })} />
                          ) : (
                            <input value={editedValues[c.key] || ''} onChange={e => setEditedValues({ ...editedValues, [c.key]: e.target.value })} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="st-save-row" style={{ marginTop: '1rem' }}>
                <button className="st-save-btn" onClick={handleSaveSystemConfigs} disabled={saving}>
                  {saving ? <Loader2 size={15} className="st-spin" /> : <Save size={15} />} Lưu tất cả cấu hình
                </button>
              </div>
            </div>

          ) : tab === 'info' ? (
            /* ─── SYSTEM INFO ─── */
            <div className="surface-card st-card">
              <h2 className="st-card-title"><Server size={18} /> Thông tin Hệ thống</h2>

              {sysInfo && (
                <div className="st-info-grid">
                  <div className="st-info-item"><Server size={16} color="#4f46e5" /><div><span className="st-info-label">Phiên bản</span><strong>v{sysInfo.version}</strong></div></div>
                  <div className="st-info-item"><Database size={16} color="#059669" /><div><span className="st-info-label">Cơ sở dữ liệu</span><strong>{sysInfo.database}</strong></div></div>
                  <div className="st-info-item"><Monitor size={16} color="#7c3aed" /><div><span className="st-info-label">AI Engine</span><strong>{sysInfo.aiEngine}</strong></div></div>
                  <div className="st-info-item"><HardDrive size={16} color="#d97706" /><div><span className="st-info-label">File Storage</span><strong>{sysInfo.storage}</strong></div></div>

                  <div className="st-info-stats">
                    <h3>Thống kê hệ thống</h3>
                    <div className="st-info-stat-grid">
                      <div className="st-info-stat"><Users size={18} color="#4f46e5" /><span>{sysInfo.stats.users}</span><small>Người dùng</small></div>
                      <div className="st-info-stat"><BookOpen size={18} color="#059669" /><span>{sysInfo.stats.works}</span><small>Công trình</small></div>
                      <div className="st-info-stat"><FileText size={18} color="#7c3aed" /><span>{sysInfo.stats.publications}</span><small>Công bố</small></div>
                      <div className="st-info-stat"><Library size={18} color="#d97706" /><span>{sysInfo.stats.library}</span><small>Thư viện</small></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>

      <style>{stStyles}</style>
    </div>
  );
}

const stStyles = `
  .st{display:flex;flex-direction:column;gap:1.25rem;padding-bottom:3rem}
  .st-loading{display:flex;justify-content:center;padding:4rem}

  .st-hero{background:linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4338ca 100%);border-radius:20px;padding:2rem 2.5rem;color:#fff}
  .st-hero h1{font-size:1.75rem;font-weight:800;color:#fff;margin-bottom:.25rem}
  .st-hero p{font-size:.9rem;opacity:.85}

  .st-layout{display:grid;grid-template-columns:240px 1fr;gap:1.5rem;align-items:start}

  .st-sidebar{display:flex;flex-direction:column;gap:4px}
  .st-tab{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:10px;border:none;background:transparent;font-weight:600;font-size:.85rem;cursor:pointer;color:var(--on-surface-muted);transition:all .15s;text-align:left;width:100%}
  .st-tab.active{background:var(--surface-lowest);color:var(--primary-indigo);font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.05)}
  .st-tab:hover{background:var(--surface-low)}

  .st-user-card{display:flex;align-items:center;gap:10px;padding:12px;margin-top:1rem;border-top:1px solid var(--surface-variant)}
  .st-user-avatar{width:36px;height:36px;border-radius:50%;background:var(--signature-gradient);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:.9rem;flex-shrink:0}
  .st-user-name{font-weight:700;font-size:.85rem;display:block}
  .st-user-role{font-size:.7rem;color:var(--on-surface-muted)}

  .st-content{min-height:400px}
  .st-card{padding:2rem!important;margin-bottom:1rem}
  .st-card-title{display:flex;align-items:center;gap:8px;font-size:1.0625rem;font-weight:700;margin-bottom:.25rem}
  .st-card-desc{font-size:.85rem;color:var(--on-surface-muted);margin-bottom:1.5rem}

  /* Form */
  .st-form{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .st-field{display:flex;flex-direction:column;gap:.375rem}
  .st-field label{font-size:.75rem;font-weight:700;color:var(--on-surface-muted)}
  .st-field select,.st-field input{padding:10px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.85rem;font-family:inherit;outline:none;background:var(--surface-lowest);cursor:pointer}
  .st-field select:focus,.st-field input:focus{border-color:var(--primary-indigo)}

  .st-save-row{display:flex;justify-content:flex-end;margin-top:1.5rem}
  .st-save-btn{background:var(--signature-gradient);color:#fff;border:none;padding:10px 24px;border-radius:10px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:.85rem}
  .st-save-btn:disabled{opacity:.5;cursor:not-allowed}

  /* Toggle */
  .st-toggles{display:flex;flex-direction:column;gap:.5rem}
  .st-toggle-row{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;background:var(--surface-low);border-radius:12px}
  .st-toggle-info{flex:1}
  .st-toggle-label{font-weight:700;font-size:.875rem;display:block}
  .st-toggle-desc{font-size:.75rem;color:var(--on-surface-muted)}
  .st-toggle{width:48px;height:26px;border-radius:100px;border:none;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0}
  .st-toggle.on{background:#10b981}
  .st-toggle.off{background:#cbd5e1}
  .st-toggle-knob{width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:3px;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}
  .st-toggle.on .st-toggle-knob{left:25px}
  .st-toggle.off .st-toggle-knob{left:3px}

  /* System Config */
  .st-config-card{margin-bottom:1rem}
  .st-config-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .st-config-field{display:flex;flex-direction:column;gap:.25rem}
  .st-config-field label{font-size:.8rem;font-weight:700}
  .st-config-desc{font-size:.7rem;color:var(--on-surface-muted)}
  .st-config-field input{padding:8px 12px;border:1.5px solid var(--surface-variant);border-radius:8px;font-size:.85rem;font-family:inherit;outline:none;background:var(--surface-lowest)}
  .st-config-field input:focus{border-color:var(--primary-indigo)}

  /* System Info */
  .st-info-grid{display:flex;flex-direction:column;gap:1rem}
  .st-info-item{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--surface-low);border-radius:10px}
  .st-info-label{font-size:.7rem;color:var(--on-surface-muted);display:block}
  .st-info-item strong{font-size:.9rem}
  .st-info-stats{margin-top:.5rem}
  .st-info-stats h3{font-size:.9rem;font-weight:700;margin-bottom:.75rem}
  .st-info-stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem}
  .st-info-stat{display:flex;flex-direction:column;align-items:center;gap:4px;padding:1rem;background:var(--surface-low);border-radius:12px;text-align:center}
  .st-info-stat span{font-size:1.5rem;font-weight:800}
  .st-info-stat small{font-size:.7rem;color:var(--on-surface-muted)}

  .st-spin{animation:st-spin 1s linear infinite}
  @keyframes st-spin{to{transform:rotate(360deg)}}

  @media(max-width:768px){.st-layout{grid-template-columns:1fr}.st-sidebar{flex-direction:row;overflow-x:auto}.st-form,.st-config-grid{grid-template-columns:1fr}.st-info-stat-grid{grid-template-columns:repeat(2,1fr)}}
`;
