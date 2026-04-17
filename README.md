# NCKH AI - Hệ thống Quản lý Công trình Khoa học cho Trường Đại học

> Đề tài: **Xây dựng phần mềm quản lý công trình khoa học cho trường đại học**, tích hợp AI hỗ trợ OCR, kiểm tra đạo văn, đề xuất phản biện, quy đổi giờ chuẩn NCKH.

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
docker compose restart back-end         # khi sửa backend
docker compose restart front-end        # khi sửa frontend CSS/config
# Frontend thường tự HMR khi sửa React, không cần restart

# Rebuild nếu thêm npm package mới
docker compose up -d --build front-end

# Rebuild nếu đổi Dockerfile
docker compose up -d --build
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

### 2. Quản lý Đề tài NCKH
- Đăng ký đề tài mới (CRUD đầy đủ)
- Toggle List/Grid view, search, bộ lọc 3 dropdown (Trạng thái, Loại hình, Cấp độ)
- Chi tiết đề tài: thông tin, workflow xét duyệt, AI đề xuất phản biện, nhận xét, file đính kèm
- Quy trình xét duyệt tự động theo cấp (Trường / Bộ / Nhà nước)
- Admin chuyển trạng thái: DRAFT → SUBMITTED → IN_PROGRESS → REVIEW → ACCEPTED

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

### 5. Quy đổi Giờ chuẩn NCKH (Tính năng đặc biệt)

> Giải quyết "nỗi khổ quyết toán giờ NCKH" - giảm 90% thời gian đối soát thủ công

**3 Tab chức năng:**

| Tab | Chức năng |
|-----|-----------|
| **Giờ chuẩn của tôi** | Ring chart %, 4 stats, trạng thái ĐẠT/THIẾU, chi tiết điểm từng nguồn |
| **Tổng hợp toàn trường** (Admin) | Thống kê, bảng theo Khoa, ranking xếp hạng giảng viên |
| **Danh mục tạp chí** | Search/filter 15+ tạp chí Scopus/HĐGSNN, Quartile, Impact Factor |

**Hệ số quy đổi theo Hội đồng Giáo sư Nhà nước:**

| Nguồn điểm | Hệ số |
|-------------|-------|
| Bài báo Scopus Q1 | 2.0 điểm |
| Bài báo Scopus Q2 | 1.5 điểm |
| Bài báo Scopus Q3 | 1.0 điểm |
| Bài báo Scopus Q4 | 0.75 điểm |
| Tạp chí HĐGSNN | 1.0 điểm |
| Tạp chí trong nước | 0.5 điểm |
| Đề tài cấp Nhà nước (CN) | 100 điểm |
| Đề tài cấp Bộ (CN) | 50 điểm |
| Đề tài cấp Trường (CN) | 25 điểm |
| Phản biện khoa học | 2 điểm/lần |

**Giá trị thực tiễn:**

| Đối tượng | Giá trị |
|-----------|---------|
| **Giảng viên** | Biết ngay đạt bao nhiêu điểm, thiếu bao nhiêu để bổ sung |
| **Phòng QLKH** | Tự động tính, không cần lật từng tờ giấy đối chiếu Q1/Q2 |
| **Ban giám hiệu** | Bảng xếp hạng, thống kê theo Khoa, dữ liệu cho kiểm định |

### 6. Kinh phí & Khen thưởng
- Hero banner + progress ring % giải ngân
- 4 stats: tổng ngân sách, đã giải ngân, đề tài đang thực hiện, khen thưởng
- Phân bổ ngân sách theo Khoa (donut chart SVG)
- Bảng giao dịch: Giải ngân / Phân bổ / Hoàn trả + Duyệt/Từ chối inline (Admin)
- Quyết định khen thưởng: Tiền mặt / Bằng khen / Giấy khen + Duyệt/Trao thưởng
- Dropdown chọn ngân sách, đề tài, người nhận (không nhập ID)
- Tình trạng xử lý: Chờ duyệt / Đã duyệt / Hoàn thành

