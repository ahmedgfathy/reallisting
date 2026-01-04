# Appwrite MCP Server

This MCP (Model Context Protocol) server provides direct connection to Appwrite with full authority.

## Setup

1. Install dependencies:
```cmd
cd mcp
npm install
```

2. Configure environment (already set in parent .env):
- APPWRITE_ENDPOINT
- APPWRITE_PROJECT_ID  
- APPWRITE_API_KEY
- APPWRITE_DATABASE_ID

3. Run the MCP server:
```cmd
npm start
```

## Available Tools

### 1. `list_collections`
List all collections in the database

### 2. `create_collection`
Create a new collection
- collectionId: string
- name: string

### 3. `list_documents`
List documents from a collection
- collectionId: string
- limit: number (optional)

### 4. `create_document`
Create a new document
- collectionId: string
- data: object

### 5. `migrate_users`
Migrate users from PostgreSQL to Appwrite
- postgresUrl: string

### 6. `migrate_messages`
Migrate messages from PostgreSQL to Appwrite
- postgresUrl: string
- limit: number (optional)

## Usage with Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "appwrite": {
      "command": "node",
      "args": ["c:/Users/ahmed/Downloads/reallisting/mcp/mcp-server.js"],
      "env": {
        "APPWRITE_ENDPOINT": "https://fra.cloud.appwrite.io/v1",
        "APPWRITE_PROJECT_ID": "694ba83300116af11b75",
        "APPWRITE_API_KEY": "your-api-key",
        "APPWRITE_DATABASE_ID": "695a84140031c5a93745"
      }
    }
  }
}
```

## Direct Migration

You can also run the complete migration directly:

```cmd
cd c:\Users\ahmed\Downloads\reallisting
node scripts\complete-migration.js
```

This bypasses MCP and runs the migration directly with full authority.
