const jwt = require('jsonwebtoken');

const BASE_URL = 'http://localhost:5000/api';
const JWT_SECRET = 'itsd_tracker_secret_2026_antigravity';

async function verifyIdentityEnforcement() {
    console.log('--- Starting Identity Enforcement Verification (Native Fetch) ---');

    // 1. Create a token for a specific user
    const adminUser = { id: 1, name: 'HAROLD ADMIN', role: 'ADMIN' };
    const adminToken = jwt.sign(adminUser, JWT_SECRET);

    try {
        console.log('Test 1: Administrative action attribution');
        const logData = {
            action: 'Test Action',
            details: 'Testing identity enforcement',
            module: 'System',
            // Attempt to spoof identity in the body
            user: 'EDUARD',
            role: 'USER',
            userId: 999
        };

        const response = await fetch(`${BASE_URL}/logs`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify(logData)
        });

        const logged = await response.json();
        console.log('Log created:', logged);

        if (logged.user === 'HAROLD ADMIN' && logged.role === 'ADMIN' && logged.userId === 1) {
            console.log('[PASS] Backend successfully enforced identity from token (overrode spoof data)');
        } else {
            console.error('[FAIL] Backend persisted spoofed identity data!');
            console.error(`Received: user=${logged.user}, role=${logged.role}, userId=${logged.userId}`);
        }

    } catch (err) {
        console.error('[ERROR] Test failed:', err.message);
    }

    console.log('--- Verification Complete ---');
}

verifyIdentityEnforcement();
