const AgentforceConnector = require('./index')

// Load environment variables if available
try {
  require('dotenv').config()
} catch (err) {
  // dotenv not available, ignore
}

// Mock queueBotSays function for testing
const mockQueueBotSays = (botMsg) => {
  console.log('🤖 Bot says:', JSON.stringify(botMsg, null, 2))
}

// Sample capabilities configuration
const sampleCaps = {
  AGENTFORCE_INSTANCE_URL: process.env.AGENTFORCE_INSTANCE_URL || 'https://your-org.salesforce.com',
  AGENTFORCE_CLIENT_ID: process.env.AGENTFORCE_CLIENT_ID || 'your_client_id_here',
  AGENTFORCE_CLIENT_SECRET: process.env.AGENTFORCE_CLIENT_SECRET || 'your_client_secret_here',
  AGENTFORCE_AGENT_ID: process.env.AGENTFORCE_AGENT_ID || 'your_agent_id_here',
  // Username/Password authentication (fallback if Client Credentials not enabled)
  AGENTFORCE_USERNAME: process.env.AGENTFORCE_USERNAME || 'your_username@yourdomain.com',
  AGENTFORCE_PASSWORD: process.env.AGENTFORCE_PASSWORD || 'your_password_here',
  AGENTFORCE_SECURITY_TOKEN: process.env.AGENTFORCE_SECURITY_TOKEN || 'your_security_token',
  AGENTFORCE_API_VERSION: process.env.AGENTFORCE_API_VERSION || 'v1',
  AGENTFORCE_TIMEOUT: process.env.AGENTFORCE_TIMEOUT || '60000'
}

async function testConnector() {
  console.log('🚀 Testing Agentforce Connector...')
  console.log('📋 Configuration:', {
    instanceUrl: sampleCaps.AGENTFORCE_INSTANCE_URL,
    agentId: sampleCaps.AGENTFORCE_AGENT_ID,
    apiVersion: sampleCaps.AGENTFORCE_API_VERSION,
    hasClientId: !!sampleCaps.AGENTFORCE_CLIENT_ID && sampleCaps.AGENTFORCE_CLIENT_ID !== 'your_consumer_key_here',
    hasUsername: !!sampleCaps.AGENTFORCE_USERNAME
  })

  const connector = new AgentforceConnector.PluginClass({
    queueBotSays: mockQueueBotSays,
    caps: sampleCaps
  })

  try {
    console.log('\n✅ Step 1: Validating configuration...')
    await connector.Validate()
    console.log('✅ Configuration is valid')

    console.log('\n✅ Step 2: Building connector...')
    await connector.Build()
    console.log('✅ Connector built successfully')

    console.log('\n✅ Step 3: Starting session...')
    await connector.Start()
    console.log('✅ Session started successfully')

    console.log('\n✅ Step 4: Sending test messages...')
    
    // Test message 1
    console.log('\n📤 Sending: "Hello"')
    await connector.UserSays({ messageText: 'Hello' })
    
    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Test message 2
    console.log('\n📤 Sending: "What can you help me with?"')
    await connector.UserSays({ messageText: 'What can you help me with?' })
    
    // Wait a bit before cleanup
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('\n✅ Step 5: Stopping session...')
    await connector.Stop()
    console.log('✅ Session stopped successfully')

    console.log('\n✅ Step 6: Cleaning up...')
    await connector.Clean()
    console.log('✅ Cleanup completed')

    console.log('\n🎉 Test completed successfully!')

  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('📋 Error details:', error)
    
    // Try to cleanup even if test failed
    try {
      await connector.Stop()
      await connector.Clean()
    } catch (cleanupError) {
      console.error('❌ Cleanup also failed:', cleanupError.message)
    }
    
    process.exit(1)
  }
}

// Check if this is being run directly
if (require.main === module) {
  console.log('🔧 Agentforce Connector Demo')
  console.log('📝 Make sure to set your environment variables or update the sampleCaps object')
  console.log('📝 You can create a .env file with your configuration')
  console.log('')
  
  testConnector().catch(error => {
    console.error('❌ Demo failed:', error)
    process.exit(1)
  })
}

module.exports = { testConnector }
