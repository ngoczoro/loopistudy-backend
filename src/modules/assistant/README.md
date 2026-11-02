# Ask AI (assistant RAG)

Module chatbot hỏi đáp trên note/file của chính người dùng. Index và tìm kiếm chạy trong backend. Sinh câu trả lời theo thứ tự: Ollama local, rồi OpenAI, cuối cùng là trả trích đoạn.

Contract FE: `loopi-study-web/docs/api-contract-assistant.md`.

## Yêu cầu

- Node 18+
- Postgres (schema `learning_app`)
- Backend đã chạy migration `023_assistant_rag`
- (Khuyến nghị) Ollama + model `qwen2.5:3b` để trả lời local

## Cài Ollama (Windows) cho thành viên nhóm

1. Tải và cài Ollama: https://ollama.com/download/windows
2. Đặt thư mục model sang ổ D (tránh đầy ổ C):

```powershell
mkdir D:\ollama\models -Force
[System.Environment]::SetEnvironmentVariable("OLLAMA_MODELS", "D:\ollama\models", "User")
```

3. Đóng PowerShell, mở lại. Quit Ollama rồi mở lại app Ollama.
4. Kiểm tra:

```powershell
echo $env:OLLAMA_MODELS
ollama --version
```

5. Tải model (cần mạng ổn định, khoảng 1.9GB):

```powershell
ollama pull qwen2.5:3b
ollama list
```

6. Thử nhanh:

```powershell
ollama run qwen2.5:3b "Xin chào, trả lời ngắn bằng tiếng Việt"
```

Nếu `ollama pull` bị EOF do mạng: chạy lại cùng lệnh, hoặc dùng hotspot. Không cài được Ollama vẫn dùng Ask AI được (OpenAI hoặc trích đoạn).

## Biến môi trường (.env)

```env
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:3b
OLLAMA_TIMEOUT_MS=60000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_ASSISTANT_TIMEOUT_MS=30000
ASSISTANT_EMBEDDING_MODEL=Xenova/multilingual-e5-small
TRANSFORMERS_CACHE=D:/ollama/hf-cache
ASSISTANT_INDEX_ENABLED=true
ASSISTANT_INDEX_INTERVAL_MS=30000
```

- Để trống `OLLAMA_URL` nếu máy không chạy Ollama.
- Để trống `OPENAI_API_KEY` nếu không dùng OpenAI; hệ thống sẽ trích đoạn từ tài liệu.
- Embedding đa ngữ (`multilingual-e5-small`, ~118MB) nằm trong `TRANSFORMERS_CACHE`. Lần đầu tải model cần mạng; file ONNX hỏng/thiếu sẽ khiến Ask AI chỉ còn keyword (hỏi EN trên tài liệu VI dễ `not_found`). Worker tự backfill embedding khi model đã sẵn sàng.

Xem mẫu đầy đủ trong `.env.example`.

## Chạy backend

```bash
npm run db:migrate
npm run dev
```

Khi start sẽ thấy dòng: `Assistant index worker started`. Worker mỗi 30 giây (và ngay sau boot) index note/file chưa index.

## API chính

Base: `/api/v1/assistant` (cần Bearer token)

- `GET /sources` — note/file + `indexStatus`
- `GET|POST /conversations`
- `PATCH|DELETE /conversations/:id`
- `GET|POST /conversations/:id/messages`

Scope khi tạo/sửa conversation:

```json
{ "type": "all" }
{ "type": "subject", "subjectId": "..." }
{ "type": "documents", "documentIds": ["...", "..."] }
```

## Luồng RAG

1. Tạo/sửa note hoặc upload file -> xếp hàng index.
2. Worker trích chữ, chia đoạn, lưu `document_chunks` (và embedding nếu tải được model).
3. Khi hỏi: lọc `userId` + scope -> tìm đoạn liên quan -> sinh câu trả lời:
   - Ollama (nếu có)
   - OpenAI (nếu Ollama lỗi / không cấu hình)
   - Trích đoạn kèm `[n]`
4. Xóa note/file -> xóa chunk/index tương ứng. Worker cũng dọn dữ liệu còn sót sau soft-delete.

## Trạng thái index

| status | Ý nghĩa |
| --- | --- |
| `indexed` | Hỏi được |
| `indexing` | Đang xử lý |
| `stale` | Tài liệu vừa sửa; vẫn trả lời trên bản cũ trong khi index lại |
| `not_indexed` | Chờ worker |
| `failed` | Lỗi sau nhiều lần thử |
| `unsupported` | Ảnh, link, file không trích được chữ |

## FE

Đặt `VITE_USE_MOCKS=false` trong `.env.local` của `loopi-study-web`, restart Vite, mở trang Ask AI.

Chỉ hỏi được nội dung đã `indexed`. Đợi worker chạy xong (khoảng 30-60 giây sau khi tạo/sửa tài liệu) rồi mới test.

## Test

```bash
npm test -- src/modules/assistant
```

## Lưu ý deploy

- Ollama chỉ cần trên máy chạy backend / AI service; người dùng chỉ cần mở web.
- Hosting thiếu RAM: tắt Ollama (`OLLAMA_URL=`), dùng OpenAI hoặc trích đoạn.
- Sau này tách microservice: bóc module `assistant` thành service riêng; FE vẫn gọi qua backend chính.
