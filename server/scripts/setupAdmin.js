const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
require('dotenv').config();

const setupAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jharkhand-civic', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Create admin user
    const adminExists = await User.findOne({ email: 'admin@jharkhand.gov.in' });
    if (!adminExists) {
      const adminUser = new User({
        name: 'System Administrator',
        email: 'admin@jharkhand.gov.in',
        phone: '9876543210',
        password: 'admin123456',
        role: 'admin',
        location: {
          type: 'Point',
          coordinates: [85.3096, 23.3441], // Ranchi coordinates
          address: 'Secretariat, Ranchi, Jharkhand',
          city: 'Ranchi',
          state: 'Jharkhand'
        },
        isActive: true
      });

      await adminUser.save();
      console.log('Admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }

    // Create departments
    const departments = [
      {
        name: 'Public Works Department',
        description: 'Responsible for road construction, maintenance, and pothole repairs',
        categories: ['Road & Pothole Issues', 'Traffic Management'],
        coverage: {
          type: 'Point',
          coordinates: [85.3096, 23.3441] // Ranchi coordinates
        },
        contact: {
          email: 'pwd@jharkhand.gov.in',
          phone: '0651-2200001',
          address: 'Public Works Department, Ranchi'
        },
        settings: {
          autoAssign: true,
          maxConcurrentIssues: 15,
          responseTimeTarget: 12,
          resolutionTimeTarget: 48
        }
      },
      {
        name: 'Municipal Corporation',
        description: 'Handles waste management, street lighting, and general civic issues',
        categories: ['Waste Management', 'Streetlight Problems', 'Parks & Recreation'],
        coverage: {
          type: 'Point',
          coordinates: [85.3096, 23.3441]
        },
        contact: {
          email: 'municipal@jharkhand.gov.in',
          phone: '0651-2200002',
          address: 'Municipal Corporation, Ranchi'
        },
        settings: {
          autoAssign: true,
          maxConcurrentIssues: 20,
          responseTimeTarget: 6,
          resolutionTimeTarget: 24
        }
      },
      {
        name: 'Water Board',
        description: 'Manages water supply and sewage systems',
        categories: ['Water Supply', 'Sewage & Drainage'],
        coverage: {
          type: 'Point',
          coordinates: [85.3096, 23.3441]
        },
        contact: {
          email: 'waterboard@jharkhand.gov.in',
          phone: '0651-2200003',
          address: 'Jharkhand Water Board, Ranchi'
        },
        settings: {
          autoAssign: true,
          maxConcurrentIssues: 10,
          responseTimeTarget: 4,
          resolutionTimeTarget: 12
        }
      },
      {
        name: 'Traffic Police',
        description: 'Handles traffic management and road safety issues',
        categories: ['Traffic Management', 'Public Safety'],
        coverage: {
          type: 'Point',
          coordinates: [85.3096, 23.3441]
        },
        contact: {
          email: 'traffic@jharkhand.gov.in',
          phone: '0651-2200004',
          address: 'Traffic Police Headquarters, Ranchi'
        },
        settings: {
          autoAssign: true,
          maxConcurrentIssues: 12,
          responseTimeTarget: 2,
          resolutionTimeTarget: 6
        }
      },
      {
        name: 'General Administration',
        description: 'Handles miscellaneous civic issues and complaints',
        categories: ['Other', 'Public Safety'],
        coverage: {
          type: 'Point',
          coordinates: [85.3096, 23.3441]
        },
        contact: {
          email: 'admin@jharkhand.gov.in',
          phone: '0651-2200005',
          address: 'General Administration, Ranchi'
        },
        settings: {
          autoAssign: true,
          maxConcurrentIssues: 25,
          responseTimeTarget: 24,
          resolutionTimeTarget: 72
        }
      }
    ];

    for (const deptData of departments) {
      const existingDept = await Department.findOne({ name: deptData.name });
      if (!existingDept) {
        const department = new Department(deptData);
        await department.save();
        console.log(`Department created: ${deptData.name}`);
      } else {
        console.log(`Department already exists: ${deptData.name}`);
      }
    }

    // Create sample department staff
    const sampleStaff = [
      {
        name: 'Rajesh Kumar',
        email: 'rajesh.pwd@jharkhand.gov.in',
        phone: '9876543211',
        role: 'department',
        department: 'Public Works Department'
      },
      {
        name: 'Priya Sharma',
        email: 'priya.municipal@jharkhand.gov.in',
        phone: '9876543212',
        role: 'department',
        department: 'Municipal Corporation'
      },
      {
        name: 'Amit Singh',
        email: 'amit.water@jharkhand.gov.in',
        phone: '9876543213',
        role: 'department',
        department: 'Water Board'
      }
    ];

    for (const staffData of sampleStaff) {
      const existingStaff = await User.findOne({ email: staffData.email });
      if (!existingStaff) {
        const staff = new User({
          name: staffData.name,
          email: staffData.email,
          phone: staffData.phone,
          password: 'staff123456',
          role: 'department',
          location: {
            type: 'Point',
            coordinates: [85.3096, 23.3441],
            address: 'Ranchi, Jharkhand',
            city: 'Ranchi',
            state: 'Jharkhand'
          },
          isActive: true
        });

        await staff.save();

        // Add staff to department
        const department = await Department.findOne({ name: staffData.department });
        if (department) {
          department.staff.push({
            user: staff._id,
            role: 'field_worker'
          });
          await department.save();
        }

        console.log(`Staff created: ${staffData.name}`);
      } else {
        console.log(`Staff already exists: ${staffData.name}`);
      }
    }

    console.log('Admin setup completed successfully!');
    console.log('\n=== Login Credentials ===');
    console.log('Admin: admin@jharkhand.gov.in / admin123456');
    console.log('Staff: rajesh.pwd@jharkhand.gov.in / staff123456');
    console.log('Staff: priya.municipal@jharkhand.gov.in / staff123456');
    console.log('Staff: amit.water@jharkhand.gov.in / staff123456');

  } catch (error) {
    console.error('Setup error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

// Run setup if called directly
if (require.main === module) {
  setupAdmin();
}

module.exports = setupAdmin;
