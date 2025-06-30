#!/bin/bash

echo "🎥 YouTube Note Taker - Supabase Authentication Setup"
echo "======================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first:"
    echo "   Visit: https://python.org/"
    exit 1
fi

echo "✅ Node.js and Python 3 are installed"
echo ""

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip3 install flask flask-cors youtube-transcript-api

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

echo "🚀 Next Steps:"
echo "=============="
echo ""
echo "1. Create a Supabase project:"
echo "   - Go to https://supabase.com"
echo "   - Create a new project"
echo "   - Get your project URL and anon key"
echo ""
echo "2. Update supabase-config.js:"
echo "   - Replace YOUR_SUPABASE_URL with your project URL"
echo "   - Replace YOUR_SUPABASE_ANON_KEY with your anon key"
echo ""
echo "3. Set up the database:"
echo "   - Copy the contents of supabase-setup.sql"
echo "   - Run it in your Supabase SQL editor"
echo ""
echo "4. Start the servers:"
echo "   - Python server: python3 server.py"
echo "   - Web server: npm start"
echo ""
echo "5. Open http://localhost:3000 in your browser"
echo ""
echo "📚 For detailed instructions, see SUPABASE_SETUP.md"
echo ""
echo "🎉 Happy note-taking!" 