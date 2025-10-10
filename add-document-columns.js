const sqlite3 = require('sqlite3').verbose();

// Open database
const db = new sqlite3.Database('./database.db');

console.log('Adding document upload columns to database...');

db.serialize(() => {
    // Add columns to applications table
    db.run(`ALTER TABLE applications ADD COLUMN paystub_file TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding paystub_file to applications:', err);
        } else {
            console.log('✓ Added paystub_file to applications table');
        }
    });
    
    db.run(`ALTER TABLE applications ADD COLUMN drivers_license_file TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding drivers_license_file to applications:', err);
        } else {
            console.log('✓ Added drivers_license_file to applications table');
        }
    });
    
    // Add columns to sell_submissions table
    db.run(`ALTER TABLE sell_submissions ADD COLUMN paystub_file TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding paystub_file to sell_submissions:', err);
        } else {
            console.log('✓ Added paystub_file to sell_submissions table');
        }
    });
    
    db.run(`ALTER TABLE sell_submissions ADD COLUMN drivers_license_file TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding drivers_license_file to sell_submissions:', err);
        } else {
            console.log('✓ Added drivers_license_file to sell_submissions table');
        }
    });
    
    // Close database after a short delay
    setTimeout(() => {
        db.close(() => {
            console.log('Database migration complete!');
        });
    }, 1000);
});