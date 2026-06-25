# راهنمای بستهٔ تحویل RTLX 15.9.2

## هدف نسخه

این نسخه فقط هفت مشکل تأییدشده در گزارش‌های واقعی Qwen و ChatGPT را اصلاح می‌کند: inherited `dir="auto"`، تشخیص نادرست `already-correct`، continuation یتیم، ناسازگاری coverage، health سخت‌گیرانهٔ Profile، حذف Selection در SPA، و گزارش بلااستفادهٔ Tab مخفی.

## فایل‌های اصلی

- `RTLX-v15.9.2-NEXT-DELIVERY.zip`: تحویل کامل؛
- `RTLX-v15.9.2-UNPACKED-INSTALL.zip`: پوشه‌های Load unpacked؛
- `rtlx-*-15.9.2.zip`: بسته‌های چهار هدف مرورگر؛
- `rtlx-v15.9.2-font-sanitized-source.zip`: سورس بدون باینری فونت؛
- `RTLX-v15.9.2-IMPLEMENTATION-REPORT.md/.json`: گزارش اجرا و فایل‌های تغییرکرده؛
- `RTLX-v15.9.2-EVIDENCE.zip`: لاگ‌ها و شواهد محلی؛
- `RTLX-v15.9.2-SHA256-MANIFEST.json`: هش تحویل نهایی.

## مرز ادعا

عبور Gateهای محلی به معنی اثبات بهبود بصری روی سایت واقعی نیست. نتیجهٔ live-site برای Artifact نهایی 15.9.2 تا اجرای Capture تمیز، Visible و عنصرمحور در وضعیت `insufficient_evidence` باقی می‌ماند.
