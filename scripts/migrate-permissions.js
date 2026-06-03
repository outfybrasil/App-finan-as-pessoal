import { Client, Databases, Permission, Role, Query } from 'node-appwrite';

const API_KEY = process.env.APPWRITE_API_KEY || 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';
const DATABASE_ID = '6984cc1e001d0e313558';

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

const COLLECTIONS = [
    { name: 'transactions', id: 'transactions', label: 'Transações' },
    { name: 'budgets', id: 'budgets', label: 'Orçamentos' },
    { name: 'goals', id: 'goals', label: 'Metas' },
    { name: 'accounts', id: '6984d3c78689ddd6fc86', label: 'Contas' },
];

async function getRealCollectionId(name) {
    const { collections } = await databases.listCollections(DATABASE_ID);
    const col = collections.find(c => c.name === name);
    return col ? col.$id : null;
}

async function migrateCollection(displayName, collectionId) {
    console.log(`\n📦 Migrando ${displayName} (${collectionId})...`);

    let total = 0;
    let migrated = 0;
    let skipped = 0;
    let offset = 0;
    const limit = 100;

    while (true) {
        const { documents } = await databases.listDocuments(
            DATABASE_ID, collectionId,
            [Query.limit(limit), Query.offset(offset)]
        );

        if (documents.length === 0) break;

        for (const doc of documents) {
            total++;
            const userId = doc.user_id;
            if (!userId) {
                console.log(`   ⚠️ Documento ${doc.$id} sem user_id. Pulando...`);
                skipped++;
                continue;
            }

            const perms = [
                Permission.read(Role.user(userId)),
                Permission.update(Role.user(userId)),
                Permission.delete(Role.user(userId)),
            ];

            try {
                await databases.updateDocument(
                    DATABASE_ID, collectionId, doc.$id,
                    {},
                    perms
                );
                migrated++;
                if (migrated % 20 === 0) {
                    console.log(`   ✅ ${migrated} documentos migrados...`);
                }
            } catch (e) {
                console.error(`   ❌ Erro no documento ${doc.$id}:`, e.message);
                skipped++;
            }
        }

        offset += limit;
    }

    console.log(`   ✅ ${displayName}: ${migrated} migrados, ${skipped} pulados de ${total} total`);
    return { total, migrated, skipped };
}

async function migrate() {
    console.log('🚀 Iniciando migração de permissões dos documentos existentes...');
    console.log(`   Banco: ${DATABASE_ID}`);
    console.log(`   Projeto: ${PROJECT_ID}\n`);

    let totals = { total: 0, migrated: 0, skipped: 0 };

    for (const col of COLLECTIONS) {
        const realId = await getRealCollectionId(col.name);
        if (!realId) {
            console.log(`⚠️ Coleção "${col.name}" não encontrada. Pulando...`);
            continue;
        }
        const result = await migrateCollection(col.label, realId);
        totals.total += result.total;
        totals.migrated += result.migrated;
        totals.skipped += result.skipped;
    }

    console.log('\n-------------------------------------------------------');
    console.log('📊 RESUMO FINAL');
    console.log('-------------------------------------------------------');
    console.log(`   Total de documentos: ${totals.total}`);
    console.log(`   Permissões atualizadas: ${totals.migrated}`);
    console.log(`   Pulados/Erro: ${totals.skipped}`);
    console.log('-------------------------------------------------------');
    console.log('✅ Migração concluída!');
}

migrate().catch(console.error);
