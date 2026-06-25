# راهنمای نصب RTLX v15.8.0

## بسته پیشنهادی برای نصب شخصی

از فایل زیر استفاده کنید:

```text
RTLX-v15.8.0-UNPACKED-INSTALL.zip
```

این بسته شامل پوشه‌های آمادهٔ Load unpacked برای Chromium و Edge و راهنمای همین نسخه است.

## ارتقا از نسخه قبلی

1. ابتدا از تنظیمات فعلی افزونه در صورت نیاز یادداشت یا نسخه پشتیبان تهیه کنید.
2. به صفحه مدیریت افزونه‌ها بروید:
   - Edge: `edge://extensions`
   - Chrome/Chromium: `chrome://extensions`
3. حالت Developer mode را روشن کنید.
4. افزونه RTLX قبلی را غیرفعال کنید. برای حفظ امکان rollback، آن را تا پایان آزمایش حذف نکنید.
5. فایل ZIP نصب مستقیم را استخراج کنید.
6. گزینه **Load unpacked** را بزنید.
7. پوشه متناسب با مرورگر را انتخاب کنید:
   - `LOAD-UNPACKED-EDGE`
   - `LOAD-UNPACKED-CHROMIUM`
8. نسخه نمایش‌داده‌شده را بررسی کنید؛ باید `15.8.0` باشد.
9. سایت هدف را refresh کنید و RTLX را برای همان سایت فعال کنید.

## آزمون پیشنهادی Qwen

برای بررسی مشکل قبلی، همان گفت‌وگوی طولانی Qwen را باز کنید و این موارد را کنترل کنید:

- عنوان‌ها، پاراگراف‌ها، فهرست‌ها و نقل‌قول‌های فارسی همگی RTL و راست‌چین باشند؛
- فونت انتخابی فارسی در تمام بلوک‌های طبیعی فارسی یکنواخت باشد؛
- inline code و code chipها monospace/LTR باقی بمانند؛
- آیکون‌های action row دیده شوند و جابه‌جا نشوند؛
- containerهای flex/grid اصلی صفحه جهت اجباری نگیرند؛
- پس از پایان پردازش، در گزارش `typographyContinuationsPending` برابر صفر باشد.

## آزمون composer

در ChatGPT، Claude، Gemini یا سایت مشابه این ورودی‌ها را امتحان کنید:

```text
متن کاملاً فارسی
English-only text
متن فارسی همراه https://example.com
فارسی + punctuation (API v2.0)
متن فارسی چندخطی
```

نسخه 15.8.0 رفتار پیش‌فرض editorهای عمومی را preserve می‌کند و دیگر برای `[contenteditable]` یا `[role="textbox"]` عمومی `force-ltr` اعمال نمی‌کند.

## Rollback

در صورت مشاهده مشکل:

1. نسخه 15.8.0 را غیرفعال کنید.
2. نسخه قبلی را دوباره فعال کنید.
3. صفحه هدف را refresh کنید.
4. گزارش خطای privacy-safe RTLX را همراه با screenshot ارسال کنید.

## نکات امنیتی

- این نسخه permission جدیدی اضافه نمی‌کند.
- متن صفحه، URL کامل، داده فرم، cookie، localStorage، screenshot یا network capture به‌طور خودکار جمع‌آوری یا ارسال نمی‌شود.
- هیچ upload خودکاری انجام نمی‌شود.

## وضعیت اعتبارسنجی

- 249 تست: Pass
- Chromium content-runtime smoke: Pass
- structured multi-block smoke: Pass
- typography continuation با 121 target: Pass
- icon/layout geometry smoke: Pass
- Production audit: صفر آسیب‌پذیری

اجرای دقیق همین بسته روی همان صفحه واقعی Qwen، Claude، Firefox و Firefox Android هنوز نیازمند آزمون خارجی است و با وضعیت `insufficient_evidence` گزارش شده است.
