/**
 * Google Apps Script for Meeting Arrangement System - Sheet Setup
 * 
 * This script creates and configures all necessary sheets and columns
 * for the n8n Meeting Arrangement Workflow in a single Google Spreadsheet.
 * AKfycbwQ8i2J6MlAjRVrQVIoWqGiQKuruGCbGFS_bjP-PFU3NgyixVNuiTDyPZWDTiv0GOWD
 * Usage:
 * 1. Open Google Sheets
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code
 * 4. Run the setupMeetingSystemSheets() function
 * 5. Copy the spreadsheet ID from the logs for use in n8n workflow
 */

/**
 * Main function to set up all sheets for the meeting system
 * Creates a new spreadsheet if no active spreadsheet exists
 */
function setupMeetingSystemSheets() {
  try {
    // Get or create the spreadsheet
    let spreadsheet;
    try {
      spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      console.log('Using active spreadsheet: ' + spreadsheet.getName());
    } catch (error) {
      // Create new spreadsheet if no active one exists
      spreadsheet = SpreadsheetApp.create('Meeting Arrangement System');
      console.log('Created new spreadsheet: ' + spreadsheet.getName());
    }
    
    console.log('Spreadsheet ID: ' + spreadsheet.getId());
    console.log('Spreadsheet URL: ' + spreadsheet.getUrl());
    
    // Create all required sheets
    createMeetingRequestsSheet(spreadsheet);
    createAdminActionsSheet(spreadsheet);
    createEmailLogsSheet(spreadsheet);
    createCalendarEventsSheet(spreadsheet);
    createUserProfilesSheet(spreadsheet);
    createSystemConfigSheet(spreadsheet);
    createNotificationHistorySheet(spreadsheet);
    createMeetingTypesSheet(spreadsheet);
    
    // Remove default Sheet1 if it exists and is empty
    removeDefaultSheet(spreadsheet);
    
    console.log('\n=== SETUP COMPLETE ===');
    console.log('All sheets have been created successfully!');
    console.log('Spreadsheet ID for n8n: ' + spreadsheet.getId());
    console.log('Please update your n8n workflow with this spreadsheet ID.');
    
    return spreadsheet.getId();
    
  } catch (error) {
    console.error('Error setting up sheets:', error);
    throw error;
  }
}

/**
 * Creates the Meeting_Requests sheet with all required columns
 */
