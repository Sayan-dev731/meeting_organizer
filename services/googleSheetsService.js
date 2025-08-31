const { google } = require('googleapis');
const axios = require('axios');
require('dotenv').config();

class GoogleSheetsService {
    constructor() {
        this.sheets = null;
        this.auth = null;
        this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        this.init();
    }

    /**
     * Initialize Google Sheets API with OAuth2 credentials
     */
    async init() {
        try {
            // Create OAuth2 client
            this.auth = new google.auth.OAuth2(
                process.env.CLIENT_ID,
                process.env.CLIENT_SECRET,
                'http://localhost:3000/auth/google/callback' // redirect URI
            );

            // For server-to-server communication, we'll use a different approach
            // Since we already have CLIENT_ID and CLIENT_SECRET, we'll use service account-like approach
            // For now, we'll use a simpler approach with API key if available

            // Initialize sheets API
            this.sheets = google.sheets({ version: 'v4', auth: this.auth });

            console.log('✅ Google Sheets service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Google Sheets service:', error.message);
        }
    }

    /**
     * Set access token for OAuth2 authentication
     * In production, this should be handled through proper OAuth flow
     */
    setAccessToken(accessToken) {
        if (this.auth) {
            this.auth.setCredentials({ access_token: accessToken });
        }
    }

    /**
     * Generate sample meeting data for testing when Google Sheets is not accessible
     * @returns {Array} Array of sample meeting objects
     */
    generateSampleData() {
        console.log('📝 Generating sample meeting data for testing...');

        const sampleMeetings = [
            {
                requestId: 'sample_001',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                userName: 'John Doe',
                userEmail: 'john.doe@example.com',
                userPhone: '+1-555-0123',
                userCompany: 'Tech Corp',
                meetingType: 'Online',
                meetingPurpose: 'Project Discussion',
                preferredDate: '2025-09-02',
                preferredTime: '10:00',
                estimatedDuration: '60',
                meetingDescription: 'Discuss upcoming project milestones and deliverables',
                status: 'Pending',
                adminNotes: '',
                urgency: 'medium',
                location: '',
                createdDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                requestId: 'sample_002',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                userName: 'Jane Smith',
                userEmail: 'jane.smith@company.com',
                userPhone: '+1-555-0456',
                userCompany: 'Business Solutions Inc',
                meetingType: 'Offline',
                meetingPurpose: 'Contract Review',
                preferredDate: '2025-09-03',
                preferredTime: '14:00',
                estimatedDuration: '90',
                meetingDescription: 'Review and finalize the service contract terms',
                status: 'Approved',
                adminNotes: 'Meeting confirmed for conference room A',
                urgency: 'high',
                location: 'Conference Room A',
                createdDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                requestId: 'sample_003',
                timestamp: new Date().toISOString(),
                userName: 'Bob Johnson',
                userEmail: 'bob.johnson@startup.io',
                userPhone: '+1-555-0789',
                userCompany: 'Startup Innovations',
                meetingType: 'Hybrid',
                meetingPurpose: 'Partnership Discussion',
                preferredDate: '2025-09-04',
                preferredTime: '11:30',
                estimatedDuration: '45',
                meetingDescription: 'Explore potential partnership opportunities',
                status: 'Pending',
                adminNotes: '',
                urgency: 'low',
                location: 'Meeting Room B + Online',
                createdDate: new Date().toISOString()
            }
        ];

        console.log(`✅ Generated ${sampleMeetings.length} sample meetings`);
        return sampleMeetings;
    }

