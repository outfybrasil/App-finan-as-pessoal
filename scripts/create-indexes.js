import { Client, Databases } from 'node-appwrite';

const API_KEY = process.env.APPWRITE_API_KEY || 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';
const DATABASE_ID = '6984cc1e001d0e313558';
const TRANSACTIONS_COLLECTION_ID = 'transactions'; // As seen in setup-appwrite

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

async function createIndexes() {
    console.log('🚀 Creating Indexes...');

    try {
        // We need the collection real ID. Assuming 'transactions' is the ID or we can find it.
        // Similar logic to check-attributes.js
        const { collections } = await databases.listCollections(DATABASE_ID);
        const transactionCol = collections.find(c => c.name === 'transactions');

        if (!transactionCol) {
            console.error('❌ Collection transactions not found');
            return;
        }

        const colId = transactionCol.$id;
        console.log(`✅ Targeted Collection ID: ${colId}`);

        // List existing indexes to avoid duplicates
        const { indexes } = await databases.listIndexes(DATABASE_ID, colId);
        const dateIndex = indexes.find(i => i.key === 'idx_date');

        if (dateIndex) {
            console.log('✅ Index "idx_date" already exists.');
        } else {
            console.log('⏳ Creating index "idx_date" on field "date"...');
            await databases.createIndex(
                DATABASE_ID,
                colId,
                'idx_date',
                'key', // Type: key, fulltext, etc. 'key' is good for sorting dates? Actually 'key' is standard.
                ['date'], // Attributes
                ['DESC'] // Order (optional for key index? usually ASC/DESC matters for sorting queries)
            );
            console.log('✅ Index "idx_date" created successfully!');
        }

    } catch (e) {
        console.error('❌ Error creating index:', e);
    }
}

createIndexes();
