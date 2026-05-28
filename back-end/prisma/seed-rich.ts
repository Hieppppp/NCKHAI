/**
 * Seed bổ sung dữ liệu phong phú cho hệ thống NCKH.
 * Idempotent: chạy lại không trùng (kiểm tra theo title/email/code).
 * Chạy:  docker compose exec back-end npx tsx prisma/seed-rich.ts
 */
import {
  PrismaClient, Role, WorkStatus, WorkType, WorkLevel,
  PatentType, PatentStatus, TextbookType, TextbookStatus,
  TransactionType, TransactionStatus, RewardType, RewardStatus,
  PublicationStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const SALT = 10;

const stepsByLevel: Record<string, string[]> = {
  UNIVERSITY: ['Đăng ký ý tưởng', 'Xét duyệt đề cương', 'Thực hiện nghiên cứu', 'Nghiệm thu', 'Lưu trữ'],
  MINISTRY: ['Đăng ký', 'Đề cương', 'Thuyết minh', 'Thực hiện', 'Phản biện', 'Chỉnh sửa', 'Nghiệm thu', 'Lưu trữ'],
  STATE: ['Đăng ký', 'Đề cương', 'Thuyết minh', 'Thực hiện', 'Phản biện 1', 'Chỉnh sửa', 'Phản biện 2', 'Nghiệm thu', 'Lưu trữ'],
};

async function main() {
  console.log('🌱 Bắt đầu seed dữ liệu phong phú...');

  // ─── Users bổ sung ────────────────────────────────────
  const userSpecs = [
    { email: 'reviewer3@nckhai.vn', name: 'PGS.TS Hoàng Văn F', role: Role.REVIEWER, department: 'Khoa Toán-Tin', specialization: 'Tối ưu hóa, Lý thuyết đồ thị', password: 'reviewer123' },
    { email: 'lecturer2@nckhai.vn', name: 'TS. Vũ Thị G', role: Role.LECTURER, department: 'Khoa Hóa học', specialization: 'Hóa hữu cơ, Polyme sinh học', password: 'lecturer123' },
    { email: 'lecturer3@nckhai.vn', name: 'TS. Đặng Minh H', role: Role.LECTURER, department: 'Khoa Cơ khí', specialization: 'Cơ điện tử, Robot công nghiệp', password: 'lecturer123' },
    { email: 'lecturer4@nckhai.vn', name: 'ThS. Bùi Thị I', role: Role.LECTURER, department: 'Khoa Kinh tế', specialization: 'Kinh tế lượng, Tài chính ngân hàng', password: 'lecturer123' },
    { email: 'student2@nckhai.vn', name: 'Phạm Thị J', role: Role.STUDENT, department: 'Khoa CNTT', specialization: 'Khoa học dữ liệu', password: 'user123' },
    { email: 'student3@nckhai.vn', name: 'Trần Văn K', role: Role.STUDENT, department: 'Khoa Điện-Điện tử', specialization: 'Điện tử y sinh', password: 'user123' },
  ];
  for (const u of userSpecs) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email, name: u.name, role: u.role,
        department: u.department, specialization: u.specialization,
        password: await bcrypt.hash(u.password, SALT),
      },
    });
  }

  // Lookup IDs theo email
  const allUsers = await prisma.user.findMany();
  const U: Record<string, number> = Object.fromEntries(allUsers.map((u: any) => [u.email, u.id]));
  const adminId     = U['admin@nckhai.vn'];
  const reviewer1Id = U['reviewer@nckhai.vn'];
  const reviewer2Id = U['reviewer2@nckhai.vn'];
  const reviewer3Id = U['reviewer3@nckhai.vn'];
  const lecturerId  = U['lecturer@nckhai.vn'];
  const lecturer2Id = U['lecturer2@nckhai.vn'];
  const lecturer3Id = U['lecturer3@nckhai.vn'];
  const lecturer4Id = U['lecturer4@nckhai.vn'];
  const studentId   = U['student@nckhai.vn'];
  const student2Id  = U['student2@nckhai.vn'];
  const student3Id  = U['student3@nckhai.vn'];

  // ─── Scientific Works bổ sung (chỉ RESEARCH_PROJECT) ──
  const workSpecs = [
    { title: 'Nghiên cứu vật liệu polyme phân hủy sinh học từ phế phẩm nông nghiệp', authors: 'TS. Vũ Thị G, ThS. Bùi Thị I', abstract: 'Tổng hợp vật liệu polyme thân thiện môi trường từ rơm rạ, bã mía. Khảo sát khả năng phân hủy trong điều kiện chôn lấp tự nhiên.', keywords: ['polyme sinh học', 'phế phẩm nông nghiệp', 'môi trường'], level: WorkLevel.MINISTRY, status: WorkStatus.IN_PROGRESS, userId: lecturer2Id, budget: 320_000_000, aiScore: 76, aiRank: 'B' },
    { title: 'Thiết kế tay máy 6 bậc tự do ứng dụng trong dây chuyền lắp ráp ô tô', authors: 'TS. Đặng Minh H', abstract: 'Xây dựng mô hình robot công nghiệp 6 DOF, thuật toán điều khiển động học ngược, mô phỏng và thử nghiệm trên dây chuyền nhỏ.', keywords: ['robot', '6DOF', 'tự động hóa', 'cơ điện tử'], level: WorkLevel.UNIVERSITY, status: WorkStatus.ACCEPTED, userId: lecturer3Id, budget: 80_000_000, aiScore: 88, aiRank: 'A' },
    { title: 'Mô hình dự báo lạm phát Việt Nam giai đoạn 2025-2030', authors: 'ThS. Bùi Thị I', abstract: 'Áp dụng mô hình ARIMA-GARCH và mạng nơ-ron LSTM để dự báo CPI, tỷ giá. Phân tích tác động chính sách tiền tệ.', keywords: ['kinh tế lượng', 'ARIMA', 'LSTM', 'lạm phát'], level: WorkLevel.STATE, status: WorkStatus.SUBMITTED, userId: lecturer4Id, budget: 600_000_000 },
    { title: 'Tối ưu hóa lịch trình giảng dạy bằng thuật toán di truyền', authors: 'PGS.TS Hoàng Văn F, Phạm Thị J', abstract: 'Mô hình bài toán xếp thời khóa biểu là bài toán đa mục tiêu, áp dụng GA cải tiến đạt độ phủ 99.2% ràng buộc.', keywords: ['tối ưu hóa', 'genetic algorithm', 'lịch học'], level: WorkLevel.UNIVERSITY, status: WorkStatus.DRAFT, userId: reviewer3Id },
    { title: 'Hệ thống theo dõi sức khỏe đeo tay dùng tín hiệu ECG', authors: 'Trần Văn K, TS. Lê Thị C', abstract: 'Thiết bị wearable ghi tín hiệu ECG, phân loại nhịp tim bất thường bằng CNN nhẹ chạy trên MCU.', keywords: ['ECG', 'wearable', 'sức khỏe', 'CNN'], level: WorkLevel.UNIVERSITY, status: WorkStatus.ACCEPTED, userId: student3Id, aiScore: 78, aiRank: 'B' },
    { title: 'Phân tích cảm xúc bình luận sinh viên về chất lượng đào tạo', authors: 'Phạm Thị J', abstract: 'Thu thập 50K bình luận, fine-tune PhoBERT cho phân loại cảm xúc 5 lớp. Trực quan hóa xu hướng theo môn học.', keywords: ['NLP', 'PhoBERT', 'cảm xúc', 'giáo dục'], level: WorkLevel.UNIVERSITY, status: WorkStatus.REJECTED, userId: student2Id },
    { title: 'Ứng dụng blockchain trong quản lý văn bằng đại học', authors: 'GS.TS Phạm Minh E, Phạm Thị J', abstract: 'Xây dựng hệ thống chứng nhận văn bằng phi tập trung dùng Hyperledger Fabric, đảm bảo chống giả mạo.', keywords: ['blockchain', 'Hyperledger', 'văn bằng'], level: WorkLevel.MINISTRY, status: WorkStatus.IN_PROGRESS, userId: reviewer2Id, budget: 250_000_000 },
  ];
  let newWorks = 0;
  for (const w of workSpecs) {
    if (await prisma.scientificWork.findFirst({ where: { title: w.title } })) continue;
    const created = await prisma.scientificWork.create({ data: { ...w, type: WorkType.RESEARCH_PROJECT } });
    const steps = stepsByLevel[w.level] || stepsByLevel.UNIVERSITY;
    await prisma.workflowStep.createMany({
      data: steps.map((name, idx) => ({ workId: created.id, name, order: idx + 1, status: WorkStatus.DRAFT })),
    });
    newWorks++;
  }

  // ─── Patents bổ sung ─────────────────────────────────
  const patentSpecs = [
    { title: 'Hệ thống nhận diện biển số xe sử dụng học sâu', inventors: 'PGS.TS Trần Văn B', owner: 'Trường ĐH ABC', abstract: 'Giải pháp nhận dạng biển số xe tốc độ cao với độ chính xác 99.5% trong điều kiện ánh sáng yếu.', patentType: PatentType.INVENTION, applicationNo: '1-2025-08901', patentNo: '1-0045621', issuingAuthority: 'Cục Sở hữu trí tuệ', field: 'Công nghệ thông tin', status: PatentStatus.GRANTED, grantDate: new Date('2025-11-20'), filingDate: new Date('2024-06-15'), userId: reviewer1Id, keywords: ['biển số xe', 'deep learning', 'nhận dạng'] },
    { title: 'Quy trình chiết xuất tinh dầu sả chanh năng suất cao', inventors: 'TS. Vũ Thị G', owner: 'Trường ĐH ABC', abstract: 'Quy trình chưng cất cải tiến tăng năng suất 25%, giảm thời gian 30%.', patentType: PatentType.UTILITY_SOLUTION, applicationNo: '2-2025-00789', issuingAuthority: 'Cục Sở hữu trí tuệ', field: 'Hóa học - Thực phẩm', status: PatentStatus.EXAMINING, filingDate: new Date('2025-04-02'), userId: lecturer2Id, keywords: ['tinh dầu', 'sả chanh', 'chiết xuất'] },
    { title: 'Cánh tay robot hỗ trợ phục hồi chức năng', inventors: 'TS. Đặng Minh H', owner: 'Trường ĐH ABC', abstract: 'Robot hỗ trợ tập luyện cho bệnh nhân đột quỵ, tích hợp cảm biến lực và điều khiển EMG.', patentType: PatentType.INVENTION, applicationNo: '1-2026-01234', issuingAuthority: 'Cục Sở hữu trí tuệ', field: 'Y sinh - Cơ điện tử', status: PatentStatus.FILED, filingDate: new Date('2026-01-15'), userId: lecturer3Id, keywords: ['robot y sinh', 'phục hồi chức năng', 'EMG'] },
    { title: 'Kiểu dáng vỏ thiết bị đo đường huyết không xâm lấn', inventors: 'Trần Văn K', owner: 'Trường ĐH ABC', abstract: 'Thiết kế công nghiệp cho thiết bị đo đường huyết quang học, tối ưu công thái học.', patentType: PatentType.INDUSTRIAL_DESIGN, applicationNo: '3-2025-00456', issuingAuthority: 'Cục Sở hữu trí tuệ', field: 'Thiết bị y tế', status: PatentStatus.DRAFT, userId: student3Id, keywords: ['đường huyết', 'thiết kế công nghiệp', 'thiết bị y tế'] },
  ];
  let newPatents = 0;
  for (const p of patentSpecs) {
    if (await prisma.patent.findFirst({ where: { title: p.title } })) continue;
    await prisma.patent.create({ data: p });
    newPatents++;
  }

  // ─── Textbooks bổ sung ───────────────────────────────
  const textbookSpecs = [
    { title: 'Bài giảng Lập trình hướng đối tượng', authors: 'TS. Lê Thị C', abstract: 'Bài giảng môn LTHĐT bằng Java, kèm bài tập và ví dụ minh họa.', materialType: TextbookType.LECTURE, publisher: 'Trường ĐH ABC (lưu hành nội bộ)', publishYear: 2024, pages: 180, subject: 'Lập trình hướng đối tượng', field: 'Công nghệ thông tin', approvalLevel: WorkLevel.UNIVERSITY, status: TextbookStatus.APPROVED, userId: lecturerId, keywords: ['OOP', 'Java', 'lập trình'] },
    { title: 'Giáo trình Toán cao cấp 1', authors: 'PGS.TS Hoàng Văn F', abstract: 'Đại số tuyến tính, giải tích 1 biến, ứng dụng trong khoa học kỹ thuật.', materialType: TextbookType.TEXTBOOK, publisher: 'NXB Giáo dục Việt Nam', isbn: '978-604-0-22333-1', publishYear: 2023, edition: 'Lần 3', pages: 410, subject: 'Toán cao cấp', field: 'Khoa học cơ bản', approvalLevel: WorkLevel.MINISTRY, status: TextbookStatus.PUBLISHED, userId: reviewer3Id, keywords: ['đại số', 'giải tích', 'toán'] },
    { title: 'Tài liệu tham khảo Khoa học vật liệu polyme', authors: 'TS. Vũ Thị G', abstract: 'Tổng hợp kiến thức về polyme sinh học, vật liệu thông minh, polyme dẫn điện.', materialType: TextbookType.REFERENCE, publisher: 'NXB Khoa học và Kỹ thuật', isbn: '978-604-0-67822-2', publishYear: 2024, pages: 280, subject: 'Hóa polyme', field: 'Hóa học', approvalLevel: WorkLevel.UNIVERSITY, status: TextbookStatus.REVIEWING, userId: lecturer2Id, keywords: ['polyme', 'vật liệu', 'hóa học'] },
    { title: 'Sách chuyên khảo An toàn thông tin nâng cao', authors: 'GS.TS Phạm Minh E', abstract: 'Mật mã, an ninh mạng, blockchain và ứng dụng thực tế.', materialType: TextbookType.MONOGRAPH, publisher: 'NXB Đại học Quốc gia', isbn: '978-604-0-99887-7', publishYear: 2025, pages: 520, subject: 'An toàn thông tin', field: 'Công nghệ thông tin', approvalLevel: WorkLevel.MINISTRY, status: TextbookStatus.SUBMITTED, userId: reviewer2Id, keywords: ['an toàn thông tin', 'mật mã', 'blockchain'] },
    { title: 'Giáo trình Kinh tế lượng ứng dụng', authors: 'ThS. Bùi Thị I', abstract: 'Hồi quy, phân tích chuỗi thời gian, ứng dụng EViews/Stata cho nghiên cứu kinh tế.', materialType: TextbookType.TEXTBOOK, publisher: 'NXB Thống kê', isbn: '978-604-0-12211-3', publishYear: 2024, pages: 320, subject: 'Kinh tế lượng', field: 'Kinh tế', approvalLevel: WorkLevel.UNIVERSITY, status: TextbookStatus.DRAFT, userId: lecturer4Id, keywords: ['kinh tế lượng', 'hồi quy', 'EViews'] },
  ];
  let newTextbooks = 0;
  for (const t of textbookSpecs) {
    if (await prisma.textbook.findFirst({ where: { title: t.title } })) continue;
    await prisma.textbook.create({ data: t });
    newTextbooks++;
  }

  // ─── Library Documents (tin khoa học) ────────────────
  const librarySpecs = [
    { title: 'Thông báo Hội thảo khoa học cấp Trường năm 2026', authors: 'Phòng Khoa học - Công nghệ', abstract: 'Hội thảo "AI & Chuyển đổi số trong giáo dục đại học" diễn ra ngày 25/06/2026. Mời các giảng viên, sinh viên đăng ký báo cáo trước 30/05/2026.', keywords: ['hội thảo', 'AI', 'chuyển đổi số'], tags: ['hội thảo', 'thông báo'], userId: adminId },
    { title: 'Quỹ tài trợ Nafosted 2026 mở đợt xét duyệt mới', authors: 'Phòng KHCN - Bộ KH&CN', abstract: 'Quỹ Phát triển KHCN Quốc gia mở nhận hồ sơ đề tài cơ bản đợt 2/2026. Hạn cuối nộp 15/08/2026.', keywords: ['Nafosted', 'tài trợ', 'đề tài'], tags: ['quỹ tài trợ', 'thông báo'], userId: adminId },
    { title: 'Cập nhật danh mục tạp chí HĐGSNN năm 2026', authors: 'Hội đồng GS Nhà nước', abstract: 'Danh mục tạp chí được tính điểm công trình khoa học có hiệu lực từ 01/01/2026. Bổ sung 12 tạp chí mới ngành KHTN-CN.', keywords: ['HDGSNN', 'tạp chí', 'điểm KHCN'], tags: ['danh mục', 'tin chuyên ngành'], userId: adminId },
    { title: 'Workshop công nghệ Quantum Computing dành cho giảng viên', authors: 'TS. Lê Thị C', abstract: 'Khóa tập huấn 3 ngày về điện toán lượng tử, Qiskit và ứng dụng. Đăng ký miễn phí cho 30 giảng viên đầu tiên.', keywords: ['quantum', 'Qiskit', 'điện toán lượng tử'], tags: ['workshop', 'tin chuyên ngành'], userId: lecturerId },
    { title: 'Hợp tác nghiên cứu giữa trường ĐH và doanh nghiệp công nghệ', authors: 'Ban Giám hiệu', abstract: 'Trường ký MOU với 5 công ty công nghệ về thực tập, đặt hàng nghiên cứu, học bổng cho sinh viên.', keywords: ['hợp tác', 'doanh nghiệp', 'MOU'], tags: ['hợp tác', 'thông báo'], userId: adminId },
    { title: 'Lịch nộp báo cáo tiến độ đề tài NCKH năm học 2025-2026', authors: 'Phòng KHCN', abstract: 'Báo cáo tiến độ giữa kỳ trước 30/04/2026, báo cáo cuối năm trước 30/09/2026. Mẫu báo cáo có trên trang web.', keywords: ['báo cáo', 'NCKH', 'tiến độ'], tags: ['thông báo', 'mẫu báo cáo'], userId: adminId },
    { title: 'Khóa học ngắn hạn về phương pháp viết bài báo khoa học', authors: 'PGS.TS Trần Văn B', abstract: 'Khóa học 5 buổi hướng dẫn cách viết, gửi và phản hồi peer-review cho tạp chí Q1/Q2.', keywords: ['viết bài', 'tạp chí', 'kỹ năng'], tags: ['khóa học', 'kỹ năng'], userId: reviewer1Id },
  ];
  let newLibrary = 0;
  for (const l of librarySpecs) {
    if (await prisma.libraryDocument.findFirst({ where: { title: l.title } })) continue;
    await prisma.libraryDocument.create({ data: { ...l, type: WorkType.RESEARCH_PROJECT } });
    newLibrary++;
  }

  // ─── Committees + Members + Reviews ──────────────────
  const acceptedWorks = await prisma.scientificWork.findMany({ where: { status: WorkStatus.ACCEPTED }, take: 3 });
  let newCommittees = 0, newReviews = 0;
  for (const w of acceptedWorks) {
    if (await prisma.committee.findFirst({ where: { workId: w.id } })) continue;
    const c = await prisma.committee.create({
      data: {
        workId: w.id,
        name: `Hội đồng nghiệm thu: ${w.title.slice(0, 50)}${w.title.length > 50 ? '...' : ''}`,
        description: 'Hội đồng nghiệm thu cấp Trường/Bộ',
        meetingDate: new Date(Date.now() - 7 * 86400_000),
        location: 'Phòng họp A301',
        finalScore: 85.7,
        conclusion: 'Đề tài đạt yêu cầu nghiệm thu. Đề nghị công bố kết quả nghiên cứu.',
      },
    });
    await prisma.committeeMember.createMany({
      data: [
        { committeeId: c.id, userId: reviewer1Id, role: 'chair' },
        { committeeId: c.id, userId: reviewer2Id, role: 'secretary' },
        { committeeId: c.id, userId: reviewer3Id, role: 'member' },
      ],
    });
    await prisma.review.createMany({
      data: [
        { workId: w.id, committeeId: c.id, reviewerId: reviewer1Id, innovationScore: 36, feasibilityScore: 27, impactScore: 27, totalScore: 90, recommendation: 'accept', comment: 'Đề tài có tính mới, kết quả rõ ràng, ứng dụng cao.' },
        { workId: w.id, committeeId: c.id, reviewerId: reviewer2Id, innovationScore: 34, feasibilityScore: 26, impactScore: 25, totalScore: 85, recommendation: 'accept', comment: 'Nghiệm thu đạt yêu cầu, phần thực nghiệm cần làm rõ hơn.' },
        { workId: w.id, committeeId: c.id, reviewerId: reviewer3Id, innovationScore: 35, feasibilityScore: 25, impactScore: 22, totalScore: 82, recommendation: 'revise', comment: 'Cần bổ sung so sánh với baseline khác.' },
      ],
    });
    newCommittees++;
    newReviews += 3;
  }

  // ─── Budgets ─────────────────────────────────────────
  const budgetSpecs = [
    { name: 'Ngân sách NCKH 2026 - Khoa CNTT', department: 'Khoa CNTT', fiscalYear: 2026, totalAmount: 2_500_000_000 },
    { name: 'Ngân sách NCKH 2026 - Khoa Hóa học', department: 'Khoa Hóa học', fiscalYear: 2026, totalAmount: 1_200_000_000 },
    { name: 'Ngân sách NCKH 2026 - Khoa Cơ khí', department: 'Khoa Cơ khí', fiscalYear: 2026, totalAmount: 1_500_000_000 },
    { name: 'Ngân sách NCKH 2026 - Khoa Kinh tế', department: 'Khoa Kinh tế', fiscalYear: 2026, totalAmount: 900_000_000 },
  ];
  let newBudgets = 0;
  for (const b of budgetSpecs) {
    if (await prisma.budget.findFirst({ where: { name: b.name } })) continue;
    await prisma.budget.create({ data: b });
    newBudgets++;
  }

  // ─── Budget Transactions ─────────────────────────────
  const budgets = await prisma.budget.findMany();
  const someWorks = await prisma.scientificWork.findMany({ take: 5 });
  let newTransactions = 0;
  if ((await prisma.budgetTransaction.count()) === 0 && budgets.length > 0) {
    const w0 = someWorks[0]?.id, w1 = someWorks[1]?.id, w2 = someWorks[2]?.id;
    const txs = [
      { amount: 200_000_000, type: TransactionType.ALLOCATION, description: 'Phân bổ kinh phí đầu năm cho đề tài', status: TransactionStatus.COMPLETED, budgetId: budgets[0].id, workId: w0, approvedById: adminId },
      { amount: 80_000_000, type: TransactionType.DISBURSEMENT, description: 'Giải ngân đợt 1 - mua thiết bị', status: TransactionStatus.APPROVED, budgetId: budgets[0].id, workId: w0, approvedById: adminId },
      { amount: 60_000_000, type: TransactionType.DISBURSEMENT, description: 'Giải ngân đợt 2 - hội thảo & công bố', status: TransactionStatus.PENDING, budgetId: budgets[0].id, workId: w0 },
      { amount: 150_000_000, type: TransactionType.ALLOCATION, description: 'Phân bổ cho đề tài hóa polyme', status: TransactionStatus.COMPLETED, budgetId: budgets[1].id, workId: w1, approvedById: adminId },
      { amount: 30_000_000, type: TransactionType.REFUND, description: 'Hoàn trả dư kinh phí', status: TransactionStatus.APPROVED, budgetId: budgets[1].id, approvedById: adminId },
      { amount: 100_000_000, type: TransactionType.DISBURSEMENT, description: 'Giải ngân mua linh kiện robot', status: TransactionStatus.REJECTED, budgetId: budgets[2].id, workId: w2 },
      { amount: 50_000_000, type: TransactionType.ALLOCATION, description: 'Phân bổ đề tài kinh tế lượng', status: TransactionStatus.PENDING, budgetId: budgets[3]?.id ?? budgets[0].id },
    ];
    await prisma.budgetTransaction.createMany({ data: txs });
    newTransactions = txs.length;
  }

  // ─── Rewards ─────────────────────────────────────────
  const accWorkId = (await prisma.scientificWork.findFirst({ where: { status: WorkStatus.ACCEPTED } }))?.id;
  let newRewards = 0;
  if ((await prisma.reward.count()) === 0) {
    const rewards = [
      { title: 'Khen thưởng đề tài nghiệm thu xuất sắc 2025', description: 'Khen thưởng tập thể nhà khoa học có đề tài đạt loại xuất sắc.', type: RewardType.CASH, amount: 20_000_000, period: '2025', status: RewardStatus.AWARDED, userId: reviewer1Id, workId: accWorkId, approvedById: adminId },
      { title: 'Giấy khen công trình NCKH cấp Trường', type: RewardType.CERTIFICATE, period: '2025', status: RewardStatus.APPROVED, userId: lecturerId, workId: accWorkId, approvedById: adminId },
      { title: 'Bằng khen nhà khoa học trẻ tiêu biểu', type: RewardType.LETTER, period: '2026', status: RewardStatus.PENDING, userId: student3Id },
      { title: 'Khen thưởng có bằng sáng chế được cấp', description: 'Thưởng cho tác giả bằng sáng chế quốc gia.', type: RewardType.CASH, amount: 30_000_000, period: '2025', status: RewardStatus.AWARDED, userId: reviewer1Id, approvedById: adminId },
      { title: 'Khen thưởng giáo trình được phê duyệt', type: RewardType.CERTIFICATE, period: '2025', status: RewardStatus.APPROVED, userId: lecturerId, approvedById: adminId },
      { title: 'Khen thưởng sinh viên NCKH', description: 'Sinh viên có công trình tham gia hội nghị quốc tế.', type: RewardType.CASH, amount: 5_000_000, period: '2026', status: RewardStatus.PENDING, userId: student2Id },
    ];
    await prisma.reward.createMany({ data: rewards });
    newRewards = rewards.length;
  }

  // ─── Publications (legacy table - giữ để tương thích library auto-create) ──
  const pubSpecs = [
    { title: 'Đánh giá hiệu năng kiến trúc Transformer cho dịch máy tiếng Việt', authors: 'TS. Lê Thị C, Phạm Thị J', journalName: 'Vietnam Journal of Computer Science', issn: '2196-8888', doi: '10.1007/s40595-025-0123-4', publishedDate: new Date('2025-09-12'), keywords: ['Transformer', 'NMT', 'tiếng Việt'], status: PublicationStatus.PUBLISHED, userId: lecturerId },
    { title: 'Khảo sát ứng dụng học sâu trong giám sát môi trường nông nghiệp', authors: 'TS. Lê Thị C', conferenceName: 'Hội nghị FAIR 2025', publishedDate: new Date('2025-08-20'), keywords: ['deep learning', 'nông nghiệp', 'môi trường'], status: PublicationStatus.CONFIRMED, userId: lecturerId },
    { title: 'Phương pháp giảm nhiễu tín hiệu ECG bằng wavelet thích nghi', authors: 'Trần Văn K, TS. Lê Thị C', journalName: 'Tạp chí Khoa học và Công nghệ Việt Nam', issn: '1859-4794', publishedDate: new Date('2026-01-10'), keywords: ['ECG', 'wavelet', 'tín hiệu'], status: PublicationStatus.DRAFT, userId: student3Id },
  ];
  let newPubs = 0;
  for (const p of pubSpecs) {
    if (await prisma.publication.findFirst({ where: { title: p.title } })) continue;
    await prisma.publication.create({ data: p });
    newPubs++;
  }

  // ─── Notifications bổ sung ────────────────────────────
  const extraNotis = [
    { userId: lecturer2Id, title: 'Nhắc lịch nộp báo cáo', message: 'Báo cáo tiến độ đề tài polyme hạn 30/04/2026', type: 'DEADLINE' as const },
    { userId: lecturer3Id, title: 'Hội đồng nghiệm thu', message: 'Đề tài robot đã được lập hội đồng nghiệm thu', type: 'COMMITTEE' as const },
    { userId: student2Id, title: 'Trạng thái đề tài', message: 'Đề tài của bạn bị từ chối, cần chỉnh sửa và nộp lại', type: 'WORKFLOW' as const },
    { userId: reviewer3Id, title: 'Phân công phản biện', message: 'Bạn được phân công phản biện 1 đề tài mới', type: 'COMMITTEE' as const },
    { userId: adminId, title: 'Sáng chế mới', message: 'Có 1 sáng chế đang chờ thẩm định cần xử lý', type: 'WORKFLOW' as const },
    { userId: lecturer4Id, title: 'Chào mừng', message: 'Tài khoản giảng viên đã được kích hoạt', type: 'SYSTEM' as const },
  ];
  await prisma.notification.createMany({ data: extraNotis });

  console.log(`
✓ Seed phong phú hoàn tất:
  - Users         +${userSpecs.length} (tổng cộng 11 user)
  - Works         +${newWorks}
  - Patents       +${newPatents}
  - Textbooks     +${newTextbooks}
  - Library       +${newLibrary}
  - Committees    +${newCommittees}  (kèm ${newReviews} reviews)
  - Budgets       +${newBudgets}
  - Transactions  +${newTransactions}
  - Rewards       +${newRewards}
  - Publications  +${newPubs}
  - Notifications +${extraNotis.length}
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
