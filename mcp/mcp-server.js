import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Client, Databases, ID, Query } from 'node-appwrite';

// Appwrite Configuration
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '694ba83300116af11b75';
const API_KEY = process.env.APPWRITE_API_KEY;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '695a84140031c5a93745';

// Initialize Appwrite
const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT_ID)
  .setKey(API_KEY);
//test
const databases = new Databases(client);

// Create MCP Server
const server = new Server(
  {
    name: 'appwrite-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool: List Collections
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'list_collections',
        description: 'List all collections in the Appwrite database',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'create_collection',
        description: 'Create a new collection in Appwrite',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', description: 'Collection ID' },
            name: { type: 'string', description: 'Collection name' },
          },
          required: ['collectionId', 'name'],
        },
      },
      {
        name: 'list_documents',
        description: 'List documents from a collection',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', description: 'Collection ID' },
            limit: { type: 'number', description: 'Number of documents to retrieve' },
          },
          required: ['collectionId'],
        },
      },
      {
        name: 'create_document',
        description: 'Create a new document in a collection',
        inputSchema: {
          type: 'object',
          properties: {
            collectionId: { type: 'string', description: 'Collection ID' },
            data: { type: 'object', description: 'Document data' },
          },
          required: ['collectionId', 'data'],
        },
      },
      {
        name: 'migrate_users',
        description: 'Migrate users from PostgreSQL to Appwrite',
        inputSchema: {
          type: 'object',
          properties: {
            postgresUrl: { type: 'string', description: 'PostgreSQL connection string' },
          },
          required: ['postgresUrl'],
        },
      },
      {
        name: 'migrate_messages',
        description: 'Migrate messages from PostgreSQL to Appwrite',
        inputSchema: {
          type: 'object',
          properties: {
            postgresUrl: { type: 'string', description: 'PostgreSQL connection string' },
            limit: { type: 'number', description: 'Number of messages to migrate' },
          },
          required: ['postgresUrl'],
        },
      },
    ],
  };
});

// Tool Call Handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_collections': {
        const collections = await databases.listCollections(DATABASE_ID);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(collections, null, 2),
            },
          ],
        };
      }

      case 'create_collection': {
        const { collectionId, name: collectionName } = args;
        const collection = await databases.createCollection(
          DATABASE_ID,
          collectionId,
          collectionName
        );
        return {
          content: [
            {
              type: 'text',
              text: `Collection "${collectionName}" created successfully with ID: ${collection.$id}`,
            },
          ],
        };
      }

      case 'list_documents': {
        const { collectionId, limit = 25 } = args;
        const documents = await databases.listDocuments(
          DATABASE_ID,
          collectionId,
          [Query.limit(limit)]
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(documents, null, 2),
            },
          ],
        };
      }

      case 'create_document': {
        const { collectionId, data } = args;
        const document = await databases.createDocument(
          DATABASE_ID,
          collectionId,
          ID.unique(),
          data
        );
        return {
          content: [
            {
              type: 'text',
              text: `Document created successfully with ID: ${document.$id}`,
            },
          ],
        };
      }

      case 'migrate_users': {
        const { Client: PgClient } = await import('pg');
        const pgClient = new PgClient({ connectionString: args.postgresUrl, ssl: { rejectUnauthorized: false } });
        await pgClient.connect();

        const result = await pgClient.query('SELECT * FROM users');
        let count = 0;

        for (const user of result.rows) {
          try {
            await databases.createDocument(DATABASE_ID, 'users', user.id.toString(), {
              mobile: user.mobile || '',
              role: user.role || 'broker',
              isActive: user.is_active || false,
              name: user.name || '',
              createdAt: user.created_at || new Date().toISOString()
            });
            count++;
          } catch (e) {
            if (e.code !== 409) console.error(`Error migrating user ${user.mobile}:`, e.message);
          }
        }

        await pgClient.end();
        return {
          content: [{ type: 'text', text: `Migrated ${count}/${result.rows.length} users successfully` }],
        };
      }

      case 'migrate_messages': {
        const { Client: PgClient } = await import('pg');
        const pgClient = new PgClient({ connectionString: args.postgresUrl, ssl: { rejectUnauthorized: false } });
        await pgClient.connect();

        const limit = args.limit || 10000;
        const result = await pgClient.query(`SELECT * FROM messages LIMIT ${limit}`);
        let count = 0;

        for (const msg of result.rows) {
          try {
            await databases.createDocument(DATABASE_ID, 'messages', msg.id.toString(), {
              message: msg.message || '',
              category: msg.category || 'أخرى',
              propertyType: msg.property_type || 'أخرى',
              region: msg.region || 'أخرى',
              purpose: msg.purpose || 'أخرى',
              sourceFile: msg.source_file || '',
              imageUrl: msg.image_url || '',
              senderName: msg.sender_name || '',
              senderMobile: msg.sender_mobile || '',
              dateOfCreation: msg.date_of_creation || new Date().toISOString(),
              createdAt: msg.created_at || new Date().toISOString()
            });
            count++;
          } catch (e) {
            if (e.code !== 409 && count < 5) console.error(`Error:`, e.message);
          }
        }

        await pgClient.end();
        return {
          content: [{ type: 'text', text: `Migrated ${count}/${result.rows.length} messages successfully` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Appwrite MCP Server running on stdio');
}

main().catch(console.error);
