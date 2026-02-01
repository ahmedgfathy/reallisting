
const fetch = require('node-fetch');

// Adjust the URL if necessary (assuming localhost based on apiConfig)
const API_BASE = 'http://localhost:5001/api';

async function verify() {
    console.log('1. Testing Message Deletion Fix...');

    // We cannot easily create a message without auth token effectively if RLS is on.
    // However, we can try to hit the delete endpoint with a dummy ID and see if we get the 404/403 with our new message.

    const dummyId = 'dummy-id-' + Date.now();

    try {
        const response = await fetch(`${API_BASE}/admin?path=messages`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                // We'd need a token here. If we don't have one, this test is limited to checking if it rejects us correctly.
                // Assuming we might not have a valid token handy in this script context without login.
            },
            body: JSON.stringify({ ids: [dummyId] })
        });

        // We expect 401 Unauthorized if no token, or 404/403 if token but ID not found/no permission
        console.log(`Status: ${response.status}`);
        const data = await response.json();
        console.log('Response:', data);

        if (response.status === 401) {
            console.log('✅ Correctly received 401 Unauthorized (Backend is reachable)');
        } else if (response.status === 404 && data.error && data.error.includes('No messages were deleted')) {
            console.log('✅ Correctly received 404 with new error message (Fix active)');
        } else {
            console.log('⚠️ received unexpected response, but API is likely active.');
        }

    } catch (err) {
        console.error('❌ Request failed:', err.message);
        console.log('This might be because the server is not running on port 5001');
    }
}

verify();
