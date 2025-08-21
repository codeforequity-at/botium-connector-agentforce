const debug = require('debug')('botium-connector-agentforce')
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
  AGENTFORCE_TIMEOUT: 'AGENTFORCE_TIMEOUT'
}

class AgentForceConnector {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.accessToken = null
    this.sessionId = null
    this.axiosInstance = null
  }

  Validate () {
    debug('Validate called')
    
    // Required capabilities
    const requiredCaps = [
      Capabilities.AGENTFORCE_INSTANCE_URL,
      Capabilities.AGENTFORCE_AGENT_ID
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
    debug('Build called')
    
    // Set default values
    this.apiVersion = this.caps[Capabilities.AGENTFORCE_API_VERSION] || 'v60.0'
    this.timeout = parseInt(this.caps[Capabilities.AGENTFORCE_TIMEOUT]) || 60000
    
    // Configure axios instance
    this.axiosInstance = axios.create({
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  async Start () {
    debug('Start called')
    
    try {
      // Step 1: Authenticate and get access token
      await this._authenticate()
      
      // Step 2: Start a session with the agent
      await this._startSession()
      
      debug(`Session started successfully with ID: ${this.sessionId}`)
    } catch (error) {
      debug('Error during Start:', error.message)
      throw new Error(`Failed to start AgentForce session: ${error.message}`)
    }
  }

  async UserSays (msg) {
    debug('UserSays called with message:', JSON.stringify(msg))
    
    if (!this.sessionId) {
      throw new Error('No active session. Please start a session first.')
    }

    try {
      const envelope = this._buildMessageEnvelope(msg)
      const response = await this._sendMessage(envelope)
      
      // Process the response and queue bot messages
      if (response) {
        const botMsg = this._parseIncomingMessage(response)
        if (botMsg) {
          this.queueBotSays(botMsg)
        }
      }
      
    } catch (error) {
      debug('Error in UserSays:', error.message)
      throw new Error(`Failed to send message to AgentForce: ${error.message}`)
    }
  }

  async Stop () {
    debug('Stop called')
    
    if (this.sessionId) {
      try {
        await this._endSession()
        debug('Session ended successfully')
      } catch (error) {
        debug('Error ending session:', error.message)
        // Don't throw error on cleanup
      }
    }
    
    this.sessionId = null
    this.accessToken = null
  }

  async Clean () {
    debug('Clean called')
    await this.Stop()
  }

  // Private methods for AgentForce API interaction
  async _authenticate() {
    debug('Authenticating with Salesforce...')
    
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
      debug('Authentication successful')
      
      // Update axios instance with access token
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`
      
    } catch (error) {
      debug('Authentication failed:', error.response?.data || error.message)
      throw new Error(`Authentication failed: ${error.response?.data?.error_description || error.message}`)
    }
  }

  async _startSession() {
    debug('Starting session with agent...')
    
    // Try different possible API endpoints for Agentforce
    const possibleEndpoints = [
      `/services/data/${this.apiVersion}/connect/conversation-management/conversations`,
      `/services/data/${this.apiVersion}/einstein/ai-agent/sessions`,
      `/services/data/${this.apiVersion}/agentforce/sessions`,
      `/services/data/${this.apiVersion}/connect/agentforce/sessions`
    ]
    
    const sessionUrl = `${this.caps[Capabilities.AGENTFORCE_INSTANCE_URL]}${possibleEndpoints[0]}`
    
    const sessionData = {
      agentId: this.caps[Capabilities.AGENTFORCE_AGENT_ID],
      requestParameters: {
        sessionId: this._generateSessionId()
      }
    }
    
    try {
      const response = await this.axiosInstance.post(sessionUrl, sessionData)
      
      this.sessionId = response.data.sessionId || response.data.id || sessionData.requestParameters.sessionId
      debug(`Session started with ID: ${this.sessionId}`)
      
    } catch (error) {
      debug('Failed to start session:', error.response?.data || error.message)
      throw new Error(`Failed to start session: ${error.response?.data?.error || error.message}`)
    }
  }

  _buildMessageEnvelope (msg) {
    const envelope = {
      messageText: msg.messageText || '',
      requestParameters: {
        sessionId: this.sessionId
      }
    }

    // Handle different message types similar to Blip connector
    if (msg.media && msg.media.length > 0) {
      envelope.attachments = msg.media.map(media => ({
        contentType: media.mimeType,
        contentUrl: media.mediaUri,
        name: media.altText || media.mediaUri.split('/').pop()
      }))
    }

    if (msg.buttons && msg.buttons.length > 0) {
      envelope.suggestedActions = {
        actions: msg.buttons.map(button => ({
          type: 'imBack',
          title: button.text,
          value: button.payload || button.text
        }))
      }
    }

    if (msg.forms && msg.forms.length > 0) {
      envelope.channelData = {
        forms: msg.forms.reduce((acc, form) => {
          acc[form.name] = form.value
          return acc
        }, {})
      }
    }

    return envelope
  }

  async _sendMessage(envelope) {
    debug('Sending message:', JSON.stringify(envelope))
    
    const messageUrl = `${this.caps[Capabilities.AGENTFORCE_INSTANCE_URL]}/services/data/${this.apiVersion}/einstein/ai-agent/sessions/${this.sessionId}/messages`
    
    try {
      const response = await this.axiosInstance.post(messageUrl, envelope)
      debug('Message sent successfully:', response.data)
      return response.data
      
    } catch (error) {
      debug('Failed to send message:', error.response?.data || error.message)
      throw new Error(`Failed to send message: ${error.response?.data?.error || error.message}`)
    }
  }

  _parseIncomingMessage (response) {
    const botMsg = { sender: 'bot', sourceData: response }
    
    // Handle different response types
    if (response.messages && Array.isArray(response.messages)) {
      // Multiple messages in response
      const firstMessage = response.messages[0]
      if (firstMessage) {
        this._parseMessageContent(firstMessage, botMsg)
      }
      
      // Queue additional messages
      for (let i = 1; i < response.messages.length; i++) {
        const additionalMsg = { sender: 'bot', sourceData: response.messages[i] }
        this._parseMessageContent(response.messages[i], additionalMsg)
        setTimeout(() => this.queueBotSays(additionalMsg), i * 100) // Small delay between messages
      }
    } else if (response.text || response.messageText) {
      // Single text response
      botMsg.messageText = response.text || response.messageText
    } else if (response.content) {
      // Content-based response
      this._parseMessageContent(response.content, botMsg)
    }

    // Handle NLP data similar to Blip connector
    if (response.nlp || response.intent) {
      botMsg.nlp = {
        intent: {
          name: response.intent?.name || response.nlp?.intent,
          confidence: parseFloat(response.intent?.confidence || response.nlp?.confidence || '1'),
          incomprehension: (response.intent?.name || response.nlp?.intent) === 'none'
        },
        entities: response.entities || response.nlp?.entities || []
      }
    }

    return botMsg
  }

  _parseMessageContent (content, botMsg) {
    if (typeof content === 'string') {
      botMsg.messageText = content
      return
    }

    // Handle different content types similar to Blip connector
    if (content.type === 'text' || !content.type) {
      botMsg.messageText = content.text || content.content || content.messageText
    } else if (content.type === 'card' || content.cards) {
      botMsg.cards = this._processCards(content.cards || [content])
    } else if (content.type === 'quickReplies' || content.buttons) {
      botMsg.messageText = content.text || content.messageText || 'Choose an option'
      botMsg.buttons = (content.buttons || content.quickReplies || []).map(button => ({
        text: button.text || button.title,
        payload: button.payload || button.value || button.text
      }))
    } else if (content.type === 'media' || content.attachments) {
      botMsg.media = (content.attachments || [content]).map(attachment => ({
        mimeType: attachment.contentType || attachment.type,
        mediaUri: attachment.contentUrl || attachment.url,
        altText: attachment.name || attachment.title
      }))
    } else if (content.type === 'list' || content.items) {
      botMsg.cards = (content.items || []).map(item => ({
        text: item.title || item.text,
        subtext: item.subtitle || item.description,
        content: item.content || item.text,
        buttons: (item.buttons || []).map(button => ({
          text: button.text || button.title,
          payload: button.payload || button.value
        }))
      }))
    }
  }

  _processCards (cards) {
    if (!Array.isArray(cards)) return []
    
    return cards.map(card => ({
      text: card.title || card.text,
      subtext: card.subtitle || card.description,
      content: card.content || card.text,
      image: card.image ? { mediaUri: card.image.url || card.image } : undefined,
      buttons: (card.buttons || []).map(button => ({
        text: button.text || button.title,
        payload: button.payload || button.value || button.text
      }))
    }))
  }

  async _endSession() {
    debug('Ending session...')
    
    const endUrl = `${this.caps[Capabilities.AGENTFORCE_INSTANCE_URL]}/services/data/${this.apiVersion}/einstein/ai-agent/sessions/${this.sessionId}`
    
    try {
      await this.axiosInstance.delete(endUrl)
      debug('Session ended successfully')
      
    } catch (error) {
      debug('Failed to end session:', error.response?.data || error.message)
      // Don't throw error for cleanup operations
    }
  }

  _generateSessionId() {
    return `botium-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: AgentForceConnector,
  PluginDesc: {
    name: 'Salesforce AgentForce',
    provider: 'Salesforce',
    avatar: null,
    helperText: 'Connect to Salesforce AgentForce AI agents for automated testing. Supports both client credentials and username/password authentication flows.',
    capabilities: [
      {
        name: Capabilities.AGENTFORCE_INSTANCE_URL,
        label: 'Salesforce Instance URL',
        description: 'The base URL of your Salesforce org (e.g., https://your-domain.my.salesforce.com)',
        type: 'url',
        required: true,
        sampleHeader: 'Salesforce Instance URL',
        sampleDescription: 'Enter your Salesforce org URL',
        sampleBody: 'https://your-domain.my.salesforce.com'
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
        description: 'Salesforce integration user username (for username/password flow)',
        type: 'string',
        required: false,
        sampleHeader: 'Salesforce Username',
        sampleDescription: 'Username of the integration user'
      },
      {
        name: Capabilities.AGENTFORCE_PASSWORD,
        label: 'Password',
        description: 'Password of the integration user',
        type: 'secret',
        required: false,
        sampleHeader: 'Salesforce Password',
        sampleDescription: 'Password of the integration user'
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
        label: 'Agent ID',
        description: 'The ID of the AgentForce agent to test',
        type: 'string',
        required: true,
        sampleHeader: 'AgentForce Agent ID',
        sampleDescription: 'The unique identifier of your AgentForce agent'
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
      securityTesting: true,
      audioInput: false,
      sendAttachments: true,
      supportedFileExtensions: ['.jpg', '.png', '.pdf', '.doc', '.docx'],
      mediaDownload: true,
      helloText: 'Hello, I am your AgentForce assistant'
    }
  }
}