    /**
     * Fetch all meeting requests from Google Sheets with fallback to sample data
     * @returns {Promise<Array>} Array of meeting objects
     */
    async fetchMeetingRequests() {
        try {
            if (!this.spreadsheetId) {
                throw new Error('Google Sheets ID not configured in environment variables');
            }

            console.log(`📊 Fetching data from Google Sheets: ${this.spreadsheetId}`);

            let response;
            const range = 'Meeting_Requests!A:X'; // All columns from A to X

            // Try different authentication methods
            if (process.env.GOOGLE_API_KEY) {
                // Method 1: Use API Key for public sheets
                console.log('🔑 Using Google API Key for authentication');
                try {
                    const sheets = google.sheets({
                        version: 'v4',
                        auth: process.env.GOOGLE_API_KEY
                    });

                    response = await sheets.spreadsheets.values.get({
                        spreadsheetId: this.spreadsheetId,
                        range: range,
                    });
                    console.log('✅ Successfully accessed sheet via API key');
                } catch (apiError) {
                    console.log('❌ API key method failed:', apiError.message);
                    throw new Error(`Google Sheets API failed: ${apiError.message}`);
                }
            } else {
                // Method 2: Try direct CSV export for public sheets
                console.log('📄 Attempting direct CSV access for public sheet');
                try {
                    const csvUrl = `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/export?format=csv`;
                    console.log('🔗 CSV URL:', csvUrl);

                    const csvResponse = await axios.get(csvUrl, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'Meeting-System/1.0.0'
                        }
                    });

                    console.log('📊 CSV Response status:', csvResponse.status);
                    console.log('📊 CSV Response size:', csvResponse.data.length);

                    if (csvResponse.status !== 200) {
                        throw new Error(`HTTP ${csvResponse.status}: ${csvResponse.statusText}`);
                    }

                    // Parse CSV data
                    const csvData = csvResponse.data;

                    if (!csvData || csvData.trim() === '') {
                        throw new Error('Empty CSV response from Google Sheets');
                    }

                    const rows = csvData.split('\n').map(row =>
                        row.split(',').map(cell => cell.replace(/"/g, '').trim())
                    );

                    // Remove empty rows
                    const validRows = rows.filter(row => row.some(cell => cell && cell.length > 0));

                    if (validRows.length === 0) {
                        throw new Error('No valid data found in CSV export');
                    }

                    response = {
                        data: {
                            values: validRows
                        }
                    };

                    console.log('✅ Successfully accessed sheet via CSV export');
                } catch (csvError) {
                    console.log('❌ CSV method failed:', csvError.message);

                    if (csvError.response?.status === 403) {
                        throw new Error('Google Sheet is not publicly accessible. Please share your sheet publicly or add GOOGLE_API_KEY to your .env file.');
                    } else if (csvError.response?.status === 404) {
                        throw new Error('Google Sheet not found. Please check your GOOGLE_SHEETS_ID in .env file.');
                    } else if (csvError.response?.status === 400) {
                        throw new Error('Google Sheet access denied (400). Please make sure:\n1. The sheet is shared publicly with "Anyone with the link can view"\n2. The GOOGLE_SHEETS_ID is correct\n3. The sheet contains a "Meeting_Requests" tab');
                    } else {
                        throw new Error(`Failed to access Google Sheet via CSV: ${csvError.message}`);
                    }
                }
            }

            const rows = response.data.values;

            if (!rows || rows.length === 0) {
                console.log('No meeting data found in Google Sheets');
                return [];
            }

            // First row contains headers
            const headers = rows[0];
            const dataRows = rows.slice(1);

            console.log(`📊 Found ${dataRows.length} meeting records in Google Sheets`);
            console.log(`📋 Sheet headers: ${headers.join(', ')}`);

            // Convert rows to objects
            const meetings = dataRows.map((row, index) => {
                const meeting = {};

                // Map each column to its corresponding header
                headers.forEach((header, colIndex) => {
                    const value = row[colIndex] || '';

                    // Map Google Sheets column names to expected API format
                    switch (header) {
                        case 'Request_ID':
                        case 'requestId':
                            meeting.requestId = value;
                            break;
                        case 'Timestamp':
                        case 'timestamp':
                            meeting.timestamp = value;
                            break;
                        case 'User_Name':
                        case 'userName':
                            meeting.userName = value;
                            break;
                        case 'User_Email':
                        case 'userEmail':
                            meeting.userEmail = value;
                            break;
                        case 'User_Phone':
                        case 'userPhone':
                            meeting.userPhone = value;
                            break;
                        case 'User_Company':
                        case 'userCompany':
                            meeting.userCompany = value;
                            break;
                        case 'userPosition':
                            meeting.userPosition = value;
                            break;
                        case 'Meeting_Type':
                        case 'meetingType':
                            meeting.meetingType = value;
                            break;
                        case 'Meeting_Purpose':
                        case 'meetingPurpose':
                            meeting.meetingPurpose = value;
                            break;
                        case 'Preferred_Date':
                        case 'preferredDate':
                            meeting.preferredDate = value;
                            break;
                        case 'Preferred_Time':
                        case 'preferredTime':
                            meeting.preferredTime = value;
                            break;
                        case 'Duration_Minutes':
                        case 'estimatedDuration':
                            meeting.estimatedDuration = value;
                            break;
                        case 'Meeting_Details':
                        case 'meetingDescription':
                            meeting.meetingDescription = value;
                            break;
                        case 'Status':
                        case 'status':
                            meeting.status = value || 'Pending';
                            break;
                        case 'Admin_Response':
                        case 'adminNotes':
                        case 'adminEmail':
                            meeting.adminNotes = value;
                            break;
                        case 'Confirmed_Date':
                        case 'confirmedDate':
                            meeting.confirmedDate = value;
                            break;
                        case 'Confirmed_Time':
                        case 'confirmedTime':
                            meeting.confirmedTime = value;
                            break;
                        case 'Priority':
                        case 'urgency':
                            meeting.urgency = value ? value.toLowerCase() : 'medium';
                            break;
                        case 'Location':
                        case 'location':
                            meeting.location = value;
                            break;
                        case 'Meeting_Link':
                        case 'meetingLink':
                            meeting.meetingLink = value;
                            break;
                        case 'Created_Date':
                        case 'createdDate':
                            meeting.createdDate = value;
                            break;
                        case 'Last_Updated':
                        case 'lastUpdated':
                            meeting.lastUpdated = value;
                            break;
                        case 'additionalNotes':
                            meeting.additionalNotes = value;
                            break;
                        case 'attachments':
                            meeting.attachments = value;
                            break;
                        case 'proposedStartTime':
                            meeting.proposedStartTime = value;
                            break;
                        case 'proposedEndTime':
                            meeting.proposedEndTime = value;
                            break;
                        default:
                            // Store any additional fields as-is
                            const fieldName = header.toLowerCase().replace(/_/g, '');
                            meeting[fieldName] = value;
                    }
                });

                // Ensure required fields have default values
                meeting.requestId = meeting.requestId || `sheet_${index + 1}`;
                meeting.status = meeting.status || 'Pending';
                meeting.timestamp = meeting.timestamp || meeting.createdDate || new Date().toISOString();

                return meeting;
            });

            // Filter out empty rows (rows where all important fields are empty)
            const validMeetings = meetings.filter((meeting, index) => {
                const hasUserName = meeting.userName && meeting.userName.trim() !== '';
                const hasUserEmail = meeting.userEmail && meeting.userEmail.trim() !== '';
                const hasMeetingPurpose = meeting.meetingPurpose && meeting.meetingPurpose.trim() !== '';

                const isValid = hasUserName && hasUserEmail && hasMeetingPurpose;

                if (!isValid) {
                    console.log(`⚠️ Filtering out meeting ${index + 1}:`, {
                        userName: meeting.userName || 'missing',
                        userEmail: meeting.userEmail || 'missing',
                        meetingPurpose: meeting.meetingPurpose || 'missing',
                        allFields: Object.keys(meeting)
                    });
                } else {
                    console.log(`✅ Valid meeting ${index + 1}: ${meeting.userName} - ${meeting.meetingPurpose}`);
                }

                return isValid;
            });

            console.log(`✅ Successfully processed ${validMeetings.length} valid meetings from Google Sheets`);

            return validMeetings;

        } catch (error) {
            console.error('❌ Error fetching meetings from Google Sheets:', error.message);

            // Provide helpful error messages
            if (error.message.includes('API key')) {
                console.log('💡 Suggestion: Add GOOGLE_API_KEY to your .env file for sheets API access');
                console.log('🔗 Get API key: https://console.developers.google.com/apis/credentials');
            } else if (error.message.includes('permission') || error.response?.status === 403) {
                console.log('💡 Suggestion: Make sure the Google Sheet is shared publicly');
                console.log('📋 Steps:');
                console.log('   1. Open your Google Sheet');
                console.log('   2. Click "Share" button');
                console.log('   3. Change to "Anyone with the link can view"');
                console.log('   4. Save the settings');
            } else if (error.message.includes('not found') || error.response?.status === 404) {
                console.log('💡 Suggestion: Check that GOOGLE_SHEETS_ID in .env is correct');
                console.log(`📋 Current ID: ${this.spreadsheetId}`);
                console.log('📋 Format: Should be the long string from your sheet URL');
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                console.log('💡 Suggestion: Check your internet connection');
            }

            // For development/testing, provide sample data as fallback
            console.log('🔄 Falling back to sample data for testing...');
            console.log('⚠️ To use real data, please fix the Google Sheets connection');

            return this.generateSampleData();
        }
    }

