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

// Create uploads directory if it doesn't exist
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
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
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

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

    // Enhanced applications table for pre-approval form
    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_type TEXT NOT NULL,
        budget TEXT NOT NULL,
        trade_in TEXT NOT NULL,
        credit_score TEXT NOT NULL,
        employment TEXT NOT NULL,
        income_type TEXT,
        annual_income REAL,
        income_years INTEGER,
        income_months INTEGER,
        company_name TEXT,
        job_title TEXT,
        monthly_income REAL,
        income_verified TEXT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        postal_code TEXT NOT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Sell car submissions table
    db.run(`CREATE TABLE IF NOT EXISTS sell_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        year TEXT,
        make TEXT,
        model TEXT,
        mileage INTEGER,
        mileage_unit TEXT,
        condition TEXT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        postal_code TEXT,
        front_photo TEXT,
        back_photo TEXT,
        driver_photo TEXT,
        passenger_photo TEXT,
        vin_photo TEXT,
        odometer_photo TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Trade-in vehicle details (linked to applications)
    db.run(`CREATE TABLE IF NOT EXISTS trade_in_vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER,
        year TEXT,
        make TEXT,
        model TEXT,
        mileage INTEGER,
        condition TEXT,
        front_photo TEXT,
        back_photo TEXT,
        driver_photo TEXT,
        passenger_photo TEXT,
        vin_photo TEXT,
        odometer_photo TEXT,
        damage_photos TEXT,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications (id)
    )`);

    // Create delivery tracking table
    db.run(`CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_id TEXT UNIQUE NOT NULL,
        order_number TEXT NOT NULL,
        vehicle_info TEXT NOT NULL,
        pickup_location TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        driver_name TEXT NOT NULL,
        driver_phone TEXT NOT NULL,
        status TEXT NOT NULL,
        current_lat REAL,
        current_lng REAL,
        destination_lat REAL,
        destination_lng REAL,
        estimated_delivery TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create default admin user if not exists
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['admin', defaultPassword]);
    
    // Create sample delivery for demo
    db.run(`INSERT OR IGNORE INTO deliveries (
        tracking_id, order_number, vehicle_info, pickup_location, 
        delivery_address, customer_name, customer_phone, driver_name, 
        driver_phone, status, current_lat, current_lng, destination_lat, 
        destination_lng, estimated_delivery
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
        'GLA-2024-1234',
        'GLA-2024-1234',
        '2023 Toyota Camry SE',
        'Toronto, ON',
        '123 Main St, Ottawa, ON',
        'John Doe',
        '(555) 123-4567',
        'John Smith',
        '(555) 987-6543',
        'in_transit',
        45.4215,
        -75.6972,
        45.3876,
        -75.6960,
        'Today, 3:00 PM - 5:00 PM'
    ]);
});

// API Routes

// Submit pre-approval application with trade-in
app.post('/api/applications', upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'backPhoto', maxCount: 1 },
    { name: 'driverPhoto', maxCount: 1 },
    { name: 'passengerPhoto', maxCount: 1 },
    { name: 'vinPhoto', maxCount: 1 },
    { name: 'odometerPhoto', maxCount: 1 },
    { name: 'damagePhotos', maxCount: 10 },
    { name: 'paystubFile', maxCount: 1 },
    { name: 'driversLicenseFile', maxCount: 1 }
]), (req, res) => {
    try {
        // Check if applicationData exists
        if (!req.body.applicationData) {
            return res.status(400).json({ error: 'Missing application data' });
        }
        
        const applicationData = JSON.parse(req.body.applicationData);
        
        // Insert main application
    db.run(
        `INSERT INTO applications (
            vehicle_type, budget, trade_in, credit_score, employment,
            income_type, annual_income, income_years, income_months,
            company_name, job_title, monthly_income, income_verified,
            first_name, last_name, email, phone, postal_code,
            paystub_file, drivers_license_file
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            applicationData.vehicleType,
            applicationData.budget,
            applicationData.tradeIn,
            applicationData.creditScore,
            applicationData.employment,
            applicationData.incomeType,
            applicationData.annualIncome,
            applicationData.incomeYears,
            applicationData.incomeMonths,
            applicationData.companyName,
            applicationData.jobTitle,
            applicationData.monthlyIncome,
            applicationData.incomeVerified,
            applicationData.firstName,
            applicationData.lastName,
            applicationData.email,
            applicationData.phone,
            applicationData.postalCode,
            files.paystubFile ? files.paystubFile[0].filename : null,
            files.driversLicenseFile ? files.driversLicenseFile[0].filename : null
        ],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to submit application' });
            }
            
            const applicationId = this.lastID;
            
            // If trade-in exists, insert trade-in details
            if (applicationData.tradeIn === 'yes' && applicationData.tradeInDetails) {
                const files = req.files;
                db.run(
                    `INSERT INTO trade_in_vehicles (
                        application_id, year, make, model, mileage, condition,
                        front_photo, back_photo, driver_photo, passenger_photo,
                        vin_photo, odometer_photo, damage_photos
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        applicationId,
                        applicationData.tradeInDetails.year,
                        applicationData.tradeInDetails.make,
                        applicationData.tradeInDetails.model,
                        applicationData.tradeInDetails.mileage,
                        applicationData.tradeInDetails.condition,
                        files.frontPhoto ? files.frontPhoto[0].filename : null,
                        files.backPhoto ? files.backPhoto[0].filename : null,
                        files.driverPhoto ? files.driverPhoto[0].filename : null,
                        files.passengerPhoto ? files.passengerPhoto[0].filename : null,
                        files.vinPhoto ? files.vinPhoto[0].filename : null,
                        files.odometerPhoto ? files.odometerPhoto[0].filename : null,
                        files.damagePhotos ? JSON.stringify(files.damagePhotos.map(f => f.filename)) : null
                    ]
                );
            }
            
            res.json({ 
                success: true, 
                message: 'Application submitted successfully',
                applicationId: applicationId 
            });
        }
    );
    } catch (error) {
        console.error('Error processing application:', error);
        res.status(500).json({ error: 'Failed to process application: ' + error.message });
    }
});

// Submit sell car form
app.post('/api/sell-car', upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'backPhoto', maxCount: 1 },
    { name: 'driverPhoto', maxCount: 1 },
    { name: 'passengerPhoto', maxCount: 1 },
    { name: 'vinPhoto', maxCount: 1 },
    { name: 'odometerPhoto', maxCount: 1 },
    { name: 'paystubFile', maxCount: 1 },
    { name: 'driversLicenseFile', maxCount: 1 }
]), (req, res) => {
    try {
        // Check if sellData exists
        if (!req.body.sellData) {
            return res.status(400).json({ error: 'Missing sell car data' });
        }
        
        const sellData = JSON.parse(req.body.sellData);
        const files = req.files;
    
    db.run(
        `INSERT INTO sell_submissions (
            year, make, model, mileage, mileage_unit, condition,
            first_name, last_name, email, phone, postal_code,
            front_photo, back_photo, driver_photo, passenger_photo,
            vin_photo, odometer_photo, paystub_file, drivers_license_file
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            sellData.year,
            sellData.make,
            sellData.model,
            sellData.mileage,
            sellData.mileageUnit,
            sellData.condition,
            sellData.firstName,
            sellData.lastName,
            sellData.email,
            sellData.phone,
            sellData.postalCode,
            files.frontPhoto ? files.frontPhoto[0].filename : null,
            files.backPhoto ? files.backPhoto[0].filename : null,
            files.driverPhoto ? files.driverPhoto[0].filename : null,
            files.passengerPhoto ? files.passengerPhoto[0].filename : null,
            files.vinPhoto ? files.vinPhoto[0].filename : null,
            files.odometerPhoto ? files.odometerPhoto[0].filename : null,
            files.paystubFile ? files.paystubFile[0].filename : null,
            files.driversLicenseFile ? files.driversLicenseFile[0].filename : null
        ],
        function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to submit sell request' });
            }
            res.json({ 
                success: true, 
                message: 'Sell request submitted successfully',
                submissionId: this.lastID 
            });
        }
    );
    } catch (error) {
        console.error('Error processing sell request:', error);
        res.status(500).json({ error: 'Failed to process sell request: ' + error.message });
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

// Get all pre-approval applications (protected route)
app.get('/api/applications', authenticateToken, (req, res) => {
    db.all('SELECT * FROM applications ORDER BY submitted_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch applications' });
        }
        res.json(rows);
    });
});

