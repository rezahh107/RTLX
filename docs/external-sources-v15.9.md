# RTLX 15.9.0 External Engineering Sources

These sources inform the engineering proposal but do not override RTLX contracts or prove site-specific runtime behavior.

## Chrome for Developers

- `Use scheduler.yield() to break up long tasks`, published 2025-03-06.
  - URL: https://developer.chrome.com/blog/use-scheduler-yield
  - Relevant points: bounded task slicing, prioritized continuation, feature detection, and fallback for non-Chromium environments.
- `Best practices to render streamed LLM responses`, published 2025-01-21.
  - URL: https://developer.chrome.com/docs/ai/render-llm-responses
  - Relevant points: incremental append/stream parsing is preferable to repeated full replacement for streamed output.

## MDN Web Docs

- `Scheduler: yield() method`.
  - URL: https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield
  - Relevant point: limited availability; continuation is a prioritized task.
- `Scheduler: postTask() method`.
  - URL: https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/postTask
  - Relevant point: limited availability and explicit priority semantics.
- `Using microtasks in JavaScript with queueMicrotask()`.
  - URL: https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
  - Relevant point: MutationObserver callbacks run through the microtask queue, so callbacks should avoid recursively expanding expensive work.

## Evidence limitation

None of these sources specifies the production DOM, selectors, streaming duration, or mutation strategy of `claude.ai`, `chatgpt.com`, `qwen.ai`, or other third-party sites. Site-specific profile decisions still require controlled runtime evidence.