function createMeetingRequestsSheet(spreadsheet) {
  const sheetName = 'Meeting_Requests';
  let sheet = findOrCreateSheet(spreadsheet, sheetName);
  
  // Clear existing content
  sheet.clear();
  
  // Define headers
  const headers = [
    'Request_ID',           // A - Unique identifier
    'Timestamp',            // B - When request was made
    'User_Name',            // C - Name of requestor
    'User_Email',           // D - Email of requestor
    'User_Phone',           // E - Phone number
    'User_Company',         // F - Company/Organization
    'Meeting_Type',         // G - Online/Offline/Hybrid
    'Meeting_Purpose',      // H - Purpose description
    'Preferred_Date',       // I - Requested date
    'Preferred_Time',       // J - Requested time
    'Duration_Minutes',     // K - Expected duration
    'Meeting_Details',      // L - Additional details
    'Status',               // M - Pending/Approved/Rejected/Rescheduled
    'Admin_Response',       // N - Admin's response/notes
    'Confirmed_Date',       // O - Final confirmed date
    'Confirmed_Time',       // P - Final confirmed time
    'Calendar_Event_ID',    // Q - Google Calendar event ID
    'Created_Date',         // R - System creation timestamp
    'Last_Updated',         // S - Last modification timestamp
    'Priority',             // T - High/Medium/Low
    'Location',             // U - Meeting location (if offline)
    'Meeting_Link',         // V - Video call link (if online)
    'Reminder_Sent',        // W - Reminder email status
    'Follow_Up_Required'    // X - Follow-up needed flag
  ];
  
  // Set headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  
  // Format headers
  formatHeaders(headerRange);
  
  // Set column widths for better readability
  sheet.setColumnWidth(1, 100);  // Request_ID
  sheet.setColumnWidth(2, 150);  // Timestamp
  sheet.setColumnWidth(3, 120);  // User_Name
  sheet.setColumnWidth(4, 200);  // User_Email
  sheet.setColumnWidth(5, 120);  // User_Phone
  sheet.setColumnWidth(6, 150);  // User_Company
  sheet.setColumnWidth(7, 100);  // Meeting_Type
  sheet.setColumnWidth(8, 200);  // Meeting_Purpose
  sheet.setColumnWidth(9, 120);  // Preferred_Date
  sheet.setColumnWidth(10, 120); // Preferred_Time
  sheet.setColumnWidth(11, 100); // Duration_Minutes
  sheet.setColumnWidth(12, 250); // Meeting_Details
  sheet.setColumnWidth(13, 100); // Status
  sheet.setColumnWidth(14, 200); // Admin_Response
  sheet.setColumnWidth(15, 120); // Confirmed_Date
  sheet.setColumnWidth(16, 120); // Confirmed_Time
  sheet.setColumnWidth(17, 200); // Calendar_Event_ID
  sheet.setColumnWidth(18, 150); // Created_Date
  sheet.setColumnWidth(19, 150); // Last_Updated
  sheet.setColumnWidth(20, 80);  // Priority
  sheet.setColumnWidth(21, 200); // Location
  sheet.setColumnWidth(22, 200); // Meeting_Link
  sheet.setColumnWidth(23, 100); // Reminder_Sent
  sheet.setColumnWidth(24, 100); // Follow_Up_Required
  
  // Add data validation for specific columns
  addDataValidation(sheet, 'G', ['Online', 'Offline', 'Hybrid']); // Meeting_Type
  addDataValidation(sheet, 'M', ['Pending', 'Approved', 'Rejected', 'Rescheduled']); // Status
  addDataValidation(sheet, 'T', ['High', 'Medium', 'Low']); // Priority
  addDataValidation(sheet, 'W', ['Yes', 'No', 'Pending']); // Reminder_Sent
  addDataValidation(sheet, 'X', ['Yes', 'No']); // Follow_Up_Required
  
  console.log('✓ Created Meeting_Requests sheet with ' + headers.length + ' columns');
}

/**
 * Creates the Admin_Actions sheet for tracking admin responses
 */
