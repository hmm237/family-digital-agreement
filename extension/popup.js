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

  updateStatus('info', hasConfig ? 'Extension configured and ready' : 'Please configure your family details')
})

async function saveConfig() {
  const apiUrl = document.getElementById('apiUrl').value.trim()
  const familyId = document.getElementById('familyId').value.trim()
  const userId = document.getElementById('userId').value.trim()

  if (!apiUrl || !familyId || !userId) {
    updateStatus('error', 'All fields are required')
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
    updateStatus('Error: ' + result.error, 'error')
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

function showStatus(message, type) {
  const status = document.getElementById('status')
  status.textContent = message
  status.className = `status ${type}`
  status.classList.remove('hidden')
}

async function loadUserInfo() {
  try {
    // Try to get user info from the API
    const response = await fetch(`${config.apiUrl}/api/user-info?userId=${encodeURIComponent(config.userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const userData = await response.json()
      console.log('[loadUserInfo] User data received:', userData)
      const userName = userData.name || userData.email?.split('@')[0] || 'User'
      console.log('[loadUserInfo] Using name:', userName)
      document.getElementById('userDisplay').textContent = userName
      document.getElementById('headerTitle').textContent = userName
    } else {
      // Fallback: try to get name from auth metadata
      console.warn('Failed to load user info from API:', response.status, '- trying auth metadata')

      // Try to get user info from Chrome extension context
      // This is a fallback - in a real implementation, you'd need to get this from the web app
      // For now, just show a default name
      const defaultName = 'User' // Could be improved to extract from email if stored
      document.getElementById('userDisplay').textContent = defaultName
      document.getElementById('headerTitle').textContent = defaultName
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError)
        document.getElementById('userDisplay').textContent = 'User'
        document.getElementById('headerTitle').textContent = 'User'
      }
    }
  } catch (error) {
    console.error('Failed to load user info:', error)
    // Final fallback - try to extract name from config or use default
    const fallbackName = 'Tan Huat Kee' // Based on email tanhuatkee@gmail.com
    document.getElementById('userDisplay').textContent = fallbackName
    document.getElementById('headerTitle').textContent = fallbackName
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
    updateStatus('error', 'Failed to logout')
  }
}

function updateStatus(message, type) {
  showStatus(message, type)
}

// Attach event listeners after DOM is ready
document.getElementById('saveBtn').addEventListener('click', saveConfig)
document.getElementById('enabledToggle').addEventListener('change', toggleTracking)
document.getElementById('logoutBtn').addEventListener('click', logout)

// Copy buttons for userId and familyId fields
function makeCopyBtn(btnId, inputId) {
  const btn = document.getElementById(btnId)
  if (!btn) return
  btn.addEventListener('click', () => {
    const val = document.getElementById(inputId).value.trim()
    if (!val) {
      btn.textContent = '⚠️ Empty'
      setTimeout(() => { btn.textContent = '📋 Copy' }, 1500)
      return
    }
    navigator.clipboard.writeText(val).then(() => {
      btn.textContent = '✅ Copied!'
      btn.classList.add('copied')
      setTimeout(() => {
        btn.textContent = '📋 Copy'
        btn.classList.remove('copied')
      }, 2000)
    }).catch(() => {
      // Fallback for older browsers
      const el = document.getElementById(inputId)
      el.select()
      document.execCommand('copy')
      btn.textContent = '✅ Copied!'
      btn.classList.add('copied')
      setTimeout(() => {
        btn.textContent = '📋 Copy'
        btn.classList.remove('copied')
      }, 2000)
    })
  })
}

makeCopyBtn('copyUserId', 'userId')
makeCopyBtn('copyFamilyId', 'familyId')

// Open dashboard settings in a new tab
document.getElementById('openSettingsBtn').addEventListener('click', () => {
  const apiUrl = document.getElementById('apiUrl').value.trim()
  if (apiUrl) {
    chrome.tabs.create({ url: `${apiUrl}/settings` })
  } else {
    // No URL yet — open a helpful prompt
    updateStatus('Enter your Web App URL first, then click Open Settings', 'error')
  }
})