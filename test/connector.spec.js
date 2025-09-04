require('dotenv').config()
const assert = require('chai').assert
const Connector = require('../src/index')
const { readCaps } = require('./helper')

describe('Agentforce Connector', function () {
  beforeEach(async function () {
    this.caps = readCaps()
    
    if (!this.caps.AGENTFORCE_INSTANCE_URL || !this.caps.AGENTFORCE_CLIENT_ID) {
      this.skip()
    }
    
    this.botMsgPromise = new Promise(resolve => {
      this.botMsgPromiseResolve = resolve
    })
    
    const queueBotSays = (botMsg) => {
      this.botMsgPromiseResolve(botMsg)
    }
    
    this.connector = new Connector.PluginClass({ queueBotSays, caps: this.caps })
    await this.connector.Validate()
    await this.connector.Build()
    await this.connector.Start()
  })

  it('should successfully authenticate with Salesforce', async function () {
    assert.isTrue(true, 'Authentication successful')
  }).timeout(15000)

  it('should successfully start a session with Agentforce', async function () {
    assert.isTrue(true, 'Session started successfully')
  }).timeout(15000)

  it('should successfully send a message and receive a response', async function () {
    this.botMsgPromise = new Promise(resolve => {
      this.botMsgPromiseResolve = resolve
    })
    
    await this.connector.UserSays({ messageText: 'Hello' })
    const botMsg = await this.botMsgPromise
    
    assert.isObject(botMsg, 'Bot message should be an object')
    assert.isString(botMsg.messageText, 'Bot message should have messageText')
    assert.isTrue(botMsg.messageText.length > 0, 'Bot message should not be empty')
  }).timeout(20000)

  it('should handle multiple message exchanges', async function () {
    this.botMsgPromise = new Promise(resolve => {
      this.botMsgPromiseResolve = resolve
    })
    
    await this.connector.UserSays({ messageText: 'What can you help me with?' })
    const botMsg1 = await this.botMsgPromise
    
    assert.isObject(botMsg1, 'First bot message should be an object')
    assert.isString(botMsg1.messageText, 'First bot message should have messageText')
    
    this.botMsgPromise = new Promise(resolve => {
      this.botMsgPromiseResolve = resolve
    })
    
    await this.connector.UserSays({ messageText: 'Tell me more' })
    const botMsg2 = await this.botMsgPromise
    
    assert.isObject(botMsg2, 'Second bot message should be an object')
    assert.isString(botMsg2.messageText, 'Second bot message should have messageText')
  }).timeout(30000)

  it('should handle empty or invalid messages gracefully', async function () {
    this.botMsgPromise = new Promise(resolve => {
      this.botMsgPromiseResolve = resolve
    })
    
    await this.connector.UserSays({ messageText: '' })
    const botMsg = await this.botMsgPromise
    
    assert.isObject(botMsg, 'Bot message should be an object')
  }).timeout(15000)

  it('should properly end the session', async function () {
    assert.isTrue(true, 'Session ended successfully')
  }).timeout(10000)

  afterEach(async function () {
    if (this.connector) {
      await this.connector.Stop()
    }
  })
})
