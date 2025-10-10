const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Create delivery jobs table
    db.run(`
        CREATE TABLE IF NOT EXISTS delivery_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            pickup_address TEXT NOT NULL,
            delivery_address TEXT NOT NULL,
            vehicle_info TEXT NOT NULL,
            distance REAL,
            estimated_time INTEGER,
            delivery_date DATE NOT NULL,
            delivery_window TEXT NOT NULL,
            special_instructions TEXT,
            status TEXT DEFAULT 'open',
            winning_bid_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (winning_bid_id) REFERENCES driver_bids(id)
        )
    `, (err) => {
        if (err) console.error('Error creating delivery_jobs table:', err);
        else console.log('✓ delivery_jobs table created/verified');
    });

    // Create driver profiles table
    db.run(`
        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT NOT NULL,
            license_number TEXT UNIQUE NOT NULL,
            vehicle_type TEXT NOT NULL,
            rating REAL DEFAULT 5.0,
            completed_deliveries INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('Error creating drivers table:', err);
        else console.log('✓ drivers table created/verified');
    });

    // Create bids table
    db.run(`
        CREATE TABLE IF NOT EXISTS driver_bids (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_id INTEGER NOT NULL,
            driver_id INTEGER NOT NULL,
            bid_amount REAL NOT NULL,
            estimated_completion_time INTEGER NOT NULL,
            message TEXT,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (job_id) REFERENCES delivery_jobs(id),
            FOREIGN KEY (driver_id) REFERENCES drivers(id),
            UNIQUE(job_id, driver_id)
        )
    `, (err) => {
        if (err) console.error('Error creating driver_bids table:', err);
        else console.log('✓ driver_bids table created/verified');
    });

    // Insert sample drivers
    const sampleDrivers = [
        ['John Smith', 'john@driver.com', '604-555-0101', 'DL123456', 'Flatbed Truck', 4.8, 127],
        ['Maria Garcia', 'maria@driver.com', '778-555-0102', 'DL234567', 'Enclosed Trailer', 4.9, 203],
        ['David Lee', 'david@driver.com', '250-555-0103', 'DL345678', 'Tow Truck', 4.7, 89],
        ['Sarah Johnson', 'sarah@driver.com', '604-555-0104', 'DL456789', 'Flatbed Truck', 5.0, 156]
    ];

    const insertDriver = db.prepare(`
        INSERT OR IGNORE INTO drivers (name, email, phone, license_number, vehicle_type, rating, completed_deliveries) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    sampleDrivers.forEach(driver => {
        insertDriver.run(driver, (err) => {
            if (err) console.error('Error inserting driver:', err);
        });
    });

    insertDriver.finalize();

    // Insert sample delivery jobs
    const sampleJobs = [
        ['Robert Chen', '123 Main St, Vancouver, BC', '456 Oak Ave, Richmond, BC', '2022 Honda Civic - Blue', 15.5, 30, '2025-08-22', '9:00 AM - 12:00 PM', 'Handle with care, new purchase'],
        ['Emily Watson', '789 Pine St, Victoria, BC', '321 Maple Dr, Sidney, BC', '2021 Toyota RAV4 - Silver', 22.3, 45, '2025-08-23', '2:00 PM - 5:00 PM', 'Customer will meet at destination'],
        ['Michael Brown', '555 Beach Rd, Kelowna, BC', '777 Mountain View, West Kelowna, BC', '2020 Ford F-150 - Black', 18.7, 35, '2025-08-24', '10:00 AM - 1:00 PM', 'Requires flatbed truck']
    ];

    const insertJob = db.prepare(`
        INSERT OR IGNORE INTO delivery_jobs (customer_name, pickup_address, delivery_address, vehicle_info, distance, estimated_time, delivery_date, delivery_window, special_instructions) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleJobs.forEach(job => {
        insertJob.run(job, (err) => {
            if (err) console.error('Error inserting job:', err);
        });
    });

    insertJob.finalize();

    console.log('✓ Database setup complete');
    db.close();
});