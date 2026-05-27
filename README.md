# NCKH AI - Hệ thống Quản lý Công trình Khoa học cho Trường Đại học

> Đề tài: **Xây dựng phần mềm quản lý công trình khoa học cho trường đại học**, tích hợp AI hỗ trợ OCR, kiểm tra đạo văn, đề xuất phản biện.

## 🆕 Cập nhật mới nhất

- **3 nghiệp vụ tách bảng & module riêng**: Công trình khoa học (`/projects` → bảng `ScientificWork`), Bằng sáng chế (`/patents` → bảng `Patent`), Giáo trình (`/textbooks` → bảng `Textbook`). Mỗi loại có trường chuyên biệt (sáng chế: số đơn/số bằng, đơn vị cấp, ngày cấp, IPC; giáo trình: NXB, ISBN, năm XB, số trang, môn học), trạng thái riêng, trang riêng. Đều cho đăng ký / sửa / tạo bản nháp.
- **Quyền xem theo trạng thái duyệt**: chưa duyệt → chỉ người tạo + ADMIN/REVIEWER xem; đã duyệt (ACCEPTED/ARCHIVED) → mọi người đều xem được.
- **Gỡ bỏ "Giờ chuẩn NCKH"** (menu, route `/research-hours`, module backend). API `/api/research-hours/*` nay trả 404.
- **Thư viện số** rút gọn thành nơi đăng "thông tin khoa học mới" — bỏ chọn loại bài báo / cấp độ khi đăng.
- **Phân quyền menu chặt**, chia 5 nhóm: Tổng quan · Quản lý công trình · Tra cứu & Trợ lý · Hội đồng & Xét duyệt · Quản trị hệ thống.

## Kiến trúc hệ thống

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  Python AI   │────▶│ Ollama Local │
│  React/Vite  │     │   NestJS     │     │   FastAPI    │     │  LLM Local   │
│  :5173       │     │   :3000      │     │   :8001      │     │  :11434      │
└──────────────┘     └──────┬───────┘     └──────┬───────┘     └──────────────┘
                            │                     │
                     ┌──────▼───────┐     ┌──────▼───────┐
                     │  PostgreSQL  │     │    MinIO      │
                     │   :5433      │     │ :9002/:9003   │
                     └──────────────┘     └──────────────┘
```

| Service | Công nghệ | Vai trò |
|---------|-----------|---------|
| **Frontend** | React 19, Vite, React Router, Axios | Giao diện người dùng |
| **Backend** | NestJS 11, Prisma 7, PostgreSQL, JWT | API, auth, business logic |
| **AI Service** | FastAPI, Tesseract OCR, scikit-learn | OCR, NLP, similarity |
| **Ollama** | qwen2.5:3b (local, không Docker) | Tóm tắt, trích xuất AI, chatbot |
| **MinIO** | S3-compatible object storage | Lưu trữ file upload |
| **PostgreSQL** | Database | Cơ sở dữ liệu |

## Yêu cầu

- **Docker Desktop** (bắt buộc)
- **Ollama** cài local (https://ollama.com)
- **RAM**: tối thiểu 8GB (khuyến nghị 16GB nếu dùng Ollama)
- **Disk**: ~5GB cho Docker images + models

## Cài đặt & Chạy

### 1. Clone repo

```bash
git clone https://github.com/Hieppppp/NCKHAI.git
cd NCKHAI
```

### 2. Cài Ollama local (nhẹ hơn chạy Docker)

```bash
# Cài Ollama từ https://ollama.com, sau đó pull model
ollama pull qwen2.5:3b
```

### 3. Chạy Docker

```bash
# Build và start tất cả services (trừ Ollama - chạy local)
docker compose up -d

# Xem logs
docker compose logs -f

# Xem trạng thái
docker compose ps
```

### 4. Seed dữ liệu demo (lần đầu chạy)

```bash
# Push schema Prisma lên DB
docker compose exec back-end npx prisma db push --accept-data-loss

# Generate Prisma Client
docker compose exec back-end npx prisma generate

# Seed dữ liệu: users, works, journals, templates, configs, variables
docker compose exec back-end npx tsx prisma/seed.ts

