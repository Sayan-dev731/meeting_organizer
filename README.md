# Meeting Organizing system

A modern web application for scheduling meetings with Google's career page inspired design. Features user and admin panels with n8n workflow integration.

## Recent Fixes (August 2025)

### Admin Dashboard Issues Resolved ✅
- **Fixed "currentMeetings is not iterable" error** - Enhanced array initialization and error handling
- **Improved n8n integration** - Added support for multiple response formats from n8n webhooks
- **Enhanced field compatibility** - Support for both camelCase and snake_case field names
- **Better error handling** - Graceful fallback to sample data when n8n is unavailable
- **Added n8n simulator** - For testing the integration without a full n8n setup

### Testing the Integration
1. **With n8n simulator**: 
   ```bash
   # Terminal 1
   node n8n-simulator.js
   
   # Terminal 2  
   npm run dev
   ```

2. **With actual n8n**: Update `.env` with your n8n webhook URLs

For detailed information about the fixes and n8n integration, see `FIXES_AND_N8N_INTEGRATION.md`.

## Features

### User Panel
- 📅 **Easy Meeting Booking** - Simple form to request meetings
- 🎨 **Google-inspired Design** - Clean, modern interface
- 📱 **Responsive Layout** - Works on all devices
- ✅ **Real-time Validation** - Instant feedback on form inputs
- 📧 **Email Notifications** - Automatic confirmations

### Admin Panel
- 👨‍💼 **Secure Authentication** - Password-protected access
- 📊 **Dashboard Overview** - Quick stats and metrics
- 📋 **Meeting Management** - Approve, reject, or reschedule meetings
- 🔍 **Advanced Filtering** - Filter by status, priority, type
- ⚡ **Real-time Updates** - Auto-refresh functionality
- 🔄 **n8n Sync Button** - Manual trigger to sync with n8n workflows

## Prerequisites

- Node.js (v14 or higher)
- n8n instance running
- Google Sheets API access (for n8n workflow)
- Gmail API access (for email notifications)

## Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd meeting-arrangement-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy the `.env` file and update the values:
   ```env
   # Admin Authentication
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin123

   # n8n Webhook URLs
   MEETING_REQUEST_WEBHOOK=http://localhost:5678/webhook/meeting-request
   ADMIN_ACTION_WEBHOOK=http://localhost:5678/webhook/admin/meetings/action
   ADMIN_MEETINGS_WEBHOOK=http://localhost:5678/webhook/admin/meetings

   # Application Settings
   PORT=3000
   ADMIN_EMAIL=your-admin@email.com
   COMPANY_NAME=Your Company Name

   # Security
   SESSION_TIMEOUT=3600000
   ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
   ```

4. **Set up n8n workflow**
   - Import the `Meeting Arrangement Workflow.json` into your n8n instance
   - Configure Google Sheets and Gmail credentials
   - Update webhook URLs in the `.env` file

5. **Set up Google Sheets**
   - Run the `meeting-sheets-setup.gs` script in Google Apps Script
   - Copy the generated spreadsheet ID to your n8n workflow

## Usage

### Development Mode
```bash
npm run dev
```
The application will start on `http://localhost:3000` with auto-reload.

### Production Mode
```bash
npm start
```

### Access Points

- **User Panel**: `http://localhost:3000/`
- **Admin Panel**: `http://localhost:3000/admin`
- **Health Check**: `http://localhost:3000/api/health`

## Admin Credentials

Default admin credentials (change in `.env`):
- **Username**: `admin`
- **Password**: `admin123`

## API Endpoints

### Public Endpoints
- `POST /api/meeting/request` - Submit meeting request
- `GET /api/health` - Health check

### Admin Endpoints (Authentication Required)
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/meetings` - Get all meetings
- `POST /api/admin/meeting/action` - Approve/reject/reschedule meeting

## Project Structure

```
meeting-arrangement-system/
├── public/                 # Static files
│   ├── css/               # Stylesheets
│   │   ├── styles.css     # Main styles
│   │   └── admin.css      # Admin panel styles
│   ├── js/                # JavaScript files
│   │   ├── user-panel.js  # User panel functionality
│   │   ├── admin-login.js # Admin login functionality
│   │   └── admin-dashboard.js # Admin dashboard functionality
│   ├── index.html         # User panel
│   ├── admin-login.html   # Admin login page
│   ├── admin-dashboard.html # Admin dashboard
│   └── 404.html          # Error page
├── server.js              # Express server
├── package.json           # Dependencies
├── .env                   # Environment variables
├── Meeting Arrangement Workflow.json # n8n workflow
├── meeting-sheets-setup.gs # Google Sheets setup script
└── README.md             # This file
```

## n8n Workflow Integration

The system integrates with n8n workflows for:

1. **Meeting Request Processing**
   - Validates and logs requests to Google Sheets
   - Sends confirmation email to user
   - Notifies admin via email

2. **Admin Actions**
   - Processes approve/reject/reschedule decisions
   - Updates Google Sheets records
   - Sends outcome emails to users
   - Creates calendar events for approved meetings

3. **Automated Reminders**
   - 24-hour and 1-hour meeting reminders
   - Email notifications to participants

## Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - Prevents abuse
- **CORS Protection** - Cross-origin request security
- **Session Management** - Secure admin sessions
- **Input Validation** - Prevents malicious input
- **CSRF Protection** - Request validation

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `ADMIN_USERNAME` | Admin login username | `admin` |
| `ADMIN_PASSWORD` | Admin login password | `admin123` |
| `ADMIN_EMAIL` | Admin email address | - |
| `COMPANY_NAME` | Company name for branding | `Your Company` |
| `MEETING_REQUEST_WEBHOOK` | n8n meeting request webhook | - |
| `ADMIN_ACTION_WEBHOOK` | n8n admin action webhook | - |
| `ADMIN_MEETINGS_WEBHOOK` | n8n meetings list webhook | - |
| `SESSION_TIMEOUT` | Session timeout in ms | `3600000` |
| `ALLOWED_ORIGINS` | CORS allowed origins | - |

## Troubleshooting

### Common Issues

1. **Cannot connect to n8n**
   - Check if n8n is running on the correct port
   - Verify webhook URLs in `.env`
   - Check n8n workflow is active

2. **Admin login fails**
   - Verify `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`
   - Check browser console for errors

3. **Emails not sending**
   - Check Gmail API credentials in n8n
   - Verify email configuration in workflow

4. **Google Sheets integration fails**
   - Check Google Sheets API credentials
   - Verify sheet ID in n8n workflow
   - Run the setup script again

### Logs and Debugging

- Check server console for error messages
- Use browser developer tools for client-side issues
- Enable n8n workflow debug mode
- Check Google Sheets for data persistence

## Support

For support and questions:
- Check the troubleshooting section
- Review server and browser console logs
- Contact system administrator

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ using Node.js, Express, and n8n automation.
