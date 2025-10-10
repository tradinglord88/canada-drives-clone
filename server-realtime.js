const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

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
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('.'));
app.use('/uploads', express.static('uploads'));

// Create database
const db = new sqlite3.Database('./database.db');

// Copy all database initialization from server-enhanced.js
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Applications table
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
    
    // Sell submissions table
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
    
    // Trade-in vehicles table
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

    // Enhanced deliveries table for real-time tracking
    db.run(`CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tracking_id TEXT UNIQUE NOT NULL,
        order_number TEXT NOT NULL,
        vehicle_info TEXT NOT NULL,
        pickup_location TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_email TEXT,
        driver_id TEXT,
        driver_name TEXT NOT NULL,
        driver_phone TEXT NOT NULL,
        driver_photo TEXT,
        vehicle_plate TEXT,
        status TEXT NOT NULL,
        current_lat REAL,
        current_lng REAL,
        destination_lat REAL,
        destination_lng REAL,
        route_polyline TEXT,
        distance_km REAL,
        duration_minutes INTEGER,
        estimated_delivery TEXT,
        actual_delivery TEXT,
        signature_image TEXT,
        delivery_notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Delivery tracking history
    db.run(`CREATE TABLE IF NOT EXISTS delivery_tracking_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_id INTEGER,
        lat REAL,
        lng REAL,
        speed_kmh REAL,
        heading REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (delivery_id) REFERENCES deliveries (id)
    )`);

    // Delivery events/timeline
    db.run(`CREATE TABLE IF NOT EXISTS delivery_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_id INTEGER,
        event_type TEXT NOT NULL,
        event_title TEXT NOT NULL,
        event_description TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (delivery_id) REFERENCES deliveries (id)
    )`);

    // Create default admin user
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['admin', defaultPassword]);
    
    // Create sample deliveries with different statuses
    const sampleDeliveries = [
        {
            tracking_id: 'GLA-2024-1234',
            order_number: 'ORD-001234',
            vehicle_info: '2023 Toyota Camry SE - Silver',
            pickup_location: 'Toronto, ON',
            delivery_address: '123 Main St, Ottawa, ON K1A 0B1',
            customer_name: 'John Doe',
            customer_phone: '(555) 123-4567',
            customer_email: 'john.doe@email.com',
            driver_name: 'Mike Johnson',
            driver_phone: '(555) 987-6543',
            vehicle_plate: 'ABC-123',
            status: 'in_transit',
            current_lat: 45.4215,
            current_lng: -75.6972,
            destination_lat: 45.3876,
            destination_lng: -75.6960,
            distance_km: 156.5,
            duration_minutes: 120,
            estimated_delivery: 'Today, 3:00 PM - 5:00 PM'
        },
        {
            tracking_id: 'GLA-2024-1235',
            order_number: 'ORD-001235',
            vehicle_info: '2024 Honda Accord Sport - Black',
            pickup_location: 'Montreal, QC',
            delivery_address: '456 King St, Kingston, ON K7L 1B1',
            customer_name: 'Jane Smith',
            customer_phone: '(555) 234-5678',
            customer_email: 'jane.smith@email.com',
            driver_name: 'Sarah Williams',
            driver_phone: '(555) 876-5432',
            vehicle_plate: 'XYZ-789',
            status: 'picked_up',
            current_lat: 45.5017,
            current_lng: -73.5673,
            destination_lat: 44.2312,
            destination_lng: -76.4860,
            distance_km: 285.3,
            duration_minutes: 180,
            estimated_delivery: 'Tomorrow, 10:00 AM - 12:00 PM'
        }
    ];

    sampleDeliveries.forEach(delivery => {
        db.run(`INSERT OR IGNORE INTO deliveries (
            tracking_id, order_number, vehicle_info, pickup_location, 
            delivery_address, customer_name, customer_phone, customer_email,
            driver_name, driver_phone, vehicle_plate, status, 
            current_lat, current_lng, destination_lat, destination_lng,
            distance_km, duration_minutes, estimated_delivery
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        Object.values(delivery));
    });
});

// Real-time tracking namespace
const trackingNamespace = io.of('/tracking');

// Store active tracking sessions
const activeTracking = new Map();

