# SJ Automotive Vehicle Health Check System

A comprehensive vehicle health check application for SJ Automotive with database support for saving, retrieving, and reviewing reports.

## Features

- User authentication system with admin and technician roles
- Create, view, edit, and delete vehicle health check reports
- Persistent storage using SQLite database
- Dashboard to view all health checks
- Print reports as PDF
- Customizable health check sections and items

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository or download the source code
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
npm start
```

5. Open your browser and navigate to `http://localhost:3000`

### Default Login Credentials

- Username: admin
- Password: admin123

## Usage

### Login

1. Access the application at `http://localhost:3000`
2. You will be redirected to the login page
3. Enter your credentials to log in

### Dashboard

The dashboard displays all saved health checks and provides options to:

- Create a new health check
- View existing health checks
- Edit existing health checks
- Delete health checks (admin only)

### Creating a Health Check

1. Click "New Health Check" on the dashboard
2. Fill in the vehicle information
3. Complete the health check items
4. Add any additional technician notes
5. Click "Save Report"

### Viewing and Editing Health Checks

1. From the dashboard, click "View" or "Edit" on any health check
2. When viewing, all fields will be read-only
3. When editing, you can modify any information and save changes

## Database Structure

The application uses SQLite with the following tables:

- `users`: Stores user accounts and authentication information
- `health_checks`: Stores the main health check information
- `health_check_items`: Stores individual check items for each health check

## User Roles

- **Admin**: Can create, view, edit, and delete all health checks, and manage users
- **Technician**: Can create, view, and edit health checks

## Development

### Developer Tools

The application includes developer tools for testing:

- Test Mode: Allows bypassing validation for testing
- Admin Mode: Enables section editing
- Fill Test Data: Quickly fills the form with test data

### Customizing Sections

Administrators can customize the health check sections:

1. Enable Admin Mode
2. Click "Edit Sections"
3. Add, edit, or remove sections and items
4. Save changes

## License

This project is proprietary software owned by SJ Automotive.

## Support

For support, please contact the development team. 