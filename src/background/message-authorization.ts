import type { RequestMessage } from '../shared/messages';
export function isAuthorizedMessage(
  message: RequestMessage,
  sender: chrome.runtime.MessageSender,
  extensionBaseUrl: string
): boolean {
  const contentHostname = senderHostname(sender);
  const content = sender.tab?.id !== undefined && contentHostname !== null;
  const extensionPage =
    sender.tab?.id === undefined &&
    typeof sender.url === 'string' &&
    sender.url.startsWith(extensionBaseUrl);
  if (
    message.type === 'REPORT_DIAGNOSTICS' ||
    message.type === 'REPORT_SUSPICIOUS_DIRECTION' ||
    message.type === 'SAVE_PICKER_SELECTION' ||
    message.type === 'SAVE_FAILURE_ELEMENT_EVIDENCE'
  )
    return content;
  if (message.type === 'REQUEST_CONTEXT') {
    if (extensionPage) return true;
    return content && contentHostname === message.payload.hostname.toLowerCase();
  }
  return extensionPage;
}
export function senderHostname(sender: chrome.runtime.MessageSender): string | null {
  const value = sender.url ?? sender.tab?.url;
  return value ? safeHostname(value) : null;
}
export function safeHostname(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.hostname.toLowerCase()
      : null;
  } catch {
    return null;
  }
}
