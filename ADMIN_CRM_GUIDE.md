# Canada Drives CRM - Admin Lead Management Guide

## Overview

The Canada Drives CRM system provides a comprehensive admin dashboard for sales teams to manage, view, and export customer leads collected from the website's pre-approval form.

## Accessing the Admin Dashboard

**URL:** `http://localhost:8000/admin` (or your deployed domain + `/admin`)

### Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`

⚠️ **IMPORTANT:** Change the default password immediately after first login!

## Features

### 1. Dashboard Statistics
When you log in, you'll see real-time statistics:
- **Total Leads:** All leads in the system
- **Today's Leads:** Leads submitted today
- **This Week:** Leads from the past 7 days
- **This Month:** Leads submitted this month

### 2. Lead Management Table
The main table displays all leads with:
- **Lead ID:** Unique identifier for each lead
- **Submission Date:** When the customer filled out the form
- **Customer Name:** First and last name
- **Contact Info:** Email and phone number
- **Vehicle Type:** Type of vehicle they're interested in
- **Budget:** Their budget range
- **Credit Score Category:** Excellent, Good, Fair, or Building Credit

### 3. Search & Filter
- **Search Box:** Search by customer name, email, or phone number
- **Vehicle Filter:** Filter by vehicle type (Sedan, SUV, Truck, etc.)
- **Credit Filter:** Filter by credit score category

### 4. View Lead Details
Click the **"View"** button on any lead to see a detailed breakdown:
- Complete customer information
- Vehicle preferences
- Financial information
- Lead submission details

### 5. Print Lead Sheet
From the lead detail modal, click **"Print Lead Sheet"** to generate a professional, printable document containing all lead information.

**Perfect for:**
- Sales follow-up calls
- Physical filing
- CRM import reference

### 6. Export to CSV
Click the **"Export CSV"** button to download all leads in a spreadsheet format.

**The CSV includes:**
- All customer contact information
- Vehicle preferences
- Financial details
- Submission timestamps

**Use cases:**
- Import into other CRM systems (Salesforce, HubSpot, etc.)
- Bulk email campaigns
- Performance reporting
- Data backup

### 7. Delete Leads
Click the **trash icon** to permanently delete a lead from the system.

⚠️ This action cannot be undone!

## How Customer Data Flows

```
1. Customer fills out form on website
        ↓
2. Data saved to SQLite database
        ↓
3. Sales team views in Admin Dashboard
        ↓
4. Print lead sheet or export to CSV
        ↓
5. Follow up with customer
```

## CRM Integration Options

### Option 1: Manual Import (Current Setup)
1. Export leads to CSV
2. Import CSV into your CRM system (most support CSV import)

### Option 2: API Integration (Future Enhancement)
The backend provides REST API endpoints at:
- `GET /api/applications` - Fetch all leads
- `GET /api/applications/:id` - Fetch single lead
- `DELETE /api/applications/:id` - Delete a lead

These can be integrated with:
- Salesforce API
- HubSpot API
- Zoho CRM
- Pipedrive
- Custom CRM systems

**Authentication:** JWT token required (Bearer auth)

## Security Features

1. **JWT Authentication:** All admin routes protected with JSON Web Tokens
2. **Bcrypt Password Hashing:** Passwords stored securely
3. **Environment Variables:** Sensitive data in `.env` file
4. **Session Management:** Auto-logout on token expiration

## Changing the Admin Password

### Method 1: Through Code
1. Edit `.env` file
2. Change `ADMIN_DEFAULT_PASSWORD=admin123` to your new password
3. Delete `database.db`
4. Restart server (password will be re-hashed on startup)

### Method 2: Direct Database Update (Advanced)
```bash
# Use bcrypt to hash your new password
# Then update the users table directly
```

## Best Practices

### For Sales Teams:
1. **Check leads daily** - Set up a routine to review new submissions
2. **Follow up within 24 hours** - Fastest response = highest conversion
3. **Print lead sheets** - Have physical copies for phone calls
4. **Update your CRM** - Export weekly to keep your main CRM in sync
5. **Delete spam/test leads** - Keep the database clean

### For Managers:
1. **Monitor statistics** - Track lead volume trends
2. **Export weekly reports** - Analyze lead quality and sources
3. **Review credit score distribution** - Understand your customer base
4. **Backup data** - Export CSV backups monthly

## Technical Details

### Database Schema
```sql
CREATE TABLE applications (
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
)
```

### Data Retention
- Leads are stored indefinitely until manually deleted
- Recommended: Archive leads older than 6 months
- Database location: `/database.db`

## Troubleshooting

### Can't log in?
- Check credentials (case-sensitive)
- Ensure server is running
- Check browser console for errors

### No leads showing?
- Click "Refresh" button
- Check if database.db file exists
- Verify server is running on correct port

### Export not working?
- Check browser pop-up blocker
- Ensure you have leads to export
- Try different browser

### Print not working?
- Ensure pop-ups allowed
- Check printer settings
- Try Print Preview first

## Support

For technical issues or feature requests, contact your development team.

## Version
**Current Version:** 1.0
**Last Updated:** 2024
