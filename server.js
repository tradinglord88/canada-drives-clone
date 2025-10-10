const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Create database
const db = new sqlite3.Database('./database.db');

// Initialize database tables
db.serialize(() => {
    // Create users table for admin login
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create applications table for form submissions
    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_type TEXT NOT NULL,
        budget TEXT NOT NULL,
        trade_in TEXT NOT NULL,
        credit_score TEXT NOT NULL,
        employment TEXT NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default admin user if not exists
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['admin', defaultPassword]);
});

// API Routes

// Submit application
app.post('/api/applications', (req, res) => {
    const {
        vehicleType,
        budget,
        tradeIn,
        creditScore,
        employment,
        contactInfo
    } = req.body;

    const { firstName, lastName, email, phone, postalCode } = contactInfo;

    db.run(
        `INSERT INTO applications (
            vehicle_type, budget, trade_in, credit_score, employment,
            first_name, last_name, email, phone, postal_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [vehicleType, budget, tradeIn, creditScore, employment, firstName, lastName, email, phone, postalCode],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to submit application' });
            }
            res.json({ 
                success: true, 
                message: 'Application submitted successfully',
                applicationId: this.lastID 
            });
        }
    );
});

// Admin login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err || !user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
            res.json({ token, username: user.username });
        });
    });
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Get all applications (protected route)
app.get('/api/applications', authenticateToken, (req, res) => {
    db.all('SELECT * FROM applications ORDER BY submitted_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch applications' });
        }
        res.json(rows);
    });
});

// Get single application (protected route)
app.get('/api/applications/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM applications WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch application' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Application not found' });
        }
        res.json(row);
    });
});

// Delete application (protected route)
app.delete('/api/applications/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM applications WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete application' });
        }
        res.json({ success: true, message: 'Application deleted' });
    });
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`Green Light Automotive Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Default login - Username: admin, Password: admin123`);
});