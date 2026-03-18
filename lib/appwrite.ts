import { Client, Account, Databases } from 'appwrite';

export const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

console.log('🔗 Appwrite Config:', {
    endpoint,
    projectId,
    hostname: window.location.hostname
});

client
    .setEndpoint(endpoint)
    .setProject(projectId);

export const account = new Account(client);
export const databases = new Databases(client);

export const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
