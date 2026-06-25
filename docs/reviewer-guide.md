# Store Reviewer Guide

## Single purpose

RTLX locally improves direction, BiDi isolation, and typography for mixed Persian/English content containers. It does not translate, collect browsing history, or modify network requests.

## Permissions

- `activeTab`: user-triggered processing of the current tab.
- `scripting`: inject the packaged content runtime after user approval.
- `storage`: store user settings, grants metadata, temporary disable state, and optional text-free diagnostics.
- `alarms`: optional profile update lifecycle; remote updates are disabled in this baseline.
- optional HTTP/HTTPS hosts: persistent site processing only after explicit user gesture.

No cookies, history, webRequest, downloads, clipboard, debugger, management, or native messaging permissions are used.

## Review flow

1. Load the unpacked target build.
2. Open a local HTTP fixture containing Persian text and a URL/code block.
3. Open the popup and choose **Current tab**.
4. Confirm only content candidates receive semantic direction changes; `html/body`, controls, code content, and icons remain protected.
5. Use rollback and verify character sequence restoration.
6. Revoke host access and verify rollback is requested.
