import { Client, Databases } from 'node-appwrite';

const API_KEY = process.env.APPWRITE_API_KEY || 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';
const DATABASE_ID = '6984cc1e001d0e313558';

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

const COLLECTION_NAMES = ['transactions', 'budgets', 'goals', 'accounts'];
const COLLECTIONS_WITH_DATE = ['transactions'];

async function ensureIndex(databaseId, collectionId, indexName, attributes, order) {
    try {
        const { indexes } = await databases.listIndexes(databaseId, collectionId);
        const existing = indexes.find(i => i.key === indexName);
        if (existing) {
            console.log(`   ℹ️ Índice "${indexName}" já existe em "${collectionId}".`);
            return;
        }
        await databases.createIndex(databaseId, collectionId, indexName, 'key', attributes, order);
        console.log(`   ✅ Índice "${indexName}" criado em "${collectionId}".`);
    } catch (e) {
        console.error(`   ❌ Erro ao criar índice "${indexName}" em "${collectionId}":`, e.message);
    }
}

async function createIndexes() {
    console.log('🚀 Criando índices...\n');

    try {
        const { collections } = await databases.listCollections(DATABASE_ID);

        for (const name of COLLECTION_NAMES) {
            const col = collections.find(c => c.name === name);
            if (!col) {
                console.log(`⚠️ Coleção "${name}" não encontrada. Pulando...\n`);
                continue;
            }

            const colId = col.$id;
            console.log(`📦 Coleção: ${name} (${colId})`);

            await ensureIndex(DATABASE_ID, colId, `idx_${name}_user_id`, ['user_id'], ['ASC']);
            if (COLLECTIONS_WITH_DATE.includes(name)) {
                await ensureIndex(DATABASE_ID, colId, `idx_${name}_date`, ['date'], ['DESC']);
            }

            console.log('');
        }

        console.log('✅ Todos os índices foram processados.');
    } catch (e) {
        console.error('❌ Erro geral:', e);
    }
}

createIndexes();
