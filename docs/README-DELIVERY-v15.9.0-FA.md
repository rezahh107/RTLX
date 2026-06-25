# راهنمای بستهٔ تحویل RTLX 15.9.0

## وضعیت

```yaml
version: 15.9.0
release_classification: effectiveness_and_streaming_resilience
implementation_status: implemented
local_verification: executed
real_site_15_9_0_effectiveness: insufficient_evidence
production_ready_claim: false
```

## مهم‌ترین تغییرها

- تجمیع Rootهای تکراری و تو‌در‌توی Streaming؛
- Flush پیش از Reject در مرز ظرفیت؛
- حفظ Rootها در صورت شکست Flush؛
- یک Failure برای هر Overflow Episode؛
- Recovery شرطی پس از سکون واقعی Runtime؛
- Capture Readiness صریح؛
- Build-input hash و Profile hash در Runtime Evidence؛
- Runtime Snapshot schema `1.8.0`.

## تصمیم محافظه‌کارانهٔ Profile

Profile اختصاصی Claude تغییر داده نشد، زیرا Selectorهای پایدار DOM با Evidence واقعی و کنترل‌شده اثبات نشده‌اند. این تصمیم از واردکردن Selector حدسی و ایجاد Regression جلوگیری می‌کند.

## فایل‌های تحویلی مورد انتظار

- بسته‌های Chromium، Edge، Firefox Desktop و Firefox Android؛
- Source Package بدون Fontهای دارای وضعیت توزیع تأییدنشده؛
- Unpacked Install؛
- Implementation Report در قالب Markdown و JSON؛
- Evidence Package شامل Logهای اجرای Gateها؛
- Manifestهای path/size/SHA-256؛
- Patch نسخهٔ 15.8.1 به 15.9.0؛
- بستهٔ کامل Next Delivery.

## محدودیت اعتبارسنجی

گزارش Qwen نسخهٔ 15.8.1 و هر گزارش تاریخی Claude، مدرک اجرای 15.9.0 نیست. برای پذیرش Effectiveness باید Corpus جدید 15.9.0 روی سایت واقعی تولید شود.
