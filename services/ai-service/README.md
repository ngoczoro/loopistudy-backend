# Loopi Study AI service

Service gọi model cho Loopi Study: tính embedding và làm cổng gọi Ollama/OpenAI. Backend gọi service này qua HTTP. Service không kết nối database và không chứa logic nghiệp vụ. Hợp đồng API nằm trong [API.md](API.md).

Service chỉ được dùng khi backend có biến `AI_SERVICE_URL`. Khi biến này trống, backend tự làm mọi việc như trước.

## Trạng thái

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Khung service: `/health`, `/info`, xác thực, log, Docker | Xong |
| 2 | `POST /v1/embed` | Xong |
| 3 | `POST /v1/llm/json` | Xong |
| 4 | `POST /v1/llm/chat`, `/v1/llm/chat/stream` | Chưa làm |
| 5 | Hàng đợi Ollama | Chưa làm |

## Chạy

```sh
cd services/ai-service
npm install
cp .env.example .env      # rồi điền AI_SERVICE_KEY
npm run dev               # tự khởi động lại khi sửa code
```

Nên đặt `TRANSFORMERS_CACHE` trùng với thư mục cache của backend (mặc định là `D:/ollama/hf-cache`). Như vậy service dùng lại model e5 đã tải, không phải tải lại khoảng 120 MB.

Kiểm tra service:

```sh
curl http://localhost:5100/health
curl -H "x-internal-key: <AI_SERVICE_KEY>" http://localhost:5100/info
```

Khi service vừa khởi động, `/health` báo `"embedding": { "status": "loading" }` trong vài giây, hoặc lâu hơn nếu phải tải model lần đầu. Trong lúc này, `/v1/embed` trả `MODEL_NOT_READY` và backend tự tìm theo từ khóa. Khi model nạp xong, `/health` chuyển sang `ready`.

## Bật service trong backend

1. Chạy service như trên. Từ giai đoạn 3, `.env` của service cần `OPENAI_API_KEY`, vì khi bật công tắc, quiz và flashcard gọi OpenAI qua service. Các tính năng khác (tóm tắt, AI Plan, ...) vẫn dùng khóa trong `.env` của backend.
2. Kiểm tra vector của service giống vector backend tự tính. Lệnh này chạy ở thư mục gốc backend:
   ```sh
   AI_SERVICE_URL=http://localhost:5100 AI_SERVICE_KEY=<key> node scripts/ai-service/compare-embeddings.mjs
   ```
   Kết quả phải là `PASS`. Khi đó dữ liệu đã index vẫn dùng được, không phải index lại.
3. Thêm vào `.env` của backend rồi khởi động lại backend:
   ```
   AI_SERVICE_URL=http://localhost:5100
   AI_SERVICE_KEY=<cùng khóa với service>
   ```
4. Muốn quay lại như cũ: để trống `AI_SERVICE_URL` rồi khởi động lại backend.

Khi service tắt hoặc lỗi, Ask AI vẫn trả lời bằng tìm kiếm theo từ khóa. Sau 3 lần lỗi liên tiếp, backend ngừng gọi service trong 30 giây để không làm chậm request.

## Test

```sh
npm test
```

Lệnh `npm test` ở thư mục gốc của backend **không** chạy test của service này.

## Docker

```sh
docker build -t loopi-ai-service .
docker run --rm -p 5100:5100 -e AI_SERVICE_KEY=dev-key loopi-ai-service
```

Khi chạy trong Docker, `127.0.0.1` là chính container. Vì vậy, để dùng Ollama cài trên máy thật, đặt `OLLAMA_URL=http://host.docker.internal:11434`.

## Cấu trúc

```
src/
├── server.js            khởi động, tắt êm khi nhận SIGTERM hoặc SIGINT
├── app.js               tạo Express app (test dùng hàm này, không mở cổng)
├── config.js            đọc và kiểm tra biến môi trường
├── status.js            trạng thái embedding và Ollama cho /health
├── errors.js            lỗi theo định dạng { error: { code, message } }
├── logger.js
├── middleware/          xác thực bằng khóa, log request, xử lý lỗi
└── routes/              /health, /info
test/                    jest + supertest
```

Quy tắc: không import gì từ `../../src` của backend. Hai bên chỉ nói chuyện qua HTTP.
