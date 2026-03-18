
import { Client, Databases, Permission, Role } from 'node-appwrite';
import fs from 'fs';

const API_KEY = process.env.APPWRITE_API_KEY || 'standard_16274f74d7bad35c937edc1ef3036876c26011eb445702559fc887e5fe9658fba58a06cc83211e88e05e0dc5fca53ec29b2bac9fae1b71f0e6b442a4dbb8602b4848f2a65ad9214f2270d72ec6d48e7be6824d3c24fd44251ab744b26cd1c7530aeca6104c3506aa43be8f8db3b303085ecc67cc6de063287920406a7f7bd55e';
const PROJECT_ID = '6984c96c00339f199cae';
const DATABASE_ID = '6984cc1e001d0e313558';

const client = new Client()
    .setEndpoint('https://nyc.cloud.appwrite.io/v1')
    .setProject(PROJECT_ID)
    .setKey(API_KEY);

const databases = new Databases(client);

async function getOrCreateCollection(dbId, name) {
    console.log(`\n🔍 Verificando coleção: ${name}...`);
    try {
        const { collections } = await databases.listCollections(dbId);
        const existing = collections.find(c => c.name === name);

        if (existing) {
            console.log(`✅ Coleção '${name}' já existe. ID: ${existing.$id}`);
            return existing.$id;
        }

        // Se não existe, cria
        console.log(`📦 Criando coleção '${name}'...`);
        const newCollection = await databases.createCollection(
            dbId,
            'unique()', // ID único gerado automaticamente, ou poderia ser o nome se validado
            name,
            [Permission.create(Role.users()), Permission.read(Role.users()), Permission.update(Role.users()), Permission.delete(Role.users())]
        );
        console.log(`✅ Coleção '${name}' criada. ID: ${newCollection.$id}`);
        return newCollection.$id;
    } catch (e) {
        console.error(`❌ Erro ao lidar com coleção ${name}:`, e.message);
        return null;
    }
}

async function createAttributeSafely(promise, desc) {
    try {
        await promise;
        console.log(`   ✨ Atributo criado: ${desc}`);
    } catch (e) {
        if (e.code === 409) {
            console.log(`   ℹ️ Atributo já existe: ${desc}`);
        } else {
            console.error(`   ❌ Erro criar atributo ${desc}:`, e.message);
        }
    }
}

async function setup() {
    console.log('🚀 Iniciando configuração do Appwrite (Modo Idempotente)...');

    try {
        // 1. Transactions - Update with new fields
        const transactionsId = await getOrCreateCollection(DATABASE_ID, 'transactions');
        if (transactionsId) {
            await createAttributeSafely(databases.createFloatAttribute(DATABASE_ID, transactionsId, 'amount', true), 'amount');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'category', 100, true), 'category');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'description', 255, true), 'description');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'date', 20, true), 'date');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'type', 20, true), 'type');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'account', 100, false, 'Carteira'), 'account'); // Legacy field, keeping for compatibility
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'group_id', 100, false), 'group_id');
            await createAttributeSafely(databases.createBooleanAttribute(DATABASE_ID, transactionsId, 'is_recurring', false, false), 'is_recurring');
            await createAttributeSafely(databases.createBooleanAttribute(DATABASE_ID, transactionsId, 'is_paid', false, true), 'is_paid');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'user_id', 100, true), 'user_id');

            // New fields for Phase 2
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'payment_method', 50, false, 'money'), 'payment_method');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'attachment_id', 100, false), 'attachment_id');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'tags', 100, false, undefined, true), 'tags'); // Array of strings
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'splits', 2000, false), 'splits'); // JSON string for splits
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, transactionsId, 'destination_account', 100, false), 'destination_account');
        }

        // 2. Budgets
        const budgetsId = await getOrCreateCollection(DATABASE_ID, 'budgets');
        if (budgetsId) {
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, budgetsId, 'category', 100, true), 'category');
            await createAttributeSafely(databases.createFloatAttribute(DATABASE_ID, budgetsId, 'limit', true), 'limit');
            await createAttributeSafely(databases.createFloatAttribute(DATABASE_ID, budgetsId, 'spent', false, 0), 'spent');
            await createAttributeSafely(databases.createBooleanAttribute(DATABASE_ID, budgetsId, 'cumulative', false, false), 'cumulative');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, budgetsId, 'user_id', 100, true), 'user_id');
        }

        // 3. Goals
        const goalsId = await getOrCreateCollection(DATABASE_ID, 'goals');
        if (goalsId) {
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, goalsId, 'name', 100, true), 'name');
            await createAttributeSafely(databases.createFloatAttribute(DATABASE_ID, goalsId, 'targetAmount', true), 'targetAmount');
            await createAttributeSafely(databases.createFloatAttribute(DATABASE_ID, goalsId, 'currentAmount', false, 0), 'currentAmount');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, goalsId, 'deadline', 20, true), 'deadline');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, goalsId, 'user_id', 100, true), 'user_id');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, goalsId, 'icon', 10, false, '🎯'), 'icon');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, goalsId, 'status', 20, false, 'active'), 'status');
        }

        // 4. Accounts (New)
        const accountsId = await getOrCreateCollection(DATABASE_ID, 'accounts');
        if (accountsId) {
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, accountsId, 'name', 100, true), 'name');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, accountsId, 'type', 50, true), 'type'); // checking, credit_card, investment
            await createAttributeSafely(databases.createFloatAttribute(DATABASE_ID, accountsId, 'balance', false, 0), 'balance');
            await createAttributeSafely(databases.createFloatAttribute(DATABASE_ID, accountsId, 'credit_limit', false, 0), 'credit_limit');
            await createAttributeSafely(databases.createIntegerAttribute(DATABASE_ID, accountsId, 'closing_day', false), 'closing_day');
            await createAttributeSafely(databases.createIntegerAttribute(DATABASE_ID, accountsId, 'due_day', false), 'due_day');
            await createAttributeSafely(databases.createStringAttribute(DATABASE_ID, accountsId, 'user_id', 100, true), 'user_id');
        }


        console.log('\n-------------------------------------------------------');
        console.log('📝 COPIE E ATUALIZE SEU ARQUIVO .ENV:');
        console.log('-------------------------------------------------------');
        console.log(`VITE_APPWRITE_TRANSACTIONS_COLLECTION_ID=${transactionsId || ''}`);
        console.log(`VITE_APPWRITE_BUDGETS_COLLECTION_ID=${budgetsId || ''}`);
        console.log(`VITE_APPWRITE_GOALS_COLLECTION_ID=${goalsId || ''}`);
        console.log(`VITE_APPWRITE_ACCOUNTS_COLLECTION_ID=${accountsId || ''}`);
        console.log('-------------------------------------------------------');

        const ids = {
            transactionsId: transactionsId || '',
            budgetsId: budgetsId || '',
            goalsId: goalsId || '',
            accountsId: accountsId || ''
        };
        fs.writeFileSync('appwrite_ids.json', JSON.stringify(ids, null, 2));
        console.log('✅ IDs salvos em appwrite_ids.json');

    } catch (error) {
        console.error('❌ Erro GERAL:', error);
    }
}

setup();
