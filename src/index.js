const debug = require('debug')('botium-connector-agentforce')
const crypto = require('crypto')

const Capabilities = {
  AGENTFORCE_INSTANCE_URL: 'AGENTFORCE_INSTANCE_URL',
  AGENTFORCE_CLIENT_ID: 'AGENTFORCE_CLIENT_ID',
  AGENTFORCE_CLIENT_SECRET: 'AGENTFORCE_CLIENT_SECRET',
  AGENTFORCE_AGENT_ID: 'AGENTFORCE_AGENT_ID',
  AGENTFORCE_API_VERSION: 'AGENTFORCE_API_VERSION'
}

class AgentForceConnector {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.accessToken = null
    this.sessionId = null
    this.sequenceId = 1
    this.timeout = 60000
  }

  Validate () {
    debug('Validating configuration')

    const requiredCaps = [
      Capabilities.AGENTFORCE_INSTANCE_URL,
      Capabilities.AGENTFORCE_CLIENT_ID,
      Capabilities.AGENTFORCE_CLIENT_SECRET,
      Capabilities.AGENTFORCE_AGENT_ID
    ]

    for (const cap of requiredCaps) {
      if (!this.caps[cap]) {
        throw new Error(`${cap} capability is required`)
      }
    }

    return Promise.resolve()
  }

  async Build () {
    debug('Building connector')

    this.apiVersion = this.caps[Capabilities.AGENTFORCE_API_VERSION] || 'v61.0'
    this.agentId = this.caps[Capabilities.AGENTFORCE_AGENT_ID]
    this.sfApiHost = this.caps[Capabilities.AGENTFORCE_INSTANCE_URL]
    this.sfOrgDomain = this.caps[Capabilities.AGENTFORCE_INSTANCE_URL]

    debug('Configuration complete', {
      apiVersion: this.apiVersion,
      agentId: this.agentId,
      sfApiHost: this.sfApiHost
    })
  }

  async Start () {
    debug('Starting connector')

    try {
      await this._authenticate()
      await this._startSession()
      debug('Connector started successfully')
    } catch (error) {
      debug('Failed to start connector:', error.message)
      throw new Error(`Failed to start AgentForce connection: ${error.message}`)
    }
  }

  async UserSays (msg) {
    debug('Processing user message:', msg.messageText)

    if (!this.accessToken) {
      throw new Error('No access token available')
    }

    if (!this.sessionId) {
      throw new Error('No session available')
    }

    try {
      const response = await this._sendMessageToAgent(msg)
      debug('Agent response received')

      if (response && response.outputs) {
        for (const output of response.outputs) {
          const botMsg = this._parseAgentResponse(output, msg)
          if (botMsg) {
            this.queueBotSays(botMsg)
          }
        }
      }
    } catch (error) {
      debug('Error processing message:', error.message)
      throw new Error(`Failed to process message: ${error.message}`)
    }
  }

  async Stop () {
    debug('Stopping connector')

    try {
      if (this.sessionId) {
        await this._endSession()
      }
    } catch (error) {
      debug('Error ending session:', error.message)
    }

    this.accessToken = null
    this.sessionId = null
  }

  async Clean () {
    debug('Cleaning up connector')
    await this.Stop()
  }

  async _authenticate () {
    debug('Authenticating with Salesforce')

    const authUrl = `${this.sfOrgDomain}/services/oauth2/token`

    const authData = {
      grant_type: 'client_credentials',
      client_id: this.caps[Capabilities.AGENTFORCE_CLIENT_ID],
      client_secret: this.caps[Capabilities.AGENTFORCE_CLIENT_SECRET]
    }

    try {
      const response = await this._httpRequest(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        },
        body: new URLSearchParams(authData)
      })

      if (!response.data.access_token) {
        throw new Error('No access token received from Salesforce')
      }

      this.accessToken = response.data.access_token
      debug('Authentication successful')
    } catch (error) {
      const errorMsg = error.response?.data?.error_description ||
                      error.response?.data?.error ||
                      error.message
      debug('Authentication failed:', errorMsg)
      throw new Error(`Salesforce authentication failed: ${errorMsg}`)
    }
  }

  async _startSession () {
    debug('Starting Agentforce session')

    const sessionUrl = `${this.sfApiHost}/einstein/ai-agent/v1/agents/${this.agentId}/sessions`

    const sessionData = {
      externalSessionKey: crypto.randomUUID(),
      instanceConfig: {
        endpoint: this.sfOrgDomain
      },
      streamingCapabilities: {
        chunkTypes: ['Text']
      },
      bypassUser: true
    }

    try {
      const response = await this._httpRequest(sessionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(sessionData)
      })

      if (response.data.sessionId) {
        this.sessionId = response.data.sessionId
      } else if (response.data.id) {
        this.sessionId = response.data.id
      } else {
        throw new Error('No session ID received from Agent API')
      }

      debug('Session started successfully:', this.sessionId)
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message ||
                      error.response?.data?.message ||
                      error.message
      debug('Session creation failed:', errorMsg)
      throw new Error(`Failed to start Agent session: ${errorMsg}`)
    }
  }

  async _sendMessageToAgent (msg) {
    debug('Sending message to agent')

    const messageUrl = `${this.sfApiHost}/einstein/ai-agent/v1/sessions/${this.sessionId}/messages`

    const messageData = {
      message: msg.messageText || msg.text || '',
      sequenceId: this.sequenceId
    }

    this.sequenceId++

    try {
      const response = await this._httpRequest(messageUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(messageData)
      })

      debug('Message sent successfully')
      return response.data
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message ||
                      error.response?.data?.message ||
                      error.message
      debug('Message sending failed:', errorMsg)
      throw new Error(`Failed to send message to agent: ${errorMsg}`)
    }
  }

  async _endSession () {
    debug('Ending Agentforce session')

    if (!this.sessionId) {
      return
    }

    const endUrl = `${this.sfApiHost}/einstein/ai-agent/v1/sessions/${this.sessionId}`

    try {
      await this._httpRequest(endUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: 'application/json'
        }
      })

      debug('Session ended successfully')
    } catch (error) {
      debug('Error ending session:', error.message)
    }
  }

  _parseAgentResponse (output, _originalMsg) {
    if (!output) {
      return null
    }

    const botMsg = {
      sender: 'bot',
      sourceData: output
    }

    if (output.type === 'text' && output.text) {
      botMsg.messageText = output.text
    } else if (output.type === 'richContent' && output.richContent) {
      botMsg.messageText = output.richContent.text || 'Rich content response'

      if (output.richContent.elements) {
        botMsg.cards = this._parseRichContentElements(output.richContent.elements)
      }
    } else if (output.text) {
      botMsg.messageText = output.text
    } else {
      botMsg.messageText = 'Agent response received'
    }

    if (output.intent) {
      botMsg.nlp = {
        intent: {
          name: output.intent.name || 'unknown',
          confidence: output.intent.confidence || 0.9,
          incomprehension: output.intent.name === 'unknown'
        }
      }

      if (output.entities && Array.isArray(output.entities)) {
        botMsg.nlp.entities = output.entities
      }
    }

    return botMsg
  }

  _parseRichContentElements (elements) {
    if (!Array.isArray(elements)) {
      return []
    }

    return elements.map(element => {
      const card = {
        text: element.title || 'Card',
        subtext: element.subtitle || element.description || ''
      }

      if (element.imageUrl) {
        card.image = { mediaUri: element.imageUrl }
      }

      if (element.buttons && Array.isArray(element.buttons)) {
        card.buttons = element.buttons.map(button => ({
          text: button.label || button.text || 'Button',
          payload: button.value || button.payload || button.text || 'button_click'
        }))
      }

      return card
    })
  }

  async _httpRequest (url, options = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Botium-Agentforce-Connector/1.0'
    }

    const fetchOptions = {
      method: options.method || 'GET',
      headers: { ...defaultHeaders, ...options.headers },
      ...options
    }

    if (options.body) {
      fetchOptions.body = options.body
    }

    const response = await fetch(url, fetchOptions)

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch (e) {
        errorData = { error: errorText }
      }

      const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
      error.response = {
        status: response.status,
        statusText: response.statusText,
        data: errorData
      }
      throw error
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return {
        data: await response.json(),
        status: response.status,
        statusText: response.statusText
      }
    } else {
      return {
        data: await response.text(),
        status: response.status,
        statusText: response.statusText
      }
    }
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: AgentForceConnector,
  PluginDesc: {
    name: 'Salesforce Agentforce Connector',
    provider: 'Salesforce',
    avatar: null,
    capabilities: [
      {
        name: Capabilities.AGENTFORCE_INSTANCE_URL,
        label: 'Salesforce Instance URL',
        type: 'string',
        required: true,
        description: 'Salesforce organization URL (e.g., https://myorg.my.salesforce.com)'
      },
      {
        name: Capabilities.AGENTFORCE_CLIENT_ID,
        label: 'Client ID',
        type: 'string',
        required: true,
        description: 'Connected App Consumer Key from Salesforce'
      },
      {
        name: Capabilities.AGENTFORCE_CLIENT_SECRET,
        label: 'Client Secret',
        type: 'secret',
        required: true,
        description: 'Connected App Consumer Secret from Salesforce'
      },
      {
        name: Capabilities.AGENTFORCE_AGENT_ID,
        label: 'Agent ID',
        type: 'string',
        required: true,
        description: 'Salesforce Agentforce Agent ID (18-character ID starting with 0Xx)'
      },
      {
        name: Capabilities.AGENTFORCE_API_VERSION,
        label: 'API Version',
        type: 'string',
        required: false,
        description: 'Salesforce API Version (default: v61.0)'
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
      mediaDownload: false
    }
  }
}
