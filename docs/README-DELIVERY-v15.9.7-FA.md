# تحویل RTLX 15.9.7

این نسخه یک hardening release برای قرارداد پیام‌رسانی است.

محتویات تحویل:

- سورس کامل نسخهٔ 15.9.7
- خروجی Chrome/Chromium
- خروجی Edge
- خروجی Firefox Desktop
- خروجی Firefox Android
- گزارش پیاده‌سازی
- لاگ‌های اعتبارسنجی
- SHA-256 همهٔ artifactها

مرز شواهد:

- تست‌های deterministic و transport simulation قابل اجرای محلی‌اند.
- اجرای واقعی هر مرورگر باید جداگانه ثبت شود.
- نبود executable یا policy محیط با `insufficient_evidence` گزارش می‌شود، نه pass.
