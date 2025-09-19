// File ini akan berjalan di Vercel sebagai serverless function
const fs = require('fs').promises;
const path = require('path');

const dbPath = path.resolve(__dirname, 'users-data.json');

const readDb = async () => {
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users.json:', error);
        return {};
    }
};

const writeDb = async (data) => {
    try {
        await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing to users.json:', error);
    }
};

module.exports = async (req, res) => {
    const users = await readDb();

    // Mengizinkan CORS untuk permintaan dari frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        // Endpoint untuk mendapatkan semua user
        res.status(200).json(users);
        return;
    }

    if (req.method === 'POST') {
        // Endpoint untuk menambah atau memperbarui user
        const { username, password, role, botToken, chatId, type, expiryDate } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Cek apakah user sudah ada
        if (users[username] && req.query.action !== 'update') {
             return res.status(409).json({ error: 'Username already exists' });
        }

        users[username] = {
            password,
            role: role || 'user',
            botToken: botToken || '',
            chatId: chatId || '',
            type: type || 'permanent',
            expiryDate: expiryDate || null
        };

        await writeDb(users);
        res.status(200).json({ message: 'User added/updated successfully', user: users[username] });
        return;
    }

    if (req.method === 'DELETE') {
        // Endpoint untuk menghapus user
        const { username } = req.body;
        if (username && users[username]) {
            delete users[username];
            await writeDb(users);
            return res.status(200).json({ message: 'User deleted successfully' });
        }
        res.status(404).json({ error: 'User not found' });
        return;
    }

    res.status(405).json({ error: 'Method not allowed' });
};
