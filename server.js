const express = require('express');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

// Get meetings for admin panel
app.get('/api/admin/meetings', authenticateAdmin, async (req, res) => {
    try {
        const webhookUrl = process.env.ADMIN_MEETINGS_WEBHOOK;
        if (!webhookUrl) {
            console.log('⚠️ Admin meetings webhook URL not configured');
            return res.json({
                success: true,
                meetings: [],
                message: 'n8n webhook not configured'
            });
        }

        console.log('📡 Fetching meetings from n8n:', webhookUrl);
        const response = await axios.get(webhookUrl, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('📊 n8n Response Status:', response.status);
        console.log('📊 n8n Response Data:', JSON.stringify(response.data, null, 2));

        let meetings = [];
        let statistics = {};
        let lastUpdated = null;
        let message = '';

        // Handle n8n "Respond to Webhook" node output structures
        if (response.data) {
            let actualData = response.data;

            // Handle different "Respond to Webhook" response types:

            // 1. "All Incoming Items" - n8n returns array directly or nested
            if (Array.isArray(actualData)) {
                meetings = actualData;
                console.log('✅ Found direct array (All Incoming Items):', meetings.length);
            }
            // 2. "First Incoming Item" or "JSON" response - check nested structures
            else if (actualData && typeof actualData === 'object') {

                // Check for n8n workflow nested json property (common with Respond to Webhook)
                if (actualData.json && typeof actualData.json === 'object') {
                    actualData = actualData.json;
                    console.log('📦 Found nested data under .json property');
                }

                // Try to extract meetings from various possible structures
                if (Array.isArray(actualData)) {
                    meetings = actualData;
                    console.log('✅ Found meetings array in nested json:', meetings.length);
                } else if (actualData.meetings && Array.isArray(actualData.meetings)) {
                    meetings = actualData.meetings;
                    statistics = actualData.statistics || {};
                    lastUpdated = actualData.lastUpdated;
                    message = actualData.message || '';
                    console.log('✅ Found meetings in .meetings property:', meetings.length);
                } else if (actualData.data && Array.isArray(actualData.data)) {
                    meetings = actualData.data;
                    console.log('✅ Found meetings in .data property:', meetings.length);
                } else if (actualData.items && Array.isArray(actualData.items)) {
                    // Handle case where n8n wraps data in "items" property
                    meetings = actualData.items;
                    console.log('✅ Found meetings in .items property:', meetings.length);
                } else if (actualData.response && Array.isArray(actualData.response)) {
                    // Handle case where data is in "response" property
                    meetings = actualData.response;
                    console.log('✅ Found meetings in .response property:', meetings.length);
                } else if (actualData.result && Array.isArray(actualData.result)) {
                    // Handle case where data is in "result" property
                    meetings = actualData.result;
                    console.log('✅ Found meetings in .result property:', meetings.length);
                } else if (actualData.message === 'Workflow was started') {
                    // n8n workflow started but didn't return data
                    console.log('⚠️ n8n workflow started but no data returned');
                    console.log('💡 SOLUTION: Add "Respond to Webhook" node to your n8n workflow');
                    console.log('📋 Steps to fix:');
                    console.log('   1. Open your n8n workflow');
                    console.log('   2. Add a "Respond to Webhook" node at the end');
                    console.log('   3. Set "Respond With" to "All Incoming Items" or "JSON"');
                    console.log('   4. Connect it after your data processing nodes');
                    console.log('   5. Make sure your Webhook trigger has "Respond" set to "Using Respond to Webhook Node"');
                    meetings = [];
                } else if (actualData.requestId || actualData.id) {
                    // If it's a single meeting object, wrap it in an array
                    meetings = [actualData];
                    console.log('✅ Found single meeting object');
                } else {
                    // Log the structure for debugging
                    console.log('🔍 Unknown data structure from n8n:');
                    console.log('📋 Available properties:', Object.keys(actualData));
                    console.log('💡 Ensure your "Respond to Webhook" node returns meeting data');

                    // Try to find any array property that might contain meetings
                    for (const [key, value] of Object.entries(actualData)) {
                        if (Array.isArray(value) && value.length > 0) {
                            console.log(`🔍 Found array in property "${key}" with ${value.length} items`);
                            // Check if it looks like meeting data
                            const firstItem = value[0];
                            if (firstItem && (firstItem.requestId || firstItem.userName || firstItem.meetingPurpose)) {
                                meetings = value;
                                console.log(`✅ Using array from "${key}" property as meetings`);
                                break;
                            }
                        }
                    }
                }
            }
        }

        console.log('📈 Final meetings count:', meetings.length);

        res.json({
            success: true,
            meetings: meetings,
            statistics: statistics,
            lastUpdated: lastUpdated,
            message: message || `Successfully loaded ${meetings.length} meetings`,
            count: meetings.length
        });

    } catch (error) {
        console.error('❌ Get meetings error:', error.message);
        console.error('🔗 Webhook URL:', process.env.ADMIN_MEETINGS_WEBHOOK);

        // Return empty array instead of error to prevent frontend crashes
        res.json({
            success: false,
            meetings: [],
            error: 'Failed to fetch meetings from n8n',
            details: error.message
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
        version: '1.0.0'
    });
});

// Temporary testing endpoint with your actual meeting data
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

// Trigger n8n sync workflow
app.post('/api/admin/sync-n8n', authenticateAdmin, async (req, res) => {
    try {
        console.log('🔄 Admin triggered n8n sync workflow');

        // For sync, we directly trigger the existing "Admin Get Meetings Webhook" 
        // which fetches fresh data from Google Sheets
        const webhookUrl = process.env.ADMIN_MEETINGS_WEBHOOK;

        if (!webhookUrl) {
            return res.status(400).json({
                error: 'No n8n webhook configured for sync operation',
                message: 'Please configure ADMIN_MEETINGS_WEBHOOK in your environment variables'
            });
        }

        console.log('📡 Triggering n8n "Admin Get Meetings Webhook" for sync:', webhookUrl);

        // Trigger the Admin Get Meetings Webhook with GET request
        // This will fetch fresh data from Google Sheets and return formatted meeting data
        const syncResponse = await axios.get(webhookUrl, {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            params: {
                // Add query parameters to indicate this is a sync request
                sync: 'true',
                triggeredBy: 'admin',
                timestamp: new Date().toISOString()
            }
        });

        console.log('✅ n8n sync completed successfully, status:', syncResponse.status);
        console.log('📊 n8n sync response:', JSON.stringify(syncResponse.data, null, 2));

        let meetings = [];
        let statistics = {};
        let responseData = syncResponse.data;

        // Handle different "Respond to Webhook" response structures from n8n sync
        if (responseData) {
            let actualData = responseData;

            // Handle "Respond to Webhook" node output structures:

            // 1. "All Incoming Items" - n8n returns array directly
            if (Array.isArray(actualData)) {
                meetings = actualData;
                console.log('✅ Sync: Found direct array (All Incoming Items):', meetings.length);
            }
            // 2. Check for nested structures from "Respond to Webhook" node
            else if (actualData && typeof actualData === 'object') {

                // Check for n8n workflow nested json property
                if (actualData.json && typeof actualData.json === 'object') {
                    actualData = actualData.json;
                    console.log('📦 Sync: Found nested data under .json property');
                }

                // Try various response structures
                if (Array.isArray(actualData)) {
                    meetings = actualData;
                    console.log('✅ Sync: Found meetings array in nested json:', meetings.length);
                } else if (actualData.meetings && Array.isArray(actualData.meetings)) {
                    meetings = actualData.meetings;
                    statistics = actualData.statistics || {};
                    console.log('✅ Sync: Found meetings in .meetings property:', meetings.length);
                } else if (actualData.data && Array.isArray(actualData.data)) {
                    meetings = actualData.data;
                    console.log('✅ Sync: Found meetings in .data property:', meetings.length);
                } else if (actualData.items && Array.isArray(actualData.items)) {
                    meetings = actualData.items;
                    console.log('✅ Sync: Found meetings in .items property:', meetings.length);
                } else if (actualData.response && Array.isArray(actualData.response)) {
                    meetings = actualData.response;
                    console.log('✅ Sync: Found meetings in .response property:', meetings.length);
                } else if (actualData.result && Array.isArray(actualData.result)) {
                    meetings = actualData.result;
                    console.log('✅ Sync: Found meetings in .result property:', meetings.length);
                } else if (actualData.success && actualData.meetings) {
                    // Handle structured response from workflow
                    meetings = Array.isArray(actualData.meetings) ? actualData.meetings : [];
                    console.log('✅ Sync: Found structured response with meetings:', meetings.length);
                } else if (actualData.requestId || actualData.id) {
                    // Single meeting object
                    meetings = [actualData];
                    console.log('✅ Sync: Found single meeting object');
                } else {
                    // Debug unknown structure
                    console.log('🔍 Sync: Unknown data structure from n8n:');
                    console.log('📋 Available properties:', Object.keys(actualData));

                    // Auto-detect array properties that might contain meetings
                    for (const [key, value] of Object.entries(actualData)) {
                        if (Array.isArray(value) && value.length > 0) {
                            console.log(`🔍 Sync: Found array in property "${key}" with ${value.length} items`);
                            const firstItem = value[0];
                            if (firstItem && (firstItem.requestId || firstItem.userName || firstItem.meetingPurpose)) {
                                meetings = value;
                                console.log(`✅ Sync: Using array from "${key}" property as meetings`);
                                break;
                            }
                        }
                    }
                }
            }
        }

        console.log('📈 Final sync result - meetings count:', meetings.length);

        // Return success response with updated data
        res.json({
            success: true,
            message: `n8n sync completed successfully - ${meetings.length} meetings retrieved`,
            meetings: meetings,
            syncTriggered: true,
            syncedAt: new Date().toISOString(),
            statistics: statistics || responseData?.statistics || null,
            metadata: {
                triggeredBy: 'admin',
                webhookUrl: webhookUrl,
                responseType: Array.isArray(responseData) ? 'array' : typeof responseData
            }
        });

    } catch (error) {
        console.error('❌ n8n sync error:', error.message);

        // Provide more helpful error messages
        let errorMessage = 'Failed to sync with n8n';
        let errorDetails = error.message;

        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Cannot connect to n8n';
            errorDetails = 'Make sure n8n is running on localhost:5678';
        } else if (error.response?.status === 404) {
            errorMessage = 'n8n webhook not found';
            errorDetails = 'Check that the "Admin Get Meetings Webhook" is properly configured in your n8n workflow';
        } else if (error.response?.status === 500) {
            errorMessage = 'n8n workflow error';
            errorDetails = 'Check n8n execution logs for workflow errors';
        }

        res.status(500).json({
            error: errorMessage,
            message: errorDetails,
            syncTriggered: false,
            timestamp: new Date().toISOString(),
            troubleshooting: {
                checkN8nRunning: 'Ensure n8n is running on localhost:5678',
                checkWorkflow: 'Verify "Admin Get Meetings Webhook" node is active in n8n workflow',
                checkWebhookUrl: 'Confirm ADMIN_MEETINGS_WEBHOOK environment variable is correct'
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
