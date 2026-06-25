# راهنمای نصب RTLX v15.8.1

## انتخاب بسته

- Chrome/Chromium: `rtlx-chromium-15.8.1.zip`
- Microsoft Edge: `rtlx-edge-15.8.1.zip`
- Firefox Desktop: `rtlx-firefox-15.8.1.zip`
- Firefox Android: `rtlx-firefox-android-15.8.1.zip`
- بسته همه پوشه‌های unpacked: `RTLX-v15.8.1-UNPACKED-INSTALL.zip`

## Chrome و Edge

1. ZIP مرورگر را استخراج کنید.
2. صفحه مدیریت Extensionها را باز کنید.
3. Developer mode را روشن کنید.
4. گزینه **Load unpacked** را بزنید.
5. پوشه استخراج‌شده را انتخاب کنید.
6. نسخه نمایش‌داده‌شده باید `15.8.1` باشد.
7. دسترسی هر سایت را فقط هنگام نیاز و با اقدام کاربر تأیید کنید.

## Firefox Desktop

1. ZIP Firefox را استخراج کنید.
2. برای نصب موقت، `about:debugging` را باز کنید.
3. **This Firefox → Load Temporary Add-on** را انتخاب کنید.
4. فایل `manifest.json` را انتخاب کنید.

نصب دائمی به بسته امضاشده Mozilla نیاز دارد؛ در این تحویل امضای فروشگاه اجرا نشده و وضعیت آن `insufficient_evidence` است.

## بررسی سلامت

پس از بازکردن صفحه هدف، popup افزونه را باز کنید و Runtime Snapshot بگیرید. در حالت آرام، صف‌ها و continuationهای pending باید صفر باشند. گزارش شامل متن صفحه، URL کامل، cookie، localStorage یا داده شبکه نیست.

## بازگشت به نسخه قبل

15.8.1 را غیرفعال یا حذف کنید و بسته 15.8.0 را دوباره بارگذاری کنید. Migration ذخیره‌سازی وجود ندارد.
