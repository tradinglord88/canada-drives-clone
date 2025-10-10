# Green Light Automotive - Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Server**
   ```bash
   npm run start:realtime
   ```

3. **Access the Application**
   - Main Site: http://localhost:8000
   - Test Dashboard: http://localhost:8000/test-all-features.html

## Google Maps Setup

### ⚠️ Important: Enable Maps JavaScript API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** > **Library**
4. Search for **"Maps JavaScript API"**
5. Click on it and press **"ENABLE"**
6. Your API Key: `AIzaSyBEBdu5vOONDHNbAu0Hxv9Ko5BQRd20C_Y`

### Troubleshooting Maps

If maps aren't showing:
1. Open browser console (F12)
2. Look for "ApiNotActivatedMapError" - this means you need to enable the API
3. Check for "InvalidKeyMapError" - verify your API key is correct
4. Visit http://localhost:8000/test-maps.html to test just the maps

## Features & URLs

### Customer Features
- **Home Page**: http://localhost:8000
- **Track Delivery**: http://localhost:8000/track-delivery.html
  - Sample tracking IDs: `GLA-2024-1234`, `GLA-2024-1235`
- **Sell My Car**: http://localhost:8000/sell-car-wizard.html
- **Get Pre-Approved**: Click button on home page

### Admin Features
- **Admin Panel**: http://localhost:8000/admin
  - Username: `admin`
  - Password: `admin123`
- **Delivery Management**: http://localhost:8000/delivery-admin.html

### Driver Features
- **Driver App**: http://localhost:8000/driver-app.html
  - Driver ID: Any value
  - PIN: `1234`

## Testing Everything

1. Visit http://localhost:8000/test-all-features.html
2. All tests should show green "Success" status
3. If Maps shows error, enable the API as described above

## Database

The system uses SQLite with the following tables:
- `applications` - Pre-approval applications
- `sell_submissions` - Sell car submissions
- `trade_in_vehicles` - Trade-in vehicle details
- `deliveries` - Delivery tracking data
- `delivery_tracking_history` - GPS location history
- `delivery_events` - Delivery timeline events
- `users` - Admin users

## Real-Time Features

The WebSocket server enables:
- Live delivery tracking on maps
- Real-time driver location updates
- Instant status notifications
- Driver-to-customer communication

## Common Issues

1. **Port 8000 already in use**
   ```bash
   # Find and kill the process
   lsof -i :8000
   kill -9 <PID>
   ```

2. **Maps not showing**
   - Enable Maps JavaScript API in Google Cloud Console
   - Check browser console for specific errors
   - Verify API key is correct

3. **WebSocket connection failed**
   - Make sure you're using `npm run start:realtime`
   - Check if Socket.io is properly installed

## Support

For issues:
1. Check browser console for errors
2. Visit test dashboard: http://localhost:8000/test-all-features.html
3. Verify all dependencies are installed
4. Ensure Maps JavaScript API is enabled