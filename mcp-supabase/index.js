// MCP Supabase Server
// Usage: Copy .env.example to .env, fill in credentials, then run: node mcp-supabase/index.js
import pg from "pg";
import dotenv from "dotenv";
import { createServer, Tool } from '@modelcontextprotocol/sdk';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});



// MCP server
const server = createServer({});

// Tool: get_schema (using pg)
server.tool("get_schema", "Return DB schema (tables + columns)", async () => {
  const query = `
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  const { rows } = await pool.query(query);
  // Reshape into JSON: { table: [ { column, type } ] }
  const schema = {};
  for (const r of rows) {
    if (!schema[r.table_name]) schema[r.table_name] = [];
    schema[r.table_name].push({ column: r.column_name, type: r.data_type });
  }
  return schema;
});

// Tool: query_table (using Supabase)
server.tool("query_table", "Returns first 10 rows from a table", async ({ table }) => {
  const { data, error } = await supabase.from(table).select('*').limit(10);
  if (error) throw error;
  return data;
});

server.start();
