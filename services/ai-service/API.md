# AI service: hợp đồng API (v1)

Tài liệu này là hợp đồng giữa **backend** (`loopistudy-backend`) và **AI service** (`services/ai-service`). Code ở hai bên phải làm đúng theo tài liệu này. Muốn đổi hợp đồng thì sửa tài liệu này trước, trong cùng PR với phần code.

## Vai trò

AI service là **cổng gọi model**. Nó chỉ làm 4 việc:

1. Tính embedding (`multilingual-e5-small`).
2. Gọi Ollama.
3. Gọi OpenAI.
4. Xếp hàng các yêu cầu gửi tới Ollama (giai đoạn 5).

AI service **không** kết nối database, **không** biết người dùng là ai, và **không** chứa logic nghiệp vụ. Các việc sau vẫn do backend làm:

- Chọn đoạn tài liệu.
- Kiểm chứng câu hỏi quiz.
- Quyết định thứ tự dự phòng Ollama → OpenAI.
- Phát hiện model từ chối trả lời, làm sạch `[n]`.
- Lưu kết quả.

Service **chỉ gọi đúng provider được yêu cầu** và không tự chuyển sang provider khác. Khi provider lỗi, service trả lỗi, và backend quyết định bước tiếp theo.

## Quy ước chung

| Mục | Giá trị |
|---|---|
| Base URL | Giá trị của `AI_SERVICE_URL`, ví dụ `http://localhost:5100` |
| Định dạng | `Content-Type: application/json`, UTF-8 |
| Giới hạn body | 5 MB |
| Xác thực | Header `x-internal-key: <AI_SERVICE_KEY>`. Bắt buộc với mọi endpoint, trừ `GET /health` |
| Truy vết | Header `x-request-id` (không bắt buộc). Service trả lại đúng giá trị đó, hoặc tự tạo nếu thiếu, và ghi vào log |
| Ưu tiên (giai đoạn 5) | Header `x-priority: chat` hoặc `x-priority: study` (mặc định). `chat` được xếp trước trong hàng đợi Ollama |
| Phiên bản | Đường dẫn bắt đầu bằng `/v1`. Thay đổi phá vỡ tương thích thì dùng `/v2` |

### Định dạng lỗi

Mọi lỗi đều có cùng dạng:

```json
{ "error": { "code": "PROVIDER_TIMEOUT", "message": "Ollama timed out after 45000ms" } }
```

| HTTP | `code` | Khi nào |
|---|---|---|
| 400 | `INVALID_REQUEST` | Body sai định dạng, thiếu trường, vượt giới hạn số lượng |
| 401 | `UNAUTHORIZED` | Thiếu hoặc sai `x-internal-key` |
| 404 | `NOT_FOUND` | Sai đường dẫn |
| 413 | `PAYLOAD_TOO_LARGE` | Body lớn hơn 5 MB |
| 502 | `PROVIDER_ERROR` | Ollama hoặc OpenAI trả lỗi |
| 502 | `INVALID_MODEL_OUTPUT` | Model trả về nội dung không phải JSON hợp lệ (`/v1/llm/json`) |
| 503 | `PROVIDER_NOT_CONFIGURED` | Provider được yêu cầu chưa được cấu hình (ví dụ `OLLAMA_URL` trống, thiếu `OPENAI_API_KEY`) |
| 503 | `MODEL_NOT_READY` | Model embedding đang được nạp hoặc nạp thất bại |
| 503 | `QUEUE_FULL` | Hàng đợi Ollama đã đầy, hoặc ước lượng thời gian chờ không vừa `timeoutMs` (xem "Hàng đợi Ollama"). Có kèm header `Retry-After` (giây) |
| 504 | `PROVIDER_TIMEOUT` | Provider không trả lời trong `timeoutMs` |
| 500 | `INTERNAL` | Lỗi khác |

**Quy tắc cho backend:** mọi lỗi từ service (kể cả lỗi mạng và lỗi vượt thời gian chờ ở phía client) đều được xử lý **như khi provider đó lỗi ở code hiện tại**. Nghĩa là backend chạy tiếp theo thứ tự dự phòng sẵn có. Riêng `QUEUE_FULL` thì backend nên chuyển sang OpenAI ngay, không thử lại Ollama.

