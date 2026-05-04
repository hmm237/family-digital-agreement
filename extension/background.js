// Background service worker for Family Digital Agreement extension

// Configuration
let config = {
  apiUrl: '',
  familyId: '',
  userId: '',
  token: '',
  enabled: false,
}

// Rules storage
let activeRules = []

// Track active tab visits
let currentTab = null
let visitStartTime = null
let lastUrl = null

// Load config and rules from storage on startup
chrome.storage.local.get(['config', 'rules']).then((stored) => {
  if (stored.config) {
    config = { ...config, ...stored.config }
    console.log('[Extension] Config loaded, enabled:', config.enabled)
    
    if (config.enabled && config.familyId) {
      syncRules()
    }
  }
  if (stored.rules) {
    activeRules = stored.rules
  }
})

// Enable side panel on click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

chrome.runtime.onInstalled.addListener(async () => {
  console.log('Family Digital Agreement extension installed')
  const stored = await chrome.storage.local.get(['config'])
  // ONLY set default if absolutely nothing exists
  if (!stored || Object.keys(stored).length === 0) {
    await chrome.storage.local.set({
      config: { apiUrl: '', familyId: '', userId: '', token: '', enabled: false }
    })
  }
})

// Sync rules from API
async function syncRules() {
  if (!config.apiUrl || !config.familyId) return
  
  try {
    const response = await fetch(`${config.apiUrl}/api/rules?family_id=${config.familyId}`)
    const data = await response.json()
    
    if (data.success) {
      if (data.rules) {
        activeRules = data.rules
        await chrome.storage.local.set({ rules: activeRules })
      }
      
      if (data.settings) {
        config.forceTracking = data.settings.force_tracking
        if (config.forceTracking) {
          config.enabled = true
        }
        await chrome.storage.local.set({ config })
      }
    }
  } catch (error) {
    console.error('[Extension] Failed to sync rules:', error)
  }
}

// Check rules every 5 minutes
setInterval(syncRules, 5 * 60 * 1000)

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getConfig') {
    chrome.storage.local.get(['config']).then((result) => {
      sendResponse(result.config || config)
    })
    return true
  }

  if (request.action === 'saveConfig') {
    config = { ...config, ...request.config }
    chrome.storage.local.set({ config }).then(() => {
      syncRules()
      sendResponse({ success: true, message: 'Configuration saved' })
    })
    return true
  }

  if (request.action === 'syncRules') {
    syncRules().then(() => sendResponse({ success: true }))
    return true
  }

  if (request.action === 'updateConfig') {
    config = { ...config, ...request.update }
    chrome.storage.local.set({ config }).then(() => {
      if (config.enabled) syncRules()
      sendResponse({ success: true })
    })
    return true
  }
})

// --- BLOCKING LOGIC ---

function categorizeUrl(url, domain) {
  const categories = [
    [['facebook','twitter','instagram','tiktok','snapchat','reddit','discord','tumblr'], 'social'],
    [['steam','epicgames','roblox','minecraft','twitch'], 'gaming'],
    [['youtube.com','netflix','hulu','disneyplus','primevideo','vimeo'], 'video'],
    [['khanacademy','coursera','edx','.edu'], 'education'],
    [['google.com/search','bing.com/search','duckduckgo.com'], 'search'],
    [['cnn','bbc','nytimes','reuters'], 'news'],
    [['amazon','ebay','etsy','walmart','target'], 'shopping'],
    [['spotify','soundcloud'], 'entertainment'],
    [['docs.google','sheets.google','notion','trello','slack'], 'productivity'],
    [['gmail','outlook','whatsapp','telegram','zoom'], 'communication'],
  ]

  for (const [patterns, cat] of categories) {
    if (patterns.some(p => domain.includes(p) || url.includes(p))) return cat
  }
  return 'uncategorized'
}



// Enforcement & Tracking Listeners
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId === 0) checkAndBlockTab(details.tabId, details.url)
})

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId === 0) checkAndBlockTab(details.tabId, details.url)
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check for blocking on URL change
  if (changeInfo.url) {
    checkAndBlockTab(tabId, changeInfo.url)
  }
  
  // Handle tracking on completion
  if (tab.url && changeInfo.status === 'complete' && tab.active) {
    handleNavigation(tab)
  }
})

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    if (tab.url) {
      if (!checkAndBlockTab(tab.id, tab.url)) {
        handleNavigation(tab)
      }
    }
  } catch (e) {}
})

