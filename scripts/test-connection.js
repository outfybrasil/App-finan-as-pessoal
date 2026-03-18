
import { Client, Databases } from 'node-appwrite';

const API_KEY = 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';

async function testConnection(endpoint) {
    console.log(`Testing connection to: ${endpoint}`);
    const client = new Client()
        .setEndpoint(endpoint)
        .setProject(PROJECT_ID)
        .setKey(API_KEY);

    const db = new Databases(client);

    try {
        const dbs = await db.list();
        console.log(`✅ Success for ${endpoint}! Found ${dbs.total} databases.`);
        dbs.databases.forEach(d => console.log(`DB ID: ${d.$id}, Name: ${d.name}`));
    } catch (e) {
        console.log(`❌ Failed for ${endpoint}: ${e.message}`);
    }
}

async function run() {
    await testConnection('https://nyc.cloud.appwrite.io/v1');
    await testConnection('https://cloud.appwrite.io/v1');
}

run();
