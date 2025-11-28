// lib/appwrite-client.ts
import { Client, Account, Databases, Storage } from "node-appwrite";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!) // e.g., https://cloud.appwrite.io/v1
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client); // Auth (login/register)
export const db = new Databases(client);     // Database access
export const storage = new Storage(client);  // File uploads/downloads

