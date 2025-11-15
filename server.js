const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image and PDF files are allowed'));
        }
    }
});

if (!JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables');
    process.exit(1);
}

// CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8000').split(',');
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
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
        income_type TEXT,
        annual_income TEXT,
        income_years INTEGER,
        income_months INTEGER,
        company_name TEXT,
        job_title TEXT,
        monthly_income TEXT,
        income_verified TEXT,
        paystub_path TEXT,
        drivers_license_path TEXT,
        trade_in_photos TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default admin user if not exists
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
    const defaultPassword = bcrypt.hashSync(adminPassword, 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, [adminUsername, defaultPassword], function(err) {
        if (!err && this.changes > 0) {
            console.warn(`⚠️  WARNING: Default admin account created!`);
            console.warn(`⚠️  Please change the admin password immediately after first login`);
        }
    });
});

// API Routes

// Submit application with file uploads
app.post('/api/applications', upload.fields([
    { name: 'paystub', maxCount: 1 },
    { name: 'driversLicense', maxCount: 1 },
    { name: 'tradeInPhotos', maxCount: 5 }
]), (req, res) => {
    try {
        // Parse the applicationData JSON string from FormData
        let applicationData;
        try {
            applicationData = JSON.parse(req.body.applicationData);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            return res.status(400).json({
                success: false,
                error: 'Invalid application data format'
            });
        }

        const {
            vehicleType,
            budget,
            tradeIn,
            creditScore,
            employment,
            contactInfo,
            incomeType,
            annualIncome,
            incomeYears,
            incomeMonths,
            companyName,
            jobTitle,
            monthlyIncome,
            incomeVerified
        } = applicationData;

        const { firstName, lastName, email, phone, postalCode } = contactInfo || {};

        // Validate required fields
        if (!vehicleType || !budget || !tradeIn || !creditScore || !employment || !firstName || !lastName || !email || !phone) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        // Get uploaded file paths
        const paystubPath = req.files && req.files['paystub'] ? req.files['paystub'][0].path : null;
        const driversLicensePath = req.files && req.files['driversLicense'] ? req.files['driversLicense'][0].path : null;
        const tradeInPhotos = req.files && req.files['tradeInPhotos']
            ? JSON.stringify(req.files['tradeInPhotos'].map(file => file.path))
            : null;

        // Insert into database
        db.run(
            `INSERT INTO applications (
                vehicle_type, budget, trade_in, credit_score, employment,
                first_name, last_name, email, phone, postal_code,
                income_type, annual_income, income_years, income_months,
                company_name, job_title, monthly_income, income_verified,
                paystub_path, drivers_license_path, trade_in_photos
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                vehicleType, budget, tradeIn, creditScore, employment,
                firstName, lastName, email, phone, postalCode,
                incomeType, annualIncome, incomeYears, incomeMonths,
                companyName, jobTitle, monthlyIncome, incomeVerified,
                paystubPath, driversLicensePath, tradeInPhotos
            ],
            function(err) {
                if (err) {
                    console.error('Database Error:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'Failed to submit application'
                    });
                }

                console.log(`✓ Application submitted successfully - ID: ${this.lastID}`);
                res.json({
                    success: true,
                    message: 'Application submitted successfully',
                    applicationId: this.lastID
                });
            }
        );
    } catch (error) {
        console.error('Application Submission Error:', error);
        res.status(500).json({
            success: false,
            error: 'An error occurred while processing your application'
        });
    }
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
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Serve old admin for backwards compatibility
app.get('/admin-old', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

app.listen(PORT, () => {
    console.log(`✓ Green Light Automotive Server running on http://localhost:${PORT}`);
    console.log(`✓ Admin panel: http://localhost:${PORT}/admin`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});