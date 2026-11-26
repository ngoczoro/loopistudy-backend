# Đo tải

`baseline.mjs` kiểm tra một câu hỏi: **khi nhiều người cùng hỏi Ask AI, các API thường có bị chậm theo không?**

Script chạy hai pha:

1. **idle:** chỉ gọi `GET /subjects` liên tục trong `IDLE_SECONDS` giây.
2. **ai-load:** gửi `ASK_USERS` câu hỏi Ask AI cùng lúc (dạng stream). Trong lúc chờ các câu trả lời, `GET /subjects` vẫn được gọi liên tục.

Kết quả được in ra màn hình và lưu vào `scripts/load/results/<LABEL>-<thời điểm>.json`.

## Chuẩn bị

- Backend đang chạy, và Ollama đang chạy nếu muốn đo với Ollama.
- Một tài khoản đã có ít nhất một tài liệu được index xong. Không nên dùng tài khoản thật: script tạo `ASK_USERS` cuộc hội thoại rồi xóa chúng khi chạy xong.

## Chạy

```sh
# PowerShell
$env:LOAD_EMAIL="test@loopi.com"; $env:LOAD_PASSWORD="..."; npm run load:baseline

# bash
LOAD_EMAIL=test@loopi.com LOAD_PASSWORD=... npm run load:baseline
```

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `BASE_URL` | `http://localhost:5000/api/v1` | |
| `ASK_USERS` | `5` | Số câu hỏi Ask AI gửi cùng lúc |
| `IDLE_SECONDS` | `20` | Thời gian của pha idle |
| `LIGHT_CONCURRENCY` | `2` | Số luồng gọi `GET /subjects` song song |
| `LOAD_QUESTION` | `Tóm tắt ý chính của tài liệu này.` | Nên chọn câu hỏi có câu trả lời trong tài liệu của tài khoản test |
| `ASK_TIMEOUT_MS` | `180000` | Thời gian chờ tối đa cho mỗi câu trả lời |
| `LABEL` | `baseline` | Tiền tố tên file kết quả, ví dụ `before-split`, `after-split` |

Mỗi lần login được tính vào giới hạn 20 lần mỗi 15 phút của `/auth/login`.

## Đọc kết quả

- **`GET /subjects` p50/p95 (ms):** so sánh `idle` với `during Ask AI`. Nếu `during Ask AI` cao hơn rõ rệt, nghĩa là phần AI đang làm chậm backend.
- **`firstTokenMs`:** thời gian người dùng chờ đến khi thấy chữ đầu tiên.
- **`provider`:** cho biết model nào đã trả lời:
  - `ollama:qwen2.5:3b` hoặc `openai:...`: câu trả lời do model viết.
  - `extractive`: không có model nào trả lời được, câu trả lời là các trích đoạn từ tài liệu.
- **`resets`:** số lần một provider bị bỏ giữa chừng để chuyển sang provider tiếp theo.

## So sánh trước và sau khi tách

1. Chạy với `LABEL=before-split` khi chưa đặt `AI_SERVICE_URL`.
2. Chạy với `LABEL=after-split` sau khi bật AI service.
3. Hai lần đo phải dùng cùng máy, cùng tài khoản, cùng câu hỏi và cùng `ASK_USERS`. Nên chạy mỗi cấu hình 2–3 lần.
