// lib/appwrite-server.ts
import { Client, Databases, Storage, Account } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // Secret API key for server-side

export const serverDb = new Databases(client);
export const serverStorage = new Storage(client);
export const serverAccount = new Account(client);
