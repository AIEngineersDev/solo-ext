export const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

export function getBrowserType() {
  if (typeof browser !== 'undefined') {
    try {
      // Firefox-specific test
      return browser.runtime.getBrowserInfo ? 'firefox' : 'chrome';
    } catch {
      return 'chrome';
    }
  }
  return 'chrome';
}

export async function executeScript(tabId, files) {
  if (getBrowserType() === 'firefox') {
    for (const file of files) {
      await browser.tabs.executeScript(tabId, { file });
    }
  } else {
    await chrome.scripting.executeScript({
      target: { tabId },
      files
    });
  }
}

export async function connectToBackground(name) {
  return browserAPI.runtime.connect({ name });
}

export async function sendMessage(message) {
  return browserAPI.runtime.sendMessage(message);
}

export async function injectContentScript(tabId) {
  if (getBrowserType() === 'firefox') {
    await executeScript(tabId, ['browser-polyfill.js', 'content.js']);
  } else {
    await executeScript(tabId, ['content.js']);
  }
}

export async function openSidePanel(tab) {
  if (getBrowserType() === 'firefox') {
    try {
      // For Firefox, just try to open without closing first
      await browser.sidebarAction.open();
    } catch (e) {
      console.error('Sidebar error:', e);
      // Fallback to popup if sidebar fails
      return browser.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 400,
        height: 600
      });
    }
  } else {
    return chrome.sidePanel.open({ tabId: tab.id });
  }
}

export async function toggleSidebar() {
  if (getBrowserType() === 'firefox') {
    try {
      // Instead of checking isOpen which can be unreliable,
      // always try to open the sidebar
      await browser.sidebarAction.open();
    } catch (e) {
      console.error('Toggle sidebar error:', e);
      throw e;
    }
  }
}
