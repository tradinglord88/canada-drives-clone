const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config();

// Database imports - use Vercel Postgres in production, SQLite locally
const isVercel = process.env.VERCEL === '1' || process.env.POSTGRES_URL;
let sql, db;

if (isVercel) {
    // Import Vercel Postgres
    sql = require('@vercel/postgres').sql;
} else {
    // Use SQLite for local development
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database('./database.db');
}

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET;

// Create uploads directory if it doesn't exist
const uploadsDir = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads');
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
    limits: { fileSize: 10 * 1024 * 1024 },
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
    if (!isVercel) process.exit(1);
}

// CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8000,https://www.greenlightautosolutions.ca,https://greenlightautosolutions.ca').split(',');
app.use(cors({
    origin: function(origin, callback) {
        if (!origin || allowedOrigins.some(o => origin.includes(o.replace('https://', '').replace('http://', '')))) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for now
        }
    },
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// Initialize database tables
async function initDatabase() {
    if (isVercel) {
        // Vercel Postgres
        try {
            await sql`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            await sql`
                CREATE TABLE IF NOT EXISTS applications (
                    id SERIAL PRIMARY KEY,
                    vehicle_type TEXT NOT NULL,
                    budget TEXT NOT NULL,
                    trade_in TEXT NOT NULL,
                    credit_score TEXT NOT NULL,
                    employment TEXT NOT NULL,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    email TEXT NOT NULL,
                    phone TEXT NOT NULL,
                    postal_code TEXT,
                    income_type TEXT,
                    annual_income TEXT,
                    income_years INTEGER,
                    income_months INTEGER,
                    company_name TEXT,
                    job_title TEXT,
                    monthly_income TEXT,
                    income_verified TEXT,
                    paystub_file TEXT,
                    drivers_license_file TEXT,
                    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Create default admin user
            const adminUsername = process.env.ADMIN_USERNAME || 'admin';
            const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);

            const existingUser = await sql`SELECT * FROM users WHERE username = ${adminUsername}`;
            if (existingUser.rows.length === 0) {
                await sql`INSERT INTO users (username, password) VALUES (${adminUsername}, ${hashedPassword})`;
                console.log('Default admin user created');
            }

            console.log('Vercel Postgres database initialized');
        } catch (error) {
            console.error('Error initializing Vercel Postgres:', error);
        }
    } else {
        // SQLite for local development
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

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
                postal_code TEXT,
                income_type TEXT,
                annual_income TEXT,
                income_years INTEGER,
                income_months INTEGER,
                company_name TEXT,
                job_title TEXT,
                monthly_income TEXT,
                income_verified TEXT,
                paystub_file TEXT,
                drivers_license_file TEXT,
                submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            const adminUsername = process.env.ADMIN_USERNAME || 'admin';
            const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);
            db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, [adminUsername, hashedPassword]);
        });
        console.log('SQLite database initialized');
    }
}

initDatabase();

// API Routes

// Submit application
const applicationUpload = upload.fields([
    { name: 'paystub', maxCount: 1 },
    { name: 'driversLicense', maxCount: 1 },
    { name: 'tradeInPhotos', maxCount: 5 }
]);

app.post('/api/applications', (req, res) => {
    applicationUpload(req, res, function(err) {
        if (err) {
            console.error('Multer error:', err);
        }
        handleApplicationSubmission(req, res);
    });
});

