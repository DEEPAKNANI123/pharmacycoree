import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch'; // Requires node-fetch or native fetch in Node 18+

const prisma = new PrismaClient();

const SUPABASE_URL = 'https://uuisyaeopokefuuhdwjv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aXN5YWVvcG9rZWZ1dWhkd2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2ODczMDAsImV4cCI6MjA5MjI2MzMwMH0.SiLX_NkUyu8qd_PZ_aft4257H9XKgUDM1QUo0QGhAs0';

async function fetchFromSupabase(table: string) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(`Failed to fetch ${table}`);
    return res.json();
}

async function migrate() {
    console.log('🚀 Starting Data Migration from Supabase to Local PostgreSQL...');

    try {
        // 1. Migrate Profiles
        console.log('Fetching Profiles...');
        const profiles: any = await fetchFromSupabase('profiles');
        for (const p of profiles) {
            await prisma.profile.upsert({
                where: { email: p.email },
                update: {},
                create: {
                    id: p.id,
                    email: p.email,
                    name: p.name,
                    role: p.role,
                    address: p.address,
                    phone: p.phone,
                    familyMembers: p.family_members || []
                }
            });
        }
        console.log(`✅ Migrated ${profiles.length} Profiles`);

        // 2. Migrate Medicines
        console.log('Fetching Medicines...');
        const medicines: any = await fetchFromSupabase('medicines');
        for (const m of medicines) {
            await prisma.medicine.upsert({
                where: { id: m.id },
                update: {},
                create: {
                    id: m.id,
                    name: m.name,
                    sku: m.sku,
                    stripSku: m.strip_sku,
                    category: m.category,
                    batch: m.batch,
                    expiryDate: m.expiry_date,
                    price: m.price,
                    stripPrice: m.strip_price,
                    purchasePrice: m.purchase_price,
                    stock: m.stock,
                    stripStock: m.strip_stock,
                    pieceStock: m.piece_stock,
                    unitsPerBox: m.units_per_box,
                    piecesPerStrip: m.pieces_per_strip,
                    piecePrice: m.piece_price,
                    reorderPoint: m.reorder_point,
                    storage: m.storage,
                    isPerishable: m.is_perishable
                }
            });
        }
        console.log(`✅ Migrated ${medicines.length} Medicines`);

        // 3. Migrate Customers
        console.log('Fetching Customers...');
        const customers: any = await fetchFromSupabase('customers');
        for (const c of customers) {
            await prisma.customer.upsert({
                where: { id: c.id },
                update: {},
                create: {
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    email: c.email,
                    emiratesId: c.emirates_id,
                    rewardPoints: c.reward_points,
                    lastVisit: c.last_visit
                }
            });
        }
        console.log(`✅ Migrated ${customers.length} Customers`);

        // Note: Transactions and Orders can be added here similarly if needed, 
        // but often historical sales data is left out of dev migrations to avoid relational foreign key conflicts on missing items.

        console.log('🎉 Migration Completed Successfully!');
    } catch (error) {
        console.error('❌ Migration Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

migrate();
