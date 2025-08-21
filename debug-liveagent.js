require('dotenv').config()
const axios = require('axios')

// Test Live Agent API endpoints instead of Einstein AI Agent
async function testLiveAgentAPI() {
  console.log('🔍 Testing Salesforce Live Agent API...')
  
  const config = {
    INSTANCE_URL: process.env.AGENTFORCE_INSTANCE_URL || 'https://your-org.salesforce.com',
    CLIENT_ID: process.env.AGENTFORCE_CLIENT_ID || 'your_client_id_here',
    CLIENT_SECRET: process.env.AGENTFORCE_CLIENT_SECRET || 'your_client_secret_here',
    AGENT_ID: process.env.AGENTFORCE_AGENT_ID || 'your_agent_id_here'
  }

  // Get access token first
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

  // Test Live Agent endpoints
  console.log('\n🧪 Testing Live Agent API endpoints...')
  
  const liveAgentEndpoints = [
    '/chat/rest/System/SessionId',
    '/chat/rest/Chasitor/ChasitorInit',
    '/services/data/v60.0/support/knowledgeArticles',
    '/services/data/v60.0/chatter/users/me',
    '/services/data/v60.0/query/?q=SELECT+Id,Name+FROM+LiveChatDeployment+LIMIT+5',
    '/services/data/v60.0/query/?q=SELECT+Id,Name+FROM+LiveChatButton+LIMIT+5',
    '/services/data/v60.0/sobjects/LiveChatTranscript',
    '/services/data/v60.0/sobjects/LiveChatVisitor'
  ]

  for (const endpoint of liveAgentEndpoints) {
    let testUrl
    
    if (endpoint.startsWith('/chat/rest/')) {
      // Live Agent REST API uses a different base URL
      testUrl = `${config.INSTANCE_URL}${endpoint}`
    } else {
      // Standard Salesforce REST API
      testUrl = `${config.INSTANCE_URL}${endpoint}`
    }
    
    try {
      const response = await axios.get(testUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-LIVEAGENT-API-VERSION': '48' // Live Agent API version
        },
        timeout: 10000
      })
      
      console.log(`✅ ${endpoint} - Status: ${response.status}`)
      if (response.data) {
        const dataStr = JSON.stringify(response.data)
        console.log(`   📋 Response: ${dataStr.substring(0, 150)}${dataStr.length > 150 ? '...' : ''}`)
      }
      
    } catch (error) {
      const status = error.response?.status
      const errorData = error.response?.data
      
      if (status === 404) {
        console.log(`❌ ${endpoint} - 404 Not Found`)
      } else if (status === 401) {
        console.log(`🔐 ${endpoint} - 401 Unauthorized`)
      } else if (status === 403) {
        console.log(`🚫 ${endpoint} - 403 Forbidden`)
      } else {
        console.log(`❓ ${endpoint} - Status: ${status}, Error: ${JSON.stringify(errorData)}`)
      }
    }
  }

  // Check what Agentforce-related objects exist
  console.log('\n🔍 Checking Agentforce-related objects...')
  
  const agentQueries = [
    "SELECT+Id,Name+FROM+User+WHERE+Profile.Name+LIKE+'%Agent%'+LIMIT+5",
    "SELECT+Id,DeveloperName+FROM+LiveChatDeployment+LIMIT+5",
    "SELECT+Id,Name+FROM+LiveChatButton+LIMIT+5",
    "SELECT+Id,Name+FROM+Queue+WHERE+Type='LiveChat'+LIMIT+5"
  ]

  for (const query of agentQueries) {
    const queryUrl = `${config.INSTANCE_URL}/services/data/v60.0/query/?q=${query}`
    
    try {
      const response = await axios.get(queryUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      
      console.log(`✅ Query: ${query.replace(/\+/g, ' ')}`)
      if (response.data && response.data.records) {
        console.log(`   📋 Found ${response.data.records.length} records:`)
        response.data.records.forEach((record, index) => {
          console.log(`      ${index + 1}. ${record.Name || record.DeveloperName || record.Id}`)
        })
      }
      
    } catch (error) {
      console.log(`❌ Query failed: ${query.replace(/\+/g, ' ')} - ${error.response?.status}`)
    }
  }

  // Check if the Agent ID we have is valid
  console.log(`\n🔍 Checking Agent ID: ${config.AGENT_ID}`)
  
  const agentCheckQueries = [
    `SELECT+Id,Name+FROM+User+WHERE+Id='${config.AGENT_ID}'`,
    `SELECT+Id,Name+FROM+LiveChatButton+WHERE+Id='${config.AGENT_ID}'`,
    `SELECT+Id,DeveloperName+FROM+LiveChatDeployment+WHERE+Id='${config.AGENT_ID}'`
  ]

  for (const query of agentCheckQueries) {
    const queryUrl = `${config.INSTANCE_URL}/services/data/v60.0/query/?q=${query}`
    
    try {
      const response = await axios.get(queryUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      
      if (response.data && response.data.records && response.data.records.length > 0) {
        console.log(`✅ Found Agent ID in: ${query.split('FROM+')[1].split('+WHERE')[0]}`)
        console.log(`   📋 Record:`, response.data.records[0])
        break
      }
      
    } catch (error) {
      // Continue to next query
    }
  }
}

if (require.main === module) {
  testLiveAgentAPI().catch(console.error)
}

module.exports = { testLiveAgentAPI }