**Ngắt mạch ở backend** (`src/shared/ai/aiServiceClient.js`): sau 3 lỗi liên tiếp **của chính service**, backend ngừng gọi service trong 30 giây. Lỗi của chính service gồm: không trả lời, quá thời gian chờ, sai khóa (401), và 5xx có mã `INTERNAL` hoặc không có mã. Các lỗi `PROVIDER_*`, `INVALID_MODEL_OUTPUT`, `MODEL_NOT_READY`, `QUEUE_FULL` và lỗi 4xx **không** được tính. Lý do: khi Ollama chết, service vẫn chạy, nên backend vẫn phải gọi được OpenAI qua service.

---

## `GET /health`

Không cần khóa. Dùng cho Docker healthcheck và để kiểm tra nhanh. Luôn trả **200** khi tiến trình còn chạy. Tình trạng chi tiết nằm trong body.

```json
{
  "status": "ok",
  "uptimeSec": 812,
  "embedding": { "status": "ready", "model": "Xenova/multilingual-e5-small" },
  "ollama": { "status": "up", "model": "qwen2.5:3b" },
  "openai": { "configured": true, "model": "gpt-4.1-mini" },
  "queue": { "running": 1, "waiting": 1, "concurrency": 1, "maxWaiting": 3, "avgWaitMs": 11919, "avgRunMs": 21603 }
}
```

| Trường | Giá trị |
|---|---|
| `status` | `ok` khi embedding đã `ready` và có ít nhất một provider LLM dùng được. Ngược lại là `degraded` |
| `embedding.status` | `idle` (chưa nạp: trước giai đoạn 2, hoặc khi `EMBEDDING_PRELOAD=false` và chưa có lần gọi nào), `loading`, `ready` hoặc `failed` |
| `embedding.model` | Model **đang thực sự được dùng**. Có thể là model dự phòng MiniLM nếu e5 nạp lỗi |
| `ollama.status` | `up`, `down` hoặc `disabled` (khi `OLLAMA_URL` trống). Lấy từ lần kiểm tra gần nhất, kết quả được lưu lại khoảng 10 giây |
| `queue` | Hàng đợi Ollama: số yêu cầu đang chạy và đang chờ, thời gian chờ trung bình của 20 lần gần nhất, thời gian chạy trung bình (`null` khi chưa có lần nào chạy xong) |

## `GET /info`

```json
{
  "version": "1.0.0",
  "embedding": {
    "model": "Xenova/multilingual-e5-small",
    "dimensions": 384,
    "maxTexts": 64,
    "maxCharsPerText": 8000
  },
  "llm": {
    "ollama": { "enabled": true, "model": "qwen2.5:3b" },
    "openai": { "enabled": true, "model": "gpt-4.1-mini" }
  }
}
```

---

## `POST /v1/embed` (giai đoạn 2)

Thay cho `embedTexts` và `embedQuery` trong `src/modules/assistant/assistant.embedding.js`.

**Request**
```json
{ "texts": ["Điện toán đám mây là gì?"], "mode": "query" }
```

| Trường | Kiểu | Ràng buộc |
|---|---|---|
| `texts` | `string[]` | 1 đến 64 phần tử |
| `mode` | `"query"` \| `"passage"` | Bắt buộc. Service tự thêm tiền tố `query: ` hoặc `passage: ` như code hiện tại. Backend **không** tự thêm tiền tố |

Đoạn văn bản dài hơn 8000 ký tự bị cắt bớt (giống `slice(0, 8000)` hiện tại), không báo lỗi.

**Response 200**
```json
{
  "model": "Xenova/multilingual-e5-small",
  "dimensions": 384,
  "vectors": [[0.0123, -0.0456, "..."]]
}
```

- `vectors[i]` tương ứng với `texts[i]`. Mỗi vector đã được chuẩn hóa L2 (độ dài bằng 1).
- `model` là model đã thực sự tính vector. Backend phải lưu đúng giá trị này vào `document_chunks.embedding_model`.
  - Backend lấy tên model từ câu trả lời của service (`getEmbeddingModelName()`), kể cả khi service đang dùng model dự phòng MiniLM. Khi backend tự tính, tên model dự phòng cũng được ghi đúng (đã sửa ở giai đoạn 2).
  - Vector của hai model không so sánh được với nhau.
- **Điều kiện bật công tắc:** vector do service tính và vector do backend tự tính cho cùng một đoạn văn phải có cosine ≥ 0,999.

## `POST /v1/llm/json` (giai đoạn 3)

Thay cho `completeJson` (Ollama, `src/modules/study-material/ollama.js`) và `generateJson` (OpenAI, `src/modules/ai/services/ai.provider.service.js`) **trong luồng tạo quiz và flashcard**.