async function handleApplicationSubmission(req, res) {
    try {
        let applicationData;
        try {
            applicationData = JSON.parse(req.body.applicationData);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            return res.status(400).json({ success: false, error: 'Invalid application data format' });
        }

        const {
            vehicleType, budget, tradeIn, creditScore, employment,
            firstName, lastName, email, phone, postalCode,
            incomeType, annualIncome, incomeYears, incomeMonths,
            companyName, jobTitle, monthlyIncome, incomeVerified
        } = applicationData;

        console.log('Received application:', { firstName, lastName, email, phone, vehicleType });

        if (!vehicleType || !budget || !tradeIn || !creditScore || !employment || !firstName || !lastName || !email || !phone) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const paystubPath = req.files?.['paystub']?.[0]?.path || null;
        const driversLicensePath = req.files?.['driversLicense']?.[0]?.path || null;

        if (isVercel) {
            // Vercel Postgres
            const result = await sql`
                INSERT INTO applications (
                    vehicle_type, budget, trade_in, credit_score, employment,
                    first_name, last_name, email, phone, postal_code,
                    income_type, annual_income, income_years, income_months,
                    company_name, job_title, monthly_income, income_verified,
                    paystub_file, drivers_license_file
                ) VALUES (
                    ${vehicleType}, ${budget}, ${tradeIn}, ${creditScore}, ${employment},
                    ${firstName}, ${lastName}, ${email}, ${phone}, ${postalCode || ''},
                    ${incomeType || ''}, ${annualIncome || ''}, ${incomeYears || null}, ${incomeMonths || null},
                    ${companyName || ''}, ${jobTitle || ''}, ${monthlyIncome || ''}, ${incomeVerified || ''},
                    ${paystubPath || ''}, ${driversLicensePath || ''}
                ) RETURNING id
            `;
            console.log('Application submitted successfully - ID:', result.rows[0].id);
            res.json({ success: true, message: 'Application submitted successfully', applicationId: result.rows[0].id });
        } else {
            // SQLite
            db.run(
                `INSERT INTO applications (
                    vehicle_type, budget, trade_in, credit_score, employment,
                    first_name, last_name, email, phone, postal_code,
                    income_type, annual_income, income_years, income_months,
                    company_name, job_title, monthly_income, income_verified,
                    paystub_file, drivers_license_file
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [vehicleType, budget, tradeIn, creditScore, employment,
                 firstName, lastName, email, phone, postalCode,
                 incomeType, annualIncome, incomeYears, incomeMonths,
                 companyName, jobTitle, monthlyIncome, incomeVerified,
                 paystubPath, driversLicensePath],
                function(err) {
                    if (err) {
                        console.error('Database Error:', err);
                        return res.status(500).json({ success: false, error: 'Failed to submit application' });
                    }
                    console.log('Application submitted successfully - ID:', this.lastID);
                    res.json({ success: true, message: 'Application submitted successfully', applicationId: this.lastID });
                }
            );
        }
    } catch (error) {
        console.error('Application Submission Error:', error);
        res.status(500).json({ success: false, error: 'An error occurred while processing your application' });
    }
}

// Admin login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        if (isVercel) {
            const result = await sql`SELECT * FROM users WHERE username = ${username}`;
            const user = result.rows[0];

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const isMatch = bcrypt.compareSync(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
            res.json({ token, username: user.username });
        } else {
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
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
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

// Get all applications (protected)
app.get('/api/applications', authenticateToken, async (req, res) => {
    try {
        if (isVercel) {
            const result = await sql`SELECT * FROM applications ORDER BY submitted_at DESC`;
            res.json(result.rows);
        } else {
            db.all('SELECT * FROM applications ORDER BY submitted_at DESC', (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch applications' });
                }
                res.json(rows);
            });
        }
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch applications' });
    }
});

// Get single application (protected)
app.get('/api/applications/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isVercel) {
            const result = await sql`SELECT * FROM applications WHERE id = ${id}`;
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Application not found' });
            }
            res.json(result.rows[0]);
        } else {
            db.get('SELECT * FROM applications WHERE id = ?', [id], (err, row) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch application' });
                }
                if (!row) {
                    return res.status(404).json({ error: 'Application not found' });
                }
                res.json(row);
            });
        }
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch application' });
    }
});

// Delete application (protected)
app.delete('/api/applications/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isVercel) {
            await sql`DELETE FROM applications WHERE id = ${id}`;
            res.json({ success: true, message: 'Application deleted' });
        } else {
            db.run('DELETE FROM applications WHERE id = ?', [id], function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to delete application' });
                }
                res.json({ success: true, message: 'Application deleted' });
            });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete application' });
    }
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Only start server if not running on Vercel
if (!isVercel) {
    app.listen(PORT, () => {
        console.log(`✓ Greenlight Automotive Server running on http://localhost:${PORT}`);
        console.log(`✓ Admin panel: http://localhost:${PORT}/admin`);
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Export for Vercel
module.exports = app;
