const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const GoogleSheetsService = require('./services/googleSheetsService');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Google Sheets service
const googleSheetsService = new GoogleSheetsService();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:5678"]
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const corsOptions = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'meeting-system-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        maxAge: parseInt(process.env.SESSION_TIMEOUT) || 3600000 // 1 hour
    }
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized access' });
};

// Routes

// Home page - User panel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin login page
app.get('/admin', (req, res) => {
    if (req.session && req.session.isAdmin) {
        res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
    }
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Check credentials against environment variables
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            req.session.isAdmin = true;
            req.session.adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
            req.session.loginTime = new Date().toISOString();

            res.json({
                success: true,
                message: 'Login successful',
                redirectUrl: '/admin/dashboard'
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin logout endpoint
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Admin dashboard page
app.get('/admin/dashboard', authenticateAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Check admin session status
app.get('/api/admin/session', authenticateAdmin, (req, res) => {
    res.json({
        success: true,
        authenticated: true,
        admin: req.session.adminEmail || 'admin'
    });
});

// Submit meeting request endpoint
app.post('/api/meeting/request', async (req, res) => {
    try {
        const {
            userName,
            userEmail,
            userPhone,
            userCompany,
            userPosition,
            meetingPurpose,
            meetingDescription,
            preferredDate,
            preferredTime,
            estimatedDuration,
            meetingType,
            location,
            urgency,
            additionalNotes
        } = req.body;

        // Validate required fields
        const requiredFields = ['userName', 'userEmail', 'userPhone', 'meetingPurpose', 'preferredDate', 'preferredTime', 'meetingType'];
        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                missingFields
            });
        }

        // Prepare data for n8n webhook
        const meetingRequestData = {
            userName,
            userEmail,
            userPhone,
            userCompany: userCompany || '',
            userPosition: userPosition || '',
            meetingPurpose,
            meetingDescription: meetingDescription || '',
            preferredDate,
            preferredTime,
            estimatedDuration: estimatedDuration || '60',
            meetingType,
            location: location || '',
            urgency: urgency || 'normal',
            additionalNotes: additionalNotes || '',
            timestamp: new Date().toISOString(),
            source: 'web-panel'
        };

        // Send to n8n webhook
        const webhookUrl = process.env.MEETING_REQUEST_WEBHOOK;
        if (!webhookUrl) {
            throw new Error('Meeting request webhook URL not configured');
        }

        const response = await axios.post(webhookUrl, meetingRequestData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('Meeting request sent to n8n:', response.status);

        res.json({
            success: true,
            message: 'Meeting request submitted successfully',
            requestId: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
            data: meetingRequestData
        });

    } catch (error) {
        console.error('Meeting request error:', error);

        if (error.code === 'ECONNREFUSED') {
            res.status(503).json({
                error: 'Meeting service temporarily unavailable. Please try again later.'
            });
        } else {
            res.status(500).json({
                error: 'Failed to submit meeting request. Please try again.'
            });
        }
    }
});

// Get meetings for admin panel - Direct Google Sheets access
app.get('/api/admin/meetings', authenticateAdmin, async (req, res) => {
    try {
        console.log('📊 Fetching meetings directly from Google Sheets...');

        // Check if Google Sheets ID is configured
        if (!process.env.GOOGLE_SHEETS_ID) {
            return res.status(400).json({
                success: false,
                meetings: [],
                error: 'Google Sheets ID not configured',
                message: 'Please set GOOGLE_SHEETS_ID in your environment variables'
            });
        }

        // Fetch meetings directly from Google Sheets
        const meetings = await googleSheetsService.fetchMeetingRequests();

        // Generate statistics
        const statistics = googleSheetsService.generateStatistics(meetings);

        console.log(`✅ Successfully fetched ${meetings.length} meetings from Google Sheets`);
        console.log('� Statistics:', JSON.stringify(statistics, null, 2));

        res.json({
            success: true,
            meetings: meetings,
            statistics: statistics,
            lastUpdated: new Date().toISOString(),
            message: `Successfully loaded ${meetings.length} meetings from Google Sheets`,
            count: meetings.length,
            source: 'google_sheets_direct'
        });

    } catch (error) {
        console.error('❌ Error fetching meetings from Google Sheets:', error.message);

        // Provide helpful error responses
        let errorMessage = 'Failed to fetch meetings from Google Sheets';
        let troubleshooting = {};

        if (error.message.includes('API key')) {
            errorMessage = 'Google Sheets API authentication failed';
            troubleshooting = {
                solution: 'Add GOOGLE_API_KEY to your .env file',
                alternative: 'Make sure the Google Sheet is publicly accessible',
                docs: 'https://developers.google.com/sheets/api/guides/authorizing'
            };
        } else if (error.message.includes('permission')) {
            errorMessage = 'Permission denied accessing Google Sheets';
            troubleshooting = {
                solution: 'Share your Google Sheet publicly with view access',
                steps: [
                    '1. Open your Google Sheet',
                    '2. Click "Share" button',
                    '3. Change to "Anyone with the link can view"',
                    '4. Copy the sheet ID from the URL'
                ]
            };
        } else if (error.message.includes('not found')) {
            errorMessage = 'Google Sheet not found';
            troubleshooting = {
                solution: 'Check your GOOGLE_SHEETS_ID in .env file',
                currentId: process.env.GOOGLE_SHEETS_ID,
                format: 'Should be the long string from your sheet URL'
            };
        }

        // Return error but don't crash the frontend
        res.json({
            success: false,
            meetings: [],
            error: errorMessage,
            details: error.message,
            troubleshooting: troubleshooting,
            timestamp: new Date().toISOString()
        });
    }
});

// Admin action on meeting (approve/reject/reschedule)
app.post('/api/admin/meeting/action', authenticateAdmin, async (req, res) => {
    try {
        const {
            requestId,
            action,
            adminNotes,
            newDate,
            newTime,
            newDuration,
            newLocation,
            newMeetingType
        } = req.body;

        if (!requestId || !action) {
            return res.status(400).json({
                error: 'Request ID and action are required'
            });
        }

        const validActions = ['approve', 'reject', 'reschedule'];
        if (!validActions.includes(action)) {
            return res.status(400).json({
                error: 'Invalid action. Must be: approve, reject, or reschedule'
            });
        }

        // Prepare action data for n8n webhook
        const actionData = {
            requestId,
            action,
            adminEmail: req.session.adminEmail,
            adminNotes: adminNotes || '',
            newDate: newDate || null,
            newTime: newTime || null,
            newDuration: newDuration || null,
            newLocation: newLocation || null,
            newMeetingType: newMeetingType || null,
            timestamp: new Date().toISOString()
        };

        // Send to n8n webhook
        const webhookUrl = process.env.ADMIN_ACTION_WEBHOOK;
        if (!webhookUrl) {
            throw new Error('Admin action webhook URL not configured');
        }

        const response = await axios.post(webhookUrl, actionData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        console.log('Admin action sent to n8n:', response.status);

        res.json({
            success: true,
            message: `Meeting ${action} successfully`,
            action: action,
            requestId: requestId
        });

    } catch (error) {
        console.error('Admin action error:', error);
        res.status(500).json({
            error: 'Failed to process admin action. Please try again.'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        googleSheetsIntegration: {
            enabled: true,
            sheetId: process.env.GOOGLE_SHEETS_ID ? 'configured' : 'missing',
            apiKey: process.env.GOOGLE_API_KEY ? 'configured' : 'missing'
        }
    });
});

// Simple test Google Sheets connection (no auth required for debugging)
app.get('/api/test-sheets-connection', async (req, res) => {
    try {
        console.log('🧪 Testing Google Sheets connection (public endpoint)...');

        if (!process.env.GOOGLE_SHEETS_ID) {
            return res.status(400).json({
                success: false,
                error: 'Google Sheets ID not configured',
                message: 'GOOGLE_SHEETS_ID missing from environment variables'
            });
        }

        const meetings = await googleSheetsService.fetchMeetingRequests();

        res.json({
            success: true,
            message: 'Google Sheets connection successful',
            meetingsFound: meetings.length,
            testResult: {
                sheetsConfigured: !!process.env.GOOGLE_SHEETS_ID,
                apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
                meetingsFound: meetings.length,
                timestamp: new Date().toISOString(),
                sheetId: process.env.GOOGLE_SHEETS_ID,
                firstMeeting: meetings.length > 0 ? {
                    requestId: meetings[0].requestId,
                    userName: meetings[0].userName,
                    status: meetings[0].status
                } : null
            }
        });
    } catch (error) {
        console.error('❌ Google Sheets test failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Google Sheets connection failed',
            details: error.message,
            testResult: {
                sheetsConfigured: !!process.env.GOOGLE_SHEETS_ID,
                apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
                meetingsFound: 0,
                timestamp: new Date().toISOString(),
                errorType: error.message.includes('403') ? 'permission_denied' :
                    error.message.includes('404') ? 'sheet_not_found' :
                        error.message.includes('API') ? 'api_error' : 'unknown'
            }
        });
    }
});

// Test Google Sheets connection (admin required)
app.get('/api/admin/test-sheets', authenticateAdmin, async (req, res) => {
    try {
        console.log('🧪 Testing Google Sheets connection...');

        const meetings = await googleSheetsService.fetchMeetingRequests();
        const statistics = googleSheetsService.generateStatistics(meetings);

        res.json({
            success: true,
            message: 'Google Sheets connection successful',
            meetings: meetings,
            statistics: statistics,
            testResult: {
                sheetsConfigured: !!process.env.GOOGLE_SHEETS_ID,
                apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
                meetingsFound: meetings.length,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('❌ Google Sheets test failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Google Sheets connection failed',
            details: error.message,
            testResult: {
                sheetsConfigured: !!process.env.GOOGLE_SHEETS_ID,
                apiKeyConfigured: !!process.env.GOOGLE_API_KEY,
                meetingsFound: 0,
                timestamp: new Date().toISOString()
            }
        });
    }
});// Temporary testing endpoint with your actual meeting data
app.get('/api/admin/meetings/test', authenticateAdmin, (req, res) => {
    console.log('🧪 Using test meeting data');
    const testMeetings = [
        {}
    ];

    res.json({
        success: true,
        meetings: testMeetings,
        count: testMeetings.length,
        message: 'Using test data - your actual n8n data structure'
    });
});

// Refresh meeting data from Google Sheets
app.post('/api/admin/sync-n8n', authenticateAdmin, async (req, res) => {
    try {
        console.log('🔄 Admin triggered Google Sheets data refresh');

        // Check if Google Sheets ID is configured
        if (!process.env.GOOGLE_SHEETS_ID) {
            return res.status(400).json({
                error: 'Google Sheets not configured',
                message: 'Please configure GOOGLE_SHEETS_ID in your environment variables'
            });
        }

        console.log('📡 Fetching fresh data from Google Sheets...');

        // Fetch fresh data directly from Google Sheets
        const meetings = await googleSheetsService.fetchMeetingRequests();
        const statistics = googleSheetsService.generateStatistics(meetings);

        console.log('✅ Google Sheets refresh completed successfully');
        console.log('� Retrieved meetings:', meetings.length);

        // Return success response with updated data
        res.json({
            success: true,
            message: `Google Sheets refresh completed successfully - ${meetings.length} meetings retrieved`,
            meetings: meetings,
            statistics: statistics,
            syncTriggered: true,
            refreshedAt: new Date().toISOString(),
            metadata: {
                triggeredBy: 'admin',
                source: 'google_sheets_direct',
                sheetId: process.env.GOOGLE_SHEETS_ID
            }
        });

    } catch (error) {
        console.error('❌ Google Sheets refresh error:', error.message);

        // Provide more helpful error messages
        let errorMessage = 'Failed to refresh data from Google Sheets';
        let errorDetails = error.message;

        if (error.message.includes('API key')) {
            errorMessage = 'Google Sheets API authentication failed';
            errorDetails = 'Add GOOGLE_API_KEY to your .env file or configure OAuth properly';
        } else if (error.message.includes('permission')) {
            errorMessage = 'Permission denied accessing Google Sheets';
            errorDetails = 'Make sure the Google Sheet is shared publicly or OAuth is configured';
        } else if (error.message.includes('not found')) {
            errorMessage = 'Google Sheet not found';
            errorDetails = 'Check that GOOGLE_SHEETS_ID in .env is correct';
        }

        res.status(500).json({
            error: errorMessage,
            message: errorDetails,
            syncTriggered: false,
            timestamp: new Date().toISOString(),
            troubleshooting: {
                checkSheetId: 'Verify GOOGLE_SHEETS_ID environment variable is correct',
                checkPermissions: 'Ensure Google Sheet is publicly accessible',
                checkApiKey: 'Add GOOGLE_API_KEY to environment variables if needed'
            }
        });
    }
});// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Meeting Arrangement System running on port ${PORT}`);
    console.log(`📱 User Panel: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
});