function checkAndBlockTab(tabId, url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return false
  
  if (shouldBlockUrl(url)) {
    chrome.tabs.update(tabId, { url: chrome.runtime.getURL('blocked.html') })
    sendVisit(url, 'Blocked Access', 0, true)
    return true
  }
  return false
}

// Quota tracking
let dailyQuotas = {
  date: new Date().toLocaleDateString(),
  usage: {} // { category: minutes }
}

// Load quotas from storage
chrome.storage.local.get(['dailyQuotas']).then((stored) => {
  if (stored.dailyQuotas) {
    const today = new Date().toLocaleDateString()
    if (stored.dailyQuotas.date === today) {
      dailyQuotas = stored.dailyQuotas
    } else {
      // Reset for new day
      dailyQuotas = { date: today, usage: {} }
      chrome.storage.local.set({ dailyQuotas })
    }
  }
})

async function handleNavigation(tab) {
  if (!config.enabled || !config.apiUrl || !config.userId || !config.familyId) return
  if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) return

  const url = tab.url
  const now = Date.now()

  if (currentTab && visitStartTime && lastUrl && lastUrl !== url) {
    const duration = now - visitStartTime
    if (duration > 1000) {
      sendVisit(lastUrl, currentTab.title || '', duration, false)
      updateQuota(lastUrl, duration)
    }
  }

  currentTab = tab
  visitStartTime = now
  lastUrl = url
}

function updateQuota(url, durationMs) {
  let domain = ''
  try {
    const urlObj = new URL(url)
    domain = urlObj.hostname.replace('www.', '')
  } catch { return }

  const category = categorizeUrl(url, domain)
  const minutes = durationMs / (1000 * 60)

  if (!dailyQuotas.usage[category]) {
    dailyQuotas.usage[category] = 0
  }
  dailyQuotas.usage[category] += minutes

  // Persist
  chrome.storage.local.set({ dailyQuotas })
}

function shouldBlockUrl(url) {
  if (!config.enabled || activeRules.length === 0) return false
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://')) return false
  
  let domain = ''
  try {
    const urlObj = new URL(url)
    domain = urlObj.hostname.replace('www.', '')
  } catch { return false }

  const category = categorizeUrl(url, domain)
  const now = new Date()
  const day = now.getDay()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  for (const rule of activeRules) {
    if (!rule.is_active) continue

    let matches = false
    if (rule.type === 'url_pattern') {
      const patternStr = rule.pattern.trim()
      // Escape special characters except *
      const escapedPattern = patternStr.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      const pattern = escapedPattern.replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`, 'i')
      matches = regex.test(url) || url.toLowerCase().includes(patternStr.replace(/\*/g, '').toLowerCase())
    } else if (rule.type === 'category') {
      matches = rule.pattern === category
    } else if (rule.type === 'schedule') {
      const day = now.getDay()
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      matches = (rule.schedule_days?.includes(day) ?? true) &&
        (!rule.schedule_start || timeStr >= rule.schedule_start) &&
        (!rule.schedule_end || timeStr <= rule.schedule_end)
    }

    if (matches) {
      if (rule.action === 'block') return true
      if (rule.action === 'limit' && rule.limit_duration_minutes) {
        const usageSoFar = dailyQuotas.usage[category] || 0
        if (usageSoFar >= rule.limit_duration_minutes) return true
      }
    }
  }

  return false
}

// Periodic flush for long-running tabs
setInterval(async () => {
  if (!config.enabled || !currentTab || !visitStartTime) return
  const now = Date.now()
  const duration = now - visitStartTime
  if (duration > 30000) {
    await sendVisit(lastUrl, currentTab.title || '', duration, false)
    updateQuota(lastUrl, duration)
    visitStartTime = now
  }
}, 30000)

async function sendVisit(url, title, durationMs, wasBlocked) {
  if (!config.apiUrl || !config.userId || !config.familyId) return
  
  try {
    await fetch(`${config.apiUrl}/api/visits`, {
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
  } catch (error) {
    console.error('[Extension] Error sending visit:', error)
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (currentTab?.id === tabId && visitStartTime && lastUrl) {
    const duration = Date.now() - visitStartTime
    if (duration > 1000) {
      sendVisit(lastUrl, currentTab.title || '', duration, false)
      updateQuota(lastUrl, duration)
    }
    currentTab = null
    visitStartTime = null
    lastUrl = null
  }
})