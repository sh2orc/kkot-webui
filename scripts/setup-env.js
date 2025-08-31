const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');

// 기본 환경변수 생성
const generateEnv = () => {
  const secret = crypto.randomBytes(32).toString('base64');
  
  const envContent = `# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${secret}

# Database Configuration (optional)
# DB_TYPE=postgresql
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=kkot_webui
# DB_USER=your_db_user
# DB_PASSWORD=your_db_password

# OAuth Configuration (optional - can be set in admin panel)
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# GITHUB_CLIENT_ID=your-github-client-id
# GITHUB_CLIENT_SECRET=your-github-client-secret
`;

  return envContent;
};

// .env.local 파일 생성
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, generateEnv());
  console.log('✅ Created .env.local file with required environment variables');
  console.log('📌 Please restart your development server for changes to take effect');
} else {
  console.log('⚠️  .env.local file already exists');
  console.log('📌 Make sure it contains:');
  console.log('   - NEXTAUTH_URL=http://localhost:3000');
  console.log('   - NEXTAUTH_SECRET=<your-secret-key>');
}