function createAdminActionsSheet(spreadsheet) {
  const sheetName = 'Admin_Actions';
  let sheet = findOrCreateSheet(spreadsheet, sheetName);
  
  sheet.clear();
  
  const headers = [
    'Action_ID',           // A - Unique action identifier
    'Request_ID',          // B - Reference to meeting request
    'Admin_Email',         // C - Admin who took action
    'Action_Type',         // D - Approved/Rejected/Rescheduled
    'Action_Timestamp',    // E - When action was taken
    'Admin_Notes',         // F - Admin's comments
    'New_Date',            // G - If rescheduled, new date
    'New_Time',            // H - If rescheduled, new time
    'Rejection_Reason',    // I - If rejected, reason
    'Calendar_Updated',    // J - Calendar sync status
    'Email_Sent',          // K - Email notification status
    'Response_Time_Hours'  // L - Time taken to respond
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeaders(headerRange);
  
  // Set column widths
  sheet.setColumnWidth(1, 100);  // Action_ID
  sheet.setColumnWidth(2, 100);  // Request_ID
  sheet.setColumnWidth(3, 200);  // Admin_Email
  sheet.setColumnWidth(4, 120);  // Action_Type
  sheet.setColumnWidth(5, 150);  // Action_Timestamp
  sheet.setColumnWidth(6, 300);  // Admin_Notes
  sheet.setColumnWidth(7, 120);  // New_Date
  sheet.setColumnWidth(8, 120);  // New_Time
  sheet.setColumnWidth(9, 250);  // Rejection_Reason
  sheet.setColumnWidth(10, 120); // Calendar_Updated
  sheet.setColumnWidth(11, 120); // Email_Sent
  sheet.setColumnWidth(12, 120); // Response_Time_Hours
  
  // Add data validation
  addDataValidation(sheet, 'D', ['Approved', 'Rejected', 'Rescheduled']); // Action_Type
  addDataValidation(sheet, 'J', ['Yes', 'No', 'Pending']); // Calendar_Updated
  addDataValidation(sheet, 'K', ['Yes', 'No', 'Failed']); // Email_Sent
  
  console.log('✓ Created Admin_Actions sheet with ' + headers.length + ' columns');
}

/**
 * Creates the Email_Logs sheet for tracking all email communications
 */
function createEmailLogsSheet(spreadsheet) {
  const sheetName = 'Email_Logs';
  let sheet = findOrCreateSheet(spreadsheet, sheetName);
  
  sheet.clear();
  
  const headers = [
    'Email_ID',            // A - Unique email identifier
    'Request_ID',          // B - Related meeting request
    'Email_Type',          // C - Confirmation/Reminder/Rejection/etc.
    'Recipient_Email',     // D - Who received the email
    'Recipient_Name',      // E - Recipient's name
    'Subject',             // F - Email subject
    'Sent_Timestamp',      // G - When email was sent
    'Email_Status',        // H - Sent/Failed/Bounced
    'Template_Used',       // I - Which email template
    'Admin_CC',            // J - Was admin CC'd
    'Delivery_Status',     // K - Delivery confirmation
    'Open_Status',         // L - Was email opened
    'Click_Status',        // M - Were links clicked
    'Reply_Received',      // N - Did recipient reply
    'Error_Message'        // O - If failed, error details
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeaders(headerRange);
  
  // Set column widths
  sheet.setColumnWidth(1, 100);  // Email_ID
  sheet.setColumnWidth(2, 100);  // Request_ID
  sheet.setColumnWidth(3, 150);  // Email_Type
  sheet.setColumnWidth(4, 200);  // Recipient_Email
  sheet.setColumnWidth(5, 150);  // Recipient_Name
  sheet.setColumnWidth(6, 300);  // Subject
  sheet.setColumnWidth(7, 150);  // Sent_Timestamp
  sheet.setColumnWidth(8, 100);  // Email_Status
  sheet.setColumnWidth(9, 150);  // Template_Used
  sheet.setColumnWidth(10, 80);  // Admin_CC
  sheet.setColumnWidth(11, 120); // Delivery_Status
  sheet.setColumnWidth(12, 100); // Open_Status
  sheet.setColumnWidth(13, 100); // Click_Status
  sheet.setColumnWidth(14, 100); // Reply_Received
  sheet.setColumnWidth(15, 250); // Error_Message
  
  // Add data validation
  const emailTypes = ['Confirmation', 'Reminder', 'Rejection', 'Reschedule', 'Admin_Notification', 'Follow_Up'];
  addDataValidation(sheet, 'C', emailTypes); // Email_Type
  addDataValidation(sheet, 'H', ['Sent', 'Failed', 'Bounced', 'Pending']); // Email_Status
  addDataValidation(sheet, 'J', ['Yes', 'No']); // Admin_CC
  addDataValidation(sheet, 'K', ['Delivered', 'Failed', 'Pending']); // Delivery_Status
  addDataValidation(sheet, 'L', ['Yes', 'No', 'Unknown']); // Open_Status
  addDataValidation(sheet, 'M', ['Yes', 'No', 'N/A']); // Click_Status
  addDataValidation(sheet, 'N', ['Yes', 'No']); // Reply_Received
  
  console.log('✓ Created Email_Logs sheet with ' + headers.length + ' columns');
}

/**
 * Creates the Calendar_Events sheet for tracking Google Calendar integration
 */
function createCalendarEventsSheet(spreadsheet) {
  const sheetName = 'Calendar_Events';
  let sheet = findOrCreateSheet(spreadsheet, sheetName);
  
  sheet.clear();
  
  const headers = [
    'Event_ID',            // A - Google Calendar event ID
    'Request_ID',          // B - Related meeting request
    'Calendar_ID',         // C - Which calendar
    'Event_Title',         // D - Meeting title
    'Event_Description',   // E - Meeting description
    'Start_DateTime',      // F - Start date and time
    'End_DateTime',        // G - End date and time
    'Attendee_Emails',     // H - List of attendees
    'Meeting_Location',    // I - Physical or virtual location
    'Meeting_Link',        // J - Video conference link
    'Event_Status',        // K - Confirmed/Tentative/Cancelled
    'Created_By',          // L - Who created the event
    'Created_Timestamp',   // M - When event was created
    'Last_Modified',       // N - Last modification time
    'Reminder_Set',        // O - Are reminders set
    'Timezone',            // P - Event timezone
    'Recurring',           // Q - Is this a recurring event
    'Sync_Status'          // R - Calendar sync status
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeaders(headerRange);
  
  // Set column widths
  sheet.setColumnWidth(1, 200);  // Event_ID
  sheet.setColumnWidth(2, 100);  // Request_ID
  sheet.setColumnWidth(3, 200);  // Calendar_ID
  sheet.setColumnWidth(4, 250);  // Event_Title
  sheet.setColumnWidth(5, 300);  // Event_Description
  sheet.setColumnWidth(6, 150);  // Start_DateTime
  sheet.setColumnWidth(7, 150);  // End_DateTime
  sheet.setColumnWidth(8, 300);  // Attendee_Emails
  sheet.setColumnWidth(9, 200);  // Meeting_Location
  sheet.setColumnWidth(10, 200); // Meeting_Link
  sheet.setColumnWidth(11, 120); // Event_Status
  sheet.setColumnWidth(12, 150); // Created_By
  sheet.setColumnWidth(13, 150); // Created_Timestamp
  sheet.setColumnWidth(14, 150); // Last_Modified
  sheet.setColumnWidth(15, 100); // Reminder_Set
  sheet.setColumnWidth(16, 120); // Timezone
  sheet.setColumnWidth(17, 80);  // Recurring
  sheet.setColumnWidth(18, 120); // Sync_Status
  
  // Add data validation
  addDataValidation(sheet, 'K', ['Confirmed', 'Tentative', 'Cancelled']); // Event_Status
  addDataValidation(sheet, 'O', ['Yes', 'No']); // Reminder_Set
  addDataValidation(sheet, 'Q', ['Yes', 'No']); // Recurring
  addDataValidation(sheet, 'R', ['Synced', 'Pending', 'Failed']); // Sync_Status
  
  console.log('✓ Created Calendar_Events sheet with ' + headers.length + ' columns');
}

/**
 * Creates the User_Profiles sheet for storing user information
 */
function createUserProfilesSheet(spreadsheet) {
  const sheetName = 'User_Profiles';
  let sheet = findOrCreateSheet(spreadsheet, sheetName);
  
  sheet.clear();
  
  const headers = [
    'User_ID',             // A - Unique user identifier
    'Full_Name',           // B - User's full name
    'Email_Address',       // C - Primary email
    'Phone_Number',        // D - Contact phone
    'Company',             // E - Company/Organization
    'Job_Title',           // F - Position/Role
    'Department',          // G - Department
    'Preferred_Contact',   // H - Email/Phone preference
    'Timezone',            // I - User's timezone
    'Language',            // J - Preferred language
    'First_Request_Date',  // K - When first contacted
    'Total_Meetings',      // L - Number of meetings requested
    'Successful_Meetings', // M - Number of completed meetings
    'Cancelled_Meetings',  // N - Number of cancelled meetings
    'Average_Rating',      // O - Average meeting rating
    'Last_Meeting_Date',   // P - Most recent meeting
    'Notes',               // Q - Admin notes about user
    'Status',              // R - Active/Inactive/Blocked
    'Created_Date',        // S - Profile creation date
    'Last_Updated'         // T - Profile last update
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeaders(headerRange);
  
  // Set column widths
  sheet.setColumnWidth(1, 100);  // User_ID
  sheet.setColumnWidth(2, 150);  // Full_Name
  sheet.setColumnWidth(3, 200);  // Email_Address
  sheet.setColumnWidth(4, 120);  // Phone_Number
  sheet.setColumnWidth(5, 150);  // Company
  sheet.setColumnWidth(6, 150);  // Job_Title
  sheet.setColumnWidth(7, 120);  // Department
  sheet.setColumnWidth(8, 120);  // Preferred_Contact
  sheet.setColumnWidth(9, 120);  // Timezone
  sheet.setColumnWidth(10, 100); // Language
  sheet.setColumnWidth(11, 150); // First_Request_Date
  sheet.setColumnWidth(12, 100); // Total_Meetings
  sheet.setColumnWidth(13, 120); // Successful_Meetings
  sheet.setColumnWidth(14, 120); // Cancelled_Meetings
  sheet.setColumnWidth(15, 120); // Average_Rating
  sheet.setColumnWidth(16, 150); // Last_Meeting_Date
  sheet.setColumnWidth(17, 300); // Notes
  sheet.setColumnWidth(18, 100); // Status
  sheet.setColumnWidth(19, 150); // Created_Date
  sheet.setColumnWidth(20, 150); // Last_Updated
  
  // Add data validation
  addDataValidation(sheet, 'H', ['Email', 'Phone', 'Both']); // Preferred_Contact
  addDataValidation(sheet, 'J', ['English', 'Spanish', 'French', 'German', 'Other']); // Language
  addDataValidation(sheet, 'R', ['Active', 'Inactive', 'Blocked']); // Status
  
  console.log('✓ Created User_Profiles sheet with ' + headers.length + ' columns');
}

/**
 * Creates the System_Config sheet for storing system settings
 */
function createSystemConfigSheet(spreadsheet) {
  const sheetName = 'System_Config';
  let sheet = findOrCreateSheet(spreadsheet, sheetName);
  
  sheet.clear();
  
  const headers = [
    'Setting_Name',        // A - Configuration setting name
    'Setting_Value',       // B - Current value
    'Default_Value',       // C - Default value
    'Description',         // D - What this setting does
    'Category',            // E - Settings category
    'Data_Type',           // F - String/Number/Boolean/Date
    'Required',            // G - Is this setting required
    'Last_Updated',        // H - When setting was changed
    'Updated_By',          // I - Who changed it
    'Valid_Options'        // J - Valid values (if applicable)
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeaders(headerRange);
  
  // Set column widths
  sheet.setColumnWidth(1, 200);  // Setting_Name
  sheet.setColumnWidth(2, 200);  // Setting_Value
  sheet.setColumnWidth(3, 150);  // Default_Value
  sheet.setColumnWidth(4, 400);  // Description
  sheet.setColumnWidth(5, 120);  // Category
  sheet.setColumnWidth(6, 100);  // Data_Type
  sheet.setColumnWidth(7, 80);   // Required
  sheet.setColumnWidth(8, 150);  // Last_Updated
  sheet.setColumnWidth(9, 150);  // Updated_By
  sheet.setColumnWidth(10, 300); // Valid_Options
  
  // Add some default configuration values
  const defaultConfigs = [
    ['admin_email', 'admin@company.com', 'admin@company.com', 'Primary admin email for notifications', 'Email', 'String', 'Yes', new Date(), 'System', ''],
    ['business_hours_start', '09:00', '09:00', 'Business hours start time', 'Schedule', 'Time', 'Yes', new Date(), 'System', ''],
    ['business_hours_end', '17:00', '17:00', 'Business hours end time', 'Schedule', 'Time', 'Yes', new Date(), 'System', ''],
    ['default_meeting_duration', '30', '30', 'Default meeting duration in minutes', 'Schedule', 'Number', 'Yes', new Date(), 'System', '15,30,45,60,90,120'],
    ['max_advance_booking_days', '30', '30', 'Maximum days in advance for booking', 'Schedule', 'Number', 'Yes', new Date(), 'System', ''],
    ['auto_approve_meetings', 'false', 'false', 'Automatically approve meeting requests', 'Workflow', 'Boolean', 'No', new Date(), 'System', 'true,false'],
    ['send_confirmation_emails', 'true', 'true', 'Send email confirmations', 'Email', 'Boolean', 'Yes', new Date(), 'System', 'true,false'],
    ['send_reminder_emails', 'true', 'true', 'Send reminder emails', 'Email', 'Boolean', 'Yes', new Date(), 'System', 'true,false'],
    ['reminder_hours_before', '24', '24', 'Hours before meeting to send reminder', 'Email', 'Number', 'Yes', new Date(), 'System', '1,2,4,12,24,48'],
    ['company_name', 'Your Company', 'Your Company', 'Company name for emails', 'General', 'String', 'Yes', new Date(), 'System', ''],
    ['meeting_room_capacity', '10', '10', 'Default meeting room capacity', 'General', 'Number', 'No', new Date(), 'System', ''],
    ['enable_qr_codes', 'true', 'true', 'Enable QR code generation', 'General', 'Boolean', 'No', new Date(), 'System', 'true,false']
  ];
  
  // Insert default configurations
  if (defaultConfigs.length > 0) {
    const dataRange = sheet.getRange(2, 1, defaultConfigs.length, defaultConfigs[0].length);
    dataRange.setValues(defaultConfigs);
  }
  
  // Add data validation
  addDataValidation(sheet, 'E', ['Email', 'Schedule', 'Workflow', 'General']); // Category
  addDataValidation(sheet, 'F', ['String', 'Number', 'Boolean', 'Date', 'Time']); // Data_Type
  addDataValidation(sheet, 'G', ['Yes', 'No']); // Required
  
  console.log('✓ Created System_Config sheet with ' + headers.length + ' columns and default settings');
}

/**
 * Creates the Notification_History sheet for tracking all notifications
 */
function createNotificationHistorySheet(spreadsheet) {
  const sheetName = 'Notification_History';
  let sheet = findOrCreateSheet(spreadsheet, sheetName);
  
  sheet.clear();
  
  const headers = [
    'Notification_ID',     // A - Unique notification identifier
    'Request_ID',          // B - Related meeting request
    'Notification_Type',   // C - Email/SMS/Push/Calendar
    'Recipient',           // D - Who received notification
    'Subject',             // E - Notification subject/title
    'Message',             // F - Notification content
    'Sent_Timestamp',      // G - When notification was sent
    'Delivery_Status',     // H - Delivered/Failed/Pending
    'Read_Status',         // I - Read/Unread/Unknown
    'Action_Taken',        // J - Did recipient take action
    'Response_Time',       // K - Time to respond
    'Channel',             // L - Email/SMS/App/etc.
    'Template_Used',       // M - Which template was used
    'Priority_Level',      // N - High/Medium/Low
    'Retry_Count',         // O - Number of retry attempts
    'Error_Details'        // P - Error information if failed
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeaders(headerRange);
  
  // Set column widths
  sheet.setColumnWidth(1, 120);  // Notification_ID
  sheet.setColumnWidth(2, 100);  // Request_ID
  sheet.setColumnWidth(3, 120);  // Notification_Type
  sheet.setColumnWidth(4, 200);  // Recipient
  sheet.setColumnWidth(5, 250);  // Subject
  sheet.setColumnWidth(6, 400);  // Message
  sheet.setColumnWidth(7, 150);  // Sent_Timestamp
  sheet.setColumnWidth(8, 120);  // Delivery_Status
  sheet.setColumnWidth(9, 100);  // Read_Status
  sheet.setColumnWidth(10, 100); // Action_Taken
  sheet.setColumnWidth(11, 120); // Response_Time
  sheet.setColumnWidth(12, 100); // Channel
  sheet.setColumnWidth(13, 150); // Template_Used
  sheet.setColumnWidth(14, 100); // Priority_Level
  sheet.setColumnWidth(15, 100); // Retry_Count
  sheet.setColumnWidth(16, 300); // Error_Details
  
  // Add data validation
  const notificationTypes = ['Email', 'SMS', 'Push', 'Calendar', 'Webhook'];
  addDataValidation(sheet, 'C', notificationTypes); // Notification_Type
  addDataValidation(sheet, 'H', ['Delivered', 'Failed', 'Pending', 'Bounced']); // Delivery_Status
  addDataValidation(sheet, 'I', ['Read', 'Unread', 'Unknown']); // Read_Status
  addDataValidation(sheet, 'J', ['Yes', 'No', 'Partial']); // Action_Taken
  addDataValidation(sheet, 'L', ['Email', 'SMS', 'App', 'Web', 'API']); // Channel
  addDataValidation(sheet, 'N', ['High', 'Medium', 'Low']); // Priority_Level
  
  console.log('✓ Created Notification_History sheet with ' + headers.length + ' columns');
}

/**
 * Creates the Meeting_Types sheet for predefined meeting categories
 */
function createMeetingTypesSheet(spreadsheet) {
  const sheetName = 'Meeting_Types';
  let sheet = findOrCreateSheet(spreadsheet, sheetName);
  
  sheet.clear();
  
  const headers = [
    'Type_ID',             // A - Unique type identifier
    'Type_Name',           // B - Meeting type name
    'Description',         // C - Type description
    'Default_Duration',    // D - Default duration in minutes
    'Requires_Approval',   // E - Does this type require approval
    'Max_Attendees',       // F - Maximum number of attendees
    'Preparation_Time',    // G - Buffer time before meeting
    'Follow_Up_Required',  // H - Does this type need follow-up
    'Priority_Level',      // I - Default priority
    'Available_Modes',     // J - Online/Offline/Both
    'Auto_Record',         // K - Should meetings be recorded
    'Send_Materials',      // L - Send prep materials
    'Calendar_Color',      // M - Color coding for calendar
    'Active',              // N - Is this type active
    'Created_Date',        // O - When type was created
    'Last_Used'            // P - Last time this type was used
  ];
  
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  formatHeaders(headerRange);
  
  // Set column widths
  sheet.setColumnWidth(1, 100);  // Type_ID
  sheet.setColumnWidth(2, 150);  // Type_Name
  sheet.setColumnWidth(3, 300);  // Description
  sheet.setColumnWidth(4, 120);  // Default_Duration
  sheet.setColumnWidth(5, 120);  // Requires_Approval
  sheet.setColumnWidth(6, 120);  // Max_Attendees
  sheet.setColumnWidth(7, 120);  // Preparation_Time
  sheet.setColumnWidth(8, 120);  // Follow_Up_Required
  sheet.setColumnWidth(9, 100);  // Priority_Level
  sheet.setColumnWidth(10, 120); // Available_Modes
  sheet.setColumnWidth(11, 100); // Auto_Record
  sheet.setColumnWidth(12, 120); // Send_Materials
  sheet.setColumnWidth(13, 120); // Calendar_Color
  sheet.setColumnWidth(14, 80);  // Active
  sheet.setColumnWidth(15, 150); // Created_Date
  sheet.setColumnWidth(16, 150); // Last_Used
  
  // Add default meeting types
  const defaultTypes = [
    ['MT001', 'General Meeting', 'Standard business meeting', 30, 'Yes', 10, 5, 'No', 'Medium', 'Both', 'No', 'No', 'Blue', 'Yes', new Date(), ''],
    ['MT002', 'Client Consultation', 'Initial client consultation', 60, 'Yes', 5, 10, 'Yes', 'High', 'Both', 'Yes', 'Yes', 'Green', 'Yes', new Date(), ''],
    ['MT003', 'Quick Check-in', 'Brief status update meeting', 15, 'No', 3, 0, 'No', 'Low', 'Online', 'No', 'No', 'Yellow', 'Yes', new Date(), ''],
    ['MT004', 'Project Review', 'Project milestone review', 45, 'Yes', 8, 5, 'Yes', 'High', 'Both', 'Yes', 'Yes', 'Red', 'Yes', new Date(), ''],
    ['MT005', 'Demo Session', 'Product or service demonstration', 90, 'Yes', 15, 15, 'Yes', 'High', 'Both', 'Yes', 'Yes', 'Purple', 'Yes', new Date(), ''],
    ['MT006', 'Training Session', 'Educational or training meeting', 120, 'No', 20, 10, 'Yes', 'Medium', 'Both', 'Yes', 'Yes', 'Orange', 'Yes', new Date(), '']
  ];
  
  // Insert default meeting types
  if (defaultTypes.length > 0) {
    const dataRange = sheet.getRange(2, 1, defaultTypes.length, defaultTypes[0].length);
    dataRange.setValues(defaultTypes);
  }
  
  // Add data validation
  addDataValidation(sheet, 'E', ['Yes', 'No']); // Requires_Approval
  addDataValidation(sheet, 'H', ['Yes', 'No']); // Follow_Up_Required
  addDataValidation(sheet, 'I', ['High', 'Medium', 'Low']); // Priority_Level
  addDataValidation(sheet, 'J', ['Online', 'Offline', 'Both']); // Available_Modes
  addDataValidation(sheet, 'K', ['Yes', 'No']); // Auto_Record
  addDataValidation(sheet, 'L', ['Yes', 'No']); // Send_Materials
  addDataValidation(sheet, 'N', ['Yes', 'No']); // Active
  
  console.log('✓ Created Meeting_Types sheet with ' + headers.length + ' columns and default types');
}

/**
 * Utility function to find or create a sheet by name
 */
function findOrCreateSheet(spreadsheet, name) {
  let sheet = spreadsheet.getSheetByName(name);
  if (sheet) {
    console.log('Found existing sheet: ' + name);
    return sheet;
  }
  
  sheet = spreadsheet.insertSheet(name);
  console.log('Created new sheet: ' + name);
  return sheet;
}

/**
 * Utility function to format header rows
 */
function formatHeaders(headerRange) {
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('#ffffff');
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  
  // Add borders
  headerRange.setBorder(true, true, true, true, true, true);
}

/**
 * Utility function to add data validation to a column
 */
function addDataValidation(sheet, columnLetter, validValues) {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(validValues)
    .setAllowInvalid(false)
    .setHelpText('Please select from the dropdown list')
    .build();
  
  const range = sheet.getRange(columnLetter + '2:' + columnLetter + '1000');
  range.setDataValidation(rule);
}

/**
 * Utility function to remove the default Sheet1 if it's empty
 */
function removeDefaultSheet(spreadsheet) {
  try {
    const defaultSheet = spreadsheet.getSheetByName('Sheet1');
    if (defaultSheet && spreadsheet.getSheets().length > 1) {
      // Check if sheet is empty
      const range = defaultSheet.getDataRange();
      if (range.getNumRows() <= 1 && range.getNumColumns() <= 1) {
        spreadsheet.deleteSheet(defaultSheet);
        console.log('✓ Removed empty default Sheet1');
      }
    }
  } catch (error) {
    // Sheet1 doesn't exist or couldn't be deleted, continue
    console.log('Note: Could not remove Sheet1 (may not exist or may not be empty)');
  }
}

/**
 * Function to update existing sheets (if they already exist)
 * This can be run to update sheet structures without losing data
 */
function updateExistingSheets() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    console.log('Updating existing sheets in: ' + spreadsheet.getName());
    
    // Update each sheet (this preserves existing data)
    setupMeetingSystemSheets();
    
    console.log('\n=== UPDATE COMPLETE ===');
    console.log('All sheets have been updated successfully!');
    
  } catch (error) {
    console.error('Error updating sheets:', error);
    throw error;
  }
}

/**
 * Function to get the spreadsheet ID for use in n8n
 */
function getSpreadsheetIdForN8n() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const id = spreadsheet.getId();
    const url = spreadsheet.getUrl();
    
    console.log('\n=== SPREADSHEET INFORMATION FOR N8N ===');
    console.log('Spreadsheet Name: ' + spreadsheet.getName());
    console.log('Spreadsheet ID: ' + id);
    console.log('Spreadsheet URL: ' + url);
    console.log('\nCopy this ID to use in your n8n workflow Google Sheets nodes: ' + id);
    
    return id;
  } catch (error) {
    console.error('Error getting spreadsheet information:', error);
    throw error;
  }
}

/**
 * Function to create a test entry in Meeting_Requests sheet
 * This can be used to test the n8n workflow integration
 */
function createTestMeetingRequest() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName('Meeting_Requests');
    
    if (!sheet) {
      console.error('Meeting_Requests sheet not found. Please run setupMeetingSystemSheets() first.');
      return;
    }
    
    const testData = [
      'TEST001',                    // Request_ID
      new Date(),                   // Timestamp
      'John Doe',                   // User_Name
      'john.doe@example.com',       // User_Email
      '+1-555-0123',               // User_Phone
      'Test Company Inc.',          // User_Company
      'Online',                     // Meeting_Type
      'Testing the system',         // Meeting_Purpose
      new Date(Date.now() + 86400000), // Preferred_Date (tomorrow)
      '14:00',                      // Preferred_Time
      30,                           // Duration_Minutes
      'This is a test meeting request', // Meeting_Details
      'Pending',                    // Status
      '',                           // Admin_Response
      '',                           // Confirmed_Date
      '',                           // Confirmed_Time
      '',                           // Calendar_Event_ID
      new Date(),                   // Created_Date
      new Date(),                   // Last_Updated
      'Medium',                     // Priority
      '',                           // Location
      '',                           // Meeting_Link
      'No',                         // Reminder_Sent
      'No'                          // Follow_Up_Required
    ];
    
    // Find the next empty row
    const lastRow = sheet.getLastRow();
    const nextRow = lastRow + 1;
    
    // Insert test data
    const range = sheet.getRange(nextRow, 1, 1, testData.length);
    range.setValues([testData]);
    
    console.log('✓ Created test meeting request in row ' + nextRow);
    console.log('Test Request ID: TEST001');
    console.log('You can use this to test your n8n workflow integration.');
    
  } catch (error) {
    console.error('Error creating test meeting request:', error);
    throw error;
  }
}
