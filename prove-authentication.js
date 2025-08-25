const fetch = require('node-fetch');

// Configuration for testing authentication
const config = {
  AGENTFORCE_INSTANCE_URL: 'your_instance_url', //https://orgfarm-d52f78d6ac-dev-ed.develop.my.salesforce.com
  AGENTFORCE_CLIENT_ID: 'Your_Client_ID',
  AGENTFORCE_CLIENT_SECRET: 'Your_Client_Secret',
  AGENTFORCE_AGENT_ID: '0050X0000000000'
};



async function testAuthentication() {
  console.log('\nTesting Salesforce Authentication');
  console.log('================================\n');

  try {
    // Test authentication
    console.log('Step 1: Testing authentication...');
    console.log('URL:', `${config.AGENTFORCE_INSTANCE_URL}/services/oauth2/token`);
    
    const authData = {
      grant_type: 'client_credentials',
      client_id: config.AGENTFORCE_CLIENT_ID,
      client_secret: config.AGENTFORCE_CLIENT_SECRET
    };
    
    const authResponse = await fetch(`${config.AGENTFORCE_INSTANCE_URL}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams(authData)
    });
    
    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      console.log('Authentication failed');
      console.log('Status:', authResponse.status, authResponse.statusText);
      console.log('Error:', errorText);
      return;
    }
    
    const authResult = await authResponse.json();
    
    console.log('Authentication successful');
    console.log('Access token received:', authResult);
   
    
    // Test session creation with the token
    console.log('\nStep 2: Testing session creation...');
    console.log('URL:', `${config.AGENTFORCE_INSTANCE_URL}/einstein/ai-agent/v1/agents/${config.AGENTFORCE_AGENT_ID}/sessions`);
    
    const sessionData = {
      externalSessionKey: `session-${Date.now()}`,
      instanceConfig: {
        endpoint: config.AGENTFORCE_INSTANCE_URL
      },
      streamingCapabilities: {
        chunkTypes: ["Text"]
      },
      bypassUser: true
    };
    
    const sessionResponse = await fetch(`${config.AGENTFORCE_INSTANCE_URL}/einstein/ai-agent/v1/agents/${config.AGENTFORCE_AGENT_ID}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authResult.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(sessionData)
    });
    
    const sessionResult = await sessionResponse.text();
    
    if (sessionResponse.ok) {
      console.log('Session creation successful');
      console.log('Response:', sessionResult);
      
      // Try to parse session response
      try {
        const sessionJson = JSON.parse(sessionResult);
        if (sessionJson.sessionId) {
          console.log('Session ID received:', sessionJson.sessionId);
        }
      } catch (e) {
        console.log('Response format may vary');
      }
      
    } else {
      console.log('Session creation failed');
      console.log('Status:', sessionResponse.status, sessionResponse.statusText);
      console.log('Response:', sessionResult.substring(0, 500));
      
      if (sessionResult.includes('URL No Longer Exists')) {
        console.log('Analysis: Agent API endpoints are not available in this org');
      }
    }
    
  } catch (error) {
    console.log('Test error:', error.message);
  }
  
  console.log('\nTest Summary');
  console.log('Authentication: Tests if credentials work with Salesforce');
  console.log('Session Creation: Tests if Agent API is available');
  console.log('If authentication passes but session fails with 404, the API is not available in your org');
}

testAuthentication();