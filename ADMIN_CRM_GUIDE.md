# Greenlight Automotive CRM - Admin Dashboard Guide

## Overview

The Greenlight Automotive CRM provides a comprehensive admin dashboard with five tabs for managing all aspects of the business: pre-approval applications, sell requests, dealership inquiries, delivery bids, and referral partners.

## Accessing the Admin Dashboard

**URL:** `http://localhost:8000/admin` (or your deployed domain + `/admin`)

### Default Login Credentials
- **Username:** `admin`
- **Password:** `admin123`

These can be changed via environment variables `ADMIN_USERNAME` and `ADMIN_DEFAULT_PASSWORD` in your `.env` file.

## Dashboard Tabs

### 1. Pre-Approvals

Manages finance applications submitted through the website's pre-approval form.

**Stats:** Total Applications, Today's Leads, This Week, Pending Review

**Table columns:** ID, Date, Customer, Contact, Vehicle, Budget, Credit, Status, Actions

**Features:**
- **Search** by customer name, email, or phone
- **Filter** by vehicle type and credit score
- **View details** including customer info, vehicle preferences, financials, employment, and uploaded documents (license, paystub)
- **Update deal status** (Pending, Contacted, Approved, Declined) — approving a referred lead automatically credits the referrer's commission
- **Download/view documents** directly from the detail modal
- **Export to CSV**
- **Delete** individual applications

### 2. Sell Requests

Manages vehicle sell submissions from the Sell My Car page.

**Stats:** Total Requests, Today's Requests, This Week, Total Vehicles

**Table columns:** ID, Date, Customer, Contact, Vehicle (make/model), Year, Mileage, Condition, Actions

**Features:**
- **Search** by customer name, email, phone, make, or model
- **View details** including customer info, vehicle details, and uploaded photos (front, back, driver side, passenger, VIN, odometer)
- **Export to CSV**
- **Delete** individual submissions

### 3. Dealer Inquiries

Manages dealership partnership requests from the Buy Leads page.

**Stats:** Total Inquiries, New/Unread, Contacted, Closed

**Table columns:** ID, Date, Dealership, Contact, Location, Package, Volume, Status, Actions

**Features:**
- **Search** by dealership name, contact, email, phone, or location
- **Filter** by status (New, Contacted, Closed)
- **Update inquiry status** from the detail modal
- **View details** including dealership info, package preference, monthly volume, and additional notes
- **Export to CSV**
- **Delete** individual inquiries

### 4. Delivery Bids

Manages driver bids on vehicle delivery jobs. Receives real-time updates via Socket.IO.

**Stats:** Total Bids, Pending Bids, Accepted Bids, Pending Value

**Table columns:** ID, Date, Driver, Vehicle, Route, Bid Amount, Bid Status, Job Status, Actions

**Features:**
- **Search** by driver name, email, vehicle info, or addresses
- **Filter** by bid status (Pending, Accepted, Rejected) and job status (Open, Assigned, Completed)
- **View details** including driver info (rating, completed deliveries), job details (route, distance, date), and bid info (amount, message)
- **Accept bids** — assigns the driver and auto-rejects other bids on the same job
- **Real-time updates** — new bids and accepted bids appear automatically via Socket.IO
- **Export to CSV**

### 5. Referral Partners

Manages registered referral partners and their performance. Partners sign up at `/referral.html` and receive a unique referral code/link.

**Stats:** Total Partners, Total Earnings Paid, Active Partners (1+ referral), Avg Conversion Rate

**Table columns:** ID, Joined, Partner, Contact, Referral Code (with copy button), Referrals, Approved, Earnings, Actions

**Features:**
- **Search** by partner name, email, phone, or referral code
- **View details** including partner info, referral link, commission rate, and performance metrics (total referrals, approved leads, conversion rate, total earnings)
- **Copy referral link** to clipboard with one click
- **Export to CSV**

## Common Features Across All Tabs

- **Search bar** — global search that filters the current tab's data
- **Export CSV** — download current tab's data as a spreadsheet
- **Stats cards** — key metrics update automatically when data loads
- **Detail modals** — click "View" on any row for full details
- **Sidebar badges** — show counts (pending bids, partner count, etc.)
- **Refresh button** — reloads all data from the server

## How Data Flows

```
Website Forms (/apply, /sell-my-car, /buy-leads, /referral.html)
        |
        v
Server API endpoints (POST)
        |
        v
Database (PostgreSQL on Vercel / SQLite locally)
        |
        v
CRM Dashboard (/admin) — fetches via GET API endpoints
        |
        v
Sales team: view, filter, export, update status, accept bids
```

## API Endpoints

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Login, returns JWT token |
| GET | `/api/applications` | All pre-approval applications |
| GET | `/api/applications/:id` | Single application details |
| GET | `/api/applications/:id/document/:type` | Download document (type: `paystub` or `license`) |
| PUT | `/api/applications/:id/status` | Update deal status |
| DELETE | `/api/applications/:id` | Delete application |
| GET | `/api/sell-submissions` | All sell car submissions |
| GET | `/api/sell-submissions/:id` | Single sell submission |
| DELETE | `/api/sell-submissions/:id` | Delete sell submission |
| GET | `/api/lead-inquiries` | All dealer inquiries |
| PUT | `/api/lead-inquiries/:id/status` | Update inquiry status |
| DELETE | `/api/lead-inquiries/:id` | Delete inquiry |
| GET | `/api/admin/delivery-bids` | All delivery bids with driver/job info |
| GET | `/api/admin/referrers` | All referral partners with lead stats |

## Security Features

1. **JWT Authentication** — all admin routes protected with JSON Web Tokens
2. **Bcrypt Password Hashing** — passwords stored securely
3. **Environment Variables** — sensitive data in `.env` file
4. **Session Management** — auto-logout on token expiration

## Changing the Admin Password

1. Edit `.env` file
2. Set `ADMIN_DEFAULT_PASSWORD=your_new_password`
3. Optionally set `ADMIN_USERNAME=your_username`
4. Restart the server (password re-hashes on startup)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't log in | Check credentials are case-sensitive, ensure server is running |
| No data showing | Click the refresh button in the top header, check server logs |
| Export not working | Check browser pop-up blocker, ensure data exists to export |
| Document download fails | Check server logs for errors, ensure the application has uploaded documents |
| Real-time bids not updating | Check that Socket.IO is connected (browser console) |
| Referral partners empty | Partners must register at `/referral.html` first |

## Files

- **Dashboard HTML:** `admin/index.html`
- **Dashboard JS:** `assets/js/admin-dashboard.js`
- **Dashboard CSS:** `assets/css/admin-styles.css`
- **Server:** `server.js`

## Version
**Current Version:** 2.0
**Last Updated:** February 2026
