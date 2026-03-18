
import { Client, Projects } from 'node-appwrite';

const API_KEY = process.env.APPWRITE_API_KEY || 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const projects = new Projects(client);

async function addPlatform() {
    console.log('🔄 Adding localhost platforms to Appwrite...');

    const platforms = [
        { type: 'web', name: 'Localhost 3000', key: 'localhost', hostname: 'localhost' },
        { type: 'web', name: 'Localhost 5173', key: 'localhost', hostname: 'localhost' }, // Vite default
    ];

    for (const p of platforms) {
        try {
            // createPlatform(projectId, type, name, key, store?, icon?)
            // For web, key is the hostname.
            await projects.createPlatform(PROJECT_ID, p.type, p.name, p.key);
            console.log(`✅ Platform added: ${p.name} (${p.key})`);
        } catch (e) {
            if (e.code === 409) {
                console.log(`ℹ️ Platform already exists: ${p.name}`);
            } else {
                console.error(`❌ Failed to add ${p.name}:`, e.message);
                // Try to log available methods if Projects is wrong
                // console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(projects)));
            }
        }
    }
}

addPlatform();
