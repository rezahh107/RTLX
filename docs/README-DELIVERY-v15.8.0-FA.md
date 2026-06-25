# راهنمای بسته تحویل RTLX v15.8.0

## وضعیت تحویل

```text
PHASE_B_COMPLETE_WITH_EXTERNAL_INSUFFICIENT_EVIDENCE
```

پیاده‌سازی، تست‌های واحد و synthetic fixture، و smoke واقعی Chromium تکمیل شده‌اند. رفع کامل بصری در همان صفحه واقعی Qwen و رفتار composer واقعی Claude هنوز باید با بسته تحویلی دوباره آزمایش شود.

## تغییر معماری اصلی

نسخه 15.8.0 pipeline را از این مدل:

```text
Semantic Region
→ One Direction Target
```

به این مدل ارتقا می‌دهد:

```text
Semantic Region
→ Ordered Text Blocks
→ Per-Block Classification
→ Per-Block Direction + Alignment
→ Bounded Typography Continuation
→ Coverage-Aware Verification
```

این تغییر rewrite کامل نیست. permission model، scheduler، MutationObserver، ownership هیبریدی، journal/rollback، profile boundaries و privacy policy حفظ شده‌اند.

## اصلاحات اصلی

- افزودن Text Block Enumerator دترمینیستیک؛
- پردازش مستقل heading، paragraph، list item، blockquote، definition item، caption و table cell؛
- جلوگیری از duplicate mutation در nested blockها؛
- تفکیک direction target از alignment target؛
- جلوگیری از alignment روی `span` و سایر inline targetها؛
- استفاده از `text-align: start` منطقی همراه با `dir` همان block؛
- continuation واقعی typography بعد از هر slice پنجاه Text Node؛
- verification مبتنی بر coverage؛
- تفکیک semantic region، text block، direction target و alignment target در diagnostics؛
- ثبت unique redirect counts، continuation و skip reasons؛
- precedence دترمینیستیک profile categoryها؛
- تبدیل editor ruleهای عمومی سایت‌های گفت‌وگویی از `force-ltr` به `preserve`؛
- حفظ code/terminal protection؛
- fixtureهای structured Markdown، بیش از 50 Text Node، nested blocks و icon geometry.

## اعتبارسنجی

| بررسی                            |                       نتیجه |
| -------------------------------- | --------------------------: |
| Format                           |                        Pass |
| TypeScript                       |                        Pass |
| ESLint                           | صفر خطا، 63 هشدار بررسی‌شده |
| Warning audit                    |                        Pass |
| Schema/Profile validation        |                        Pass |
| تست‌ها                           |            90 فایل، 249 تست |
| Statements coverage              |                      86.01% |
| Branch coverage                  |                      75.87% |
| Function coverage                |                      91.39% |
| Line coverage                    |                      87.12% |
| Chromium runtime smoke           |                        Pass |
| Structured multi-block smoke     |                        Pass |
| 121-node typography continuation |                        Pass |
| Layout/icon geometry             |                        Pass |
| Rollback                         |                        Pass |
| Security scan                    |                        Pass |
| Production audit                 |              صفر آسیب‌پذیری |
| Deterministic browser packaging  |                        Pass |

## شواهد کنترل‌شده Runtime

```yaml
textBlocksDiscovered: 8
textBlocksProcessed: 8
typographyContinuationsQueued: 5
typographyContinuationsPending: 0
ownedTypographyTargets: 130
verificationFailures: 0
```

## موارد عمداً اضافه‌نشده

CSS Custom Highlight API در این نسخه اضافه نشده است. این API یک قابلیت اختیاری برای نمایش بصری diagnostics است و نبود آن defect جهت یا typography محسوب نمی‌شود.

## شکاف‌های شواهد خارجی

```yaml
qwen_same_conversation_15_8_0: insufficient_evidence
claude_real_composer: insufficient_evidence
deepseek_same_conversation_15_8_0: insufficient_evidence
chromium_exact_release_zip: blocked_by_administrator_policy
edge_exact_release_zip: executable_unavailable
firefox_exact_release_zip: executable_unavailable
firefox_android: device_or_emulator_unavailable
```

## محتویات بسته کامل

- بسته نصب مستقیم Chromium/Edge؛
- چهار بسته مرورگر؛
- سورس Font-Sanitized؛
- گزارش کامل پیاده‌سازی Markdown و JSON؛
- بسته evidence و logها؛
- patch نسخه 15.7.3 به 15.8.0؛
- راهنمای نصب و تحویل فارسی؛
- SHA-256 manifest.
