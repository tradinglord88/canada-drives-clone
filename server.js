const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
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
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
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
app.use('/uploads', express.static(uploadsDir));

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
                    street_address TEXT,
                    city TEXT,
                    province TEXT,
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

            // Add new address columns if they don't exist (migration for existing databases)
            try {
                await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS street_address TEXT`;
                await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS city TEXT`;
                await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS province TEXT`;
                console.log('Address columns migration complete');
            } catch (alterError) {
                console.log('Address columns already exist or migration skipped');
            }

            // Create default admin user
            const adminUsername = process.env.ADMIN_USERNAME || 'admin';
            const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
            const hashedPassword = bcrypt.hashSync(adminPassword, 10);

            console.log('Checking for admin user:', adminUsername);

            const existingUser = await sql`SELECT * FROM users WHERE username = ${adminUsername}`;
            console.log('Existing users found:', existingUser.rows.length);

            if (existingUser.rows.length === 0) {
                await sql`INSERT INTO users (username, password) VALUES (${adminUsername}, ${hashedPassword})`;
                console.log('Default admin user created');
            } else {
                // Update the password in case it changed
                await sql`UPDATE users SET password = ${hashedPassword} WHERE username = ${adminUsername}`;
                console.log('Admin user password updated');
            }

            // Delivery Jobs Tables for Vercel Postgres
            await sql`
                CREATE TABLE IF NOT EXISTS delivery_jobs (
                    id SERIAL PRIMARY KEY,
                    customer_name TEXT,
                    pickup_address TEXT,
                    delivery_address TEXT,
                    vehicle_info TEXT,
                    distance REAL,
                    estimated_time INTEGER,
                    delivery_date TEXT,
                    delivery_window TEXT,
                    special_instructions TEXT,
                    status TEXT DEFAULT 'open',
                    winning_bid_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            await sql`
                CREATE TABLE IF NOT EXISTS drivers (
                    id SERIAL PRIMARY KEY,
                    name TEXT,
                    email TEXT UNIQUE,
                    phone TEXT,
                    license_number TEXT UNIQUE,
                    vehicle_type TEXT,
                    rating REAL DEFAULT 5.0,
                    completed_deliveries INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            await sql`
                CREATE TABLE IF NOT EXISTS driver_bids (
                    id SERIAL PRIMARY KEY,
                    job_id INTEGER,
                    driver_id INTEGER,
                    bid_amount REAL,
                    estimated_completion_time TEXT,
                    message TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(job_id, driver_id)
                )
            `;

            // Referral Program Tables
            await sql`
                CREATE TABLE IF NOT EXISTS referrers (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    referral_code TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    commission_rate DECIMAL DEFAULT 500.00,
                    total_earnings DECIMAL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // Add referral columns to applications if they don't exist
            try {
                await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS referrer_code TEXT`;
                await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS deal_status TEXT DEFAULT 'pending'`;
                await sql`ALTER TABLE applications ADD COLUMN IF NOT EXISTS commission_paid BOOLEAN DEFAULT FALSE`;
                console.log('Referral columns migration complete');
            } catch (alterError) {
                console.log('Referral columns already exist or migration skipped');
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
                street_address TEXT,
                city TEXT,
                province TEXT,
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

            // Delivery Jobs Tables
            db.run(`CREATE TABLE IF NOT EXISTS delivery_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT,
                pickup_address TEXT,
                delivery_address TEXT,
                vehicle_info TEXT,
                distance REAL,
                estimated_time INTEGER,
                delivery_date TEXT,
                delivery_window TEXT,
                special_instructions TEXT,
                status TEXT DEFAULT 'open',
                winning_bid_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS drivers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                email TEXT UNIQUE,
                phone TEXT,
                license_number TEXT UNIQUE,
                vehicle_type TEXT,
                rating REAL DEFAULT 5.0,
                completed_deliveries INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            db.run(`CREATE TABLE IF NOT EXISTS driver_bids (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER,
                driver_id INTEGER,
                bid_amount REAL,
                estimated_completion_time TEXT,
                message TEXT,
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(job_id, driver_id)
            )`);

            // Referral Program Tables
            db.run(`CREATE TABLE IF NOT EXISTS referrers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                phone TEXT,
                referral_code TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                commission_rate REAL DEFAULT 500.00,
                total_earnings REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Add referral columns to applications (SQLite doesn't support ADD COLUMN IF NOT EXISTS)
            db.run(`ALTER TABLE applications ADD COLUMN referrer_code TEXT`, () => {});
            db.run(`ALTER TABLE applications ADD COLUMN deal_status TEXT DEFAULT 'pending'`, () => {});
            db.run(`ALTER TABLE applications ADD COLUMN commission_paid INTEGER DEFAULT 0`, () => {});
        });
        console.log('SQLite database initialized');
    }
}

// Database initialization promise
let dbInitialized = false;
let dbInitPromise = initDatabase().then(() => {
    dbInitialized = true;
    console.log('Database initialization complete');
}).catch(err => {
    console.error('Database initialization failed:', err);
});

// Middleware to ensure DB is ready
app.use(async (req, res, next) => {
    if (!dbInitialized) {
        await dbInitPromise;
    }
    next();
});

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
            firstName, lastName, email, phone, streetAddress, city, province, postalCode,
            incomeType, annualIncome, incomeYears, incomeMonths,
            companyName, jobTitle, monthlyIncome, incomeVerified,
            referrerCode, paystubBase64, driversLicenseBase64
        } = applicationData;

        console.log('Received application:', { firstName, lastName, email, phone, vehicleType });
        console.log('Documents received:', { hasPaystub: !!paystubBase64, hasLicense: !!driversLicenseBase64 });

        if (!vehicleType || !budget || !tradeIn || !creditScore || !employment || !firstName || !lastName || !email || !phone) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Use base64 data directly (persists in database on Vercel)
        const paystubData = paystubBase64 || null;
        const driversLicenseData = driversLicenseBase64 || null;

        if (isVercel) {
            // Vercel Postgres
            const result = await sql`
                INSERT INTO applications (
                    vehicle_type, budget, trade_in, credit_score, employment,
                    first_name, last_name, email, phone, street_address, city, province, postal_code,
                    income_type, annual_income, income_years, income_months,
                    company_name, job_title, monthly_income, income_verified,
                    paystub_file, drivers_license_file, referrer_code
                ) VALUES (
                    ${vehicleType}, ${budget}, ${tradeIn}, ${creditScore}, ${employment},
                    ${firstName}, ${lastName}, ${email}, ${phone}, ${streetAddress || ''}, ${city || ''}, ${province || ''}, ${postalCode || ''},
                    ${incomeType || ''}, ${annualIncome || ''}, ${incomeYears || null}, ${incomeMonths || null},
                    ${companyName || ''}, ${jobTitle || ''}, ${monthlyIncome || ''}, ${incomeVerified || ''},
                    ${paystubData || ''}, ${driversLicenseData || ''}, ${referrerCode || null}
                ) RETURNING id
            `;
            console.log('Application submitted successfully - ID:', result.rows[0].id);
            res.json({ success: true, message: 'Application submitted successfully', applicationId: result.rows[0].id });
        } else {
            // SQLite
            db.run(
                `INSERT INTO applications (
                    vehicle_type, budget, trade_in, credit_score, employment,
                    first_name, last_name, email, phone, street_address, city, province, postal_code,
                    income_type, annual_income, income_years, income_months,
                    company_name, job_title, monthly_income, income_verified,
                    paystub_file, drivers_license_file, referrer_code
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [vehicleType, budget, tradeIn, creditScore, employment,
                 firstName, lastName, email, phone, streetAddress, city, province, postalCode,
                 incomeType, annualIncome, incomeYears, incomeMonths,
                 companyName, jobTitle, monthlyIncome, incomeVerified,
                 paystubData, driversLicenseData, referrerCode || null],
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

// Debug endpoint to check environment
app.get('/api/debug-env', (req, res) => {
    res.json({
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasAdminUsername: !!process.env.ADMIN_USERNAME,
        hasAdminPassword: !!process.env.ADMIN_DEFAULT_PASSWORD,
        adminUsername: process.env.ADMIN_USERNAME || 'admin',
        isVercel: isVercel,
        nodeEnv: process.env.NODE_ENV
    });
});

// Admin login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    console.log('Login attempt:', { username, passwordLength: password?.length });

    // Simple environment-based login (works without database)
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';

    console.log('Expected:', { adminUsername, adminPasswordLength: adminPassword?.length });

    if (username === adminUsername && password === adminPassword) {
        const token = jwt.sign({ id: 1, username: adminUsername }, JWT_SECRET);
        console.log('Login successful');
        return res.json({ token, username: adminUsername });
    }

    console.log('Env login failed, trying database...');

    // Fallback to database login if env login fails
    try {
        if (isVercel) {
            const result = await sql`SELECT * FROM users WHERE username = ${username}`;
            const user = result.rows[0];

            if (user && bcrypt.compareSync(password, user.password)) {
                const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
                return res.json({ token, username: user.username });
            }
        } else {
            return new Promise((resolve) => {
                db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
                    if (user && bcrypt.compareSync(password, user.password)) {
                        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
                        return res.json({ token, username: user.username });
                    }
                    res.status(401).json({ error: 'Invalid credentials' });
                    resolve();
                });
            });
        }
    } catch (error) {
        console.error('Login error:', error);
    }

    res.status(401).json({ error: 'Invalid credentials' });
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

// ========================================
// SOCKET.IO CONNECTION HANDLER
// ========================================
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('newBid', (data) => {
        io.emit('newBid', data);
    });

    socket.on('jobStatusUpdate', (data) => {
        io.emit('jobStatusUpdate', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// ========================================
// DELIVERY JOBS API ENDPOINTS
// ========================================

// Get all delivery jobs
app.get('/api/delivery-jobs', async (req, res) => {
    try {
        const { status, location, date } = req.query;

        if (isVercel) {
            // Vercel Postgres - simplified query without complex joins for now
            let result;
            if (status) {
                result = await sql`SELECT * FROM delivery_jobs WHERE status = ${status} ORDER BY created_at DESC`;
            } else {
                result = await sql`SELECT * FROM delivery_jobs ORDER BY created_at DESC`;
            }
            res.json(result.rows);
        } else {
            // SQLite
            let query = `
                SELECT j.*,
                       COUNT(DISTINCT b.id) as bid_count,
                       AVG(b.bid_amount) as average_bid,
                       d.name as winning_driver
                FROM delivery_jobs j
                LEFT JOIN driver_bids b ON j.id = b.job_id
                LEFT JOIN drivers d ON j.winning_bid_id = b.id AND b.driver_id = d.id
                WHERE 1=1
            `;
            const params = [];

            if (status) {
                query += ' AND j.status = ?';
                params.push(status);
            }
            if (location) {
                query += ' AND (j.pickup_address LIKE ? OR j.delivery_address LIKE ?)';
                params.push(`%${location}%`, `%${location}%`);
            }
            if (date) {
                query += ' AND j.delivery_date = ?';
                params.push(date);
            }
            query += ' GROUP BY j.id ORDER BY j.created_at DESC';

            db.all(query, params, (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(rows);
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single delivery job
app.get('/api/delivery-jobs/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isVercel) {
            const result = await sql`SELECT * FROM delivery_jobs WHERE id = ${id}`;
            res.json(result.rows[0]);
        } else {
            db.get('SELECT * FROM delivery_jobs WHERE id = ?', [id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(row);
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new delivery job
app.post('/api/delivery-jobs', async (req, res) => {
    try {
        const {
            customer_name,
            pickup_address,
            delivery_address,
            vehicle_info,
            delivery_date,
            delivery_window,
            special_instructions
        } = req.body;

        const distance = Math.floor(Math.random() * 50) + 10;
        const estimated_time = Math.floor(distance * 2);

        if (isVercel) {
            const result = await sql`
                INSERT INTO delivery_jobs (
                    customer_name, pickup_address, delivery_address,
                    vehicle_info, distance, estimated_time,
                    delivery_date, delivery_window, special_instructions
                ) VALUES (
                    ${customer_name}, ${pickup_address}, ${delivery_address},
                    ${vehicle_info}, ${distance}, ${estimated_time},
                    ${delivery_date}, ${delivery_window}, ${special_instructions}
                ) RETURNING id
            `;
            io.emit('newJob', { id: result.rows[0].id });
            res.json({ id: result.rows[0].id, message: 'Job posted successfully' });
        } else {
            db.run(`
                INSERT INTO delivery_jobs (
                    customer_name, pickup_address, delivery_address,
                    vehicle_info, distance, estimated_time,
                    delivery_date, delivery_window, special_instructions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [customer_name, pickup_address, delivery_address, vehicle_info, distance, estimated_time, delivery_date, delivery_window, special_instructions],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                io.emit('newJob', { id: this.lastID });
                res.json({ id: this.lastID, message: 'Job posted successfully' });
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get bids for a job
app.get('/api/delivery-jobs/:id/bids', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isVercel) {
            const jobResult = await sql`SELECT * FROM delivery_jobs WHERE id = ${id}`;
            const bidsResult = await sql`
                SELECT b.*, d.name as driver_name, d.rating as driver_rating,
                       d.completed_deliveries, d.vehicle_type
                FROM driver_bids b
                JOIN drivers d ON b.driver_id = d.id
                WHERE b.job_id = ${id}
                ORDER BY b.bid_amount ASC
            `;
            res.json({ job: jobResult.rows[0], bids: bidsResult.rows });
        } else {
            db.get('SELECT * FROM delivery_jobs WHERE id = ?', [id], (err, job) => {
                if (err) return res.status(500).json({ error: err.message });
                db.all(`
                    SELECT b.*, d.name as driver_name, d.rating as driver_rating,
                           d.completed_deliveries, d.vehicle_type
                    FROM driver_bids b
                    JOIN drivers d ON b.driver_id = d.id
                    WHERE b.job_id = ?
                    ORDER BY b.bid_amount ASC
                `, [id], (err, bids) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ job, bids });
                });
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Accept a bid
app.post('/api/delivery-jobs/:id/accept-bid', async (req, res) => {
    try {
        const { bidId } = req.body;
        const jobId = parseInt(req.params.id);

        if (isVercel) {
            await sql`UPDATE delivery_jobs SET status = 'assigned', winning_bid_id = ${bidId} WHERE id = ${jobId}`;
            await sql`UPDATE driver_bids SET status = 'accepted' WHERE id = ${bidId}`;
            await sql`UPDATE driver_bids SET status = 'rejected' WHERE job_id = ${jobId} AND id != ${bidId}`;
            const bid = await sql`SELECT driver_id FROM driver_bids WHERE id = ${bidId}`;
            if (bid.rows[0]) {
                io.emit('bidAccepted', { jobId, bidId, driverId: bid.rows[0].driver_id });
            }
            res.json({ message: 'Bid accepted successfully' });
        } else {
            db.serialize(() => {
                db.run('UPDATE delivery_jobs SET status = ?, winning_bid_id = ? WHERE id = ?', ['assigned', bidId, jobId]);
                db.run('UPDATE driver_bids SET status = ? WHERE id = ?', ['accepted', bidId]);
                db.run('UPDATE driver_bids SET status = ? WHERE job_id = ? AND id != ?', ['rejected', jobId, bidId]);
                db.get('SELECT driver_id FROM driver_bids WHERE id = ?', [bidId], (err, bid) => {
                    if (!err && bid) io.emit('bidAccepted', { jobId, bidId, driverId: bid.driver_id });
                });
                res.json({ message: 'Bid accepted successfully' });
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update job status
app.put('/api/delivery-jobs/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const id = parseInt(req.params.id);

        if (isVercel) {
            await sql`UPDATE delivery_jobs SET status = ${status} WHERE id = ${id}`;
            io.emit('jobStatusUpdate', { jobId: id, status });
            res.json({ message: 'Status updated successfully' });
        } else {
            db.run('UPDATE delivery_jobs SET status = ? WHERE id = ?', [status, id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                io.emit('jobStatusUpdate', { jobId: id, status });
                res.json({ message: 'Status updated successfully' });
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// DRIVER API ENDPOINTS
// ========================================

// Driver login
app.post('/api/driver/login', async (req, res) => {
    try {
        const { email, licenseNumber } = req.body;

        if (isVercel) {
            const result = await sql`SELECT * FROM drivers WHERE email = ${email} AND license_number = ${licenseNumber}`;
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            res.json(result.rows[0]);
        } else {
            db.get('SELECT * FROM drivers WHERE email = ? AND license_number = ?', [email, licenseNumber], (err, driver) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!driver) return res.status(401).json({ error: 'Invalid credentials' });
                res.json(driver);
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Driver registration
app.post('/api/driver/register', async (req, res) => {
    try {
        const { name, email, phone, license_number, vehicle_type } = req.body;

        if (isVercel) {
            const result = await sql`
                INSERT INTO drivers (name, email, phone, license_number, vehicle_type)
                VALUES (${name}, ${email}, ${phone}, ${license_number}, ${vehicle_type})
                RETURNING id
            `;
            res.json({ id: result.rows[0].id, message: 'Registration successful' });
        } else {
            db.run(`INSERT INTO drivers (name, email, phone, license_number, vehicle_type) VALUES (?, ?, ?, ?, ?)`,
                [name, email, phone, license_number, vehicle_type], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'Email or license number already exists' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                res.json({ id: this.lastID, message: 'Registration successful' });
            });
        }
    } catch (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
            return res.status(400).json({ error: 'Email or license number already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Place a bid
app.post('/api/driver/place-bid', async (req, res) => {
    try {
        const { job_id, driver_id, bid_amount, estimated_completion_time, message } = req.body;

        if (isVercel) {
            const result = await sql`
                INSERT INTO driver_bids (job_id, driver_id, bid_amount, estimated_completion_time, message)
                VALUES (${job_id}, ${driver_id}, ${bid_amount}, ${estimated_completion_time}, ${message})
                RETURNING id
            `;
            io.emit('newBid', { jobId: job_id, bidId: result.rows[0].id });
            res.json({ id: result.rows[0].id, message: 'Bid placed successfully' });
        } else {
            db.run(`INSERT INTO driver_bids (job_id, driver_id, bid_amount, estimated_completion_time, message) VALUES (?, ?, ?, ?, ?)`,
                [job_id, driver_id, bid_amount, estimated_completion_time, message], function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) {
                        return res.status(400).json({ error: 'You have already bid on this job' });
                    }
                    return res.status(500).json({ error: err.message });
                }
                io.emit('newBid', { jobId: job_id, bidId: this.lastID });
                res.json({ id: this.lastID, message: 'Bid placed successfully' });
            });
        }
    } catch (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
            return res.status(400).json({ error: 'You have already bid on this job' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Get driver's bids
app.get('/api/driver/:id/bids', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isVercel) {
            const result = await sql`
                SELECT b.*, j.vehicle_info, j.pickup_address, j.delivery_address,
                       j.delivery_date, j.delivery_window
                FROM driver_bids b
                JOIN delivery_jobs j ON b.job_id = j.id
                WHERE b.driver_id = ${id}
                ORDER BY b.created_at DESC
            `;
            res.json(result.rows);
        } else {
            db.all(`
                SELECT b.*, j.vehicle_info, j.pickup_address, j.delivery_address,
                       j.delivery_date, j.delivery_window
                FROM driver_bids b
                JOIN delivery_jobs j ON b.job_id = j.id
                WHERE b.driver_id = ?
                ORDER BY b.created_at DESC
            `, [id], (err, bids) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(bids);
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get driver's assigned jobs
app.get('/api/driver/:id/assigned-jobs', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (isVercel) {
            const result = await sql`
                SELECT j.*
                FROM delivery_jobs j
                JOIN driver_bids b ON j.winning_bid_id = b.id
                WHERE b.driver_id = ${id} AND j.status IN ('assigned', 'in_progress')
                ORDER BY j.delivery_date ASC
            `;
            res.json(result.rows);
        } else {
            db.all(`
                SELECT j.*
                FROM delivery_jobs j
                JOIN driver_bids b ON j.winning_bid_id = b.id
                WHERE b.driver_id = ? AND j.status IN ('assigned', 'in_progress')
                ORDER BY j.delivery_date ASC
            `, [id], (err, jobs) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(jobs);
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel a bid
app.delete('/api/driver/cancel-bid/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isVercel) {
            await sql`DELETE FROM driver_bids WHERE id = ${id}`;
            res.json({ message: 'Bid cancelled successfully' });
        } else {
            db.run('DELETE FROM driver_bids WHERE id = ?', [id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ message: 'Bid cancelled successfully' });
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// REFERRAL PROGRAM API ENDPOINTS
// ==========================================

// Generate unique referral code
function generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Register as a referrer
app.post('/api/referral/register', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        const referralCode = generateReferralCode();
        const hashedPassword = bcrypt.hashSync(password, 10);

        if (isVercel) {
            const result = await sql`
                INSERT INTO referrers (name, email, phone, referral_code, password)
                VALUES (${name}, ${email}, ${phone || ''}, ${referralCode}, ${hashedPassword})
                RETURNING id, referral_code
            `;
            res.json({
                success: true,
                referralCode: result.rows[0].referral_code,
                message: 'Registration successful!'
            });
        } else {
            db.run(
                `INSERT INTO referrers (name, email, phone, referral_code, password) VALUES (?, ?, ?, ?, ?)`,
                [name, email, phone || '', referralCode, hashedPassword],
                function(err) {
                    if (err) {
                        if (err.message.includes('UNIQUE constraint failed')) {
                            return res.status(400).json({ error: 'Email already registered' });
                        }
                        return res.status(500).json({ error: err.message });
                    }
                    res.json({
                        success: true,
                        referralCode: referralCode,
                        message: 'Registration successful!'
                    });
                }
            );
        }
    } catch (error) {
        if (error.message?.includes('duplicate key')) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Referrer login
app.post('/api/referral/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (isVercel) {
            const result = await sql`SELECT * FROM referrers WHERE email = ${email}`;
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            const referrer = result.rows[0];
            if (!bcrypt.compareSync(password, referrer.password)) {
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            const token = jwt.sign({ id: referrer.id, email: referrer.email, type: 'referrer' }, JWT_SECRET, { expiresIn: '7d' });
            res.json({ success: true, token, referralCode: referrer.referral_code, name: referrer.name });
        } else {
            db.get(`SELECT * FROM referrers WHERE email = ?`, [email], (err, referrer) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!referrer) return res.status(401).json({ error: 'Invalid email or password' });
                if (!bcrypt.compareSync(password, referrer.password)) {
                    return res.status(401).json({ error: 'Invalid email or password' });
                }
                const token = jwt.sign({ id: referrer.id, email: referrer.email, type: 'referrer' }, JWT_SECRET, { expiresIn: '7d' });
                res.json({ success: true, token, referralCode: referrer.referral_code, name: referrer.name });
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get referrer stats
app.get('/api/referral/stats', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== 'referrer') {
            return res.status(403).json({ error: 'Invalid token type' });
        }

        if (isVercel) {
            const referrer = await sql`SELECT * FROM referrers WHERE id = ${decoded.id}`;
            const leads = await sql`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN deal_status = 'approved' THEN 1 ELSE 0 END) as converted
                FROM applications WHERE referrer_code = ${referrer.rows[0].referral_code}
            `;
            res.json({
                referralCode: referrer.rows[0].referral_code,
                totalLeads: parseInt(leads.rows[0].total) || 0,
                convertedLeads: parseInt(leads.rows[0].converted) || 0,
                totalEarnings: parseFloat(referrer.rows[0].total_earnings) || 0,
                commissionRate: parseFloat(referrer.rows[0].commission_rate) || 500
            });
        } else {
            db.get(`SELECT * FROM referrers WHERE id = ?`, [decoded.id], (err, referrer) => {
                if (err) return res.status(500).json({ error: err.message });
                db.get(
                    `SELECT COUNT(*) as total,
                            SUM(CASE WHEN deal_status = 'approved' THEN 1 ELSE 0 END) as converted
                     FROM applications WHERE referrer_code = ?`,
                    [referrer.referral_code],
                    (err, leads) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json({
                            referralCode: referrer.referral_code,
                            totalLeads: leads.total || 0,
                            convertedLeads: leads.converted || 0,
                            totalEarnings: referrer.total_earnings || 0,
                            commissionRate: referrer.commission_rate || 500
                        });
                    }
                );
            });
        }
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Get referrer's leads
app.get('/api/referral/leads', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.type !== 'referrer') {
            return res.status(403).json({ error: 'Invalid token type' });
        }

        if (isVercel) {
            const referrer = await sql`SELECT referral_code FROM referrers WHERE id = ${decoded.id}`;
            const leads = await sql`
                SELECT id, first_name, last_name, vehicle_type, budget, deal_status, submitted_at
                FROM applications
                WHERE referrer_code = ${referrer.rows[0].referral_code}
                ORDER BY submitted_at DESC
            `;
            res.json(leads.rows);
        } else {
            db.get(`SELECT referral_code FROM referrers WHERE id = ?`, [decoded.id], (err, referrer) => {
                if (err) return res.status(500).json({ error: err.message });
                db.all(
                    `SELECT id, first_name, last_name, vehicle_type, budget, deal_status, submitted_at
                     FROM applications WHERE referrer_code = ? ORDER BY submitted_at DESC`,
                    [referrer.referral_code],
                    (err, leads) => {
                        if (err) return res.status(500).json({ error: err.message });
                        res.json(leads);
                    }
                );
            });
        }
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Admin: Update application status (triggers commission on approved)
app.put('/api/applications/:id/status', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET); // Just verify it's valid admin token

        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'contacted', 'approved', 'declined'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        if (isVercel) {
            // Get the application to check for referrer
            const app = await sql`SELECT * FROM applications WHERE id = ${id}`;
            if (app.rows.length === 0) {
                return res.status(404).json({ error: 'Application not found' });
            }

            const application = app.rows[0];

            // Update status
            await sql`UPDATE applications SET deal_status = ${status} WHERE id = ${id}`;

            // If approved and has referrer, credit commission
            if (status === 'approved' && application.referrer_code && !application.commission_paid) {
                const referrer = await sql`SELECT * FROM referrers WHERE referral_code = ${application.referrer_code}`;
                if (referrer.rows.length > 0) {
                    const commission = referrer.rows[0].commission_rate || 500;
                    await sql`
                        UPDATE referrers
                        SET total_earnings = total_earnings + ${commission}
                        WHERE referral_code = ${application.referrer_code}
                    `;
                    await sql`UPDATE applications SET commission_paid = TRUE WHERE id = ${id}`;
                }
            }

            res.json({ success: true, message: 'Status updated' });
        } else {
            db.get(`SELECT * FROM applications WHERE id = ?`, [id], (err, application) => {
                if (err) return res.status(500).json({ error: err.message });
                if (!application) return res.status(404).json({ error: 'Application not found' });

                db.run(`UPDATE applications SET deal_status = ? WHERE id = ?`, [status, id], function(err) {
                    if (err) return res.status(500).json({ error: err.message });

                    // If approved and has referrer, credit commission
                    if (status === 'approved' && application.referrer_code && !application.commission_paid) {
                        db.get(`SELECT * FROM referrers WHERE referral_code = ?`, [application.referrer_code], (err, referrer) => {
                            if (!err && referrer) {
                                const commission = referrer.commission_rate || 500;
                                db.run(`UPDATE referrers SET total_earnings = total_earnings + ? WHERE referral_code = ?`,
                                    [commission, application.referrer_code]);
                                db.run(`UPDATE applications SET commission_paid = 1 WHERE id = ?`, [id]);
                            }
                        });
                    }

                    res.json({ success: true, message: 'Status updated' });
                });
            });
        }
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Start server (skip on Vercel deployment, but allow local testing with Postgres)
const shouldStartServer = process.env.VERCEL !== '1';
if (shouldStartServer) {
    server.listen(PORT, () => {
        console.log(`✓ Greenlight Automotive Server running on http://localhost:${PORT}`);
        console.log(`✓ Admin panel: http://localhost:${PORT}/admin`);
        console.log(`✓ Delivery Jobs: http://localhost:${PORT}/delivery-jobs.html`);
        console.log(`✓ Delivery Admin: http://localhost:${PORT}/delivery-admin.html`);
        console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

// Export for Vercel
module.exports = app;
