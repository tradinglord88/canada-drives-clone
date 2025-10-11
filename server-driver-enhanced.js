const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads', 'licenses');
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
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only JPG, PNG, and PDF files are allowed'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Serve uploaded files (protected)
app.use('/uploads/licenses', express.static(path.join(__dirname, 'uploads', 'licenses')));

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

    // Create drivers table with license fields
    db.run(`CREATE TABLE IF NOT EXISTS drivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT NOT NULL,
        license_number TEXT UNIQUE NOT NULL,
        license_expiry DATE NOT NULL,
        license_front_url TEXT,
        license_back_url TEXT,
        vehicle_type TEXT NOT NULL,
        license_verified BOOLEAN DEFAULT 0,
        verification_status TEXT DEFAULT 'pending',
        verification_notes TEXT,
        rating REAL DEFAULT 5.0,
        completed_deliveries INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_at DATETIME,
        verified_by INTEGER
    )`);

    // Create driver bids table
    db.run(`CREATE TABLE IF NOT EXISTS driver_bids (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        driver_id INTEGER NOT NULL,
        bid_amount REAL NOT NULL,
        estimated_completion_time INTEGER NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (driver_id) REFERENCES drivers(id)
    )`);

    // Create delivery jobs table
    db.run(`CREATE TABLE IF NOT EXISTS delivery_jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER,
        vehicle_info TEXT NOT NULL,
        pickup_address TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        delivery_date DATE NOT NULL,
        delivery_window TEXT NOT NULL,
        distance REAL,
        special_instructions TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        status TEXT DEFAULT 'open',
        assigned_driver_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_driver_id) REFERENCES drivers(id)
    )`);

    // Create default admin user if not exists
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['admin', defaultPassword]);
});

// API Routes

