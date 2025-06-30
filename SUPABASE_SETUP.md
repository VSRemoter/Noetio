# Supabase Setup Guide for YouTube Note Taker

This guide will help you set up Supabase authentication and database for your YouTube Note Taker application.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `youtube-note-taker` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose the closest region to your users
5. Click "Create new project"
6. Wait for the project to be created (this may take a few minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **Anon public key** (starts with `eyJ...`)

## Step 3: Update Your Configuration

1. Open `supabase-config.js` in your project
2. Replace the placeholder values:

```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co'; // Your actual project URL
const SUPABASE_ANON_KEY = 'your-anon-key-here'; // Your actual anon key
```

## Step 4: Set Up the Database

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy and paste the entire contents of `supabase-setup.sql`
4. Click "Run" to execute the SQL
5. This will create all the necessary tables and security policies

## Step 5: Configure Authentication Settings

1. Go to **Authentication** → **Settings**
2. Configure the following:

### Email Templates (Optional)
- Go to **Authentication** → **Email Templates**
- Customize the email templates for sign-up confirmation

### Site URL
- Go to **Authentication** → **URL Configuration**
- Add your site URL (for local development: `http://localhost:3000`)
- Add redirect URLs if needed

## Step 6: Test the Setup

1. Start your local server:
   ```bash
   npm start
   ```

2. Open your browser to `http://localhost:3000`

3. Try to sign up with a new email address

4. Check your email for the confirmation link

5. After confirming, try logging in

## Step 7: Verify Database Tables

1. Go to **Table Editor** in your Supabase dashboard
2. You should see the following tables:
   - `user_videos`
   - `user_playlists`
   - `user_tags`
   - `user_notes`

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure your site URL is added to the allowed origins in Supabase settings

2. **Authentication Not Working**: 
   - Check that your Supabase URL and anon key are correct
   - Verify that the Supabase script is loading properly
   - Check browser console for any JavaScript errors

3. **Database Errors**:
   - Make sure you ran the SQL setup script
   - Check that Row Level Security (RLS) is enabled
   - Verify that the policies are created correctly

### Debug Mode

To enable debug mode, add this to your `supabase-config.js`:

```javascript
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        debug: true
    }
});
```

## Security Features

The setup includes:

- **Row Level Security (RLS)**: Users can only access their own data
- **Automatic timestamps**: Created and updated timestamps are automatically managed
- **Cascade deletes**: When a user is deleted, all their data is automatically removed
- **JSONB storage**: Efficient storage of complex data structures

## Production Deployment

When deploying to production:

1. Update the site URL in Supabase settings to your production domain
2. Consider enabling additional security features like:
   - Rate limiting
   - Email confirmation requirements
   - Password strength requirements

## Data Migration

If you have existing data in localStorage:

1. The app will automatically sync local data to Supabase when a user logs in
2. Data is stored as JSON in the database for easy querying
3. Users can access their data from any device once logged in

## API Endpoints

The following Supabase tables are used:

- `user_videos`: Stores user's video collection
- `user_playlists`: Stores user's playlists
- `user_tags`: Stores user's tags
- `user_notes`: Stores individual notes for videos

Each table has automatic RLS policies that ensure users can only access their own data. 