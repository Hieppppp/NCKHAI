import { PrismaClient, Role, WorkStatus, WorkType, WorkLevel } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const SALT = 10;

async function main() {
  // ─── Users ───────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nckhai.vn' },
    update: {},
    create: {
      email: 'admin@nckhai.vn', name: 'Quản trị viên',
      password: await bcrypt.hash('admin123', SALT),
      role: Role.ADMIN, department: 'Phòng KHCN', specialization: 'Quản lý khoa học',
    },
  });

  const reviewer1 = await prisma.user.upsert({
    where: { email: 'reviewer@nckhai.vn' },
    update: {},
    create: {
      email: 'reviewer@nckhai.vn', name: 'PGS.TS Trần Văn B',
      password: await bcrypt.hash('reviewer123', SALT),
      role: Role.REVIEWER, department: 'Khoa CNTT', specialization: 'Trí tuệ nhân tạo, Machine Learning, Xử lý ngôn ngữ tự nhiên',
    },
  });

  const reviewer2 = await prisma.user.upsert({
    where: { email: 'reviewer2@nckhai.vn' },
    update: {},
    create: {
      email: 'reviewer2@nckhai.vn', name: 'GS.TS Phạm Minh E',
      password: await bcrypt.hash('reviewer123', SALT),
      role: Role.REVIEWER, department: 'Khoa CNTT', specialization: 'An toàn thông tin, Mật mã học, Blockchain',
    },
  });

  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@nckhai.vn' },
    update: {},
    create: {
      email: 'lecturer@nckhai.vn', name: 'TS. Lê Thị C',
      password: await bcrypt.hash('lecturer123', SALT),
      role: Role.LECTURER, department: 'Khoa Điện tử - Viễn thông', specialization: 'IoT, Hệ thống nhúng, Xử lý tín hiệu số',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@nckhai.vn' },
    update: {},
    create: {
      email: 'student@nckhai.vn', name: 'Nguyễn Văn D',
      password: await bcrypt.hash('user123', SALT),
      role: Role.STUDENT, department: 'Khoa CNTT',
    },
  });

  // ─── Scientific Works ────────────────────────────────
  const works = [
    {
      title: 'Ứng dụng Deep Learning trong chẩn đoán bệnh qua ảnh X-quang',
      authors: 'PGS.TS Trần Văn B, Nguyễn Văn D',
      abstract: 'Nghiên cứu áp dụng mạng nơ-ron tích chập (CNN) để phát hiện sớm các bệnh lý phổi từ ảnh X-quang ngực. Sử dụng kiến trúc ResNet-50 với transfer learning trên tập dữ liệu ChestX-ray14.',
      keywords: ['deep learning', 'CNN', 'X-ray', 'chẩn đoán', 'y tế', 'ResNet', 'transfer learning'],
      type: WorkType.JOURNAL_ARTICLE, level: WorkLevel.MINISTRY,
      status: WorkStatus.REVIEW, userId: reviewer1.id, aiScore: 85, aiRank: 'A',
      budget: 150000000, journalName: 'Tạp chí Khoa học & Công nghệ', issn: '1859-1531',
    },
    {
      title: 'Hệ thống IoT giám sát môi trường nông nghiệp thông minh',
      authors: 'TS. Lê Thị C',
      abstract: 'Thiết kế và triển khai hệ thống IoT sử dụng LoRa và ESP32 để thu thập dữ liệu nhiệt độ, độ ẩm, ánh sáng trong nhà kính. Tích hợp AI dự đoán năng suất cây trồng.',
      keywords: ['IoT', 'LoRa', 'ESP32', 'nông nghiệp', 'cảm biến', 'smart farming', 'AI'],
      type: WorkType.RESEARCH_PROJECT, level: WorkLevel.UNIVERSITY,
      status: WorkStatus.IN_PROGRESS, userId: lecturer.id, aiScore: 72, aiRank: 'B',
      budget: 50000000,
    },
    {
      title: 'Phân tích mã độc sử dụng kỹ thuật học máy trên nền tảng Android',
      authors: 'GS.TS Phạm Minh E, Nguyễn Văn D',
      abstract: 'Xây dựng mô hình phân loại mã độc Android dựa trên phân tích tĩnh và động, kết hợp Random Forest và XGBoost đạt độ chính xác 97.3%.',
      keywords: ['malware', 'Android', 'machine learning', 'an toàn thông tin', 'Random Forest', 'phân tích mã độc'],
      type: WorkType.CONFERENCE_PAPER, level: WorkLevel.UNIVERSITY,
      status: WorkStatus.ACCEPTED, userId: reviewer2.id, aiScore: 90, aiRank: 'A',
      journalName: 'Hội nghị RIVF 2026',
    },
    {
      title: 'Nghiên cứu thuật toán mã hóa đồng hình trong bảo mật dữ liệu đám mây',
      authors: 'GS.TS Phạm Minh E',
      abstract: 'Đề xuất cải tiến thuật toán BFV cho mã hóa đồng hình, giảm 40% thời gian xử lý so với phương pháp gốc khi áp dụng vào tìm kiếm trên dữ liệu mã hóa.',
      keywords: ['mã hóa đồng hình', 'đám mây', 'bảo mật', 'BFV', 'homomorphic encryption', 'cloud'],
      type: WorkType.JOURNAL_ARTICLE, level: WorkLevel.STATE,
      status: WorkStatus.SUBMITTED, userId: reviewer2.id,
      budget: 500000000, journalName: 'IEEE Access', issn: '2169-3536',
    },
    {
      title: 'Xây dựng chatbot hỗ trợ sinh viên bằng mô hình ngôn ngữ lớn',
      authors: 'Nguyễn Văn D',
      abstract: 'Phát triển chatbot tư vấn học tập cho sinh viên sử dụng kỹ thuật RAG (Retrieval-Augmented Generation) kết hợp với cơ sở tri thức nội bộ của trường đại học.',
      keywords: ['chatbot', 'LLM', 'RAG', 'NLP', 'giáo dục', 'AI', 'sinh viên'],
      type: WorkType.THESIS, level: WorkLevel.UNIVERSITY,
      status: WorkStatus.DRAFT, userId: student.id,
    },
  ];

  for (const w of works) {
    const existing = await prisma.scientificWork.findFirst({ where: { title: w.title } });
    if (!existing) {
      const work = await prisma.scientificWork.create({ data: w });

      // Create workflow steps
      const levelTemplates: Record<string, string[]> = {
        UNIVERSITY: ['Đăng ký ý tưởng', 'Xét duyệt đề cương', 'Thực hiện nghiên cứu', 'Nghiệm thu', 'Lưu trữ'],
        MINISTRY: ['Đăng ký ý tưởng', 'Xét duyệt đề cương', 'Xét duyệt thuyết minh', 'Thực hiện', 'Phản biện', 'Chỉnh sửa', 'Nghiệm thu', 'Lưu trữ'],
        STATE: ['Đăng ký', 'Đề cương', 'Thuyết minh', 'Thực hiện', 'Phản biện 1', 'Chỉnh sửa', 'Phản biện 2', 'Nghiệm thu', 'Lưu trữ'],
      };
      const steps = levelTemplates[w.level] || levelTemplates.UNIVERSITY;
      await prisma.workflowStep.createMany({
        data: steps.map((name, idx) => ({
          workId: work.id, name, order: idx + 1, status: WorkStatus.DRAFT,
        })),
      });
    }
  }

  // ─── Notifications ───────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: admin.id, title: 'Đề tài mới đăng ký', message: '"Xây dựng chatbot hỗ trợ sinh viên" vừa được đăng ký', type: 'WORKFLOW', link: '/projects/5' },
      { userId: student.id, title: 'Chào mừng', message: 'Chào mừng bạn đến với hệ thống quản lý NCKH', type: 'SYSTEM' },
      { userId: lecturer.id, title: 'Nhắc lịch', message: 'Báo cáo tiến độ đề tài IoT hạn cuối 30/04/2026', type: 'DEADLINE' },
      { userId: reviewer1.id, title: 'Phân công phản biện', message: 'Bạn được phân công phản biện đề tài Deep Learning X-quang', type: 'COMMITTEE' },
    ],
  });

  // ─── Journal Rankings (Danh mục tạp chí) ────────────────
  const journals = [
    { name: 'IEEE Transactions on Pattern Analysis and Machine Intelligence', issn: '0162-8828', category: 'Scopus', quartile: 'Q1', impactFactor: 24.314, points: 2.0, publisher: 'IEEE', country: 'USA' },
    { name: 'Nature Machine Intelligence', issn: '2522-5839', category: 'Scopus', quartile: 'Q1', impactFactor: 25.898, points: 2.0, publisher: 'Springer Nature', country: 'UK' },
    { name: 'Journal of Machine Learning Research', issn: '1532-4435', category: 'Scopus', quartile: 'Q1', impactFactor: 6.0, points: 2.0, publisher: 'MIT Press', country: 'USA' },
    { name: 'IEEE Access', issn: '2169-3536', category: 'Scopus', quartile: 'Q2', impactFactor: 3.476, points: 1.5, publisher: 'IEEE', country: 'USA' },
    { name: 'Applied Sciences', issn: '2076-3417', category: 'Scopus', quartile: 'Q2', impactFactor: 2.838, points: 1.5, publisher: 'MDPI', country: 'Switzerland' },
    { name: 'Computers & Education', issn: '0360-1315', category: 'Scopus', quartile: 'Q1', impactFactor: 12.0, points: 2.0, publisher: 'Elsevier', country: 'UK' },
    { name: 'Expert Systems with Applications', issn: '0957-4174', category: 'Scopus', quartile: 'Q1', impactFactor: 8.665, points: 2.0, publisher: 'Elsevier', country: 'UK' },
    { name: 'Journal of Finance', issn: '0022-1082', category: 'Scopus', quartile: 'Q1', impactFactor: 8.238, points: 2.0, publisher: 'Wiley', country: 'USA' },
    { name: 'Sustainability', issn: '2071-1050', category: 'Scopus', quartile: 'Q2', impactFactor: 3.889, points: 1.5, publisher: 'MDPI', country: 'Switzerland' },
    { name: 'Journal of Cleaner Production', issn: '0959-6526', category: 'Scopus', quartile: 'Q1', impactFactor: 11.072, points: 2.0, publisher: 'Elsevier', country: 'UK' },
    { name: 'Tạp chí Khoa học và Công nghệ Việt Nam', issn: '1859-4794', category: 'HDGSNN', quartile: null, impactFactor: null, points: 1.0, publisher: 'Bộ KH&CN', country: 'Vietnam' },
    { name: 'Tạp chí Khoa học ĐHQGHN', issn: '0866-8612', category: 'HDGSNN', quartile: null, impactFactor: null, points: 1.0, publisher: 'ĐHQG Hà Nội', country: 'Vietnam' },
    { name: 'Vietnam Journal of Computer Science', issn: '2196-8888', category: 'Scopus', quartile: 'Q3', impactFactor: 1.2, points: 1.0, publisher: 'Springer', country: 'Vietnam' },
    { name: 'Tạp chí Công nghệ Thông tin và Truyền thông', issn: '1859-3550', category: 'HDGSNN', quartile: null, impactFactor: null, points: 0.75, publisher: 'Học viện CNBCVT', country: 'Vietnam' },
    { name: 'Journal of Science and Technology', issn: '2525-2518', category: 'Trong nước', quartile: null, impactFactor: null, points: 0.5, publisher: 'ĐH Đà Nẵng', country: 'Vietnam' },
  ];

  for (const j of journals) {
    await prisma.journalRanking.upsert({
      where: { id: 0 }, // Force create
      update: {},
      create: j,
    }).catch(() => {
      // If upsert fails, just create
      return prisma.journalRanking.create({ data: j });
    });
  }

  console.log('Seed completed!', { admin: admin.id, reviewer1: reviewer1.id, reviewer2: reviewer2.id, lecturer: lecturer.id, student: student.id, journals: journals.length });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
