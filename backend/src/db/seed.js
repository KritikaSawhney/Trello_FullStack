require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  decimalNumbers: true,
  ssl: process.env.DB_HOST && process.env.DB_HOST.includes('aivencloud.com') ? { rejectUnauthorized: false } : undefined,
};

async function main() {
  let pool;
  try {
    // Step 1: Connect WITHOUT a database to create it if needed
    const tempConn = await mysql.createConnection(dbConfig);
    const dbName = process.env.DB_NAME || 'trello_clone';
    await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${dbName}' ready`);
    await tempConn.end();

    // Step 2: Now connect WITH the database
    pool = await mysql.createPool({ ...dbConfig, database: dbName, multipleStatements: false });

    // Step 3: Run schema
    await runSchema(pool);

    // Step 4: Seed data
    await seedData(pool);

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

async function runSchema(pool) {
  const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const statements = schemaSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await pool.query(stmt);
  }
  console.log('✅ Schema created successfully');
}

async function seedData(pool) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Seed Members
    await conn.query(`
      INSERT IGNORE INTO members (id, name, initials, email, avatar_color) VALUES
        ('11111111-1111-1111-1111-111111111111', 'Alice Johnson', 'AJ', 'alice@company.com', '#61BD4F'),
        ('22222222-2222-2222-2222-222222222222', 'Bob Smith', 'BS', 'bob@company.com', '#FF8B00'),
        ('33333333-3333-3333-3333-333333333333', 'Carol Davis', 'CD', 'carol@company.com', '#C377E0'),
        ('44444444-4444-4444-4444-444444444444', 'David Wilson', 'DW', 'david@company.com', '#EB5A46'),
        ('55555555-5555-5555-5555-555555555555', 'Emma Brown', 'EB', 'emma@company.com', '#0079BF')
    `);
    console.log('✅ Members seeded');

    // Seed Board
    const boardId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    await conn.query(`
      INSERT IGNORE INTO boards (id, title, background_color) VALUES
        ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Product Launch 🚀', '#0079BF')
    `);
    console.log('✅ Board seeded');

    // Seed Labels
    await conn.query(`
      INSERT IGNORE INTO labels (id, name, color, board_id) VALUES
        ('l1111111-1111-1111-1111-111111111111', 'Bug', '#EB5A46', ?),
        ('l2222222-2222-2222-2222-222222222222', 'Feature', '#61BD4F', ?),
        ('l3333333-3333-3333-3333-333333333333', 'Design', '#C377E0', ?),
        ('l4444444-4444-4444-4444-444444444444', 'High Priority', '#FF8B00', ?),
        ('l5555555-5555-5555-5555-555555555555', 'Research', '#00C2E0', ?),
        ('l6666666-6666-6666-6666-666666666666', 'Blocked', '#344563', ?)
    `, [boardId, boardId, boardId, boardId, boardId, boardId]);
    console.log('✅ Labels seeded');

    // Seed Lists
    await conn.query(`
      INSERT IGNORE INTO lists (id, board_id, title, position) VALUES
        ('l1000000-0000-0000-0000-000000000001', ?, 'Backlog', 0),
        ('l1000000-0000-0000-0000-000000000002', ?, 'In Progress', 1),
        ('l1000000-0000-0000-0000-000000000003', ?, 'Review', 2),
        ('l1000000-0000-0000-0000-000000000004', ?, 'Done', 3)
    `, [boardId, boardId, boardId, boardId]);
    console.log('✅ Lists seeded');

    // Seed Cards
    await conn.query(`
      INSERT IGNORE INTO cards (id, list_id, title, description, position, due_date) VALUES
        ('c1000000-0000-0000-0000-000000000001', 'l1000000-0000-0000-0000-000000000001',
          'Design new landing page', 'Create wireframes and mockups for the new product landing page', 0,
          DATE_ADD(NOW(), INTERVAL 5 DAY)),
        ('c1000000-0000-0000-0000-000000000002', 'l1000000-0000-0000-0000-000000000001',
          'Set up CI/CD pipeline', 'Configure GitHub Actions for automated testing and deployment', 1,
          DATE_ADD(NOW(), INTERVAL 3 DAY)),
        ('c1000000-0000-0000-0000-000000000003', 'l1000000-0000-0000-0000-000000000001',
          'User research interviews', 'Conduct 5 user interviews to gather feedback on prototype', 2,
          DATE_ADD(NOW(), INTERVAL 7 DAY)),
        ('c1000000-0000-0000-0000-000000000004', 'l1000000-0000-0000-0000-000000000002',
          'Implement authentication', 'Build JWT-based auth system with refresh tokens', 0,
          DATE_ADD(NOW(), INTERVAL 2 DAY)),
        ('c1000000-0000-0000-0000-000000000005', 'l1000000-0000-0000-0000-000000000002',
          'Fix navigation bug on mobile', 'Hamburger menu not closing after link click on iOS Safari', 1,
          DATE_SUB(NOW(), INTERVAL 1 DAY)),
        ('c1000000-0000-0000-0000-000000000006', 'l1000000-0000-0000-0000-000000000002',
          'Database schema optimization', 'Add indexes and optimize slow queries identified in profiling', 2,
          DATE_ADD(NOW(), INTERVAL 4 DAY)),
        ('c1000000-0000-0000-0000-000000000007', 'l1000000-0000-0000-0000-000000000003',
          'API rate limiting', 'Implement rate limiting middleware using Redis', 0,
          DATE_ADD(NOW(), INTERVAL 1 DAY)),
        ('c1000000-0000-0000-0000-000000000008', 'l1000000-0000-0000-0000-000000000003',
          'Update documentation', 'Rewrite API docs with OpenAPI 3.0 spec', 1,
          DATE_ADD(NOW(), INTERVAL 6 DAY)),
        ('c1000000-0000-0000-0000-000000000009', 'l1000000-0000-0000-0000-000000000004',
          'Project kickoff meeting', 'Initial stakeholder alignment and project scope definition', 0,
          DATE_SUB(NOW(), INTERVAL 10 DAY)),
        ('c1000000-0000-0000-0000-000000000010', 'l1000000-0000-0000-0000-000000000004',
          'Technology stack selection', 'Evaluated Next.js, React, Vue and decided on Next.js', 1,
          DATE_SUB(NOW(), INTERVAL 8 DAY))
    `);
    console.log('✅ Cards seeded');

    // Seed Card Labels
    await conn.query(`
      INSERT IGNORE INTO card_labels (card_id, label_id) VALUES
        ('c1000000-0000-0000-0000-000000000001', 'l3333333-3333-3333-3333-333333333333'),
        ('c1000000-0000-0000-0000-000000000001', 'l4444444-4444-4444-4444-444444444444'),
        ('c1000000-0000-0000-0000-000000000002', 'l2222222-2222-2222-2222-222222222222'),
        ('c1000000-0000-0000-0000-000000000003', 'l5555555-5555-5555-5555-555555555555'),
        ('c1000000-0000-0000-0000-000000000004', 'l2222222-2222-2222-2222-222222222222'),
        ('c1000000-0000-0000-0000-000000000004', 'l4444444-4444-4444-4444-444444444444'),
        ('c1000000-0000-0000-0000-000000000005', 'l1111111-1111-1111-1111-111111111111'),
        ('c1000000-0000-0000-0000-000000000005', 'l6666666-6666-6666-6666-666666666666'),
        ('c1000000-0000-0000-0000-000000000006', 'l2222222-2222-2222-2222-222222222222'),
        ('c1000000-0000-0000-0000-000000000007', 'l2222222-2222-2222-2222-222222222222'),
        ('c1000000-0000-0000-0000-000000000008', 'l5555555-5555-5555-5555-555555555555')
    `);
    console.log('✅ Card labels seeded');

    // Seed Card Members
    await conn.query(`
      INSERT IGNORE INTO card_members (card_id, member_id) VALUES
        ('c1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333'),
        ('c1000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111'),
        ('c1000000-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444'),
        ('c1000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333'),
        ('c1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111'),
        ('c1000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222'),
        ('c1000000-0000-0000-0000-000000000006', '44444444-4444-4444-4444-444444444444'),
        ('c1000000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111'),
        ('c1000000-0000-0000-0000-000000000007', '55555555-5555-5555-5555-555555555555'),
        ('c1000000-0000-0000-0000-000000000008', '22222222-2222-2222-2222-222222222222'),
        ('c1000000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111'),
        ('c1000000-0000-0000-0000-000000000010', '44444444-4444-4444-4444-444444444444')
    `);
    console.log('✅ Card members seeded');

    // Seed Checklists
    await conn.query(`
      INSERT IGNORE INTO checklists (id, card_id, title, position) VALUES
        ('ch100000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Design Tasks', 0),
        ('ch100000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000004', 'Implementation Steps', 0)
    `);
    await conn.query(`
      INSERT IGNORE INTO checklist_items (id, checklist_id, title, is_complete, position) VALUES
        ('ci100000-0000-0000-0000-000000000001', 'ch100000-0000-0000-0000-000000000001', 'Create wireframes', 1, 0),
        ('ci100000-0000-0000-0000-000000000002', 'ch100000-0000-0000-0000-000000000001', 'Design mockups in Figma', 1, 1),
        ('ci100000-0000-0000-0000-000000000003', 'ch100000-0000-0000-0000-000000000001', 'Get stakeholder approval', 0, 2),
        ('ci100000-0000-0000-0000-000000000004', 'ch100000-0000-0000-0000-000000000001', 'Hand off to development', 0, 3),
        ('ci100000-0000-0000-0000-000000000005', 'ch100000-0000-0000-0000-000000000002', 'Set up user model', 1, 0),
        ('ci100000-0000-0000-0000-000000000006', 'ch100000-0000-0000-0000-000000000002', 'Implement login endpoint', 1, 1),
        ('ci100000-0000-0000-0000-000000000007', 'ch100000-0000-0000-0000-000000000002', 'Add JWT middleware', 0, 2),
        ('ci100000-0000-0000-0000-000000000008', 'ch100000-0000-0000-0000-000000000002', 'Write auth tests', 0, 3)
    `);
    console.log('✅ Checklists seeded');

    // Seed Comments
    await conn.query(`
      INSERT IGNORE INTO comments (card_id, member_id, content) VALUES
        ('c1000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'Started working on the wireframes. Should have a draft by EOD.'),
        ('c1000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Let us make sure the design aligns with our brand guidelines.'),
        ('c1000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Going with JWT + refresh token pattern. Should be straightforward.'),
        ('c1000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'Reproduced on iPhone 14. It happens on iOS 16 and above.')
    `);
    console.log('✅ Comments seeded');

    await conn.commit();
    console.log('\n🎉 Database seeded successfully!');
  } catch (err) {
    await conn.rollback();
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

main();
