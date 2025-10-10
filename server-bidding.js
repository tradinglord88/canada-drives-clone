const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Database connection
const db = new sqlite3.Database('./database.db');

// Socket.io connection
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

// === DELIVERY JOBS ENDPOINTS ===

// Get all delivery jobs
app.get('/api/delivery-jobs', (req, res) => {
    const { status, location, date } = req.query;
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
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Get single delivery job
app.get('/api/delivery-jobs/:id', (req, res) => {
    const query = `
        SELECT * FROM delivery_jobs WHERE id = ?
    `;
    
    db.get(query, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(row);
    });
});

// Create new delivery job
app.post('/api/delivery-jobs', (req, res) => {
    const {
        customer_name,
        pickup_address,
        delivery_address,
        vehicle_info,
        delivery_date,
        delivery_window,
        special_instructions
    } = req.body;
    
    // Calculate estimated distance (mock calculation)
    const distance = Math.floor(Math.random() * 50) + 10;
    const estimated_time = Math.floor(distance * 2);
    
    const query = `
        INSERT INTO delivery_jobs (
            customer_name, pickup_address, delivery_address, 
            vehicle_info, distance, estimated_time, 
            delivery_date, delivery_window, special_instructions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
        customer_name, pickup_address, delivery_address,
        vehicle_info, distance, estimated_time,
        delivery_date, delivery_window, special_instructions
    ], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, message: 'Job posted successfully' });
    });
});

// Get bids for a job
app.get('/api/delivery-jobs/:id/bids', (req, res) => {
    const jobQuery = 'SELECT * FROM delivery_jobs WHERE id = ?';
    const bidsQuery = `
        SELECT b.*, d.name as driver_name, d.rating as driver_rating, 
               d.completed_deliveries, d.vehicle_type
        FROM driver_bids b
        JOIN drivers d ON b.driver_id = d.id
        WHERE b.job_id = ?
        ORDER BY b.bid_amount ASC
    `;
    
    db.get(jobQuery, [req.params.id], (err, job) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        db.all(bidsQuery, [req.params.id], (err, bids) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ job, bids });
        });
    });
});

// Accept a bid
app.post('/api/delivery-jobs/:id/accept-bid', (req, res) => {
    const { bidId } = req.body;
    const jobId = req.params.id;
    
    db.serialize(() => {
        // Update job status and winning bid
        db.run(
            'UPDATE delivery_jobs SET status = ?, winning_bid_id = ? WHERE id = ?',
            ['assigned', bidId, jobId]
        );
        
        // Update bid status
        db.run(
            'UPDATE driver_bids SET status = ? WHERE id = ?',
            ['accepted', bidId]
        );
        
        // Reject other bids
        db.run(
            'UPDATE driver_bids SET status = ? WHERE job_id = ? AND id != ?',
            ['rejected', jobId, bidId]
        );
        
        // Get driver info to emit socket event
        db.get(
            'SELECT driver_id FROM driver_bids WHERE id = ?',
            [bidId],
            (err, bid) => {
                if (!err && bid) {
                    io.emit('bidAccepted', { jobId, bidId, driverId: bid.driver_id });
                }
            }
        );
        
        res.json({ message: 'Bid accepted successfully' });
    });
});

// Update job status
app.put('/api/delivery-jobs/:id/status', (req, res) => {
    const { status } = req.body;
    
    db.run(
        'UPDATE delivery_jobs SET status = ? WHERE id = ?',
        [status, req.params.id],
        (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ message: 'Status updated successfully' });
        }
    );
});

// === DRIVER ENDPOINTS ===

// Driver login
app.post('/api/driver/login', (req, res) => {
    const { email, licenseNumber } = req.body;
    
    const query = 'SELECT * FROM drivers WHERE email = ? AND license_number = ?';
    
    db.get(query, [email, licenseNumber], (err, driver) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!driver) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        
        res.json(driver);
    });
});

// Driver registration
app.post('/api/driver/register', (req, res) => {
    const { name, email, phone, license_number, vehicle_type } = req.body;
    
    const query = `
        INSERT INTO drivers (name, email, phone, license_number, vehicle_type)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [name, email, phone, license_number, vehicle_type], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                res.status(400).json({ error: 'Email or license number already exists' });
            } else {
                res.status(500).json({ error: err.message });
            }
            return;
        }
        res.json({ id: this.lastID, message: 'Registration successful' });
    });
});

// Place a bid
app.post('/api/driver/place-bid', (req, res) => {
    const { job_id, driver_id, bid_amount, estimated_completion_time, message } = req.body;
    
    const query = `
        INSERT INTO driver_bids (job_id, driver_id, bid_amount, estimated_completion_time, message)
        VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [job_id, driver_id, bid_amount, estimated_completion_time, message], function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                res.status(400).json({ error: 'You have already bid on this job' });
            } else {
                res.status(500).json({ error: err.message });
            }
            return;
        }
        
        io.emit('newBid', { jobId: job_id, bidId: this.lastID });
        res.json({ id: this.lastID, message: 'Bid placed successfully' });
    });
});

// Get driver's bids
app.get('/api/driver/:id/bids', (req, res) => {
    const query = `
        SELECT b.*, j.vehicle_info, j.pickup_address, j.delivery_address,
               j.delivery_date, j.delivery_window
        FROM driver_bids b
        JOIN delivery_jobs j ON b.job_id = j.id
        WHERE b.driver_id = ?
        ORDER BY b.created_at DESC
    `;
    
    db.all(query, [req.params.id], (err, bids) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(bids);
    });
});

// Get driver's assigned jobs
app.get('/api/driver/:id/assigned-jobs', (req, res) => {
    const query = `
        SELECT j.*
        FROM delivery_jobs j
        JOIN driver_bids b ON j.winning_bid_id = b.id
        WHERE b.driver_id = ? AND j.status IN ('assigned', 'in_progress')
        ORDER BY j.delivery_date ASC
    `;
    
    db.all(query, [req.params.id], (err, jobs) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(jobs);
    });
});

// Cancel a bid
app.delete('/api/driver/cancel-bid/:id', (req, res) => {
    db.run('DELETE FROM driver_bids WHERE id = ?', [req.params.id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Bid cancelled successfully' });
    });
});

// Start server
server.listen(PORT, () => {
    console.log(`Delivery Bidding Server running on http://localhost:${PORT}`);
    console.log('Available pages:');
    console.log('  - Delivery Jobs: http://localhost:' + PORT + '/delivery-jobs.html');
    console.log('  - Driver Portal: http://localhost:' + PORT + '/driver-portal.html');
});