require('dotenv').config()
const AgentforceConnector = require('./index')

// Mock queueBotSays function for testing
const mockQueueBotSays = (botMsg) => {
  console.log('🤖 Bot says:', JSON.stringify(botMsg, null, 2))
}

// Sample capabilities configuration from environment variables
const sampleCaps = {
  AGENTFORCE_INSTANCE_URL: process.env.AGENTFORCE_INSTANCE_URL || 'https://your-org.salesforce.com',
  AGENTFORCE_CLIENT_ID: process.env.AGENTFORCE_CLIENT_ID || 'your_client_id_here',
  AGENTFORCE_CLIENT_SECRET: process.env.AGENTFORCE_CLIENT_SECRET || 'your_client_secret_here',
  AGENTFORCE_AGENT_ID: process.env.AGENTFORCE_AGENT_ID || 'your_agent_id_here'
}

async function testProductInquiry() {
  console.log('🧪 Testing Product Inquiry (Card Response)...')

  const connector = new AgentforceConnector.PluginClass({
    queueBotSays: mockQueueBotSays,
    caps: sampleCaps
  })

  try {
    await connector.Validate()
    await connector.Build()
    await connector.Start()

    console.log('\n📤 Sending: "Tell me about your products"')
    await connector.UserSays({ messageText: 'Tell me about your products' })
    
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log('\n📤 Sending: "Thank you"')
    await connector.UserSays({ messageText: 'Thank you' })

    await connector.Stop()
    await connector.Clean()

    console.log('\n🎉 Product inquiry test completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testProductInquiry().catch(console.error)
