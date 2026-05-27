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
      { value: 'JOURNAL_ARTICLE', label: 'Bài báo khoa học' },
      { value: 'CONFERENCE_PAPER', label: 'Bài hội nghị' },
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
