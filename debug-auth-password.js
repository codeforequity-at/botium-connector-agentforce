require('dotenv').config()
const axios = require('axios')

// Test Username/Password Flow
async function testPasswordAuth() {
  console.log('🔍 Testing Username/Password Authentication...')
  
  const config = {
    INSTANCE_URL: process.env.AGENTFORCE_INSTANCE_URL || 'https://your-org.salesforce.com',
    CLIENT_ID: process.env.AGENTFORCE_CLIENT_ID || 'your_client_id_here',
    CLIENT_SECRET: process.env.AGENTFORCE_CLIENT_SECRET || 'your_client_secret_here',
    // You need to provide these:
    USERNAME: process.env.AGENTFORCE_USERNAME || 'your_username@yourdomain.com',
    PASSWORD: process.env.AGENTFORCE_PASSWORD || 'your_password',
    SECURITY_TOKEN: process.env.AGENTFORCE_SECURITY_TOKEN || 'your_security_token' // Optional if IP is whitelisted
  }

  const authUrl = `${config.INSTANCE_URL}/services/oauth2/token`
  
  try {
    const password = config.SECURITY_TOKEN ? config.PASSWORD + config.SECURITY_TOKEN : config.PASSWORD
    
    const authData = {
      grant_type: 'password',
      client_id: config.CLIENT_ID,
      client_secret: config.CLIENT_SECRET,
      username: config.USERNAME,
      password: password
    }

    console.log('📤 Sending username/password request...')
    console.log('📋 Data:', {
      grant_type: authData.grant_type,
      client_id: authData.client_id.substring(0, 10) + '...',
      username: authData.username,
      hasPassword: !!authData.password
    })

    const response = await axios.post(authUrl, new URLSearchParams(authData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    })

    console.log('✅ Username/Password Authentication Success!')
    console.log('📋 Response:', {
      access_token: response.data.access_token ? response.data.access_token.substring(0, 20) + '...' : 'missing',
      instance_url: response.data.instance_url,
      token_type: response.data.token_type,
      scope: response.data.scope
    })

    return response.data.access_token

  } catch (error) {
    console.log('❌ Username/Password Authentication Failed!')
    console.log('📋 Error Response:', error.response?.data || error.message)
    console.log('📋 Status:', error.response?.status)
    
    if (error.response?.data?.error === 'invalid_grant') {
      console.log('\n💡 Possible solutions:')
      console.log('   1. Check username and password are correct')
      console.log('   2. Add security token to password if IP not whitelisted')
      console.log('   3. Enable "Password" OAuth flow in Connected App')
      console.log('   4. Check user has API access enabled')
    }
  }
}

if (require.main === module) {
  console.log('⚠️  Please update the USERNAME, PASSWORD, and SECURITY_TOKEN in this file before running')
  testPasswordAuth().catch(console.error)
}

module.exports = { testPasswordAuth }
