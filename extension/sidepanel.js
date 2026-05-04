// Popup script for Family Digital Agreement extension

let config = {
  apiUrl: '',
  familyId: '',
  userId: '',
  token: '',
  enabled: false,
}

// Load config on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.runtime.sendMessage({ action: 'getConfig' })
  config = { ...config, ...result }

  // Fill form
  if (result.apiUrl) document.getElementById('apiUrl').value = result.apiUrl
  if (result.familyId) document.getElementById('familyId').value = result.familyId
  if (result.userId) document.getElementById('userId').value = result.userId

  // Update UI
  document.getElementById('enabledToggle').checked = result.enabled

  // Show appropriate sections
  const hasConfig = result.apiUrl && result.familyId && result.userId
  document.getElementById('setup-section').classList.toggle('hidden', hasConfig)
  document.getElementById('control-section').classList.toggle('hidden', !hasConfig)
  document.getElementById('user-section').classList.toggle('hidden', !hasConfig)

  // Update header title based on config status
  if (hasConfig) {
    // Fetch and display user info (this will update the header)
    await loadUserInfo()
  } else {
    // Reset to default when not configured
    document.getElementById('headerTitle').textContent = 'Family Digital Agreement'
  }

  // Auto-sync rules when opening extension
  if (hasConfig && result.enabled) {
    chrome.runtime.sendMessage({ action: 'syncRules' })
  }

  updateStatus(hasConfig ? 'Extension configured and ready' : 'Please configure your family details', 'info')
})

async function saveConfig() {
  const apiUrl = document.getElementById('apiUrl').value.trim()
  const familyId = document.getElementById('familyId').value.trim()
  const userId = document.getElementById('userId').value.trim()

  if (!apiUrl || !familyId || !userId) {
    updateStatus('All fields are required', 'error')
    return
  }

  const config = { apiUrl, familyId, userId, enabled: true }

  showStatus('Testing connection...', 'info')

  const result = await chrome.runtime.sendMessage({
    action: 'saveConfig',
    config,
  })

  if (result.success) {
    updateStatus('Configuration saved! Tracking enabled.', 'success')
    // Reload to update UI
    setTimeout(() => {
      document.location.reload()
    }, 1500)
  } else {
    updateStatus('Error: ' + (result.error || 'Unknown error'), 'error')
  }
}

async function toggleTracking() {
  const enabled = document.getElementById('enabledToggle').checked

  await chrome.runtime.sendMessage({
    action: 'updateConfig',
    update: { enabled }
  })

  updateStatus(enabled ? 'Tracking enabled' : 'Tracking paused', 'success')
}

async function syncRules() {
  const btn = document.getElementById('syncRulesBtn')
  const originalText = btn.textContent
  btn.textContent = '⏳ Syncing...'
  btn.disabled = true

  const result = await chrome.runtime.sendMessage({ action: 'syncRules' })
  
  if (result.success) {
    updateStatus('Rules synced successfully!', 'success')
  } else {
    updateStatus('Failed to sync rules', 'error')
  }
  
  btn.textContent = originalText
  btn.disabled = false
}

function showStatus(message, type) {
  const status = document.getElementById('status')
  status.textContent = message
  status.className = `status ${type}`
  status.classList.remove('hidden')
}

async function loadUserInfo() {
  try {
    const response = await fetch(`${config.apiUrl}/api/user-info?userId=${encodeURIComponent(config.userId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.ok) {
      const userData = await response.json()
      const userName = userData.name || userData.email?.split('@')[0] || 'User'
      document.getElementById('userDisplay').textContent = userName
      document.getElementById('headerTitle').textContent = userName
    } else {
      console.warn('Failed to load user info from API:', response.status)
      document.getElementById('userDisplay').textContent = 'User'
      document.getElementById('headerTitle').textContent = 'User'
    }
  } catch (error) {
    console.error('Failed to load user info:', error)
    document.getElementById('userDisplay').textContent = 'User'
    document.getElementById('headerTitle').textContent = 'User'
  }
}

async function logout() {
  try {
    // Clear extension config
    config = {
      apiUrl: '',
      familyId: '',
      userId: '',
      token: '',
      enabled: false,
    }

    // Update chrome storage
    await chrome.runtime.sendMessage({
      action: 'updateConfig',
      update: config
    })

    // Open login page
    chrome.tabs.create({ url: `${config.apiUrl}/login` })

    // Close popup
    window.close()
  } catch (error) {
    console.error('Logout error:', error)
    updateStatus('Failed to logout', 'error')
  }
}

function updateStatus(message, type) {
  showStatus(message, type)
}

// Attach event listeners after DOM is ready
document.getElementById('saveBtn').addEventListener('click', saveConfig)
document.getElementById('enabledToggle').addEventListener('change', toggleTracking)
document.getElementById('logoutBtn').addEventListener('click', logout)
document.getElementById('syncRulesBtn').addEventListener('click', syncRules)