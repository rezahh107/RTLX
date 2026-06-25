# Migration: RTLX 15.7.1 → 15.7.2

No user action or new permission is required.

## Profile changes

Qwen and DeepSeek move from profile version 1 to version 2. Version 2 removes broad profile rules for generic content roots and all interactive elements. Generic runtime classification remains active, while stable safety boundaries remain protected.

## Report changes

- RuntimeSnapshot: `1.3.0` → `1.4.0`
- ProfileHealth: `1.0.0` → `1.1.0`
- Failure Evidence Report: `1.1.0` → `1.2.0`

Consumers must accept the new required `analysis` object and the new runtime evidence fields.

## Selection lifecycle

A stale selection from another document or path is deleted and represented as `no_data` with a cleared reason code. Users should select the problem area again before downloading a report when element-specific analysis is required.
