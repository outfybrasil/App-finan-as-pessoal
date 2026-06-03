import { Client, Databases, Query } from 'node-appwrite';

const API_KEY = process.env.APPWRITE_API_KEY || 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';
const DATABASE_ID = '6984cc1e001d0e313558';

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

const COLLECTIONS = [
    { name: 'transactions', label: 'Transações' },
    { name: 'budgets', label: 'Orçamentos' },
    { name: 'goals', label: 'Metas' },
    { name: 'accounts', label: 'Contas' },
];

async function getRealCollectionId(name) {
    const { collections } = await databases.listCollections(DATABASE_ID);
    const col = collections.find(c => c.name === name);
    return col ? col.$id : null;
}

async function cleanupCollection(displayName, collectionId) {
    console.log(`\n📦 Limpando permissões de ${displayName} (${collectionId})...`);

    let cleaned = 0;
    let offset = 0;
    const limit = 100;

    while (true) {
        const { documents } = await databases.listDocuments(
            DATABASE_ID, collectionId,
            [Query.limit(limit), Query.offset(offset)]
        );

        if (documents.length === 0) break;

        for (const doc of documents) {
            try {
                // Sends empty data and empty permissions array to clear document-level permissions
                await databases.updateDocument(
                    DATABASE_ID, collectionId, doc.$id,
                    {},
                    []
                );
                cleaned++;
                if (cleaned % 20 === 0) {
                    console.log(`   ✅ ${cleaned} documentos limpos...`);
                }
            } catch (e) {
                console.error(`   ❌ Erro no documento ${doc.$id}: ${e.message}`);
            }
        }

        offset += limit;
    }

    console.log(`   ✅ ${displayName}: ${cleaned} documentos limpos`);
    return cleaned;
}

async function cleanup() {
    console.log('🚀 Limpando permissões de documento (herdar da coleção)...\n');

    let total = 0;

    for (const col of COLLECTIONS) {
        const realId = await getRealCollectionId(col.name);
        if (!realId) {
            console.log(`⚠️ Coleção "${col.name}" não encontrada. Pulando...`);
            continue;
        }
        total += await cleanupCollection(col.label, realId);
    }

    console.log(`\n✅ Total: ${total} documentos limpos. Agora todos herdam as permissões da coleção.`);
}

cleanup().catch(console.error);