### 7. Thư viện số Thông minh
- Hero banner + search embedded + stats (tổng tài liệu, lượt xem, lượt tải)
- Lọc theo loại tài liệu, cấp độ
- Card tài liệu: level badge, type chip, abstract, tags, AI score, lượt xem/tải
- **Download tài liệu thực**: presigned URL từ MinIO
- **Xem trước PDF**: iframe preview trong detail view
- Chi tiết: DOI link, ISSN, BibTeX copy 1 click
- AI Chat widget: trợ lý tìm kiếm tài liệu
- Thêm tài liệu mới (Lecturer/Admin)
- Sidebar: từ khóa phổ biến, thống kê

### 8. Trợ lý AI (4 Tab)
| Tab | Chức năng |
|-----|-----------|
| **OCR & Phân tích** | Upload PDF/ảnh → OCR → metadata + BBox visual/table + JSON/Markdown export + AI tóm tắt |
| **Kiểm tra đạo văn** | So sánh với kho nội bộ, hiện % similarity từng công trình |
| **Xu hướng NC** | Top từ khóa, phân bố theo loại/cấp/năm |
| **Trợ lý AI** | Chat với Ollama LLM, hỏi đáp nghiên cứu |

### 9. Profile cá nhân
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
| **ADMIN** | Toàn quyền + quản lý users + ngân sách + khen thưởng + tổng hợp giờ chuẩn |
| **REVIEWER** | Xem + đánh giá + chấm điểm hội đồng |
| **LECTURER** | Đăng ký đề tài + upload + công bố + thêm thư viện + xem giờ chuẩn |
| **STUDENT** | Đăng ký đề tài + upload + xem (mặc định khi đăng ký) |

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
| `JournalRanking` | Danh mục tạp chí (Scopus, HĐGSNN, trong nước) |
| `ResearchHours` | Giờ chuẩn NCKH theo năm học |

## API Endpoints

### Auth & Profile
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/profile` | Thông tin user + _count stats |
| PATCH | `/api/auth/profile` | Cập nhật profile |

### Công trình khoa học
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/works` | Danh sách (search, filter, paginate) |
| POST | `/api/works` | Đăng ký mới |
| GET | `/api/works/:id` | Chi tiết + workflow + reviews |
| PATCH | `/api/works/:id` | Cập nhật / đổi trạng thái |

### AI
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/ai/upload` | Upload file → OCR → extract (annotations, bbox, pages) |
| POST | `/api/ai/similarity` | Kiểm tra đạo văn |
| POST | `/api/ai/chat` | Chat với AI (Ollama) |
| POST | `/api/ai/summarize` | Tóm tắt văn bản |
| GET | `/api/ai/suggest-experts/:workId` | AI đề xuất phản biện |
| GET | `/api/ai/trends` | Phân tích xu hướng |

### Quy đổi Giờ chuẩn NCKH
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/research-hours/my` | Giờ chuẩn cá nhân + chi tiết |
| POST | `/api/research-hours/calculate` | Tính cho user cụ thể (Admin) |
| GET | `/api/research-hours/summary` | Tổng hợp toàn trường (Admin) |
| GET | `/api/research-hours/journals` | Danh mục tạp chí (search, filter) |
| POST | `/api/research-hours/journals` | Thêm tạp chí (Admin) |

### Công bố, Thư viện, Kinh phí, Hội đồng
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/publications` | Tạo publication |
| POST | `/api/publications/:id/confirm` | Xác nhận → auto-thêm Library |
| GET | `/api/library` | Tìm kiếm thư viện |
| GET | `/api/finance/stats` | Dashboard kinh phí |
| POST | `/api/committees` | Tạo hội đồng |
| POST | `/api/committees/review` | Chấm điểm |

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
│   │   ├── ai/                # Proxy to Python AI service
│   │   ├── committees/        # Hội đồng + chấm điểm
│   │   ├── publications/      # Công bố khoa học
│   │   ├── library/           # Kho lưu trữ số
│   │   ├── finance/           # Kinh phí & Khen thưởng
│   │   ├── research-hours/    # Giờ chuẩn NCKH + Danh mục tạp chí
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
│       │   ├── ResearchHoursPage.tsx
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
