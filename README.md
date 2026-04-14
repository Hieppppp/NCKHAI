# NCKH AI - Hệ thống Quản lý Công trình Khoa học cho Trường Đại học

> Đề tài: **Xây dựng phần mềm quản lý công trình khoa học cho trường đại học**, tích hợp AI hỗ trợ OCR, kiểm tra đạo văn, đề xuất phản biện.

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

### 4. Truy cập

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:3000/api |
| **AI Service** | http://localhost:8001/health |
| **MinIO Console** | http://localhost:9003 |
| **Ollama (local)** | http://localhost:11434 |
| **PostgreSQL** | localhost:5433 |

> **Lưu ý:** Các port đã được đổi để tránh xung đột với local PHP/Ollama:
> - AI Service: 8001 (thay vì 8000)
> - MinIO: 9002/9003 (thay vì 9000/9001)
> - Ollama: chạy local trên 11434 (không dùng Docker)

## Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|-----------|
| Quản trị viên | `admin@nckhai.vn` | `admin123` |
| Phản biện 1 | `reviewer@nckhai.vn` | `reviewer123` |
| Phản biện 2 | `reviewer2@nckhai.vn` | `reviewer123` |
| Giảng viên | `lecturer@nckhai.vn` | `lecturer123` |
| Sinh viên | `student@nckhai.vn` | `user123` |

## Tính năng

### Nghiệp vụ cốt lõi
- Đăng ký, đăng nhập, phân quyền (Admin / Reviewer / Lecturer / Student)
- Quản lý người dùng (Admin CRUD, gán vai trò)
- Quản lý công trình khoa học (CRUD, tìm kiếm, lọc)
- Quy trình xét duyệt tự động (Workflow engine theo cấp: Trường / Bộ / Nhà nước)
- Hội đồng khoa học (tạo hội đồng, phân công, chấm điểm 3 tiêu chí)
- Hệ thống thông báo (in-app notifications)
- Dashboard thống kê real-time

### Công bố khoa học (Mới)
- Upload file → AI OCR trích xuất tự động (title, authors, abstract, keywords)
- Xem trước tài liệu + confidence score
- Chỉnh sửa thủ công kết quả AI
- Xác nhận & Lưu trữ → tự động thêm vào Thư viện số

### Kho lưu trữ số Thông minh (Mới)
- Tìm kiếm full-text (tên bài, tác giả, từ khóa, tags)
- Lọc nâng cao theo loại tài liệu, cấp độ
- AI Score cho từng tài liệu
- Từ khóa phổ biến (sidebar tags)
- Widget chat AI trợ lý thư viện
- Đếm lượt xem, lượt tải

### Quản lý Kinh phí & Khen thưởng (Mới)
- Dashboard tổng quan: tổng ngân sách, đã giải ngân, đề tài đang thực hiện, khen thưởng
- Phân bổ ngân sách theo Khoa (biểu đồ donut)
- Theo dõi giao dịch giải ngân (tạo, duyệt, hoàn thành)
- Tiến độ giải ngân (progress bar + danh sách)
- Quyết định khen thưởng (Tiền mặt, Bằng khen, Giấy khen)
- Công bố khoa học tiêu biểu

### AI Features
- **OCR** - Tesseract (tiếng Việt + Anh) với bounding box annotation
- **PDF Extract** - PyPDF2 text + pdf2image cho scanned PDF
- **Trích xuất metadata** - Tự động tìm title, authors, abstract, keywords
- **Kiểm tra đạo văn** - Cosine similarity (TF-IDF) so với kho nội bộ
- **Đề xuất phản biện** - Matching chuyên gia dựa trên keyword + similarity
- **Xu hướng nghiên cứu** - Phân tích keyword frequency, phân bố loại/cấp
- **LLM local** - Ollama (qwen2.5:3b) cho tóm tắt, chatbot, smart extraction
- **Upload MinIO** - Lưu file S3-compatible, presigned URL download

### Phân quyền

| Vai trò | Quyền |
|---------|-------|
| **ADMIN** | Toàn quyền + quản lý users + ngân sách + khen thưởng |
| **REVIEWER** | Xem + đánh giá + chấm điểm hội đồng |
| **LECTURER** | Đăng ký đề tài + upload + công bố + thêm thư viện |
| **STUDENT** | Đăng ký đề tài + upload + xem (mặc định khi đăng ký) |

## Database Schema

### Bảng chính (13 bảng)

| Bảng | Mục đích |
|------|----------|
| `User` | Người dùng (4 vai trò) |
| `ScientificWork` | Đề tài / Công trình NCKH |
| `WorkflowStep` | Các bước quy trình duyệt (auto-generate theo cấp) |
| `Committee` | Hội đồng đánh giá |
| `CommitteeMember` | Thành viên hội đồng |
| `Review` | Phiếu chấm điểm (3 tiêu chí: Đổi mới/Khả thi/Tác động) |
| `FileUpload` | File tải lên + kết quả OCR |
| `Notification` | Thông báo hệ thống |
| `Publication` | Công bố khoa học (OCR → xác nhận → lưu trữ) |
| `LibraryDocument` | Kho lưu trữ số (tìm kiếm, tags, AI score) |
| `Budget` | Ngân sách theo khoa/năm |
| `BudgetTransaction` | Giao dịch giải ngân/phân bổ |
| `Reward` | Khen thưởng (Tiền mặt/Bằng khen/Giấy khen) |