# Expected output:
# Seed completed! { admin: 1, reviewer1: 2, reviewer2: 3, lecturer: 4, student: 5,
#   journals: 15, configs: 14, templateVars: 25, templates: 3 }
```

### 5. Deploy PostgreSQL Functions (tối ưu hiệu năng)

```bash
# Copy SQL functions vào container DB
docker cp back-end/prisma/functions/nckhai_functions.sql nckhai-db:/tmp/

# Chạy file SQL
docker compose exec db psql -U nckhai -d nckhai_db -f /tmp/nckhai_functions.sql
```

Tạo 10 PostgreSQL functions tối ưu: dashboard stats, finance stats, library stats,
research hours calculation, template data loader, plagiarism check với pg_trgm.

### 6. Restart sau khi có code mới

```bash
# Chỉ restart các service thay đổi
docker compose restart back-end         # khi sửa backend (thêm module, controller, service)
docker compose restart front-end        # khi sửa frontend CSS/config/router
docker compose restart ai-service       # khi sửa code Python (OCR, AI)
# Frontend thường tự HMR khi sửa React component, không cần restart

# Khi thêm module backend mới (VD: FilesModule, Queue), bắt buộc restart backend
docker compose restart back-end

# Khi thêm route/page frontend mới (VD: /files, /jobs), HMR tự load
# Nhưng nếu đổi menu/router nặng thì restart cho chắc
docker compose restart front-end

# Rebuild nếu thêm npm package mới
docker compose up -d --build front-end
docker compose up -d --build back-end

# Rebuild nếu đổi Dockerfile hoặc docker-compose.yml
docker compose up -d --build

# Dọn volume + rebuild (khi gặp lỗi Prisma client cũ)
docker compose down
docker volume rm nckhai_nckhai-backend-node_modules 2>/dev/null
docker compose up -d --build back-end
```

### 7. Truy cập

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:3000/api |
| **AI Service** | http://localhost:8001/health |
| **MinIO Console** | http://localhost:9003 |
| **Ollama (local)** | http://localhost:11434 |
| **PostgreSQL** | localhost:5433 |

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Quản trị viên | `admin@nckhai.vn` | `admin123` |
| Phản biện 1 | `reviewer@nckhai.vn` | `reviewer123` |
| Phản biện 2 | `reviewer2@nckhai.vn` | `reviewer123` |
| Giảng viên | `lecturer@nckhai.vn` | `lecturer123` |
| Sinh viên | `student@nckhai.vn` | `user123` |

## Lệnh hữu ích khi dev

### Database
```bash
# Kết nối PostgreSQL CLI
docker compose exec db psql -U nckhai -d nckhai_db

# Reset database (xóa toàn bộ)
docker compose down -v            # ⚠️ Mất hết dữ liệu
docker compose up -d
docker compose exec back-end npx prisma db push --accept-data-loss
docker compose exec back-end npx tsx prisma/seed.ts

# Xem các bảng
docker compose exec db psql -U nckhai -d nckhai_db -c "\dt"
```

### Logs & Debug
```bash
# Xem log real-time
docker compose logs -f back-end
docker compose logs -f front-end
docker compose logs -f ai-service

# Xem 50 dòng cuối
docker compose logs --tail=50 back-end

# Chạy command trong container
docker compose exec back-end npm run build
docker compose exec back-end npm run lint
docker compose exec front-end npm install <package>
```

### Backup & Restore
```bash
# Backup DB
docker compose exec db pg_dump -U nckhai nckhai_db > backup.sql

# Restore DB
cat backup.sql | docker compose exec -T db psql -U nckhai -d nckhai_db

