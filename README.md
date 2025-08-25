# Botium Connector for Salesforce Agentforce

A professional Botium connector for testing Salesforce Agentforce chatbots using the real Agent API.

## Installation

```bash
npm install botium-connector-agentforce
```

## Configuration

### Required Capabilities

| Capability | Type | Required | Description |
|------------|------|----------|-------------|
| `AGENTFORCE_INSTANCE_URL` | string | Yes | Salesforce org URL (e.g., https://myorg.my.salesforce.com) |
| `AGENTFORCE_CLIENT_ID` | string | Yes | Connected App Consumer Key from Salesforce |
| `AGENTFORCE_CLIENT_SECRET` | secret | Yes | Connected App Consumer Secret from Salesforce |
| `AGENTFORCE_AGENT_ID` | string | Yes | Agentforce Agent ID (18-character ID starting with 0Xx) |

### Optional Capabilities

| Capability | Type | Default | Description |
|------------|------|---------|-------------|
| `AGENTFORCE_API_VERSION` | string | v61.0 | Salesforce API version |

## Setup Instructions

### 1. Create Salesforce Connected App

1. In Salesforce Setup, navigate to **App Manager**
2. Click **New Connected App**
3. Fill in basic information:
   - Connected App Name: `Botium Agentforce Connector`
   - API Name: `Botium_Agentforce_Connector`
   - Contact Email: Your email address
4. Enable **OAuth Settings**:
   - Callback URL: `https://login.salesforce.com/services/oauth2/success`
   - Selected OAuth Scopes: Add required scopes
5. Save the Connected App
6. After saving, click **Edit** and enable **Client Credentials Flow**
7. Set **Run As** to your user account
8. Note the **Consumer Key** (Client ID) and **Consumer Secret**

### 2. Configure Agentforce Agent

1. Ensure Agentforce is enabled in your Salesforce org
2. Create or configure your Agentforce agent
3. Publish and activate the agent
4. Copy the 18-character Agent ID from the agent URL

### 3. Botium Box Configuration

Configure the following capabilities in your Botium Box project:

```json
{
  "CONTAINERMODE": "agentforce",
  "AGENTFORCE_INSTANCE_URL": "https://your-org.my.salesforce.com",
  "AGENTFORCE_CLIENT_ID": "your_consumer_key",
  "AGENTFORCE_CLIENT_SECRET": "your_consumer_secret",
  "AGENTFORCE_AGENT_ID": "0XxXXXXXXXXXXXXXXX"
}
```

## Testing Authentication

Use the provided test file to verify your configuration:

```bash
node prove-authentication.js
```

Update the configuration in the test file with your actual credentials before running.

## Features

- **Real API Integration**: Connects directly to Salesforce Agent API
- **OAuth2 Authentication**: Secure Client Credentials Flow
- **Session Management**: Automatic session creation and cleanup
- **Message Processing**: Full support for text and rich content
- **Intent Recognition**: NLP intent and entity extraction
- **Error Handling**: Comprehensive error reporting

## Supported Message Types

### Text Messages
Standard text message exchange between user and agent.

### Rich Content
- **Cards**: Title, subtitle, and image support
- **Buttons**: Interactive button responses
- **Entities**: Extracted entities with confidence scores
- **Intents**: Recognized intents with confidence levels

## Example Usage

```javascript
const AgentForceConnector = require('./index.js').PluginClass;

const connector = new AgentForceConnector({
  queueBotSays: (botMsg) => {
    console.log('Agent Response:', botMsg.messageText);
  },
  caps: {
    AGENTFORCE_INSTANCE_URL: 'https://your-org.my.salesforce.com',
    AGENTFORCE_CLIENT_ID: 'your_consumer_key',
    AGENTFORCE_CLIENT_SECRET: 'your_consumer_secret',
    AGENTFORCE_AGENT_ID: '0XxXXXXXXXXXXXXXXX'
  }
});

async function testBot() {
  try {
    await connector.Validate();
    await connector.Build();
    await connector.Start();
    
    await connector.UserSays({ messageText: 'Hello' });
    
    await connector.Stop();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBot();
```

## Troubleshooting

### Authentication Issues
- Verify Connected App Consumer Key and Secret are correct
- Ensure Client Credentials Flow is enabled in the Connected App
- Check that the Run As user has appropriate permissions

### Session Creation Issues
- Verify the Agent ID is the correct 18-character ID
- Ensure the Agentforce agent is published and active
- Check that your Salesforce org has Agent API access enabled

### API Availability
- Agent API may not be available in all Salesforce editions
- Developer Edition orgs may have limited API access
- Contact Salesforce Support if APIs are not available in your org

## Requirements

- Salesforce org with Agentforce enabled
- Connected App with Client Credentials Flow
- Published Agentforce agent
- Node.js and npm

## License

MIT License