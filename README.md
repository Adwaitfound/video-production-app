# Video Production Agency - Project Management & Billing App

A comprehensive full-stack web application designed for video production agencies to manage projects, collaborate with clients, and handle billing seamlessly.

## Features

### Phase 1 (MVP) - Implemented

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Client Management**: Complete CRUD operations for managing client information
- **Project Management**: Create and track projects with status updates and milestones
- **Project Updates & Communication**: Post updates, comments, and file attachments
- **File Management**: Upload and download project files with version tracking
- **Billing & Invoicing**: Create professional invoices with PDF generation
- **Dashboard Analytics**: Comprehensive dashboards for admins and clients
- **Client Portal**: Dedicated portal for clients to view projects and invoices

## Tech Stack

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript
- **Database**: SQLite (upgradable to PostgreSQL)
- **Authentication**: JWT with bcrypt
- **File Upload**: Multer
- **PDF Generation**: PDFKit

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Project Structure

```
video-production-app/
├── server/                 # Backend API
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, upload middleware
│   │   ├── utils/         # Database, PDF generation
│   │   └── server.ts      # Main server file
│   ├── package.json
│   └── tsconfig.json
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── context/       # React context
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Helper functions
│   ├── package.json
│   └── vite.config.ts
├── database/              # SQLite database
├── uploads/               # Uploaded files
└── README.md
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Git

### 1. Clone the Repository

```bash
git clone <repository-url>
cd video-production-app
```

### 2. Backend Setup

```bash
cd server
npm install

# Copy environment variables
cp .env.example .env

# Initialize database
npm run init-db

# Seed sample data (optional)
npm run seed

# Start development server
npm run dev
```

The backend server will run on `http://localhost:5000`

### 3. Frontend Setup

Open a new terminal:

```bash
cd client
npm install

# Start development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## Default Credentials

After seeding the database, you can use these credentials:

### Admin Access
- Email: `admin@videoproduction.com`
- Password: `admin123`

### Project Manager
- Email: `pm@videoproduction.com`
- Password: `pm123`

### Client Access
- Email: `john@techstartup.com`
- Password: `client123`
- Email: `jane@creativeagency.com`
- Password: `client123`

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "client"
}
```

#### POST /api/auth/login
Login user
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### GET /api/auth/me
Get current user (requires authentication)

### Client Endpoints

- `GET /api/clients` - Get all clients
- `GET /api/clients/:id` - Get single client
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Project Endpoints

- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project with updates
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Update Endpoints

- `POST /api/updates` - Create project update
- `GET /api/updates/:id` - Get update with comments
- `POST /api/updates/:id/comments` - Add comment to update
- `DELETE /api/updates/:id` - Delete update

### File Endpoints

- `POST /api/files/upload` - Upload file
- `GET /api/files/download/:id` - Download file
- `GET /api/files/:id` - Get file info
- `DELETE /api/files/:id` - Delete file

### Invoice Endpoints

- `GET /api/invoices` - Get all invoices
- `GET /api/invoices/:id` - Get single invoice
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `GET /api/invoices/:id/pdf` - Download invoice PDF
- `POST /api/invoices/:id/payments` - Record payment
- `DELETE /api/invoices/:id` - Delete invoice

### Dashboard Endpoints

- `GET /api/dashboard/admin` - Get admin dashboard data
- `GET /api/dashboard/client` - Get client dashboard data

## Database Schema

The application uses SQLite with the following main tables:

- **users**: User accounts with role-based access
- **clients**: Client information
- **projects**: Project details and tracking
- **project_updates**: Updates and progress posts
- **project_comments**: Comments on updates
- **project_files**: File attachments
- **invoices**: Invoice headers
- **invoice_items**: Line items for invoices
- **payments**: Payment records
- **milestones**: Project milestones
- **settings**: Company settings

## Development

### Backend Development

```bash
cd server
npm run dev  # Start with nodemon hot reload
```

### Frontend Development

```bash
cd client
npm run dev  # Start with Vite hot reload
```

### Build for Production

```bash
# Backend
cd server
npm run build
npm start

# Frontend
cd client
npm run build
npm run preview
```

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Role-based access control (RBAC)
- SQL injection prevention through parameterized queries
- File type validation for uploads
- Secure file storage
- XSS protection

## Future Enhancements (Phase 2)

- Email notifications for updates and invoices
- Real-time notifications with Socket.io
- Advanced analytics with charts
- Payment gateway integration
- File versioning system
- Advanced search and filtering
- Team collaboration features
- Mobile responsive improvements
- Cloud storage integration (AWS S3, Google Cloud)
- Export data to Excel/CSV
- Custom branding per client
- Multi-language support

## Deployment

### Environment Variables

Make sure to set these environment variables in production:

```
PORT=5000
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
DATABASE_PATH=./database/video-production.db
UPLOAD_PATH=./uploads
```

### Database Migration

When deploying, ensure to:
1. Run `npm run init-db` to create tables
2. Optionally run `npm run seed` for sample data
3. Configure proper backup strategies for the database

## Support

For issues and feature requests, please create an issue in the repository.

## License

MIT License - feel free to use this project for your video production agency!

---

Built with ❤️ for video production agencies
