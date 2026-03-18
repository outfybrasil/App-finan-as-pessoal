import { Client, Databases } from 'node-appwrite';

const API_KEY = process.env.APPWRITE_API_KEY || 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';
const DATABASE_ID = '6984cc1e001d0e313558';
// We need the collection ID. In setup-appwrite it was returning 'transactions' (if created by name?) or unique ID.
// Let's assume it's 'transactions' based on previous logs, or check appwrite_ids.json if possible.
// I'll try 'transactions' first.
const COLLECTION_ID = 'transactions';

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

async function debugData() {
    console.log('🔍 Debugging Data...');
    try {
        const { documents, total } = await databases.listDocuments(DATABASE_ID, COLLECTION_ID);
        console.log(`✅ Found ${total} documents in '${COLLECTION_ID}'`);

        if (documents.length === 0) {
            console.log('⚠️ Collection is empty.');
        } else {
            console.log('\n📋 First 5 Documents:');
            documents.slice(0, 5).forEach(doc => {
                console.log(`\nID: ${doc.$id}`);
                console.log(`   Description: ${doc.description}`);
                console.log(`   Amount: ${doc.amount}`);
                console.log(`   Date: "${doc.date}" (Type: ${typeof doc.date})`);
                console.log(`   User ID: ${doc.user_id} (Length: ${doc.user_id?.length})`);
                console.log(`   Permissions: ${JSON.stringify(doc.$permissions)}`);
            });
        }
    } catch (e) {
        console.error('❌ Error listing documents:', e);
        if (e.code === 404) {
            console.log('Maybe Collection ID is wrong? Trying to list collections...');
            const { collections } = await databases.listCollections(DATABASE_ID);
            console.log('Available collections:', collections.map(c => `${c.name} (${c.$id})`).join(', '));
        }
    }
}

debugData();