    /**
     * Get statistics about meetings
     * @param {Array} meetings Array of meeting objects
     * @returns {Object} Statistics object
     */
    generateStatistics(meetings) {
        const stats = {
            total: meetings.length,
            pending: 0,
            approved: 0,
            rejected: 0,
            rescheduled: 0,
            byPriority: {
                high: 0,
                medium: 0,
                low: 0
            },
            byMeetingType: {
                online: 0,
                offline: 0,
                hybrid: 0
            }
        };

        meetings.forEach(meeting => {
            // Count by status
            const status = meeting.status ? meeting.status.toLowerCase() : 'pending';
            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            }

            // Count by priority/urgency
            const priority = meeting.urgency ? meeting.urgency.toLowerCase() : 'medium';
            if (stats.byPriority.hasOwnProperty(priority)) {
                stats.byPriority[priority]++;
            }

            // Count by meeting type
            const meetingType = meeting.meetingType ? meeting.meetingType.toLowerCase() : 'online';
            if (stats.byMeetingType.hasOwnProperty(meetingType)) {
                stats.byMeetingType[meetingType]++;
            }
        });

        return stats;
    }

    /**
     * Update a meeting record in Google Sheets
     * @param {string} requestId The request ID to update
     * @param {Object} updateData The data to update
     */
    async updateMeetingRequest(requestId, updateData) {
        try {
            // This would require finding the row and updating specific cells
            // For now, we'll log this as it requires more complex logic
            console.log(`📝 Update request for meeting ${requestId}:`, updateData);
            console.log('⚠️ Note: Direct sheet updates not implemented yet. Use n8n workflow for updates.');

            // Return success for now - in production, implement actual update logic
            return {
                success: true,
                message: 'Update logged (implement sheet update logic)',
                requestId,
                updateData
            };
        } catch (error) {
            console.error('❌ Error updating meeting in Google Sheets:', error.message);
            throw error;
        }
    }
}

module.exports = GoogleSheetsService;
