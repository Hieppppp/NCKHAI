// Cấu hình 3 màn quản lý dùng chung bộ trang works (WorkList / WorkCreate / WorkDetail).
// Cả 3 dùng chung model ScientificWork ở backend, phân biệt bằng `category` + `type`.

export interface WorkTypeOption {
  value: string;
  label: string;
}

export interface WorksModule {
  /** khóa định danh */
  key: 'works';
  /** đường dẫn gốc, ví dụ /projects */
  basePath: string;
  /** nhóm gửi lên API ?category= */
  category: 'scientific';

  /** Tiêu đề danh sách */
  listTitle: string;
  listSubtitle: string;
  /** Tiêu đề form tạo mới */
  createTitle: string;
  createSubtitle: string;
  /** Nhãn nút tạo */
  createButton: string;
  /** Từ "đối tượng" dùng trong các câu thông báo, ví dụ "công trình", "bằng sáng chế" */
  itemNoun: string;

  /** Loại cho phép chọn khi tạo (nếu chỉ 1 → ẩn dropdown, gán cố định) */
  types: WorkTypeOption[];

  /** Hiển thị trường nào trong form tạo */
  showLevel: boolean;
  showBudget: boolean;
  /** Nhãn cho 2 ô phụ (map vào journalName / issn của ScientificWork) */
  journalLabel: string;
  journalPlaceholder: string;
  issnLabel: string;
  issnPlaceholder: string;
}

// ─── Trạng thái công trình (rút gọn 5 bước, rõ ràng) ───
export interface WorkStatusInfo { value: string; label: string; color: string; }

/** 5 trạng thái chính dùng cho dropdown đổi trạng thái & bộ lọc */
export const WORK_MAIN_STATUSES: WorkStatusInfo[] = [
  { value: 'DRAFT', label: 'Bản nháp', color: '#94a3b8' },
  { value: 'SUBMITTED', label: 'Chờ duyệt', color: '#3b82f6' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện', color: '#f59e0b' },
  { value: 'ACCEPTED', label: 'Đã nghiệm thu', color: '#10b981' },
  { value: 'REJECTED', label: 'Từ chối', color: '#ef4444' },
];

/** Nhãn TV cho mọi trạng thái (gộp các trạng thái cũ vào 5 nhóm để hiển thị dữ liệu sẵn có) */
export const WORK_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Bản nháp', color: '#94a3b8' },
  SUBMITTED: { label: 'Chờ duyệt', color: '#3b82f6' },
  OUTLINE_REVIEW: { label: 'Chờ duyệt', color: '#3b82f6' },
  PROPOSAL_REVIEW: { label: 'Chờ duyệt', color: '#3b82f6' },
  IN_PROGRESS: { label: 'Đang thực hiện', color: '#f59e0b' },
  REVIEW: { label: 'Đang thực hiện', color: '#f59e0b' },
  REVISION: { label: 'Đang thực hiện', color: '#f59e0b' },
  ACCEPTED: { label: 'Đã nghiệm thu', color: '#10b981' },
  ARCHIVED: { label: 'Đã nghiệm thu', color: '#10b981' },
  REJECTED: { label: 'Từ chối', color: '#ef4444' },
};

export const WORK_LEVEL_LABELS: Record<string, string> = { UNIVERSITY: 'Cấp Trường', MINISTRY: 'Cấp Bộ', STATE: 'Cấp Nhà nước' };
export const WORK_LEVEL_COLORS: Record<string, string> = { UNIVERSITY: '#3b82f6', MINISTRY: '#8b5cf6', STATE: '#dc2626' };
export const WORK_TYPE_LABELS: Record<string, string> = {
  RESEARCH_PROJECT: 'Đề tài NCKH', THESIS: 'Luận văn / Luận án',
  JOURNAL_ARTICLE: 'Bài báo', CONFERENCE_PAPER: 'Bài hội nghị', PATENT: 'Bằng sáng chế', TEXTBOOK: 'Giáo trình',
};

export const WORKS_MODULES: Record<WorksModule['key'], WorksModule> = {
  works: {
    key: 'works',
    basePath: '/projects',
    category: 'scientific',
    listTitle: 'Quản lý Công trình Khoa học',
    listSubtitle: 'Theo dõi, quản lý và đánh giá các đề tài, bài báo, công trình nghiên cứu',
    createTitle: 'Đăng ký công trình khoa học',
    createSubtitle: 'Điền thông tin đề tài / bài báo / công trình nghiên cứu',
    createButton: 'Đăng ký công trình',
    itemNoun: 'công trình',
    types: [
      { value: 'RESEARCH_PROJECT', label: 'Đề tài NCKH' },
      { value: 'THESIS', label: 'Luận văn / Luận án' },
    ],
    showLevel: true,
    showBudget: true,
    journalLabel: 'Tạp chí / Hội nghị',
    journalPlaceholder: 'VD: IEEE Access',
    issnLabel: 'ISSN / DOI',
    issnPlaceholder: 'VD: 1859-1531',
  },
};
