// Background service worker for Family Digital Agreement extension

// Configuration - will be set during setup
let config = {
  apiUrl: '',
  familyId: '',
  userId: '',
  token: '',
  enabled: false,
}

// Track active tab visits
let currentTab = null
let visitStartTime = null
let lastUrl = null

// Load config from storage on service worker startup (runs every time worker wakes up)
chrome.storage.local.get(['config']).then((stored) => {
  if (stored.config) {
    config = { ...config, ...stored.config }
    console.log('[Extension] Config loaded from storage on startup, enabled:', config.enabled)
  }
})

// Enable side panel on click of the extension icon (must run on every startup)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

// Initialize from storage
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Family Digital Agreement extension installed')

  const stored = await chrome.storage.local.get(['config'])
  if (!stored.config) {
    await chrome.storage.local.set({
      config: {
        apiUrl: '',
        familyId: '',
        userId: '',
        token: '',
        enabled: false,
      }
    })
  }
})

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
})

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    chrome.storage.local.get(['config']).then((result) => {
      sendResponse(result.config || config)
    })
    return true
  }

  if (request.action === 'saveConfig') {
    config = { ...config, ...request.config }

    // Save to storage immediately so config persists across restarts
    chrome.storage.local.set({ config }).then(() => {
      // Test the connection after saving
      return fetch(`${config.apiUrl}/api/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: config.userId,
          family_id: config.familyId,
          url: 'https://example.com',
          title: 'Test Connection',
          duration_ms: 1000,
          visited_at: new Date().toISOString(),
          was_blocked: false,
        }),
      })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success || data.error?.includes('Failed to record visit')) {
          sendResponse({ success: true, message: 'Configuration saved' })
        } else {
          // Config already saved — still report success so UI updates
          console.warn('[Extension] Connection test warning:', data.error)
          sendResponse({ success: true, message: 'Configuration saved (connection test had warnings)' })
        }
      })
      .catch(err => {
        // Config already saved — connection test failed but config is stored
        console.error('[Extension] Connection test failed:', err.message)
        sendResponse({ success: true, message: 'Configuration saved (could not verify connection)' })
      })
    return true
  }


  if (request.action === 'updateConfig') {
    return chrome.storage.local.get(['config']).then((stored) => {
      config = { ...stored.config, ...request.update }
      return chrome.storage.local.set({ config }).then(() => {
        sendResponse({ success: true })
      })
    })
  }

  if (request.action === 'getStatus') {
    sendResponse({ enabled: config.enabled, configured: !!config.apiUrl })
  }
})

// Track tab changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.url && changeInfo.status === 'complete' && tab.active) {
    handleNavigation(tab)
  }
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  if (tab.url) {
    handleNavigation(tab)
  }
})

async function handleNavigation(tab) {
  if (!config.enabled || !config.apiUrl || !config.userId || !config.familyId) return

  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) return

  const url = tab.url
  const now = Date.now()

  if (currentTab && visitStartTime && lastUrl && lastUrl !== url) {
    const duration = now - visitStartTime
    sendVisit(lastUrl, currentTab.title || '', duration, false)
  }

  currentTab = tab
  visitStartTime = now
  lastUrl = url
}

// Periodic flush for long-running tabs
setInterval(async () => {
  if (!config.enabled || !currentTab || !visitStartTime) return

  const now = Date.now()
  const duration = now - visitStartTime

  if (duration > 5000) {
    await sendVisit(lastUrl, currentTab.title || '', duration, false)
    visitStartTime = now
  }
}, 30000)

async function sendVisit(url, title, durationMs, wasBlocked) {
  try {
    console.log('[Extension] Sending visit:', { url, durationMs, config: { apiUrl: config.apiUrl, userId: config.userId, familyId: config.familyId } })

    const response = await fetch(`${config.apiUrl}/api/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: config.userId,
        family_id: config.familyId,
        url,
        title,
        duration_ms: durationMs,
        visited_at: new Date().toISOString(),
        was_blocked: wasBlocked,
      }),
    })

    console.log('[Extension] API response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Extension] Failed to send visit:', response.status, errorText)
    } else {
      const result = await response.json()
      console.log('[Extension] Visit sent successfully:', result)
    }
  } catch (error) {
    console.error('[Extension] Error sending visit:', error)
  }
}

// Cleanup when tab closes
chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentTab?.id === tabId && visitStartTime && lastUrl) {
    const duration = Date.now() - visitStartTime
    sendVisit(lastUrl, currentTab.title || '', duration, false)
    currentTab = null
    visitStartTime = null
    lastUrl = null
  }
})