# Shelly Chat

A simple chat application built for Node.js 22, utilizing Express, .

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 22)
- npm package manager
- An internet connection (as the frontend relies on a CDN)

## Installation

1. Clone the repository
```bash
git clone https://github.com/alexmtonev/shelly-chat.git
```

2. Navigate to the project directory
```bash
cd shelly-chat
```

3. Install dependencies
```bash
npm install
```

4. Start the server
```bash
npm run start
```

The application should now be running at `http://localhost:3000`

You may optionally create a `.env` file to change from the default PORT 3000

```bash
touch .env
echo "PORT=3000" >> .env
```

## Functionalities
1. Create or join a room using the input on the left
2. Type messages and press Enter or click Send
3. Click a user on the right column to start a private chat
- The both user's room list should be updated
