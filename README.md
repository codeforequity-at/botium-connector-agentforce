# Botium Connector for Salesforce Agentforce

A Botium connector for testing Salesforce Agentforce chatbots using Botium Box.

## Installation

```bash
npm install botium-connector-agentforce
```

## Configuration

### Required Capabilities

The following capabilities must be configured in your Botium Box project:

| Capability | Type | Required | Description |
|------------|------|----------|-------------|
| `AGENTFORCE_INSTANCE_URL` | string | Yes | Salesforce org URL (e.g., https://mydomain.my.salesforce.com) |
| `AGENTFORCE_AGENT_ID` | string | Yes | ID of the Agentforce agent to connect to |

### Authentication Methods

Choose one of the following authentication methods:

#### Method 1: Client Credentials Flow (Recommended)
| Capability | Type | Required | Description |
|------------|------|----------|-------------|
| `AGENTFORCE_CLIENT_ID` | string | Yes | Consumer Key from Salesforce Connected App |
| `AGENTFORCE_CLIENT_SECRET` | secret | Yes | Client Secret from Salesforce Connected App |

#### Method 2: Username/Password Flow
| Capability | Type | Required | Description |
|------------|------|----------|-------------|
| `AGENTFORCE_USERNAME` | string | Yes | Salesforce integration user username |
| `AGENTFORCE_PASSWORD` | secret | Yes | Password of the integration user |
| `AGENTFORCE_SECURITY_TOKEN` | secret | No | Security token (required if IP not whitelisted) |

### Optional Capabilities

| Capability | Type | Default | Description |
|------------|------|---------|-------------|
| `AGENTFORCE_API_VERSION` | choice | v60.0 | Salesforce API version |
| `AGENTFORCE_TIMEOUT` | int | 60000 | Request timeout in milliseconds |

## Setup Instructions

### 1. Salesforce Connected App Setup

1. In Salesforce Setup, go to **App Manager**
2. Click **New Connected App**
3. Fill in basic information
4. Enable **OAuth Settings**
5. Add OAuth Scopes:
   - `Full access (full)`
   - `Perform requests on your behalf at any time (refresh_token, offline_access)`
6. For Client Credentials Flow:
   - Enable **Client Credentials Flow**
   - Set appropriate policies
7. Save and note the **Consumer Key** and **Consumer Secret**

### 2. Agentforce Agent Setup

1. Ensure you have Agentforce enabled in your Salesforce org
2. Create or identify your Agentforce agent
3. Note the Agent ID from the agent configuration

### 3. Botium Configuration

Create a `botium.json` file:

```json
{
  "botium": {
    "Capabilities": {
      "CONTAINERMODE": "agentforce",
      "AGENTFORCE_INSTANCE_URL": "https://your-domain.my.salesforce.com",
      "AGENTFORCE_CLIENT_ID": "your_consumer_key",
      "AGENTFORCE_CLIENT_SECRET": "your_consumer_secret",
      "AGENTFORCE_AGENT_ID": "your_agent_id"
    }
  }
}
```

## Features

- ✅ **Authentication**: Supports both Client Credentials and Username/Password flows
- ✅ **Session Management**: Automatic session creation and cleanup
- ✅ **Message Types**: Text, cards, buttons, media attachments
- ✅ **NLP Support**: Intent and entity recognition
- ✅ **Error Handling**: Comprehensive error handling and debugging
- ✅ **Timeout Configuration**: Configurable request timeouts

## Supported Message Types

### Text Messages
Simple text messages are supported in both directions.

### Rich Content
- **Cards**: Support for card-based responses with titles, subtitles, and images
- **Buttons**: Quick reply buttons and suggested actions
- **Media**: Image, document, and file attachments
- **Lists**: Structured list responses

### NLP Features
- **Intent Recognition**: Automatic intent detection from responses
- **Entity Extraction**: Entity recognition and confidence scores
- **Confidence Scoring**: Intent confidence levels

## Example Usage

```javascript
const AgentforceConnector = require('botium-connector-agentforce')

const connector = new AgentforceConnector.PluginClass({
  queueBotSays: (botMsg) => console.log('Bot says:', botMsg),
  caps: {
    AGENTFORCE_INSTANCE_URL: 'https://your-domain.my.salesforce.com',
    AGENTFORCE_CLIENT_ID: 'your_consumer_key',
    AGENTFORCE_CLIENT_SECRET: 'your_consumer_secret',
    AGENTFORCE_AGENT_ID: 'your_agent_id'
  }
})

async function testBot() {
  await connector.Validate()
  await connector.Build()
  await connector.Start()
  
  await connector.UserSays({ messageText: 'Hello' })
  
  await connector.Stop()
  await connector.Clean()
}

testBot().catch(console.error)
```

## Troubleshooting

### Authentication Issues
- Verify your Connected App settings
- Check that OAuth scopes are correctly configured
- Ensure Client Credentials Flow is enabled (if using that method)
- For Username/Password flow, verify the security token if required

### Session Issues
- Verify the Agent ID is correct
- Check that the Agentforce agent is active and published
- Ensure your user has access to the Agentforce agent

### API Issues
- Check the Salesforce API version compatibility
- Verify your org has Agentforce enabled
- Review Salesforce API limits and usage

## License

MIT License - see LICENSE file for details.