## API Endpoints

### Auth
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/profile` | Thông tin user |

### Công trình khoa học
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/works` | Danh sách (search, filter, paginate) |
| GET | `/api/works/my` | Công trình của tôi |
| POST | `/api/works` | Đăng ký mới |
| GET | `/api/works/:id` | Chi tiết + workflow + reviews |
| PATCH | `/api/works/:id` | Cập nhật / đổi trạng thái |
| GET | `/api/works/:id/workflow` | Quy trình xét duyệt |

### AI
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/ai/upload` | Upload file → OCR → extract |
| POST | `/api/ai/similarity` | Kiểm tra đạo văn |
| POST | `/api/ai/extract-keywords` | Trích xuất từ khóa (TF-IDF) |
| GET | `/api/ai/suggest-experts/:workId` | AI đề xuất phản biện |
| GET | `/api/ai/trends` | Phân tích xu hướng |

### Công bố khoa học
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/publications` | Tạo publication |
| POST | `/api/publications/:id/confirm` | Xác nhận → auto-thêm vào Library |
| GET | `/api/publications` | Danh sách |
| GET | `/api/publications/:id` | Chi tiết |
| PATCH | `/api/publications/:id` | Cập nhật |

### Thư viện số
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/library` | Tìm kiếm, lọc (type, level, tag) |
| GET | `/api/library/stats` | Thống kê, top tags |
| GET | `/api/library/:id` | Chi tiết (auto tăng view count) |

### Kinh phí & Khen thưởng
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/finance/stats` | Dashboard tổng quan |
| POST | `/api/finance/budgets` | Tạo ngân sách (Admin) |
| GET | `/api/finance/budgets` | Danh sách ngân sách |
| POST | `/api/finance/transactions` | Tạo giao dịch (Admin) |
| GET | `/api/finance/transactions` | Danh sách giao dịch |
| PATCH | `/api/finance/transactions/:id/status` | Duyệt/hoàn thành |
| POST | `/api/finance/rewards` | Tạo khen thưởng (Admin) |
| GET | `/api/finance/rewards` | Danh sách khen thưởng |
| PATCH | `/api/finance/rewards/:id/status` | Duyệt/trao thưởng |

### Hội đồng
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/committees` | Tạo hội đồng (Admin) |
| GET | `/api/committees` | Danh sách |
| POST | `/api/committees/review` | Chấm điểm (3 tiêu chí, tổng /100) |

### Dashboard & Notifications
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/dashboard/stats` | Thống kê tổng quan |
| GET | `/api/notifications` | Danh sách thông báo |
| GET | `/api/notifications/count` | Số thông báo chưa đọc |
| PATCH | `/api/notifications/read-all` | Đánh dấu đã đọc |

## Dữ liệu persist

Dữ liệu **KHÔNG mất** khi restart Docker:

```bash
# Dừng
docker compose down

# Start lại - dữ liệu vẫn còn
docker compose up -d
```

Dữ liệu lưu trong Docker named volumes:
- `postgres_data` - Database
- `minio_data` - File uploads

**Chỉ mất dữ liệu khi chạy:**
```bash
docker compose down -v   # ⚠️ -v xóa volumes = MẤT dữ liệu
```

## Cấu trúc thư mục

```
NCKHAI/
├── docker-compose.yml
├── .env
├── README.md
│
├── back-end/              # NestJS API
│   ├── src/
│   │   ├── auth/          # JWT, guards, decorators
│   │   ├── users/         # User CRUD (Admin)
│   │   ├── scientific-works/  # Công trình CRUD + workflow
│   │   ├── ai/            # Proxy to Python AI service
│   │   ├── committees/    # Hội đồng + chấm điểm
│   │   ├── publications/  # Công bố khoa học
│   │   ├── library/       # Kho lưu trữ số
│   │   ├── finance/       # Kinh phí & Khen thưởng
│   │   ├── notifications/ # Thông báo
│   │   ├── dashboard/     # Thống kê
│   │   └── prisma/        # Database service
│   └── prisma/
│       ├── schema.prisma  # Database schema (13 bảng)
│       └── seed.ts        # Demo data
│
├── font-end/              # React Frontend
│   └── src/
│       ├── components/    # Layout, Header, Sidebar, ProtectedRoute
│       ├── contexts/      # AuthContext
│       ├── pages/         # Dashboard, Works, AI, Publications, Library, Finance
│       ├── services/      # API clients (axios)
│       └── types/         # TypeScript types
│
├── ai-service/            # Python AI Service
│   ├── main.py            # FastAPI endpoints
│   ├── ocr_service.py     # Tesseract OCR + bbox
│   ├── nlp_utils.py       # TF-IDF, similarity, keywords
│   ├── llm_client.py      # Ollama / DeepSeek LLM
│   └── minio_client.py    # MinIO S3 client
│
└── scripts/
    └── setup-ollama.sh    # Auto-pull Ollama model
```

## Tech Stack

- **Frontend**: React 19 + Vite 8 + React Router 7 + Axios + Lucide Icons
- **Backend**: NestJS 11 + Prisma 7 + PostgreSQL 15 + JWT + Passport
- **AI**: Python 3.11 + FastAPI + Tesseract OCR + scikit-learn + Ollama
- **Storage**: MinIO (S3-compatible)
- **Infra**: Docker Compose