// WebSocket connection handling
trackingNamespace.on('connection', (socket) => {
    console.log('New tracking connection:', socket.id);

    // Customer joins tracking room
    socket.on('track-delivery', (trackingId) => {
        socket.join(`delivery-${trackingId}`);
        console.log(`Client ${socket.id} tracking delivery ${trackingId}`);
        
        // Send current delivery status
        db.get('SELECT * FROM deliveries WHERE tracking_id = ?', [trackingId], (err, delivery) => {
            if (!err && delivery) {
                socket.emit('delivery-update', delivery);
                
                // Send tracking history
                db.all('SELECT * FROM delivery_tracking_history WHERE delivery_id = ? ORDER BY timestamp DESC LIMIT 50', 
                    [delivery.id], (err, history) => {
                    if (!err) {
                        socket.emit('tracking-history', history);
                    }
                });
            }
        });
    });

    // Driver starts delivery
    socket.on('driver-start-delivery', (data) => {
        const { trackingId, driverId, driverLocation } = data;
        activeTracking.set(trackingId, {
            driverId,
            socketId: socket.id,
            startTime: new Date()
        });
        
        socket.join(`delivery-${trackingId}`);
        console.log(`Driver ${driverId} started delivery ${trackingId}`);
        
        // Update delivery status
        db.run(`UPDATE deliveries SET 
            status = 'in_transit', 
            driver_id = ?,
            current_lat = ?, 
            current_lng = ?,
            updated_at = CURRENT_TIMESTAMP 
            WHERE tracking_id = ?`,
            [driverId, driverLocation.lat, driverLocation.lng, trackingId]
        );

        // Add event
        db.get('SELECT id FROM deliveries WHERE tracking_id = ?', [trackingId], (err, delivery) => {
            if (!err && delivery) {
                db.run(`INSERT INTO delivery_events (delivery_id, event_type, event_title, event_description)
                    VALUES (?, ?, ?, ?)`,
                    [delivery.id, 'in_transit', 'Driver En Route', `Driver ${driverId} has started the delivery`]
                );
            }
        });

        // Notify all tracking clients
        trackingNamespace.to(`delivery-${trackingId}`).emit('status-update', {
            status: 'in_transit',
            message: 'Driver is on the way!'
        });
    });

    // Driver updates location
    socket.on('driver-location-update', (data) => {
        const { trackingId, location, speed, heading } = data;
        
        db.get('SELECT id FROM deliveries WHERE tracking_id = ?', [trackingId], (err, delivery) => {
            if (!err && delivery) {
                // Update current location
                db.run(`UPDATE deliveries SET 
                    current_lat = ?, 
                    current_lng = ?,
                    updated_at = CURRENT_TIMESTAMP 
                    WHERE id = ?`,
                    [location.lat, location.lng, delivery.id]
                );

                // Add to tracking history
                db.run(`INSERT INTO delivery_tracking_history (delivery_id, lat, lng, speed_kmh, heading)
                    VALUES (?, ?, ?, ?, ?)`,
                    [delivery.id, location.lat, location.lng, speed || 0, heading || 0]
                );

                // Emit to all tracking clients
                trackingNamespace.to(`delivery-${trackingId}`).emit('location-update', {
                    location,
                    speed,
                    heading,
                    timestamp: new Date()
                });
            }
        });
    });

    // Driver completes delivery
    socket.on('driver-complete-delivery', (data) => {
        const { trackingId, signature, notes, photoUrl } = data;
        
        db.run(`UPDATE deliveries SET 
            status = 'delivered',
            signature_image = ?,
            delivery_notes = ?,
            actual_delivery = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP 
            WHERE tracking_id = ?`,
            [signature, notes, trackingId]
        );

        // Add completion event
        db.get('SELECT id FROM deliveries WHERE tracking_id = ?', [trackingId], (err, delivery) => {
            if (!err && delivery) {
                db.run(`INSERT INTO delivery_events (delivery_id, event_type, event_title, event_description)
                    VALUES (?, ?, ?, ?)`,
                    [delivery.id, 'delivered', 'Delivery Completed', `Package delivered successfully${notes ? ': ' + notes : ''}`]
                );
            }
        });

        // Notify all tracking clients
        trackingNamespace.to(`delivery-${trackingId}`).emit('delivery-completed', {
            signature,
            notes,
            photoUrl,
            timestamp: new Date()
        });

        // Clean up active tracking
        activeTracking.delete(trackingId);
    });

    socket.on('disconnect', () => {
        console.log('Tracking connection closed:', socket.id);
        // Clean up any active tracking sessions for this socket
        for (const [trackingId, session] of activeTracking.entries()) {
            if (session.socketId === socket.id) {
                activeTracking.delete(trackingId);
            }
        }
    });
});

