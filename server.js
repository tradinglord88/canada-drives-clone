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

// Only start server if not running on Vercel
if (!isVercel) {
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
