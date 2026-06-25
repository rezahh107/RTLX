# RTLX 15.5.4 Architecture Delta — Page Activation Switch

RTLX 15.5.4 is a targeted popup and supportability hardening release. It does not change the extension boundary, Profile Schema v3, storage architecture, telemetry policy, remote-code policy, mutation ownership model, or rollback contract.

## Evidence trigger

The user-provided v15.5.3 page debug report concluded `permission_missing`. It reported `hostPermission: not_granted`, `contentScriptRegistered: false`, and `contentScriptReachable: false` for the current page. Therefore the practical failure was not only direction or typography logic; the page had never become eligible for normal content processing.

## Popup activation delta

The popup now includes an explicit Persian switch labelled for page activation. Enabling it performs the current-site optional host-permission request from the user gesture, stores the restored enabled site mode, and applies the current tab through the existing background injection path. Disabling it stores `siteMode: disabled` and rolls back owned mutations.

## Debug-report delta

The current-page debug-report action attempts the same current-site permission request before applying and exporting evidence. If the user grants permission, the next report can include runtime/pageDebug evidence. If the user denies permission or the browser blocks the page, the report still honestly records the relevant unavailable/permission state.

## Boundary status

No new permission was added to the manifest. The existing optional host-permission contract is preserved. The report remains local, user-initiated, and text-free.
