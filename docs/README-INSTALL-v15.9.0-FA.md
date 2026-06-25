# راهنمای نصب RTLX 15.9.0

## نصب روی Chrome یا Edge

1. بستهٔ `RTLX-v15.9.0-UNPACKED-INSTALL.zip` را استخراج کنید.
2. در Chrome نشانی `chrome://extensions` و در Edge نشانی `edge://extensions` را باز کنید.
3. گزینهٔ **Developer mode** را فعال کنید.
4. روی **Load unpacked** بزنید.
5. برای Chrome پوشهٔ `LOAD-UNPACKED-CHROMIUM` و برای Edge پوشهٔ `LOAD-UNPACKED-EDGE` را انتخاب کنید. فایل `manifest.json` باید مستقیماً داخل همان پوشه باشد.
6. نسخهٔ نمایش‌داده‌شده را کنترل کنید: `15.9.0`.

## نصب روی Firefox Desktop

1. بستهٔ `rtlx-firefox-15.9.0.zip` را استخراج کنید.
2. برای آزمایش موقت، `about:debugging#/runtime/this-firefox` را باز کنید.
3. **Load Temporary Add-on** را انتخاب و فایل `manifest.json` را باز کنید.

این روش نصب موقت است و پس از بستن Firefox ممکن است نیاز به بارگذاری مجدد داشته باشد.

## تعویض نسخهٔ قبلی

برای جلوگیری از اشتباه در Evidence:

1. نسخهٔ قبلی Unpacked را Remove کنید.
2. پوشهٔ جدید را از مسیر جداگانه Load کنید.
3. صفحهٔ هدف را Reload کنید.
4. در گزارش مشکل، `extensionVersion`، `processorVersion` و `provenance.buildInputHash` را کنترل کنید.

## گرفتن گزارش قابل ارزیابی

گزارش نهایی را زمانی بگیرید که Popup وضعیت Capture را آماده نشان می‌دهد. در JSON باید این وضعیت وجود داشته باشد:

```json
{
  "captureReadiness": {
    "status": "ready",
    "certificationEligible": true,
    "reasonCodes": []
  }
}
```

گزارش `partial` یا `blocked` برای خطایابی مفید است، اما مدرک نهایی پوشش کامل نیست.

## حریم خصوصی

گزارش خودکار شامل متن صفحه، URL کامل، Query، Fragment، Cookie، Local Storage، Form Value، Network Capture یا Screenshot نیست. Screenshot قبل و بعد فقط باید به‌صورت دستی و پس از بازبینی اطلاعات خصوصی تهیه شود.
