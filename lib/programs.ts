// lib/programs.ts
import { serverDb } from "@/lib/appwrite.server";

export interface Program {
  id: string;
  name: string;
}

export const getPrograms = async (): Promise<Program[]> => {
  const res = await serverDb.listDocuments({
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DB_ID!,
    collectionId: "programs",
  });
  return res.documents.map((d) => ({ id: d.$id, name: d.name }));
};
