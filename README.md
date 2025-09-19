# Jharkhand Civic Issues Platform

A modern, accessible, and effective crowdsourced civic issue reporting and resolution system for the Government of Jharkhand. This platform enables citizens to report civic issues, track their resolution, and engage with their community to build better neighborhoods.

## 🌟 Features

### For Citizens
- **Effortless Reporting**: Clean, intuitive interface for quick issue submission
- **Automatic Geotagging**: GPS-based location detection for accurate reporting
- **Multimedia Support**: Photo, video, and voice recording attachments
- **AI-Powered Categorization**: Automatic issue categorization for faster processing
- **Real-time Tracking**: Live status updates and progress monitoring
- **Interactive Map**: Visual representation of all reported issues with color-coded status
- **Community Engagement**: Upvote, comment, and confirm issues
- **Push Notifications**: Instant updates on issue status changes
- **Personal Dashboard**: Track all your reports and community activity

### For Municipal Staff (Admin Portal)
- **Powerful Dashboard**: Centralized, web-based dashboard with sortable, filterable issue lists
- **Automated Routing Engine**: AI-powered system that automatically assigns issues to correct departments based on category and location
- **Task Management**: Update issue status, assign to field workers, add private notes, and communicate with citizens
- **Comprehensive Analytics**: 
  - Trend analysis to identify common issues in specific areas
  - Response time metrics for each department
  - Heat maps to visualize issue density and problem hotspots
- **User & Department Management**: Manage user accounts, assign roles (admin, manager, field worker), and configure department settings
- **Real-time Notifications**: Instant updates on new issues, status changes, and assignments
- **Advanced Filtering**: Filter by category, location, priority, status, department, and date ranges
- **Bulk Operations**: Handle multiple issues simultaneously
- **Performance Tracking**: Monitor department and staff performance metrics

## 🚀 Technology Stack

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **Socket.io** for real-time communication
- **JWT** for authentication
- **Multer** for file uploads
- **Express Validator** for input validation
- **Helmet** for security
- **Rate Limiting** for API protection

### Frontend
- **React.js** with functional components and hooks
- **React Router** for navigation
- **React Query** for data fetching and caching
- **React Hook Form** for form management
- **Tailwind CSS** for styling
- **React Leaflet** for interactive maps
- **Framer Motion** for animations
- **React Hot Toast** for notifications
- **Socket.io Client** for real-time updates

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd jharkhand-civic-issues
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### 3. Environment Configuration

Create a `.env` file in the `server` directory:

```env
MONGODB_URI=mongodb://localhost:27017/jharkhand-civic
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:3000
PORT=5000
NODE_ENV=development

# Email configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# File upload configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

### 4. Setup Admin Users and Departments
```bash
# Setup admin users and departments
cd server
npm run setup-admin
```

This will create:
- Admin user: `admin@jharkhand.gov.in` / `admin123456`
- Sample department staff accounts
- Default departments (Public Works, Municipal Corporation, Water Board, etc.)

### 5. Start the Application

#### Development Mode (Recommended)
```bash
# From the root directory
npm run dev
```

This will start both the backend server (port 5000) and frontend development server (port 3000) concurrently.

#### Manual Start
```bash
# Start backend server
cd server
npm run dev

# Start frontend server (in a new terminal)
cd client
npm start
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Admin Portal**: http://localhost:3000/admin (login with admin credentials)
- **Backend API**: http://localhost:5000
- **API Health Check**: http://localhost:5000/api/health

## 📱 Usage

### For Citizens

1. **Register/Login**: Create an account or sign in
2. **Report Issues**: Use the "Report Issue" page to submit civic problems
3. **Track Progress**: Monitor your reports in the dashboard
4. **Engage Community**: Upvote, comment, and confirm other issues
5. **View Map**: See all issues on the interactive map

### For Municipal Staff (Admin Portal)

1. **Access Admin Dashboard**: Login with admin credentials at `/admin`
2. **Issue Management**: 
   - View all issues with advanced filtering and sorting
   - Assign issues to departments and field workers
   - Update issue status and add resolution details
   - Add private notes and communicate with citizens
