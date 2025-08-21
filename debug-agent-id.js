require('dotenv').config()
const axios = require('axios')

// Check what the Agent ID actually refers to
async function checkAgentId() {
  const config = {
    INSTANCE_URL: process.env.AGENTFORCE_INSTANCE_URL || 'https://your-org.salesforce.com',
    CLIENT_ID: process.env.AGENTFORCE_CLIENT_ID || 'your_client_id_here',
    CLIENT_SECRET: process.env.AGENTFORCE_CLIENT_SECRET || 'your_client_secret_here',
    AGENT_ID: process.env.AGENTFORCE_AGENT_ID || 'your_agent_id_here'
  }

  console.log(`🔍 Analyzing Agent ID: ${config.AGENT_ID}`)

  // Get access token
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

  // Analyze the Agent ID format
  console.log('\n🔍 Agent ID Analysis:')
  console.log(`   📋 Full ID: ${config.AGENT_ID}`)
  console.log(`   📋 Length: ${config.AGENT_ID.length}`)
  console.log(`   📋 Prefix: ${config.AGENT_ID.substring(0, 3)}`)
  console.log(`   📋 Pattern: ${config.AGENT_ID.match(/^[0-9A-Za-z]{15,18}$/) ? 'Valid Salesforce ID format' : 'Invalid format'}`)

  // Try to find this ID in various objects
  console.log('\n🧪 Searching for Agent ID in different objects...')
  
  const objectsToCheck = [
    'User',
    'Contact', 
    'Account',
    'Case',
    'Lead',
    'Opportunity',
    'CustomObject__c',
    'Agent__c',
    'Bot__c',
    'ChatBot__c'
  ]

  for (const objectName of objectsToCheck) {
    try {
      const queryUrl = `${config.INSTANCE_URL}/services/data/v60.0/query/?q=SELECT+Id,Name+FROM+${objectName}+WHERE+Id='${config.AGENT_ID}'`
      
      const response = await axios.get(queryUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })
      
      if (response.data && response.data.records && response.data.records.length > 0) {
        console.log(`✅ Found in ${objectName}:`)
        console.log(`   📋 Record:`, response.data.records[0])
        
        // Get more details about this record
        try {
          const detailUrl = `${config.INSTANCE_URL}/services/data/v60.0/sobjects/${objectName}/${config.AGENT_ID}`
          const detailResponse = await axios.get(detailUrl, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          })
          
          console.log(`   📋 Full details:`, JSON.stringify(detailResponse.data, null, 2))
        } catch (detailError) {
          console.log(`   ⚠️  Could not get full details: ${detailError.response?.status}`)
        }
        
        return // Found it, no need to continue
      }
      
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.[0]?.errorCode === 'INVALID_TYPE') {
        // Object doesn't exist, continue
        continue
      } else {
        console.log(`❌ Error checking ${objectName}: ${error.response?.status} - ${error.response?.data?.[0]?.message}`)
      }
    }
  }

  // Check if it might be a custom object or field
  console.log('\n🔍 Checking for custom objects with similar names...')
  
  try {
    const sobjectsUrl = `${config.INSTANCE_URL}/services/data/v60.0/sobjects/`
    const response = await axios.get(sobjectsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    const agentRelatedObjects = response.data.sobjects.filter(obj => 
      obj.name.toLowerCase().includes('agent') || 
      obj.name.toLowerCase().includes('bot') ||
      obj.name.toLowerCase().includes('chat') ||
      obj.name.toLowerCase().includes('ai')
    )
    
    console.log('📋 Found agent/bot/chat related objects:')
    agentRelatedObjects.forEach(obj => {
      console.log(`   - ${obj.name} (${obj.label})`)
    })
    
    // Try to find our ID in these objects
    for (const obj of agentRelatedObjects) {
      try {
        const queryUrl = `${config.INSTANCE_URL}/services/data/v60.0/query/?q=SELECT+Id,Name+FROM+${obj.name}+WHERE+Id='${config.AGENT_ID}'+LIMIT+1`
        
        const queryResponse = await axios.get(queryUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (queryResponse.data && queryResponse.data.records && queryResponse.data.records.length > 0) {
          console.log(`✅ Found Agent ID in ${obj.name}:`, queryResponse.data.records[0])
        }
        
      } catch (error) {
        // Continue to next object
      }
    }
    
  } catch (error) {
    console.log('❌ Could not retrieve sobjects list:', error.response?.status)
  }

  console.log('\n❌ Agent ID not found in any standard objects')
  console.log('💡 This might be:')
  console.log('   1. A custom object ID')
  console.log('   2. An ID from a different Salesforce org')
  console.log('   3. An invalid/test ID')
  console.log('   4. An ID that requires special permissions to access')
}

if (require.main === module) {
  checkAgentId().catch(console.error)
}

module.exports = { checkAgentId }
