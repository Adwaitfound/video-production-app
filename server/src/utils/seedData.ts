import bcrypt from 'bcryptjs';
import db from './database';

async function seedData() {
  try {
    console.log('Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Admin User', 'admin@videoproduction.com', adminPassword, 'admin']
    );
    console.log('✓ Admin user created');

    // Create project manager
    const pmPassword = await bcrypt.hash('pm123', 10);
    await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Project Manager', 'pm@videoproduction.com', pmPassword, 'project_manager']
    );
    console.log('✓ Project manager created');

    // Create sample clients
    const client1 = await db.run(
      `INSERT INTO clients (company_name, contact_name, email, phone, address, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Tech Startup Inc', 'John Doe', 'john@techstartup.com', '+1234567890', '123 Tech Street, Silicon Valley', 'Key client - priority handling']
    );

    const client2 = await db.run(
      `INSERT INTO clients (company_name, contact_name, email, phone, address, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['Creative Agency', 'Jane Smith', 'jane@creativeagency.com', '+1234567891', '456 Design Ave, New York', 'Regular client for social media work']
    );
    console.log('✓ Sample clients created');

    // Create client users
    const client1Password = await bcrypt.hash('client123', 10);
    await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['John Doe', 'john@techstartup.com', client1Password, 'client']
    );

    const client2Password = await bcrypt.hash('client123', 10);
    await db.run(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      ['Jane Smith', 'jane@creativeagency.com', client2Password, 'client']
    );
    console.log('✓ Client users created');

    // Create sample projects
    const project1 = await db.run(
      `INSERT INTO projects (client_id, title, description, project_type, status, start_date, deadline, budget, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client1.lastID,
        'Corporate Video Production',
        'Professional corporate video showcasing company culture and values',
        'video',
        'in_progress',
        '2024-01-01',
        '2024-02-15',
        5000,
        adminResult.lastID
      ]
    );

    const project2 = await db.run(
      `INSERT INTO projects (client_id, title, description, project_type, status, start_date, deadline, budget, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client2.lastID,
        'Social Media Campaign',
        'Monthly social media content creation and management',
        'social_media',
        'in_progress',
        '2024-01-10',
        '2024-03-10',
        3000,
        adminResult.lastID
      ]
    );

    const project3 = await db.run(
      `INSERT INTO projects (client_id, title, description, project_type, status, start_date, deadline, budget, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        client1.lastID,
        'Brand Identity Design',
        'Complete brand identity package including logo and guidelines',
        'design',
        'planning',
        '2024-02-01',
        '2024-03-01',
        4000,
        adminResult.lastID
      ]
    );
    console.log('✓ Sample projects created');

    // Create project updates
    await db.run(
      `INSERT INTO project_updates (project_id, user_id, title, content, update_type, visibility)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        project1.lastID,
        adminResult.lastID,
        'Project Kickoff',
        'We have started working on your corporate video. Initial concept development is underway.',
        'progress',
        'client'
      ]
    );

    await db.run(
      `INSERT INTO project_updates (project_id, user_id, title, content, update_type, visibility)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        project1.lastID,
        adminResult.lastID,
        'First Draft Ready',
        'First draft of the video is ready for review. Please check and provide feedback.',
        'milestone',
        'client'
      ]
    );

    await db.run(
      `INSERT INTO project_updates (project_id, user_id, title, content, update_type, visibility)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        project2.lastID,
        adminResult.lastID,
        'Content Calendar Created',
        'Monthly content calendar has been prepared for your approval.',
        'progress',
        'client'
      ]
    );
    console.log('✓ Sample updates created');

    // Create sample invoice
    const invoice1 = await db.run(
      `INSERT INTO invoices (invoice_number, project_id, client_id, status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount, total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['INV-00001', project1.lastID, client1.lastID, 'sent', '2024-01-15', '2024-02-15', 5000, 10, 500, 0, 5500, 'Payment terms: Net 30']
    );

    // Add invoice items
    await db.run(
      `INSERT INTO invoice_items (invoice_id, service_category, description, quantity, rate, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoice1.lastID, 'Video Production', 'Corporate video production - planning and filming', 1, 3000, 3000]
    );

    await db.run(
      `INSERT INTO invoice_items (invoice_id, service_category, description, quantity, rate, amount)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoice1.lastID, 'Video Production', 'Post-production and editing', 1, 2000, 2000]
    );
    console.log('✓ Sample invoice created');

    // Create milestones
    await db.run(
      `INSERT INTO milestones (project_id, title, description, due_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [project1.lastID, 'Script Approval', 'Final script approval from client', '2024-01-20', 'completed']
    );

    await db.run(
      `INSERT INTO milestones (project_id, title, description, due_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [project1.lastID, 'Filming Complete', 'Complete all filming activities', '2024-02-01', 'in_progress']
    );

    await db.run(
      `INSERT INTO milestones (project_id, title, description, due_date, status)
       VALUES (?, ?, ?, ?, ?)`,
      [project1.lastID, 'Final Delivery', 'Deliver final video to client', '2024-02-15', 'pending']
    );
    console.log('✓ Sample milestones created');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\nTest Credentials:');
    console.log('Admin: admin@videoproduction.com / admin123');
    console.log('Project Manager: pm@videoproduction.com / pm123');
    console.log('Client 1: john@techstartup.com / client123');
    console.log('Client 2: jane@creativeagency.com / client123');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
