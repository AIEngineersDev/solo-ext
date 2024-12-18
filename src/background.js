import Client from './client.js';
import { browserAPI, openSidePanel, getBrowserType, toggleSidebar } from './utils.js';

const rateLimiter = {
  lastRequest: 0,
  minDelay: 1000, // 1 second between requests
};

async function sendToAPI(content) {
  try {
    const settings = await browserAPI.storage.sync.get(['apiUrl', 'apiToken', 'modelName', 'maxTokens']);
    
    if (!settings.apiUrl) {
      throw new Error('API URL is not configured. Please open settings and configure the API URL.');
    }

    if (!content.trim()) {
      throw new Error('Please enter some text to process.');
    }

    const client = new Client({
      apiKey: settings.apiToken,
      baseURL: settings.apiUrl
    });

    const chatCompletion = await client.chat.completions.create({
      model: settings.modelName || 'meta-llama/Llama-2-7b-chat',
      messages: [{ role: "user", content: content }],
      max_tokens: parseInt(settings.maxTokens) || 500
    });

    if (!chatCompletion.choices?.[0]?.message) {
      throw new Error('Invalid response from API. Please check your settings and try again.');
    }

    return { success: true, message: chatCompletion.choices[0].message.content.trim() };
  } catch (error) {
    return { 
      success: false, 
      error: error.message
    };
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendToAPI') {
    // Handle the API request
    sendToAPI(request.content)
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        sendResponse({ 
          success: false, 
          error: error.message || 'API request failed'
        });
      });
    return true; // Required for async response
  }
});

// Add settings change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    // Broadcast settings changes to all open tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        try {
          chrome.tabs.sendMessage(tab.id, {
            action: 'settingsUpdated',
            changes
          });
        } catch (error) {
          // Ignore errors for inactive tabs
          console.debug('Could not send to tab:', tab.id);
        }
      });
    });
  }
});

// Handle extension icon click to open sidebar
browserAPI.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) {
    return; // Can't open on browser internal URLs
  }
  
  try {
    await openSidePanel(tab);
  } catch (error) {
    console.error('Failed to open panel:', error);
    // Fallback to opening as a popup if side panel fails
    browserAPI.windows.create({
      url: 'popup.html',
      type: 'popup',
      width: 400,
      height: 600
    });
  }
});

// Handle browser action click
if (getBrowserType() === 'firefox') {
  browser.browserAction.onClicked.addListener(async (tab) => {
    await toggleSidebar().catch(error => {
      console.error('Failed to toggle sidebar:', error);
      // Fallback to popup if sidebar fails
      browser.windows.create({
        url: 'popup.html',
        type: 'popup',
        width: 400,
        height: 600
      });
    });
  });
} else {
  chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
      await openSidePanel(tab);
    }
  });
}

// Initialize sidebar on install for Firefox
if (getBrowserType() === 'firefox') {
  browser.runtime.onInstalled.addListener(() => {
    browser.sidebarAction.open();
  });
}