**Request**
```json
{
  "provider": "ollama",
  "system": "Bạn viết câu hỏi trắc nghiệm...",
  "user": "Đoạn ghi chú: ...",
  "schema": { "type": "object", "properties": { "question": { "type": "string" } }, "required": ["question"] },
  "maxTokens": 400,
  "temperature": 0.4,
  "timeoutMs": 45000
}
```

| Trường | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `provider` | `"ollama"` \| `"openai"` | bắt buộc | Service không tự chuyển sang provider khác |
| `system` | `string` | bắt buộc | |
| `user` | `string` | bắt buộc | |
| `schema` | JSON Schema \| `null` | `null` | Ollama: truyền vào `format`. Khi `null`, dùng `format: "json"`. OpenAI: dùng chế độ JSON object, và schema chỉ để tham khảo |
| `maxTokens` | `number` | 800 | Ollama: `num_predict`. OpenAI: `max_output_tokens` |
| `temperature` | `number` | 0.4 | |
| `timeoutMs` | `number` | 60000 | Tối đa 120000. Tính cả thời gian chờ trong hàng đợi |

**Response 200**
```json
{ "provider": "ollama", "model": "qwen2.5:3b", "json": { "question": "..." }, "durationMs": 18420 }
```

`json` là object đã được parse. Nếu model trả về nội dung không parse được thành JSON, service trả lỗi `INVALID_MODEL_OUTPUT`.

## `POST /v1/llm/chat` (giai đoạn 4)

Gọi không stream, dùng cho `POST /assistant/conversations/:id/messages`.

**Request**
```json
{ "provider": "ollama", "system": "...", "user": "...", "maxTokens": 512, "temperature": 0.2, "timeoutMs": 60000 }
```

**Response 200**
```json
{ "provider": "ollama", "model": "qwen2.5:3b", "content": "Điện toán đám mây là ... [1]", "durationMs": 21000 }
```

`content` là nguyên văn câu trả lời của model. Việc làm sạch `[n]` và phát hiện model từ chối trả lời vẫn do backend làm.

## `POST /v1/llm/chat/stream` (giai đoạn 4)

Request giống `/v1/llm/chat`. Riêng `timeoutMs` ở đây là **thời gian chờ token đầu tiên**.

Response là `text/event-stream` với header `Cache-Control: no-cache` và `X-Accel-Buffering: no`:

```
event: start
data: {"provider":"ollama","model":"qwen2.5:3b"}

event: token
data: {"text":"Điện toán"}

event: token
data: {"text":" đám mây là"}

event: done
data: {"durationMs":21000,"tokens":142}
```

- `start` được gửi **khi token đầu tiên sắp đến**, ngay trước `token` đầu tiên, không gửi lúc vừa nhận request. Nhờ vậy backend giữ nguyên cách gọi `onProvider` hiện tại.
- Lỗi **trước** token đầu tiên: service trả mã HTTP lỗi và body JSON như phần "Định dạng lỗi", không mở stream.
- Provider kết thúc mà không gửi token nào: service trả `502 INVALID_MODEL_OUTPUT` dạng JSON, không mở stream.
- Mặc định của chat: `maxTokens` 512, `temperature` 0.2. Backend gửi 700 token cho OpenAI, giống như trước khi tách.
- Lỗi **sau** khi đã stream: service gửi `event: error` với `data: {"code":"...","message":"..."}`, rồi đóng kết nối. Backend xử lý như lỗi giữa chừng hiện tại: gửi `reset` cho frontend, rồi thử provider tiếp theo.
- **Hủy giữa chừng:** backend đóng kết nối, ví dụ khi người dùng đóng tab. Service phải hủy request tới Ollama hoặc OpenAI ngay lập tức.
- Thời gian chờ giữa hai token (`STREAM_IDLE_TIMEOUT_MS`) vẫn do backend kiểm soát.

---

## Hàng đợi Ollama

Máy chạy Ollama bằng CPU chỉ trả lời được một yêu cầu một lúc, mỗi câu mất khoảng 15–45 giây. Vì vậy, mọi yêu cầu tới Ollama (`/v1/llm/*` với `provider: "ollama"`) đều phải xếp hàng trong service. OpenAI không cần hàng đợi.