// Get all sell car submissions (protected route)
app.get('/api/sell-submissions', authenticateToken, (req, res) => {
    db.all('SELECT * FROM sell_submissions ORDER BY submitted_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch sell submissions' });
        }
        res.json(rows);
    });
});

// Get single application with trade-in details (protected route)
app.get('/api/applications/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM applications WHERE id = ?', [req.params.id], (err, application) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch application' });
        }
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        
        // Get trade-in details if exists
        db.get('SELECT * FROM trade_in_vehicles WHERE application_id = ?', [req.params.id], (err, tradeIn) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch trade-in details' });
            }
            
            application.tradeInDetails = tradeIn;
            res.json(application);
        });
    });
});

// Get single sell submission (protected route)
app.get('/api/sell-submissions/:id', authenticateToken, (req, res) => {
    db.get('SELECT * FROM sell_submissions WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch submission' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json(row);
    });
});

// Generate printable report for application
app.get('/api/applications/:id/print', authenticateToken, (req, res) => {
    db.get('SELECT * FROM applications WHERE id = ?', [req.params.id], (err, application) => {
        if (err || !application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        
        db.get('SELECT * FROM trade_in_vehicles WHERE application_id = ?', [req.params.id], (err, tradeIn) => {
            res.json({
                application: application,
                tradeIn: tradeIn
            });
        });
    });
});

// Generate printable report for sell submission
app.get('/api/sell-submissions/:id/print', authenticateToken, (req, res) => {
    db.get('SELECT * FROM sell_submissions WHERE id = ?', [req.params.id], (err, submission) => {
        if (err || !submission) {
            return res.status(404).json({ error: 'Submission not found' });
        }
        res.json(submission);
    });
});

// Delete application (protected route)
app.delete('/api/applications/:id', authenticateToken, (req, res) => {
    // First delete trade-in details if exists
    db.run('DELETE FROM trade_in_vehicles WHERE application_id = ?', [req.params.id], (err) => {
        // Then delete main application
        db.run('DELETE FROM applications WHERE id = ?', [req.params.id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to delete application' });
            }
            res.json({ success: true, message: 'Application deleted' });
        });
    });
});

