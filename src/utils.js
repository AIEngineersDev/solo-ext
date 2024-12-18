export const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export function getBrowserType() {
  return typeof browser !== 'undefined' ? 'firefox' : 'chrome';
}

export async function connectToBackground(name) {
  if (getBrowserType() === 'firefox') {
    return browser.runtime.connect({ name });
  }
  return chrome.runtime.connect({ name });
}

export async function openSidePanel(tab) {
  if (getBrowserType() === 'firefox') {
    // Firefox doesn't support side panel, fallback to popup
    return browser.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 400,
      height: 600
    });
  }
  return chrome.sidePanel.open({ tabId: tab.id });
}