# Backup MinIO files
docker cp nckhai-minio:/data ./minio-backup
```

## Tính năng chính

### 1. Bảng điều khiển (Dashboard)
- Hero banner với lời chào, role badge, % hoàn thành
- 4 thẻ thống kê: tổng công trình, chờ xử lý, đã nghiệm thu, người dùng
- 6 quick links nhanh đến các module
- Phân bố trạng thái (bar chart), bảng công trình gần đây
- Sidebar: cấp đề tài, loại hình, thông báo mới, gợi ý AI

### 2. Quản lý Công trình Khoa học · Bằng sáng chế · Giáo trình (3 bảng riêng)
- **Công trình khoa học** (`/projects`, bảng `ScientificWork`): Đề tài NCKH, Bài báo, Bài hội nghị, Luận văn — kèm workflow xét duyệt, file đính kèm, AI đề xuất phản biện
- **Bằng sáng chế** (`/patents`, bảng `Patent`): loại đơn (Sáng chế / Giải pháp hữu ích / Kiểu dáng CN), số đơn, số bằng, đơn vị cấp, IPC, ngày nộp/cấp; trạng thái DRAFT → FILED → EXAMINING → GRANTED / REJECTED
- **Giáo trình** (`/textbooks`, bảng `Textbook`): loại (Giáo trình / Bài giảng / Tham khảo / Chuyên khảo), NXB, ISBN, năm XB, lần XB, số trang, môn học, cấp phê duyệt; trạng thái DRAFT → SUBMITTED → REVIEWING → APPROVED → PUBLISHED / REJECTED
- Đăng ký mới / sửa / tạo bản nháp (CRUD đầy đủ); mỗi loại có trang & form chuyên biệt
- Toggle List/Grid view, search, bộ lọc (Trạng thái, Loại hình, Cấp độ)
- Chi tiết: thông tin, workflow xét duyệt, AI đề xuất phản biện, nhận xét, file đính kèm
- Quy trình xét duyệt tự động theo cấp (Trường / Bộ / Nhà nước)
- Admin/Reviewer chuyển trạng thái: DRAFT → SUBMITTED → IN_PROGRESS → REVIEW → ACCEPTED
- **Quyền xem**: chưa duyệt chỉ người tạo + ADMIN/REVIEWER thấy; đã duyệt thì mọi người xem được

### 3. Công bố Khoa học
- 4 chế độ xem: List, Upload, Detail, Edit
- Upload PDF → AI tự động OCR trích xuất: tiêu đề, tác giả, tóm tắt, từ khóa
- Preview tài liệu gốc + confidence score + engine info
- Chỉnh sửa kết quả AI, thêm DOI/ISSN
- Xác nhận → tự động thêm vào Thư viện số
- Search/filter/pagination, trạng thái DRAFT → CONFIRMED → PUBLISHED
- Copy BibTeX 1 click

### 4. Hội đồng Đánh giá
- Hero banner + % completion ring + 4 stats cards
- Grid cards: tên hội đồng, đề tài, ngày họp, tiến độ chấm, kết luận
- Tạo hội đồng: dropdown chọn đề tài + thành viên (không nhập ID thủ công)
- Phiếu đánh giá điện tử: 3 tiêu chí slider (Đổi mới/40, Khả thi/30, Tác động/30)
- Đề xuất: Chấp nhận / Yêu cầu chỉnh sửa / Từ chối
- AI gợi ý chuyên gia phản biện dựa trên keyword matching
- Tiến độ hội đồng: danh sách thành viên + trạng thái đã chấm

### 5. (Đã gỡ bỏ) Quy đổi Giờ chuẩn NCKH

> ⚠️ Tính năng "Quy đổi Giờ chuẩn NCKH" đã được **loại bỏ** khỏi hệ thống: menu, route `/research-hours`, module backend và trang frontend. API `/api/research-hours/*` nay trả về **404**.

### 6. Tài chính & Thi đua (đổi tên từ "Kinh phí & Khen thưởng")
- Hero banner + progress ring % giải ngân
- 4 stats: tổng ngân sách, đã giải ngân, đề tài đang thực hiện, khen thưởng
- Phân bổ ngân sách theo Khoa (donut chart SVG)
- Bảng giao dịch: Giải ngân / Phân bổ / Hoàn trả + Duyệt/Từ chối inline (Admin)
- Quyết định khen thưởng: Tiền mặt / Bằng khen / Giấy khen + Duyệt/Trao thưởng
- Dropdown chọn ngân sách, đề tài, người nhận (không nhập ID)
- Tình trạng xử lý: Chờ duyệt / Đã duyệt / Hoàn thành

### 7. Thư viện số — Tin khoa học (đã rút gọn)
- Nơi **đăng & tra cứu thông tin khoa học mới**: tin tức, thông báo, tài liệu chia sẻ
- Form đăng tin tối giản: Tiêu đề / Tác giả - Nguồn / Nội dung / Từ khóa / Tags
- **Bỏ việc chọn loại bài báo & cấp độ** khi đăng (so với bản cũ)
- Hero banner + search + stats (bản tin, lượt xem, lượt tải)
- **Download tài liệu thực**: presigned URL từ MinIO; **Xem trước PDF** trong detail view
- BibTeX copy 1 click, AI Chat widget hỗ trợ tìm kiếm
- Đăng tin mới: Lecturer/Admin
- Sidebar: từ khóa phổ biến, thống kê

### 8. Trợ lý AI (4 Tab)
| Tab | Chức năng |
|-----|-----------|
| **OCR & Phân tích** | Upload PDF/ảnh → OCR → metadata + BBox visual/table + JSON/Markdown export + AI tóm tắt |
| **Kiểm tra đạo văn** | So sánh với kho nội bộ, hiện % similarity từng công trình |
| **Xu hướng NC** | Top từ khóa, phân bố theo loại/cấp/năm |
| **Trợ lý AI** | Chat với Ollama LLM, hỏi đáp nghiên cứu |

### 9. Quản lý tài liệu (MinIO File Manager)
- **Trang mới** `/files` — quản lý toàn bộ tài liệu đã upload lên MinIO
- 4 stat cards: tổng số tệp, dung lượng sử dụng, upload 7 ngày qua, số định dạng
- Bảng danh sách: tên tệp, phân loại (badge màu), kích thước, trạng thái OCR + độ tin cậy %, người tải, đề tài liên kết, ngày upload
- Filter: phân loại (MANUSCRIPT/PROPOSAL/...), định dạng (PDF/Word/ảnh/text), trạng thái OCR (đã/chưa)
- Chi tiết file: metadata OCR (tiêu đề/tác giả/keywords), preview PDF inline, preview ảnh, download
- Admin xóa file (xóa cả object MinIO + DB record)
- **API**: `GET /api/files`, `/stats`, `/:id`, `/:id/download`, `DELETE /:id`

### 10. Quản lý tác vụ (Job Queue Manager)
- **Trang mới** `/jobs` — theo dõi các tác vụ xử lý bất đồng bộ (OCR, AI summarize, embedding, email, report)
- 5 stat cards status (tiếng Việt): **Đang chờ / Đang xử lý / Hoàn thành / Thất bại / Tổng bản ghi**
- 2 queue cards: hiển thị số job theo từng state (Chờ/Chạy/Xong/Lỗi/Hoãn) cho OCR + AI Summarize
- Bảng danh sách: Job ID, hàng đợi, status badge, progress bar, thời gian xử lý, ngày tạo
- Auto-refresh mỗi 5s, toggle bật/tắt
- Filter: theo status, theo queue, toggle "Xem tất cả người dùng" (Admin)
- Actions (Admin): **Chạy lại** job thất bại, **Xóa** job, **Dọn dẹp** jobs cũ > 24h
- Chi tiết: input JSON, result JSON, error stacktrace
- **API**: `GET /api/jobs`, `/admin/stats`, `POST /:id/retry`, `DELETE /:id`, `POST /admin/clean`

### 11. Profile cá nhân
- Hero banner gradient + avatar + role badge
- 3 stats: đề tài, công bố, đánh giá
- Chỉnh sửa: tên, SĐT, khoa, chuyên ngành
- Tài khoản & bảo mật

### 10. Shared Components
- **Modal component**: dùng chung tất cả trang, max-height 94vh, header/footer cố định
- **Toast notification**: success/error/warning/info, auto dismiss, slide-in animation
- **Confirm dialog**: icon, title, message, danger mode (đỏ), thay thế toàn bộ alert/confirm JS

## AI Features

| Tính năng | Công nghệ | Mô tả |
|-----------|-----------|-------|
| **OCR** | Tesseract (vie+eng) | Word/line-level bounding box annotation |
| **PDF Extract** | PyPDF2 + pdf2image | Digital PDF text + scanned PDF OCR |
| **Metadata** | NLP regex + LLM | Tự động tìm title, authors, abstract, keywords |
| **Đạo văn** | TF-IDF cosine similarity | So sánh với kho dữ liệu nội bộ |
| **Phản biện** | Keyword + text matching | Đề xuất chuyên gia theo lĩnh vực |
| **Xu hướng** | Frequency analysis | Top keywords, phân bố loại/cấp/năm |
| **Tóm tắt** | Ollama qwen2.5:3b | Tóm tắt văn bản nghiên cứu |
| **Chatbot** | Ollama qwen2.5:3b | Trợ lý AI nghiên cứu tiếng Việt |
| **Quy đổi điểm** | Rule engine + DB lookup | Tự động tính giờ chuẩn NCKH theo HĐGSNN |

## Phân quyền

| Vai trò | Quyền |
|---------|-------|
| **ADMIN** | Toàn quyền + quản lý users + ngân sách + khen thưởng + duyệt công trình + khu Quản trị hệ thống |
| **REVIEWER** | Xem + đánh giá + chấm điểm hội đồng + đổi trạng thái duyệt |
| **LECTURER** | Đăng ký công trình/sáng chế/giáo trình + upload + công bố + đăng tin thư viện |
| **STUDENT** | Đăng ký công trình/sáng chế/giáo trình + upload + xem (mặc định khi đăng ký) |

**Phân quyền menu (5 nhóm):**

| Nhóm | Menu | Vai trò thấy |
|------|------|--------------|
| TỔNG QUAN | Bảng điều khiển | Mọi vai trò |
| QUẢN LÝ CÔNG TRÌNH | Công trình khoa học, Bằng sáng chế, Giáo trình, Công bố khoa học | Mọi vai trò |
| TRA CỨU & TRỢ LÝ | Thư viện số, Trợ lý AI | Mọi vai trò |
| HỘI ĐỒNG & XÉT DUYỆT | Hội đồng chấm điểm | ADMIN, REVIEWER |
| QUẢN TRỊ HỆ THỐNG | Tài chính & Thi đua, Mẫu tài liệu, Kho tài liệu (MinIO), Hàng đợi tác vụ, Quản lý người dùng | ADMIN |

## Database Schema (15 bảng)

| Bảng | Mục đích |
|------|----------|
| `User` | Người dùng (4 vai trò) |
| `ScientificWork` | Đề tài / Công trình NCKH |
| `WorkflowStep` | Các bước quy trình duyệt |
| `Committee` | Hội đồng đánh giá |
| `CommitteeMember` | Thành viên hội đồng |
| `Review` | Phiếu chấm điểm (3 tiêu chí) |
| `FileUpload` | File tải lên + kết quả OCR |
| `Notification` | Thông báo hệ thống |
| `Publication` | Công bố khoa học |
| `LibraryDocument` | Kho lưu trữ số |
| `Budget` | Ngân sách theo khoa/năm |
| `BudgetTransaction` | Giao dịch giải ngân/phân bổ |
| `Reward` | Khen thưởng |
| `Patent` | Bằng sáng chế / sở hữu trí tuệ (bảng riêng) |
| `Textbook` | Giáo trình / tài liệu giảng dạy (bảng riêng) |
| `JournalRanking` | Danh mục tạp chí (Scopus, HĐGSNN, trong nước) |
| `ResearchHours` | ⚠️ Bảng cũ của tính năng Giờ chuẩn (đã gỡ, bảng còn lại nhưng không dùng) |

## API Endpoints

### Auth & Profile
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/profile` | Thông tin user + _count stats |
| PATCH | `/api/auth/profile` | Cập nhật profile |

### Công trình khoa học / Bằng sáng chế / Giáo trình (3 API riêng)

Cả 3 đều áp dụng **quyền xem theo trạng thái duyệt** (chưa duyệt → chủ sở hữu + ADMIN/REVIEWER; đã duyệt → mọi người) và **đổi trạng thái chỉ ADMIN/REVIEWER**.

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST | `/api/works`, `/api/works/:id` | Công trình KH (`ScientificWork`) + workflow, file, reviews. `GET ?category=scientific` loại trừ sáng chế/giáo trình |
| GET/POST/PATCH/DELETE | `/api/patents`, `/api/patents/:id` | Bằng sáng chế (`Patent`). Lọc `?status=&patentType=` |
| GET/POST/PATCH/DELETE | `/api/textbooks`, `/api/textbooks/:id` | Giáo trình (`Textbook`). Lọc `?status=&materialType=` |

### AI
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/ai/upload` | **Sync**: Upload + OCR đồng bộ (block, đợi response) |
| POST | `/api/ai/upload-async` | **Async**: Upload MinIO + push OCR job → trả jobId ngay |
| POST | `/api/ai/similarity` | Kiểm tra đạo văn (so sánh corpus, riskLevel, verdict) |
| POST | `/api/ai/chat` | Chat với AI (Ollama qwen2.5:3b) |
| POST | `/api/ai/summarize` | Tóm tắt văn bản |
| GET | `/api/ai/suggest-experts/:workId` | AI đề xuất phản biện |
| GET | `/api/ai/trends` | Phân tích xu hướng (overview, top keywords, growth YoY, insights) |

### Quy đổi Giờ chuẩn NCKH — ĐÃ GỠ BỎ

> Toàn bộ endpoint `/api/research-hours/*` đã được loại bỏ (trả 404).

### Công bố, Thư viện, Tài chính & Thi đua, Hội đồng
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/publications` | Tạo publication |
| POST | `/api/publications/:id/confirm` | Xác nhận → auto-thêm Library |
| GET | `/api/library` | Tìm kiếm thư viện |
| GET | `/api/finance/stats` | Dashboard kinh phí |
| POST | `/api/committees` | Tạo hội đồng |
| POST | `/api/committees/review` | Chấm điểm |

### Quản lý tài liệu (MinIO File Manager)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/files` | Danh sách file (filter: category, mimeType, hasOcr, uploaderId, workId, search, page, limit) |
| GET | `/api/files/stats` | Thống kê: tổng file, dung lượng, theo category, theo mimeType, 7 ngày gần nhất |
| GET | `/api/files/:id` | Chi tiết file + metadata OCR |
| GET | `/api/files/:id/download` | Presigned URL tải file từ MinIO |
| DELETE | `/api/files/:id` | Xóa file (uploader hoặc Admin) |

### Quản lý tác vụ (Job Queue)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/jobs` | Lịch sử job của user (filter: status, queueName, page; admin có thể `?all=true`) |
| GET | `/api/jobs/:id` | Chi tiết 1 job (polling từ frontend) |
| GET | `/api/jobs/admin/stats` | Stats BullMQ + byStatus (Admin) |
| POST | `/api/jobs/:id/retry` | Chạy lại job thất bại (Admin) |
| DELETE | `/api/jobs/:id` | Xóa job record (Admin) |
| POST | `/api/jobs/admin/clean` | Dọn jobs cũ `{olderThanHours}` (Admin) |

## Job Queue Trigger - Luồng async OCR

Hệ thống có **2 chế độ upload** OCR, người dùng chọn ở tab "Trợ lý AI":

### Sync mode (truyền thống)
```
Browser → POST /api/ai/upload (multipart) → AI service /process →
  [MinIO upload + OCR + extract đồng bộ trong 1 request] →
  Response chứa toàn bộ kết quả
```
- Đợi 10-30 giây tùy file size
- Browser block trong khi xử lý
- Phù hợp file nhỏ, demo nhanh

### Async mode (khuyến nghị, qua Job Queue)
```
Browser → POST /api/ai/upload-async (multipart) →
  Backend gọi AI /upload-only (chỉ lưu MinIO, ~1s) →
  Tạo FileUpload + JobRecord (pending) + push BullMQ queue →
  Response: { jobId, fileId } (~1s)

Worker (OcrProcessor, concurrency=2):
  1. Pick job từ Redis queue
  2. Update JobRecord status=processing, progress=20
  3. Gọi AI /reprocess?object_name=xxx
  4. Update JobRecord progress=70 → 100
  5. Update FileUpload với extractedText, OCR confidence, keywords...
  6. Mark JobRecord completed + lưu result JSON

Browser polls GET /api/jobs/:id mỗi 1.5s → cập nhật progress bar →
  status=completed → render kết quả OCR vào UI
```

**Ưu điểm async**:
- Browser không block, có thể chuyển tab khác
- Retry tự động 3 lần (exponential backoff 2s → 4s → 8s)
- Track lịch sử qua trang `/jobs`
- Admin có thể retry job failed thủ công, dọn job cũ
- Concurrency 2 (giới hạn qua `@Processor(QUEUE_NAMES.OCR, { concurrency: 2 })`)

### Test thử end-to-end

```bash
# 1. Login lấy token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nckhai.vn","password":"admin123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

# 2. Upload async
curl -X POST http://localhost:3000/api/ai/upload-async \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@your-paper.pdf"
# Response: {"jobId":"1","file":{"id":34,...}}

# 3. Poll job status (1.5s/lần)
curl http://localhost:3000/api/jobs/1 -H "Authorization: Bearer $TOKEN"
# {"status":"processing","progress":70,...}

# 4. Khi completed, lấy kết quả từ result hoặc query file
curl "http://localhost:3000/api/files/34" -H "Authorization: Bearer $TOKEN"
```

### Trang quản lý

| Trang | URL | Mô tả |
|-------|-----|-------|
| **Quản lý tài liệu** | `/files` | Toàn bộ file MinIO + filter + preview + delete |
| **Quản lý tác vụ** | `/jobs` | Tất cả jobs + stats real-time + retry + cleanup |
| **Trợ lý AI** | `/ai` | Upload (sync/async toggle) + OCR + plagiarism + trends |

## 5 loại Job Queue trên hệ thống

Hệ thống có **5 queue BullMQ** tách biệt, mỗi queue có processor riêng với concurrency được tinh chỉnh phù hợp:

| Queue | Tên Redis | Concurrency | Processor | Mô tả |
|-------|-----------|-------------|-----------|-------|
| **OCR** | `ocr-processing` | 2 | OcrProcessor | OCR Tesseract + extract metadata từ PDF/ảnh |
| **Tóm tắt AI** | `ai-summarize` | 2 | SummarizeProcessor | Gọi Ollama LLM tóm tắt văn bản |
| **Vector hóa** | `ai-embedding` | 1 | EmbeddingProcessor | Trích xuất TF-IDF keywords làm vector đại diện |
| **Gửi email** | `email-notification` | 5 | EmailProcessor | Gửi email thông báo (mock SMTP, sẵn sàng plug nodemailer) |
| **Tạo báo cáo** | `report-generation` | 1 | ReportProcessor | Render báo cáo PDF (works/finance/research-hours/committee) |

**Mã Job composite**: `<queue-name>_<bullId>` (ví dụ `ai-summarize_1`) — tránh trùng vì BullMQ reset id từng queue.

### Trigger jobs

```typescript
// Inject QueueService rồi gọi các method:
queueService.queueOcr({ objectName, originalName, mimeType, userId, workId })
queueService.queueSummarize({ text, maxWords, userId, fileId })
queueService.queueEmbedding({ text, userId, workId, fileId })
queueService.queueEmail({ to, subject, body, template, userId })
queueService.queueReport({ type: 'works' | 'finance' | 'research-hours' | 'committee', userId })
```

### Test endpoint cho Admin

```bash
# Seed all - đẩy 4 test jobs (summarize/embedding/email/report) vào queue
curl -X POST http://localhost:3000/api/jobs/admin/seed-test \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"all"}'

# Hoặc từng loại: type = ocr | summarize | embedding | email | report | all
```

### Báo cáo kết quả test (chạy ngày 2026-04-28)

```
═══════════════════════════════════════════════════════════
📊 BullMQ STATS
═══════════════════════════════════════════════════════════
Total records: 5
By status: {'completed': 5}

Queue                    Active  Wait  Done  Fail
────────────────────────────────────────────────────────────
ocr-processing           0       0     1     0
ai-summarize             0       0     1     0
ai-embedding             0       0     1     0
email-notification       0       0     1     0
report-generation        0       0     1     0
```

**Chi tiết kết quả:**

| Queue | Job ID | Status | Kết quả |
|-------|--------|--------|---------|
| OCR | `ocr-processing_1` | ✓ completed 100% | Tesseract OCR text + extract metadata |
| Tóm tắt AI | `ai-summarize_1` | ✓ completed 100% | "Bài báo đề cập đến ứng dụng trí tuệ nhân tạo trong giáo dục đại học, đặc biệt là các phương pháp deep learning, CNN và transformer..." |
| Vector hóa | `ai-embedding_1` | ✓ completed 100% | 15 keywords trích xuất: `["dụng","học","nhân","đại","bài","trình","gian","sinh"...]` |
| Gửi email | `email-notification_1` | ✓ completed 100% | sentTo=test-recipient@nckhai.vn, messageId=`<1777347453205.gf450x84vmr@nckhai.vn>` |
| Tạo báo cáo | `report-generation_1` | ✓ completed 100% | reportType=works, 12 pages, 535 KB, data={total:8, byLevel:[MINISTRY:2, UNIVERSITY:4, STATE:2]} |

**Pass rate: 100%** — tất cả 5 queue xử lý job thành công, JobRecord được lưu đầy đủ vào DB, kết quả trả về đúng schema, BullMQ stats đồng bộ với DB.

## Dữ liệu persist

```bash
# Dừng - dữ liệu KHÔNG mất
docker compose down

# Start lại
docker compose up -d

# ⚠️ Chỉ mất khi xóa volumes
docker compose down -v
```

## Cấu trúc thư mục

```
NCKHAI/
├── docker-compose.yml
├── .env
├── README.md
│
├── back-end/                  # NestJS API
│   ├── src/
│   │   ├── auth/              # JWT, guards, decorators
│   │   ├── users/             # User CRUD (Admin)
│   │   ├── scientific-works/  # Công trình CRUD + workflow
│   │   ├── patents/           # Bằng sáng chế (bảng Patent)
│   │   ├── textbooks/         # Giáo trình (bảng Textbook)
│   │   ├── ai/                # Proxy to Python AI service
│   │   ├── committees/        # Hội đồng + chấm điểm
│   │   ├── publications/      # Công bố khoa học
│   │   ├── library/           # Kho lưu trữ số
│   │   ├── finance/           # Kinh phí & Khen thưởng
│   │   ├── notifications/     # Thông báo
│   │   ├── dashboard/         # Thống kê
│   │   └── prisma/            # Database service
│   └── prisma/
│       ├── schema.prisma      # Database schema (15 bảng)
│       └── seed.ts            # Demo data + 15 tạp chí
│
├── font-end/                  # React Frontend
│   └── src/
│       ├── components/
│       │   ├── common/        # Modal, Toast, ProgressBar (shared)
│       │   ├── AppLayout.tsx
│       │   ├── Header.tsx
│       │   └── Sidebar.tsx
│       ├── contexts/          # AuthContext
│       ├── pages/
│       │   ├── DashboardPage.tsx
│       │   ├── works/         # WorkList, WorkDetail, WorkCreate
│       │   ├── Publications.tsx
│       │   ├── CommitteeEvaluation.tsx
│       │   ├── FinancePage.tsx
│       │   ├── LibraryPage.tsx
│       │   ├── ProfilePage.tsx
│       │   ├── ai/AiAnalysis.tsx
│       │   └── admin/UserManagement.tsx
│       ├── services/          # API clients (axios)
│       └── config/            # Menu config
│
├── ai-service/                # Python AI Service
│   ├── main.py                # FastAPI endpoints
│   ├── ocr_service.py         # Tesseract OCR + bbox
│   ├── nlp_utils.py           # TF-IDF, similarity, keywords
│   ├── llm_client.py          # Ollama / DeepSeek LLM
│   └── minio_client.py        # MinIO S3 client
│
└── scripts/
    └── setup-ollama.sh        # Auto-pull Ollama model
```

## Tech Stack

- **Frontend**: React 19 + Vite 8 + React Router 7 + Axios + Lucide Icons
- **Backend**: NestJS 11 + Prisma 7 + PostgreSQL 15 + JWT + Passport
- **AI**: Python 3.11 + FastAPI + Tesseract OCR + scikit-learn + Ollama
- **Storage**: MinIO (S3-compatible)
- **Infra**: Docker Compose
