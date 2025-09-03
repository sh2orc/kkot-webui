import { initDatabase } from '../lib/db/setup';
import { hashPassword } from '../lib/auth';
import { sql } from 'drizzle-orm';
import { users } from '../lib/db/schema';

async function createTestUser() {
  console.log('Creating test user...\n');
  
  // Initialize database
  const db = await initDatabase();
  
  const testEmail = 'test@example.com';
  const testPassword = 'test123';
  const testUsername = 'Test User';
  
  try {
    // Check existing user
    const existingUsers = await db.select().from(users).where(sql`${users.email} = ${testEmail}`);
    
    if (existingUsers.length > 0) {
      console.log(`User with email ${testEmail} already exists`);
      console.log('User details:', {
        id: existingUsers[0].id,
        email: existingUsers[0].email,
        username: existingUsers[0].username,
        role: existingUsers[0].role
      });
    } else {
      // Create new user
      const hashedPassword = hashPassword(testPassword);
      
      // Check if first user
      const allUsers = await db.select().from(users);
      const isFirstUser = allUsers.length === 0;
      const userRole = isFirstUser ? 'admin' : 'user';
      
      const newUser = await db.insert(users).values({
        username: testUsername,
        email: testEmail,
        password: hashedPassword,
        role: userRole
      }).returning();
      
      console.log('✅ Test user created successfully!');
      console.log('User details:', {
        id: newUser[0].id,
        email: newUser[0].email,
        username: newUser[0].username,
        role: newUser[0].role
      });
    }
    
    console.log('\n📌 Login credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
  }
  
  process.exit(0);
}

createTestUser().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});