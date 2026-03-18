import { Client, Databases } from 'node-appwrite';

const API_KEY = process.env.APPWRITE_API_KEY || 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';
const DATABASE_ID = '6984cc1e001d0e313558';
const TRANSACTIONS_COLLECTION_ID = 'transactions'; // Or use the ID if we know it, check check-attributes output

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

async function checkAttributes() {
    console.log('🔍 Checking attributes for collection:', TRANSACTIONS_COLLECTION_ID);
    try {
        // First get the real collection ID if 'transactions' is just a name and not ID (in my setup script I used name as ID? No, I used unique(). Or did I?)
        // In setup-appwrite.js:
        // const { collections } = await databases.listCollections(dbId);
        // const existing = collections.find(c => c.name === name);
        // If existing, use existing.$id.
        // If created, used 'unique()'. 

        // Wait, I need the ID. The .env has it.
        // I will trust the user to have the correct ID in .env, BUT since I'm running this script I need to know it.
        // I'll list collections to find it by name 'transactions'.

        const { collections } = await databases.listCollections(DATABASE_ID);
        const transactionCol = collections.find(c => c.name === 'transactions');

        if (!transactionCol) {
            console.error('❌ Collection "transactions" NOT FOUND!');
            return;
        }

        console.log(`✅ Found "transactions" collection with ID: ${transactionCol.$id}`);

        const { attributes } = await databases.listAttributes(DATABASE_ID, transactionCol.$id);

        console.log('\n📋 Attributes found:');
        const attrNames = attributes.map(a => `${a.key} [${a.type}, required:${a.required}]`);
        attrNames.forEach(name => console.log(`   - ${name}`));

        const missing = [];
        ['tags', 'payment_method', 'attachment_id', 'group_id', 'account'].forEach(key => {
            if (!attributes.find(a => a.key === key)) missing.push(key);
        });

        if (missing.length > 0) {
            console.error(`\n❌ MISSING ATTRIBUTES: ${missing.join(', ')}`);
            console.log('👉 This explains the 400 Bad Request error. You need to re-run the setup script or add them manually.');
        } else {
            console.log('\n✅ All expected attributes seem to be present.');
        }

    } catch (e) {
        console.error('❌ Error checking attributes:', e);
    }
}

checkAttributes();
