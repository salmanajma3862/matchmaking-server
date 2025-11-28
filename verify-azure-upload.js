const fs = require('fs');

// Polyfill for fetch and FormData if needed (Node < 18)
// But assuming Node 18+ for now.

const API_URL = 'http://localhost:5000/api';

async function run() {
    try {
        console.log('1. Registering User 1...');
        const user1Res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User 1',
                email: `test1_${Date.now()}@example.com`,
                password: 'password123',
                gender: 'male',
                dateOfBirth: '1990-01-01',
                city: 'Lahore',
                country: 'Pakistan'
            })
        });
        const user1 = await user1Res.json();
        if (!user1.token) throw new Error('Failed to register user 1: ' + JSON.stringify(user1));
        console.log('User 1 registered:', user1.user.id);

        console.log('2. Registering User 2...');
        const user2Res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User 2',
                email: `test2_${Date.now()}@example.com`,
                password: 'password123',
                gender: 'female',
                dateOfBirth: '1992-01-01',
                city: 'Karachi',
                country: 'Pakistan'
            })
        });
        const user2 = await user2Res.json();
        if (!user2.token) throw new Error('Failed to register user 2: ' + JSON.stringify(user2));
        console.log('User 2 registered:', user2.user.id);

        console.log('3. Creating Conversation...');
        const convRes = await fetch(`${API_URL}/chat/conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${user1.token}`
            },
            body: JSON.stringify({ participantId: user2.user.id })
        });
        const conversation = await convRes.json();
        console.log('Conversation created:', conversation._id);

        console.log('4. Sending Photo Message...');
        // Create a dummy file
        fs.writeFileSync('test-image.png', 'dummy image content');

        const formData = new FormData();
        formData.append('conversationId', conversation._id);
        formData.append('text', 'Check out this photo!');
        formData.append('messageType', 'image');
        // Node's native fetch FormData might need a Blob or File object.
        // If using 'undici' (built-in in Node 18), we can pass a Blob.
        const fileBuffer = fs.readFileSync('test-image.png');
        const blob = new Blob([fileBuffer], { type: 'image/png' });
        formData.append('image', blob, 'test-image.png');

        const msgRes = await fetch(`${API_URL}/chat/send`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${user1.token}`
            },
            body: formData
        });

        const message = await msgRes.json();
        if (!message._id) throw new Error('Failed to send message: ' + JSON.stringify(message));
        console.log('Message sent:', message._id);

        if (message.media && message.media.mediaId) {
            console.log('✅ Media ID present:', message.media.mediaId);
        } else {
            console.error('❌ Media ID missing in response');
        }

        console.log('5. Fetching Messages...');
        const getMsgRes = await fetch(`${API_URL}/chat/messages/${conversation._id}`, {
            headers: {
                'Authorization': `Bearer ${user2.token}`
            }
        });
        const messages = await getMsgRes.json();
        const lastMsg = messages[0]; // Should be the one we just sent (or last in list)

        console.log('Fetched message media:', lastMsg.media);

        if (lastMsg.media && lastMsg.media.imageUrl && lastMsg.media.imageUrl.includes('sig=')) {
            console.log('✅ SAS Token present in imageUrl');
        } else {
            console.error('❌ SAS Token missing or invalid in imageUrl');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

run();