// Driver registration with file upload
app.post('/api/driver/register', upload.fields([
    { name: 'license_front', maxCount: 1 },
    { name: 'license_back', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name, email, phone, license_number, license_expiry, vehicle_type } = req.body;

        // Check if files were uploaded
        if (!req.files || !req.files.license_front || !req.files.license_back) {
            return res.status(400).json({ error: 'Both front and back license images are required' });
        }

        const licenseFrontUrl = `/uploads/licenses/${req.files.license_front[0].filename}`;
        const licenseBackUrl = `/uploads/licenses/${req.files.license_back[0].filename}`;

        // Check if driver already exists
        db.get('SELECT * FROM drivers WHERE email = ? OR license_number = ?', [email, license_number], (err, existingDriver) => {
            if (existingDriver) {
                // Clean up uploaded files
                fs.unlinkSync(req.files.license_front[0].path);
                fs.unlinkSync(req.files.license_back[0].path);
                return res.status(400).json({ error: 'Driver with this email or license number already exists' });
            }

            // Insert new driver
            db.run(
                `INSERT INTO drivers (
                    name, email, phone, license_number, license_expiry,
                    license_front_url, license_back_url, vehicle_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [name, email, phone, license_number, license_expiry, licenseFrontUrl, licenseBackUrl, vehicle_type],
                function(err) {
                    if (err) {
                        // Clean up uploaded files
                        fs.unlinkSync(req.files.license_front[0].path);
                        fs.unlinkSync(req.files.license_back[0].path);
                        return res.status(500).json({ error: 'Failed to register driver' });
                    }
                    res.json({
                        success: true,
                        message: 'Registration successful! Your account is pending verification.',
                        driverId: this.lastID
                    });
                }
            );
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
});

// Driver login
app.post('/api/driver/login', (req, res) => {
    const { email, licenseNumber } = req.body;

    db.get('SELECT * FROM drivers WHERE email = ? AND license_number = ?', [email, licenseNumber], (err, driver) => {
        if (err || !driver) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        if (driver.verification_status === 'rejected') {
            return res.status(403).json({ error: 'Your account has been rejected. Please contact support.' });
        }

        if (driver.verification_status === 'pending') {
            return res.status(403).json({ error: 'Your account is pending verification. Please check back later.' });
        }

        res.json({
            id: driver.id,
            name: driver.name,
            email: driver.email,
            rating: driver.rating,
            completed_deliveries: driver.completed_deliveries,
            vehicle_type: driver.vehicle_type,
            license_verified: driver.license_verified
        });
    });
});

// Get driver bids
app.get('/api/driver/:driverId/bids', (req, res) => {
    const { driverId } = req.params;

    db.all(`
        SELECT b.*, j.vehicle_info, j.pickup_address, j.delivery_address
        FROM driver_bids b
        JOIN delivery_jobs j ON b.job_id = j.id
        WHERE b.driver_id = ?
        ORDER BY b.created_at DESC
    `, [driverId], (err, bids) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch bids' });
        }
        res.json(bids);
    });
});

// Get assigned jobs for driver
app.get('/api/driver/:driverId/assigned-jobs', (req, res) => {
    const { driverId } = req.params;

    db.all(`
        SELECT * FROM delivery_jobs
        WHERE assigned_driver_id = ?
        ORDER BY delivery_date ASC
    `, [driverId], (err, jobs) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch assigned jobs' });
        }
        res.json(jobs);
    });
});

// Place bid
app.post('/api/driver/place-bid', (req, res) => {
    const { job_id, driver_id, bid_amount, estimated_completion_time, message } = req.body;

    // Check if driver is verified
    db.get('SELECT license_verified FROM drivers WHERE id = ?', [driver_id], (err, driver) => {
        if (err || !driver) {
            return res.status(400).json({ error: 'Driver not found' });
        }

        if (!driver.license_verified) {
            return res.status(403).json({ error: 'Your license must be verified before placing bids' });
        }

        db.run(
            `INSERT INTO driver_bids (job_id, driver_id, bid_amount, estimated_completion_time, message)
             VALUES (?, ?, ?, ?, ?)`,
            [job_id, driver_id, bid_amount, estimated_completion_time, message],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Failed to place bid' });
                }
                res.json({ success: true, bidId: this.lastID });
            }
        );
    });
});

// Admin endpoints

// Get all drivers (admin only)
app.get('/api/admin/drivers', authenticateToken, (req, res) => {
    db.all('SELECT * FROM drivers ORDER BY created_at DESC', (err, drivers) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch drivers' });
        }
        res.json(drivers);
    });
});

// Verify driver license (admin only)
app.put('/api/admin/drivers/:driverId/verify', authenticateToken, (req, res) => {
    const { driverId } = req.params;
    const { status, notes } = req.body;

    const verificationStatus = status === 'approve' ? 'approved' : 'rejected';
    const licenseVerified = status === 'approve' ? 1 : 0;

    db.run(
        `UPDATE drivers
         SET verification_status = ?, license_verified = ?, verification_notes = ?,
             verified_at = CURRENT_TIMESTAMP, verified_by = ?
         WHERE id = ?`,
        [verificationStatus, licenseVerified, notes, req.user.id, driverId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update verification status' });
            }
            res.json({ success: true, message: `Driver ${verificationStatus}` });
        }
    );
});

// Get delivery jobs
app.get('/api/delivery-jobs', (req, res) => {
    const { status } = req.query;
    let query = 'SELECT * FROM delivery_jobs';
    const params = [];

    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, jobs) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch jobs' });
        }
        res.json(jobs);
    });
});

// Get single job
app.get('/api/delivery-jobs/:id', (req, res) => {
    db.get('SELECT * FROM delivery_jobs WHERE id = ?', [req.params.id], (err, job) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch job' });
        }
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        res.json(job);
    });
});

// Cancel bid
app.delete('/api/driver/cancel-bid/:bidId', (req, res) => {
    db.run('DELETE FROM driver_bids WHERE id = ?', [req.params.bidId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to cancel bid' });
        }
        res.json({ success: true });
    });
});

// Update job status
app.put('/api/delivery-jobs/:id/status', (req, res) => {
    const { status } = req.body;

    db.run('UPDATE delivery_jobs SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update status' });
        }
        res.json({ success: true });
    });
});

// Existing application submission endpoint
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