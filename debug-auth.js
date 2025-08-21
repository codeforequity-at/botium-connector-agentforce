require('dotenv').config()
const axios = require('axios')

// Configuration from environment variables
const config = {
  INSTANCE_URL: process.env.AGENTFORCE_INSTANCE_URL || 'https://your-org.salesforce.com',
  CLIENT_ID: process.env.AGENTFORCE_CLIENT_ID || 'your_client_id_here',
  CLIENT_SECRET: process.env.AGENTFORCE_CLIENT_SECRET || 'your_client_secret_here'
}

async function testAuth() {
  console.log('🔍 Testing Salesforce Authentication...')
  console.log('📋 Config:', {
    instanceUrl: config.INSTANCE_URL,
    clientId: config.CLIENT_ID.substring(0, 10) + '...',
    hasClientSecret: !!config.CLIENT_SECRET
  })

  const authUrl = `${config.INSTANCE_URL}/services/oauth2/token`
  console.log('🌐 Auth URL:', authUrl)

  // Test 1: Client Credentials Flow
  console.log('\n🧪 Test 1: Client Credentials Flow')
  try {
    const authData = {
      grant_type: 'client_credentials',
      client_id: config.CLIENT_ID,
      client_secret: config.CLIENT_SECRET
    }

    console.log('📤 Sending request with data:', {
      grant_type: authData.grant_type,
      client_id: authData.client_id.substring(0, 10) + '...',
      client_secret: authData.client_secret.substring(0, 10) + '...'
    })

    const response = await axios.post(authUrl, new URLSearchParams(authData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    })

    console.log('✅ Client Credentials Success!')
    console.log('📋 Response:', {
      access_token: response.data.access_token ? response.data.access_token.substring(0, 20) + '...' : 'missing',
      instance_url: response.data.instance_url,
      token_type: response.data.token_type,
      scope: response.data.scope
    })

    return response.data.access_token

  } catch (error) {
    console.log('❌ Client Credentials Failed!')
    console.log('📋 Error Response:', error.response?.data || error.message)
    console.log('📋 Status:', error.response?.status)
    console.log('📋 Headers:', error.response?.headers)
  }

  // Test 2: Try different grant types that might be supported
  console.log('\n🧪 Test 2: Check supported grant types')
  try {
    // This should fail but might give us info about supported grant types
    const response = await axios.post(authUrl, new URLSearchParams({
      grant_type: 'unsupported_test'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 10000
    })
  } catch (error) {
    console.log('📋 Error details (might show supported grant types):', error.response?.data)
  }

  // Test 3: Check if the org supports Einstein AI
  console.log('\n🧪 Test 3: Check Einstein AI API availability')
  try {
    const testUrl = `${config.INSTANCE_URL}/services/data/v60.0/einstein`
    const response = await axios.get(testUrl, { timeout: 10000 })
    console.log('✅ Einstein API accessible')
  } catch (error) {
    console.log('❌ Einstein API check failed:', error.response?.status, error.response?.data)
  }
}

if (require.main === module) {
  testAuth().catch(console.error)
}

module.exports = { testAuth }