3. **Analytics & Reporting**:
   - Monitor department performance metrics
   - View trend analysis and heat maps
   - Track response and resolution times
4. **Department Management**:
   - Create and manage departments
   - Assign staff roles and permissions
   - Configure department settings and coverage areas
5. **User Management**:
   - Manage citizen and staff accounts
   - Assign roles and permissions
   - Monitor user activity and engagement

## 🗂️ Project Structure

```
jharkhand-civic-issues/
├── server/                 # Backend API
│   ├── config/            # Database configuration
│   ├── middleware/        # Custom middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── uploads/          # File uploads directory
│   └── index.js          # Server entry point
├── client/               # Frontend React app
│   ├── public/           # Static assets
│   ├── src/
│   │   ├── components/   # Reusable components
│   │   ├── contexts/     # React contexts
│   │   ├── pages/        # Page components
│   │   └── App.js        # Main app component
│   └── package.json
├── package.json          # Root package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Issues
- `GET /api/issues` - Get all issues (with filtering)
- `POST /api/issues` - Create new issue
- `GET /api/issues/:id` - Get single issue
- `PUT /api/issues/:id/upvote` - Upvote issue
- `PUT /api/issues/:id/confirm` - Confirm issue
- `POST /api/issues/:id/comments` - Add comment
- `PUT /api/issues/:id/status` - Update issue status (Admin)

### Users
- `GET /api/users/dashboard` - Get user dashboard data
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/leaderboard` - Get community leaderboard

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `PUT /api/notifications/read-all` - Mark all as read

### Admin (Municipal Staff)
- `GET /api/admin/dashboard` - Get admin dashboard data
- `GET /api/admin/issues` - Get all issues with advanced filtering
- `PUT /api/admin/issues/:id/assign` - Assign issue to department and officer
- `PUT /api/admin/issues/:id/status` - Update issue status with detailed tracking
- `GET /api/admin/analytics` - Get analytics data (trends, heatmaps, performance)
- `GET /api/admin/departments` - Get all departments
- `POST /api/admin/departments` - Create new department
- `GET /api/admin/users` - Get all users with filtering
- `PUT /api/admin/users/:id/role` - Update user role

## 🎨 UI/UX Features

- **Dark Theme**: Modern dark interface matching government standards
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Accessibility**: WCAG compliant with keyboard navigation support
- **Real-time Updates**: Live notifications and status changes
- **Interactive Maps**: Leaflet-based mapping with custom markers
- **File Upload**: Drag-and-drop media upload with preview
- **Form Validation**: Client and server-side validation
- **Loading States**: Smooth loading indicators and transitions

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS Protection**: Cross-origin resource sharing configuration
- **Helmet Security**: Security headers and protection
- **File Upload Security**: File type and size validation

## 📊 Database Schema

### User Model
- Personal information (name, email, phone)
- Location data with geospatial indexing
- Role-based access (citizen, admin, department)
- Preferences and statistics

### Issue Model
- Issue details (title, description, category)
- Location with geospatial data
- Status tracking and timeline
- Community engagement (upvotes, comments, confirmations)
- Media attachments
- Assignment and resolution data

### Notification Model
- User-specific notifications
- Multiple delivery channels (email, SMS, push)
- Notification types and priorities
- Read status tracking

## 🚀 Deployment

### Backend Deployment
1. Set up MongoDB Atlas or local MongoDB instance
2. Configure environment variables
3. Deploy to cloud platform (Heroku, AWS, DigitalOcean)
4. Set up file storage for uploads

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, AWS S3)
3. Configure environment variables
4. Update API endpoints for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- Mobile app development (React Native)
- AI-powered issue categorization
- Advanced analytics dashboard
- Multi-language support
- Integration with government systems
- SMS notifications
- Offline support
- Advanced reporting features

---

**Built with ❤️ for the Government of Jharkhand**