// Delete sell submission (protected route)
app.delete('/api/sell-submissions/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM sell_submissions WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to delete submission' });
        }
        res.json({ success: true, message: 'Submission deleted' });
    });
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-enhanced.html'));
});

// Delivery Tracking API
app.get('/api/track/:trackingId', (req, res) => {
    const trackingId = req.params.trackingId;
    
    db.get('SELECT * FROM deliveries WHERE tracking_id = ? OR order_number = ?', 
        [trackingId.toUpperCase(), trackingId.toUpperCase()], 
        (err, delivery) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!delivery) {
                return res.status(404).json({ error: 'Delivery not found' });
            }
            
            // Add timeline events based on status
            const timeline = [
                {
                    status: 'confirmed',
                    title: 'Order Confirmed',
                    time: 'Yesterday, 2:30 PM',
                    completed: true
                },
                {
                    status: 'picked_up',
                    title: 'Vehicle Picked Up',
                    time: 'Today, 9:15 AM',
                    completed: true
                },
                {
                    status: 'in_transit',
                    title: 'In Transit',
                    time: 'Currently en route to delivery address',
                    completed: false,
                    current: true
                },
                {
                    status: 'delivered',
                    title: 'Delivered',
                    time: 'Pending',
                    completed: false
                }
            ];
            
            res.json({
                ...delivery,
                timeline: timeline
            });
        }
    );
});

// Update delivery location (for driver app simulation)
app.put('/api/deliveries/:trackingId/location', authenticateToken, (req, res) => {
    const { lat, lng } = req.body;
    const trackingId = req.params.trackingId;
    
    db.run(
        'UPDATE deliveries SET current_lat = ?, current_lng = ?, updated_at = CURRENT_TIMESTAMP WHERE tracking_id = ?',
        [lat, lng, trackingId],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Failed to update location' });
            }
            res.json({ success: true, message: 'Location updated' });
        }
    );
});

// Get all deliveries (admin)
app.get('/api/deliveries', authenticateToken, (req, res) => {
    db.all('SELECT * FROM deliveries ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch deliveries' });
        }
        res.json(rows);
    });
});

// Serve print page
app.get('/print/:type/:id', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'print.html'));
});

app.listen(PORT, () => {
    console.log(`Green Light Automotive Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Default login - Username: admin, Password: admin123`);
});