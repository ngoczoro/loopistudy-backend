# Loopi Study AI service

Service gọi model cho Loopi Study: tính embedding và làm cổng gọi Ollama/OpenAI. Backend gọi service này qua HTTP. Service không kết nối database và không chứa logic nghiệp vụ. Hợp đồng API nằm trong [API.md](API.md).

Service chỉ được dùng khi backend có biến `AI_SERVICE_URL`. Khi biến này trống, backend tự làm mọi việc như trước.

## Trạng thái

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Khung service: `/health`, `/info`, xác thực, log, Docker | Xong |
| 2 | `POST /v1/embed` | Chưa làm |
| 3 | `POST /v1/llm/json` | Chưa làm |
| 4 | `POST /v1/llm/chat`, `/v1/llm/chat/stream` | Chưa làm |
| 5 | Hàng đợi Ollama | Chưa làm |

## Chạy

```sh
cd services/ai-service
npm install
cp .env.example .env      # rồi điền AI_SERVICE_KEY
npm run dev               # tự khởi động lại khi sửa code
```

Kiểm tra service:

```sh
curl http://localhost:5100/health
curl -H "x-internal-key: <AI_SERVICE_KEY>" http://localhost:5100/info
```

Khi chưa có giai đoạn 2, `/health` luôn báo `"status": "degraded"`, vì model embedding chưa được nạp (`"embedding": { "status": "idle" }`).

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