// REST API endpoints (copy from server-enhanced.js)
// ... [Include all existing endpoints from server-enhanced.js]

// Enhanced delivery tracking endpoints
app.get('/api/track/:trackingId', (req, res) => {
    const trackingId = req.params.trackingId;
    
    db.get(`SELECT d.*, 
        (SELECT COUNT(*) FROM delivery_tracking_history WHERE delivery_id = d.id) as total_updates
        FROM deliveries d 
        WHERE tracking_id = ? OR order_number = ?`, 
        [trackingId.toUpperCase(), trackingId.toUpperCase()], 
        (err, delivery) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!delivery) {
                return res.status(404).json({ error: 'Delivery not found' });
            }
            
            // Get events timeline
            db.all('SELECT * FROM delivery_events WHERE delivery_id = ? ORDER BY timestamp DESC', 
                [delivery.id], (err, events) => {
                
                res.json({
                    ...delivery,
                    events: events || []
                });
            });
        }
    );
});

// Get tracking history
app.get('/api/track/:trackingId/history', (req, res) => {
    const trackingId = req.params.trackingId;
    
    db.get('SELECT id FROM deliveries WHERE tracking_id = ?', [trackingId], (err, delivery) => {
        if (err || !delivery) {
            return res.status(404).json({ error: 'Delivery not found' });
        }
        
        db.all(`SELECT * FROM delivery_tracking_history 
            WHERE delivery_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 100`, 
            [delivery.id], (err, history) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to fetch history' });
                }
                res.json(history);
            });
    });
});

// Driver endpoints
app.post('/api/driver/login', (req, res) => {
    const { driverId, pin } = req.body;
    
    // Simple driver authentication (in production, use proper auth)
    if (driverId && pin === '1234') {
        const token = jwt.sign({ driverId, role: 'driver' }, JWT_SECRET);
        res.json({ 
            success: true, 
            token,
            driver: {
                id: driverId,
                name: 'Driver ' + driverId
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Get driver's active deliveries
app.get('/api/driver/deliveries', authenticateDriver, (req, res) => {
    const driverId = req.driver.driverId;
    
    db.all(`SELECT * FROM deliveries 
        WHERE driver_id = ? AND status IN ('assigned', 'picked_up', 'in_transit')
        ORDER BY created_at DESC`, 
        [driverId], (err, deliveries) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to fetch deliveries' });
            }
            res.json(deliveries);
        });
});

// Driver authentication middleware
function authenticateDriver(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }

    jwt.verify(token, JWT_SECRET, (err, driver) => {
        if (err || driver.role !== 'driver') {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.driver = driver;
        next();
    });
}

// Admin endpoints (copy from server-enhanced.js)
app.post('/api/applications', upload.fields([
    { name: 'frontPhoto', maxCount: 1 },
    { name: 'backPhoto', maxCount: 1 },
    { name: 'driverPhoto', maxCount: 1 },
    { name: 'passengerPhoto', maxCount: 1 },
    { name: 'vinPhoto', maxCount: 1 },
    { name: 'odometerPhoto', maxCount: 1 },
    { name: 'damagePhotos', maxCount: 10 }
]), (req, res) => {
    // Implementation from server-enhanced.js
    res.json({ success: true, message: 'Application endpoint' });
});

// Serve pages
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-enhanced.html'));
});

app.get('/driver', (req, res) => {
    res.sendFile(path.join(__dirname, 'driver-app.html'));
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

server.listen(PORT, () => {
    console.log(`Green Light Automotive Real-Time Server running on http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Driver app: http://localhost:${PORT}/driver`);
    console.log(`WebSocket server ready for real-time tracking`);
});