# راهنمای بسته تحویل RTLX v15.8.1

## محتوای اصلی

- سورس کامل font-sanitized؛
- بسته unpacked نصب؛
- بسته‌های Chromium، Edge، Firefox Desktop و Firefox Android؛
- patch از 15.8.0 به 15.8.1؛
- گزارش پیاده‌سازی Markdown و JSON؛
- Evidence ZIP شامل logها و گزارش‌های machine-readable؛
- راهنمای نصب و تحویل فارسی؛
- component manifest و manifest نهایی SHA-256.

## اعتبارسنجی هش

ابتدا `RTLX-v15.8.1-SHA256-MANIFEST.json` را باز کنید. برای هر فایل، مسیر، اندازه و SHA-256 را با فایل واقعی مقایسه کنید. verifier داخل سورس، فایل مفقود، اضافی، تکراری، تغییر اندازه و تغییر محتوا را رد می‌کند.

## وضعیت شواهد

آزمون‌های محلی و synthetic فقط همان رفتارهایی را اثبات می‌کنند که اجرا شده‌اند. گزارش‌های external با `status: not_run`، `evidenceState: insufficient_evidence` و Exit Code `2` عمداً موفق تلقی نمی‌شوند.

گزارش واقعی Qwen موجود در handoff مربوط به 15.8.0 است و فقط baseline تاریخی است؛ اثبات runtime نسخه 15.8.1 محسوب نمی‌شود.
