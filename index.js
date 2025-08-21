const debug = require('debug')('botium-connector-agentforce-dev')
const axios = require('axios')
const _ = require('lodash')

const Capabilities = {
  AGENTFORCE_INSTANCE_URL: 'AGENTFORCE_INSTANCE_URL',
  AGENTFORCE_CLIENT_ID: 'AGENTFORCE_CLIENT_ID',
  AGENTFORCE_CLIENT_SECRET: 'AGENTFORCE_CLIENT_SECRET',
  AGENTFORCE_USERNAME: 'AGENTFORCE_USERNAME',
  AGENTFORCE_PASSWORD: 'AGENTFORCE_PASSWORD',
  AGENTFORCE_SECURITY_TOKEN: 'AGENTFORCE_SECURITY_TOKEN',
  AGENTFORCE_AGENT_ID: 'AGENTFORCE_AGENT_ID',
  AGENTFORCE_API_VERSION: 'AGENTFORCE_API_VERSION',
  AGENTFORCE_TIMEOUT: 'AGENTFORCE_TIMEOUT',
  AGENTFORCE_SIMULATION_MODE: 'AGENTFORCE_SIMULATION_MODE' // New capability for dev edition
}

class AgentForceDevEditionConnector {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.accessToken = null
    this.sessionId = null
    this.axiosInstance = null
    this.simulationMode = true // Always true for dev edition
  }

  Validate () {
    debug('Validate called (Developer Edition Mode)')
    
    // Required capabilities
    const requiredCaps = [
      Capabilities.AGENTFORCE_INSTANCE_URL
    ]
    
    for (const cap of requiredCaps) {
      if (!this.caps[cap]) {
        throw new Error(`${cap} capability is required`)
      }
    }

    // Check authentication method - either client credentials or username/password
    const hasClientCredentials = this.caps[Capabilities.AGENTFORCE_CLIENT_ID] && this.caps[Capabilities.AGENTFORCE_CLIENT_SECRET]
    const hasUserCredentials = this.caps[Capabilities.AGENTFORCE_USERNAME] && this.caps[Capabilities.AGENTFORCE_PASSWORD]
    
    if (!hasClientCredentials && !hasUserCredentials) {
      throw new Error('Either Client ID/Secret or Username/Password authentication is required')
    }

    return Promise.resolve()
  }

  async Build () {
    debug('Build called (Developer Edition Mode)')
    
    // Set default values
    this.apiVersion = this.caps[Capabilities.AGENTFORCE_API_VERSION] || 'v60.0'
    this.timeout = parseInt(this.caps[Capabilities.AGENTFORCE_TIMEOUT]) || 60000
    this.agentId = this.caps[Capabilities.AGENTFORCE_AGENT_ID] || 'dev-edition-agent'
    
    // Configure axios instance
    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async Start () {
    debug('Start called (Developer Edition Mode)')
    
    try {
      // Step 1: Authenticate and get access token
      await this._authenticate()
      
      // Step 2: Initialize simulation session
      await this._initializeSimulation()
      
      debug(`Simulation session started successfully with ID: ${this.sessionId}`)
    } catch (error) {
      debug('Error during Start:', error.message)
      throw new Error(`Failed to start AgentForce simulation session: ${error.message}`)
    }
  }

  async UserSays (msg) {
    debug('UserSays called with message:', JSON.stringify(msg))
    
    if (!this.sessionId) {
      throw new Error('No active session. Please start a session first.')
    }

    try {
      // In simulation mode, we'll create intelligent responses
      const response = await this._simulateAgentResponse(msg)
      
      // Process the response and queue bot messages
      if (response) {
        const botMsg = this._parseSimulatedResponse(response, msg)
        if (botMsg) {
          this.queueBotSays(botMsg)
        }
      }
      
    } catch (error) {
      debug('Error in UserSays:', error.message)
      throw new Error(`Failed to process message: ${error.message}`)
    }
  }

  async Stop () {
    debug('Stop called (Developer Edition Mode)')
    
    if (this.sessionId) {
      try {
        await this._endSimulation()
        debug('Simulation session ended successfully')
      } catch (error) {
        debug('Error ending session:', error.message)
        // Don't throw error on cleanup
      }
    }
    
    this.sessionId = null
    this.accessToken = null
  }

  async Clean () {
    debug('Clean called (Developer Edition Mode)')
    await this.Stop()
  }

  // Private methods for Developer Edition simulation
  async _authenticate() {
    debug('Authenticating with Salesforce (Developer Edition)...')
    
    const authUrl = `${this.caps[Capabilities.AGENTFORCE_INSTANCE_URL]}/services/oauth2/token`
    
    let authData
    
    // Check which authentication method to use
    if (this.caps[Capabilities.AGENTFORCE_CLIENT_ID] && this.caps[Capabilities.AGENTFORCE_CLIENT_SECRET]) {
      // Client Credentials Flow
      authData = {
        grant_type: 'client_credentials',
        client_id: this.caps[Capabilities.AGENTFORCE_CLIENT_ID],
        client_secret: this.caps[Capabilities.AGENTFORCE_CLIENT_SECRET]
      }
    } else {
      // Username/Password Flow
      const password = this.caps[Capabilities.AGENTFORCE_SECURITY_TOKEN] 
        ? this.caps[Capabilities.AGENTFORCE_PASSWORD] + this.caps[Capabilities.AGENTFORCE_SECURITY_TOKEN]
        : this.caps[Capabilities.AGENTFORCE_PASSWORD]
        
      authData = {
        grant_type: 'password',
        client_id: this.caps[Capabilities.AGENTFORCE_CLIENT_ID] || 'default_client_id',
        client_secret: this.caps[Capabilities.AGENTFORCE_CLIENT_SECRET] || 'default_client_secret',
        username: this.caps[Capabilities.AGENTFORCE_USERNAME],
        password: password
      }
    }
    
    try {
      const response = await this.axiosInstance.post(authUrl, new URLSearchParams(authData), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
      
      this.accessToken = response.data.access_token
      debug('Authentication successful (Developer Edition)')
      
      // Update axios instance with access token
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
      
    } catch (error) {
      debug('Authentication failed:', error.response?.data || error.message)
      throw new Error(`Authentication failed: ${error.response?.data?.error_description || error.message}`)
    }
  }

  async _initializeSimulation() {
    debug('Initializing simulation session...')
    
    // Generate a session ID
    this.sessionId = this._generateSessionId()
    
    // Optionally, create a custom object record to track the session
    try {
      await this._createSessionRecord()
    } catch (error) {
      debug('Could not create session record (this is normal for dev edition):', error.message)
      // Continue anyway - session tracking is optional
    }
    
    debug(`Simulation session initialized with ID: ${this.sessionId}`)
  }

  async _createSessionRecord() {
    // Try to create a session record in a custom object (if it exists)
    const sessionData = {
      Name: `Botium Session ${this.sessionId}`,
      Session_ID__c: this.sessionId,
      Agent_ID__c: this.agentId,
      Status__c: 'Active',
      Start_Time__c: new Date().toISOString()
    }

    try {
      const response = await this.axiosInstance.post(
        `${this.caps[Capabilities.AGENTFORCE_INSTANCE_URL]}/services/data/${this.apiVersion}/sobjects/Botium_Session__c`,
        sessionData
      )
      debug('Session record created:', response.data.id)
    } catch (error) {
      // Custom object might not exist - that's fine for simulation
      debug('Session record creation skipped (custom object not found)')
    }
  }

  async _simulateAgentResponse(msg) {
    debug('Simulating agent response for:', msg.messageText)
    
    // Create intelligent responses based on the input
    const userMessage = (msg.messageText || '').toLowerCase()
    
    // Simulate different types of responses
    let response = {
      text: '',
      type: 'text',
      confidence: 0.9,
      intent: 'general_inquiry',
      entities: []
    }

    // Simple rule-based responses for simulation
    if (userMessage.includes('hello') || userMessage.includes('hi')) {
      response.text = "Hello! I'm your Agentforce assistant. How can I help you today?"
      response.intent = 'greeting'
    } else if (userMessage.includes('help')) {
      response.text = "I'm here to help! I can assist you with various tasks. What do you need help with?"
      response.intent = 'help_request'
    } else if (userMessage.includes('weather')) {
      response.text = "I'd be happy to help with weather information, but I don't have access to real-time weather data in this simulation."
      response.intent = 'weather_inquiry'
    } else if (userMessage.includes('product') || userMessage.includes('service')) {
      response = {
        text: "Here are our available products and services:",
        type: 'card',
        cards: [
          {
            title: "Product A",
            subtitle: "Our flagship product",
            image: "https://example.com/product-a.jpg",
            buttons: [
              { text: "Learn More", payload: "learn_more_product_a" },
              { text: "Buy Now", payload: "buy_product_a" }
            ]
          },
          {
            title: "Service B", 
            subtitle: "Professional services",
            buttons: [
              { text: "Get Quote", payload: "quote_service_b" }
            ]
          }
        ],
        intent: 'product_inquiry'
      }
    } else if (userMessage.includes('thank')) {
      response.text = "You're welcome! Is there anything else I can help you with?"
      response.intent = 'gratitude'
    } else {
      response.text = `I understand you're asking about "${msg.messageText}". While I'm running in simulation mode (Developer Edition), I can help you test various conversation flows. Try asking about products, weather, or say hello!`
      response.intent = 'general_inquiry'
    }

    // Add some simulated processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
    
    return response
  }

  _parseSimulatedResponse(response, originalMsg) {
    const botMsg = { 
      sender: 'bot', 
      sourceData: response,
      messageText: response.text
    }

    // Handle different response types
    if (response.type === 'card' && response.cards) {
      botMsg.cards = response.cards.map(card => ({
        text: card.title,
        subtext: card.subtitle,
        image: card.image ? { mediaUri: card.image } : undefined,
        buttons: (card.buttons || []).map(button => ({
          text: button.text,
          payload: button.payload
        }))
      }))
    }

    // Add NLP information
    if (response.intent) {
      botMsg.nlp = {
        intent: {
          name: response.intent,
          confidence: response.confidence || 0.9,
          incomprehension: response.intent === 'unknown'
        },
        entities: response.entities || []
      }
    }

    return botMsg
  }

  async _endSimulation() {
    debug('Ending simulation session...')
    
    // Optionally update the session record
    try {
      await this._updateSessionRecord('Completed')
    } catch (error) {
      debug('Could not update session record:', error.message)
    }
  }

  async _updateSessionRecord(status) {
    // Try to update the session record if it exists
    try {
      const updateData = {
        Status__c: status,
        End_Time__c: new Date().toISOString()
      }

      // We'd need the record ID to update, so this is just a placeholder
      debug('Session record update skipped (simulation mode)')
    } catch (error) {
      debug('Session record update failed:', error.message)
    }
  }

  _generateSessionId() {
    return `dev-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: AgentForceDevEditionConnector,
  PluginDesc: {
    name: 'Salesforce Agentforce (Developer Edition)',
    provider: 'Salesforce',
    avatar: null,
    helperText: 'Connect to Salesforce for Agentforce simulation in Developer Edition. This connector simulates Agentforce responses since the full Agentforce features are not available in Developer Edition.',
    capabilities: [
      {
        name: Capabilities.AGENTFORCE_INSTANCE_URL,
        label: 'Salesforce Instance URL',
        description: 'The base URL of your Salesforce Developer Edition org',
        type: 'url',
        required: true,
        sampleHeader: 'Salesforce Instance URL',
        sampleDescription: 'Enter your Salesforce Developer Edition org URL',
        sampleBody: 'https://your-domain.develop.my.salesforce.com'
      },
      {
        name: Capabilities.AGENTFORCE_CLIENT_ID,
        label: 'Client ID (Consumer Key)',
        description: 'The Consumer Key from your connected app',
        type: 'string',
        required: false,
        sampleHeader: 'Connected App Client ID',
        sampleDescription: 'The Consumer Key from your connected app configuration'
      },
      {
        name: Capabilities.AGENTFORCE_CLIENT_SECRET,
        label: 'Client Secret (Consumer Secret)',
        description: 'The Consumer Secret from your connected app',
        type: 'secret',
        required: false,
        sampleHeader: 'Connected App Client Secret',
        sampleDescription: 'The Consumer Secret from your connected app configuration'
      },
      {
        name: Capabilities.AGENTFORCE_USERNAME,
        label: 'Username',
        description: 'Salesforce username (for username/password flow)',
        type: 'string',
        required: false,
        sampleHeader: 'Salesforce Username',
        sampleDescription: 'Username for your Developer Edition org'
      },
      {
        name: Capabilities.AGENTFORCE_PASSWORD,
        label: 'Password',
        description: 'Password for the user',
        type: 'secret',
        required: false,
        sampleHeader: 'Salesforce Password',
        sampleDescription: 'Password for your Developer Edition org'
      },
      {
        name: Capabilities.AGENTFORCE_SECURITY_TOKEN,
        label: 'Security Token',
        description: 'Security token (optional, used if IP not whitelisted)',
        type: 'secret',
        required: false,
        sampleHeader: 'Security Token',
        sampleDescription: 'Salesforce security token for the user'
      },
      {
        name: Capabilities.AGENTFORCE_AGENT_ID,
        label: 'Agent ID (Simulation)',
        description: 'Agent identifier for simulation purposes',
        type: 'string',
        required: false,
        sampleHeader: 'Agent ID',
        sampleDescription: 'Any identifier for your simulated agent'
      },
      {
        name: Capabilities.AGENTFORCE_API_VERSION,
        label: 'API Version',
        description: 'Salesforce API version (default: v60.0)',
        type: 'choice',
        required: false,
        choices: [
          { key: 'v60.0', name: 'v60.0 (Winter \'24)', description: 'Winter \'24 Release' },
          { key: 'v59.0', name: 'v59.0 (Summer \'23)', description: 'Summer \'23 Release' },
          { key: 'v58.0', name: 'v58.0 (Spring \'23)', description: 'Spring \'23 Release' }
        ],
        sampleHeader: 'API Version',
        sampleDescription: 'Select the Salesforce API version to use'
      },
      {
        name: Capabilities.AGENTFORCE_TIMEOUT,
        label: 'Request Timeout (ms)',
        description: 'Timeout for API requests in milliseconds (default: 60000)',
        type: 'int',
        required: false,
        sampleHeader: 'Request Timeout',
        sampleDescription: 'Maximum time to wait for API responses'
      }
    ],
    features: {
      conversationFlowTesting: true,
      e2eTesting: true,
      intentResolution: true,
      intentConfidenceScore: true,
      alternateIntents: false,
      entityResolution: true,
      entityConfidenceScore: true,
      testCaseGeneration: true,
      testCaseExport: false,
      securityTesting: false,
      audioInput: false,
      sendAttachments: false,
      supportedFileExtensions: [],
      mediaDownload: false,
      helloText: 'Hello, I am your Agentforce assistant (Developer Edition Simulation)'
    }
  }
}
