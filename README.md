# NCKH AI - Hệ thống Quản lý Công trình Khoa học cho Trường Đại học

> Đề tài: **Xây dựng phần mềm quản lý công trình khoa học cho trường đại học**, tích hợp AI hỗ trợ OCR, kiểm tra đạo văn, đề xuất phản biện.

## Kiến trúc hệ thống

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  Python AI   │────▶│   Ollama     │
│  React/Vite  │     │   NestJS     │     │   FastAPI    │     │  LLM Local   │
│  :5173       │     │   :3000      │     │   :8000      │     │  :11434      │
└──────────────┘     └──────┬───────┘     └──────┬───────┘     └──────────────┘
                            │                     │
                     ┌──────▼───────┐     ┌──────▼───────┐
                     │  PostgreSQL  │     │    MinIO      │
                     │   :5433      │     │  :9000/:9001  │
                     └──────────────┘     └──────────────┘
```

| Service | Công nghệ | Vai trò |
|---------|-----------|---------|
| **Frontend** | React 19, Vite, React Router, Axios | Giao diện người dùng |
| **Backend** | NestJS 11, Prisma 7, PostgreSQL, JWT | API, auth, business logic |
| **AI Service** | FastAPI, Tesseract OCR, scikit-learn | OCR, NLP, similarity |
| **Ollama** | qwen2.5:3b (local LLM) | Tóm tắt, trích xuất AI, chatbot |
| **MinIO** | S3-compatible object storage | Lưu trữ file upload |
| **PostgreSQL** | Database | Cơ sở dữ liệu |

## Yêu cầu

- **Docker Desktop** (bắt buộc)
- **RAM**: tối thiểu 8GB (khuyến nghị 16GB nếu dùng Ollama)
- **Disk**: ~5GB cho Docker images + models

## Cài đặt & Chạy

### 1. Clone repo

```bash
git clone https://github.com/Hieppppp/NCKHAI.git
cd NCKHAI
```

### 2. Chạy Docker

```bash
# Build và start tất cả services
docker compose up -d

# Xem logs
docker compose logs -f

# Xem trạng thái
docker compose ps
```

### 3. Chạy migration & seed dữ liệu mẫu

```bash
# Chạy migration
docker compose run --rm --entrypoint="" \
  -e DATABASE_URL="postgresql://nckhai:nckhai_secret@db:5432/nckhai_db?schema=public" \
  back-end npx prisma migrate deploy

# Seed dữ liệu demo
docker compose run --rm --entrypoint="" \
  -e DATABASE_URL="postgresql://nckhai:nckhai_secret@db:5432/nckhai_db?schema=public" \
  back-end npx prisma db seed
```

### 4. (Tùy chọn) Pull model Ollama cho AI LLM

```bash
# Pull model nhẹ cho laptop sinh viên (~2GB)
docker exec nckhai-ollama ollama pull qwen2.5:3b

# Hoặc model siêu nhẹ (~1.6GB)
docker exec nckhai-ollama ollama pull gemma2:2b
```

### 5. Truy cập

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:3000/api |
| **AI Service** | http://localhost:8000/health |
| **MinIO Console** | http://localhost:9001 |
| **Ollama** | http://localhost:11434 |

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
- ✅ Đăng ký, đăng nhập, phân quyền (Admin / Reviewer / Lecturer / Student)
- ✅ Quản lý người dùng (Admin CRUD, gán vai trò)
- ✅ Quản lý công trình khoa học (CRUD, tìm kiếm, lọc)
- ✅ Quy trình xét duyệt tự động (Workflow engine theo cấp: Trường / Bộ / Nhà nước)
- ✅ Hội đồng khoa học (tạo hội đồng, phân công, chấm điểm)
- ✅ Hệ thống thông báo (in-app notifications)
- ✅ Dashboard thống kê real-time

### AI Features
- ✅ **OCR** - Tesseract (tiếng Việt + Anh) với bounding box annotation
- ✅ **PDF Extract** - PyPDF2 text + pdf2image cho scanned PDF
- ✅ **Trích xuất metadata** - Tự động tìm title, authors, abstract, keywords
- ✅ **Kiểm tra đạo văn** - Cosine similarity (TF-IDF) so với kho nội bộ
- ✅ **Đề xuất phản biện** - Matching chuyên gia dựa trên keyword + similarity
- ✅ **Xu hướng nghiên cứu** - Phân tích keyword frequency, phân bố loại/cấp
- ✅ **LLM local** - Ollama (qwen2.5:3b) cho tóm tắt, chatbot, smart extraction
- ✅ **Upload MinIO** - Lưu file S3-compatible, presigned URL download

### Phân quyền

| Vai trò | Quyền |
|---------|-------|
| **ADMIN** | Toàn quyền + quản lý users + đổi trạng thái workflow |
| **REVIEWER** | Xem + đánh giá + chấm điểm hội đồng |
| **LECTURER** | Đăng ký đề tài + upload + xem |
| **STUDENT** | Đăng ký đề tài + upload + xem (mặc định khi đăng ký) |

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
| POST | `/api/ai/upload` | Upload file → OCR → extract (bbox + annotation) |
| POST | `/api/ai/similarity` | Kiểm tra đạo văn |
| POST | `/api/ai/extract-keywords` | Trích xuất từ khóa (TF-IDF) |
| GET | `/api/ai/suggest-experts/:workId` | AI đề xuất phản biện |
| GET | `/api/ai/trends` | Phân tích xu hướng |

### Hội đồng
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/committees` | Tạo hội đồng (Admin) |
| GET | `/api/committees` | Danh sách |
| POST | `/api/committees/review` | Chấm điểm |

### Dashboard & Notifications
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/dashboard/stats` | Thống kê tổng quan |
| GET | `/api/notifications` | Danh sách thông báo |
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
- `ollama_data` - AI model cache

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
│   │   ├── notifications/ # Thông báo
│   │   ├── dashboard/     # Thống kê
│   │   └── prisma/        # Database service
│   └── prisma/
│       ├── schema.prisma  # Database schema
│       └── seed.ts        # Demo data
│
├── font-end/              # React Frontend
│   └── src/
│       ├── components/    # Layout, Header, Sidebar, ProtectedRoute
│       ├── contexts/      # AuthContext
│       ├── pages/         # Dashboard, Works, AI, Auth, Admin
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

## Lệnh thường dùng

```bash
# Start
docker compose up -d

# Stop (giữ dữ liệu)
docker compose down

# Xem logs
docker compose logs -f back-end
docker compose logs -f ai-service

# Rebuild sau khi sửa code
docker compose up -d --build

# Vào container chạy lệnh
docker compose exec back-end sh
docker compose exec ai-service sh

# Reset database (⚠️ mất dữ liệu)
docker compose run --rm --entrypoint="" \
  -e DATABASE_URL="postgresql://nckhai:nckhai_secret@db:5432/nckhai_db?schema=public" \
  back-end npx prisma migrate reset --force
```

## Tech Stack

- **Frontend**: React 19 + Vite 8 + React Router 7 + Axios + Lucide Icons
- **Backend**: NestJS 11 + Prisma 7 + PostgreSQL 15 + JWT + Passport
- **AI**: Python 3.11 + FastAPI + Tesseract OCR + scikit-learn + Ollama
- **Storage**: MinIO (S3-compatible)
- **Infra**: Docker Compose
