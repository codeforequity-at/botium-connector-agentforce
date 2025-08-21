require('dotenv').config()
const axios = require('axios')

// Test different API endpoints to find the correct Agentforce API
async function testEndpoints() {
  console.log('🔍 Testing Different Agentforce API Endpoints...')
  
  const config = {
    INSTANCE_URL: process.env.AGENTFORCE_INSTANCE_URL || 'https://your-org.salesforce.com',
    CLIENT_ID: process.env.AGENTFORCE_CLIENT_ID || 'your_client_id_here',
    CLIENT_SECRET: process.env.AGENTFORCE_CLIENT_SECRET || 'your_client_secret_here',
    AGENT_ID: process.env.AGENTFORCE_AGENT_ID || 'your_agent_id_here'
  }

  // First, get access token
  console.log('🔐 Getting access token...')
  let accessToken
  try {
    const authUrl = `${config.INSTANCE_URL}/services/oauth2/token`
    const authData = {
      grant_type: 'client_credentials',
      client_id: config.CLIENT_ID,
      client_secret: config.CLIENT_SECRET
    }

    const authResponse = await axios.post(authUrl, new URLSearchParams(authData), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    
    accessToken = authResponse.data.access_token
    console.log('✅ Authentication successful')
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data)
    return
  }

  // Test different API versions and endpoints
  const apiVersions = ['v60.0', 'v59.0', 'v58.0', 'v57.0']
  const endpointPatterns = [
    '/einstein/ai-agent/sessions',
    '/einstein/ai-agents/sessions', 
    '/agentforce/sessions',
    '/agentforce/conversations',
    '/connect/conversation-management/conversations',
    '/connect/agentforce/sessions',
    '/einstein/platform/v1/models',
    '/einstein/language/sentiment',
    '/tooling/sobjects/AgentWork',
    '/sobjects/AgentWork'
  ]

  console.log('\n🧪 Testing API endpoints...')
  
  for (const version of apiVersions) {
    console.log(`\n📋 Testing API version: ${version}`)
    
    for (const endpoint of endpointPatterns) {
      const testUrl = `${config.INSTANCE_URL}/services/data/${version}${endpoint}`
      
      try {
        // Try GET first to see if endpoint exists
        const response = await axios.get(testUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        })
        
        console.log(`✅ GET ${version}${endpoint} - Status: ${response.status}`)
        if (response.data) {
          console.log(`   📋 Response sample:`, JSON.stringify(response.data).substring(0, 200) + '...')
        }
        
      } catch (error) {
        const status = error.response?.status
        const errorData = error.response?.data
        
        if (status === 404) {
          console.log(`❌ GET ${version}${endpoint} - 404 Not Found`)
        } else if (status === 405) {
          console.log(`⚠️  GET ${version}${endpoint} - 405 Method Not Allowed (endpoint exists but needs POST)`)
          
          // Try POST if GET gives 405
          try {
            const postResponse = await axios.post(testUrl, {
              agentId: config.AGENT_ID
            }, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            })
            console.log(`✅ POST ${version}${endpoint} - Status: ${postResponse.status}`)
          } catch (postError) {
            console.log(`❌ POST ${version}${endpoint} - Status: ${postError.response?.status}, Error: ${postError.response?.data?.error || postError.message}`)
          }
          
        } else if (status === 401) {
          console.log(`🔐 GET ${version}${endpoint} - 401 Unauthorized (check permissions)`)
        } else if (status === 403) {
          console.log(`🚫 GET ${version}${endpoint} - 403 Forbidden (insufficient permissions)`)
        } else {
          console.log(`❓ GET ${version}${endpoint} - Status: ${status}, Error: ${errorData?.error || error.message}`)
        }
      }
    }
  }

  // Test specific Agentforce objects
  console.log('\n🔍 Testing Agentforce-specific objects...')
  const agentforceObjects = [
    '/tooling/sobjects/Agent',
    '/tooling/sobjects/AgentWork', 
    '/sobjects/Agent',
    '/sobjects/AgentWork',
    '/tooling/query/?q=SELECT+Id,Name+FROM+Agent+LIMIT+1'
  ]

  for (const objEndpoint of agentforceObjects) {
    const testUrl = `${config.INSTANCE_URL}/services/data/v60.0${objEndpoint}`
    
    try {
      const response = await axios.get(testUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      
      console.log(`✅ ${objEndpoint} - Available`)
      if (response.data && response.data.records) {
        console.log(`   📋 Found ${response.data.records.length} records`)
      }
      
    } catch (error) {
      console.log(`❌ ${objEndpoint} - Status: ${error.response?.status}`)
    }
  }
}

if (require.main === module) {
  testEndpoints().catch(console.error)
}

module.exports = { testEndpoints }