- **Số yêu cầu chạy cùng lúc:** `OLLAMA_CONCURRENCY`, mặc định 1.
- **Ưu tiên:** `x-priority: chat` (Ask AI, có người đang chờ trên màn hình) được xếp trước `study` (quiz, flashcard). Hai yêu cầu cùng mức ưu tiên thì ai đến trước được phục vụ trước.
- **Từ chối ngay khi không kịp:** service ước lượng thời gian chờ bằng cách lấy số yêu cầu đứng trước, chia cho `OLLAMA_CONCURRENCY`, nhân với thời gian chạy trung bình (mặc định 30 giây khi chưa có số liệu). Nếu ước lượng ≥ `timeoutMs` của yêu cầu, service trả `QUEUE_FULL` **ngay**, và backend chuyển sang OpenAI mà không phải chờ hết thời gian.
- **Giới hạn cứng:** khi đã có `OLLAMA_MAX_QUEUE` yêu cầu đang chờ, yêu cầu mới bị trả `QUEUE_FULL`.
- **Thời gian chờ được tính vào `timeoutMs`:** chờ quá `timeoutMs` thì trả `PROVIDER_TIMEOUT`. Nếu đã vào lượt, service chỉ còn phần thời gian chưa dùng cho cuộc gọi tới Ollama.
- Backend ngắt kết nối trong lúc đang chờ thì yêu cầu được rút khỏi hàng.
- Với stream, yêu cầu giữ lượt cho tới token cuối cùng.

## Biến môi trường

### Backend (`loopistudy-backend/.env`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `AI_SERVICE_URL` | trống | **Công tắc.** Khi trống, backend tự tính embedding và tự gọi Ollama hoặc OpenAI như hiện tại |
| `AI_SERVICE_KEY` | trống | Khóa gửi trong header `x-internal-key`. Bắt buộc khi đã đặt `AI_SERVICE_URL` |
| `AI_SERVICE_TIMEOUT_MS` | `10000` | Thời gian chờ cho `/v1/embed` khi embed câu hỏi. Khi index tài liệu, backend gửi từng lô 16 đoạn với thời gian chờ 30 giây. Với `/v1/llm/*`, backend dùng `timeoutMs` của từng lần gọi, cộng thêm 5 giây |

### AI service (`services/ai-service/.env`)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `5100` | |
| `AI_SERVICE_KEY` | bắt buộc | Phải trùng với backend. Khi thiếu, service từ chối khởi động |
| `EMBEDDING_MODEL` | `Xenova/multilingual-e5-small` | |
| `TRANSFORMERS_CACHE` | `./.hf-cache` | Thư mục cache model e5 (volume trong Docker) |
| `EMBEDDING_PRELOAD` | `true` | Nạp model ngay khi service khởi động |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Để trống để tắt Ollama |
| `OLLAMA_MODEL` | `qwen2.5:3b` | |
| `OLLAMA_KEEP_ALIVE` | `30m` | |
| `OLLAMA_CONCURRENCY` | `1` | Số yêu cầu Ollama chạy cùng lúc (giai đoạn 5) |
| `OLLAMA_MAX_QUEUE` | `3` | Số yêu cầu chờ tối đa. Vượt quá thì trả `QUEUE_FULL` |
| `OLLAMA_WARMUP` | `true` | Nạp model Ollama vào bộ nhớ khi service khởi động |
| `OPENAI_API_KEY` | trống | Để trống để tắt OpenAI |
| `OPENAI_MODEL` | `gpt-4.1-mini` | |
| `LOG_LEVEL` | `info` | |

Hai khóa `AI_SERVICE_KEY` của backend và service phải giống nhau. Trên production, dùng một chuỗi ngẫu nhiên dài, ví dụ:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Ánh xạ từ code hiện tại

| Code hiện tại (backend) | Endpoint thay thế | Giai đoạn |
|---|---|---|
| `assistant/assistant.embedding.js` → `embedTexts`, `embedQuery` | `POST /v1/embed` | 2 |
| `study-material/ollama.js` → `completeJson` | `POST /v1/llm/json` (`provider: "ollama"`) | 3 |
| `study-material/reasoning-items.js`, `study-items.js` → `generateJson` | `POST /v1/llm/json` (`provider: "openai"`) | 3 |
| `assistant/assistant.llm.js` → gọi Ollama/OpenAI không stream | `POST /v1/llm/chat` | 4 |
| `assistant/assistant.llm.js` → `streamWithOllama`, `streamWithOpenAI` | `POST /v1/llm/chat/stream` | 4 |
| Tóm tắt, AI Plan, gợi ý tài liệu, tìm kiếm tài liệu (`generateJson`) | Giữ nguyên, có thể chuyển ở giai đoạn 9 | 9 |
