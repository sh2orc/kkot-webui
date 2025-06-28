# DB Module Usage Guide

This module supports SQLite and PostgreSQL databases using Drizzle ORM.

## Setup

### Environment Variables

Create a `.env` file and configure it as follows:

```
# For SQLite (default)
DB_TYPE=sqlite
DATABASE_URL=file:./data.db

# For PostgreSQL
# DB_TYPE=postgresql
# DATABASE_URL=postgres://username:password@localhost:5432/dbname
```

## Usage

### In Server Components

```tsx
import { db } from '@/lib/db/server';

export default async function MyServerComponent() {
  // Get user list
  const users = await db.userRepository.findAll();
  
  return (
    <div>
      <h1>User List</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.username}</li>
        ))}
      </ul>
    </div>
  );
}
```

### In API Routes

```tsx
import { NextResponse } from 'next/server';
import { db } from '@/lib/db/server';

export async function GET() {
  const users = await db.userRepository.findAll();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  const newUser = await db.userRepository.create({
    username: body.username,
    email: body.email,
    password: body.password
  });
  
  return NextResponse.json({ user: newUser });
}
```

### In Client Components

In client components, don't access the DB directly. Use API routes instead.

```tsx
"use client"

import { useState } from 'react';

export default function ClientComponent() {
  const [users, setUsers] = useState([]);
  
  const fetchUsers = async () => {
    const response = await fetch('/api/users');
    const data = await response.json();
    setUsers(data.users);
  };
  
  return (
    <div>
      <button onClick={fetchUsers}>Fetch User List</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.username}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Supported Tables

- `users`: User information
- `chatSessions`: Chat sessions
- `chatMessages`: Chat messages
- `apiConnections`: API connection settings
- `modelSettings`: Model settings
- `webSearchSettings`: Web search settings
- `imageSettings`: Image generation settings
- `audioSettings`: Audio settings
- `systemSettings`: System settings

## Migrations

Migrations run automatically when the application starts. To run them manually:

```typescript
import { runMigrations } from '@/lib/db';

await runMigrations();
``` 