// Cấu hình 3 màn quản lý dùng chung bộ trang works (WorkList / WorkCreate / WorkDetail).
// Cả 3 dùng chung model ScientificWork ở backend, phân biệt bằng `category` + `type`.

export interface WorkTypeOption {
  value: string;
  label: string;
}

export interface WorksModule {
  /** khóa định danh */
  key: 'works' | 'patents' | 'textbooks';
  /** đường dẫn gốc, ví dụ /projects, /patents, /textbooks */
  basePath: string;
  /** nhóm gửi lên API ?category= */
  category: 'scientific' | 'patent' | 'textbook';

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
  patents: {
    key: 'patents',
    basePath: '/patents',
    category: 'patent',
    listTitle: 'Quản lý Bằng sáng chế',
    listSubtitle: 'Đăng ký, theo dõi và quản lý các bằng sáng chế, giải pháp hữu ích',
    createTitle: 'Đăng ký bằng sáng chế',
    createSubtitle: 'Điền thông tin sáng chế / giải pháp hữu ích',
    createButton: 'Đăng ký sáng chế',
    itemNoun: 'bằng sáng chế',
    types: [{ value: 'PATENT', label: 'Bằng sáng chế' }],
    showLevel: false,
    showBudget: false,
    journalLabel: 'Đơn vị cấp bằng',
    journalPlaceholder: 'VD: Cục Sở hữu trí tuệ',
    issnLabel: 'Số đơn / Số bằng',
    issnPlaceholder: 'VD: 1-2024-01234',
  },
  textbooks: {
    key: 'textbooks',
    basePath: '/textbooks',
    category: 'textbook',
    listTitle: 'Quản lý Giáo trình',
    listSubtitle: 'Đăng ký, theo dõi và quản lý các giáo trình, tài liệu giảng dạy',
    createTitle: 'Đăng ký giáo trình',
    createSubtitle: 'Điền thông tin giáo trình / tài liệu giảng dạy',
    createButton: 'Đăng ký giáo trình',
    itemNoun: 'giáo trình',
    types: [{ value: 'TEXTBOOK', label: 'Giáo trình' }],
    showLevel: false,
    showBudget: false,
    journalLabel: 'Nhà xuất bản',
    journalPlaceholder: 'VD: NXB Giáo dục',
    issnLabel: 'ISBN',
    issnPlaceholder: 'VD: 978-604-...',
  },
};
