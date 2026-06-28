import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

const prisma = new PrismaClient();
const app = express();

app.use(helmet());

// General rate limiter for all API requests
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

// --- GLOBAL BACKEND LOGGER & TRACING ---
// This middleware logs EVERY single request that hits the backend and assigns a Trace ID
app.use((req: any, res, next) => {
  const start = Date.now();
  req.traceId = uuidv4();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[TraceID: ${req.traceId}] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// --- WEBHOOK HELPER ---
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'http://localhost:5678/webhook';

async function fireWebhook(endpoint: string, payload: any) {
  try {
    const url = `${N8N_WEBHOOK_BASE}/${endpoint}`;
    console.log(`[n8n] Firing webhook: ${url}`);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(e => console.error(`[n8n] Webhook send error (${endpoint}):`, e.message));
  } catch (error) {
    console.error(`[n8n] Error triggering webhook ${endpoint}:`, error);
  }
}

async function createAuditLog(userId: string | null, action: string, details: string, traceId?: string) {
  try {
    const parsedDetails = JSON.parse(details);
    if (traceId) parsedDetails.traceId = traceId;
    const finalDetails = JSON.stringify(parsedDetails);

    await prisma.auditLog.create({
      data: { userId, action, details: finalDetails }
    });
  } catch (error) {
    // If details is not valid JSON, fallback to appending traceId
    try {
        await prisma.auditLog.create({
            data: { userId, action, details: traceId ? `${details} | traceId: ${traceId}` : details }
        });
    } catch (e) {
        console.error('[AuditLog] Error creating log:', e);
    }
  }
}

// --- UTILS & SCRAPER ---
app.post('/api/parse-qr-url', async (req: any, res: any) => {
  try {
    const { url } = req.body;
    if (!url || !url.startsWith('http')) return res.status(400).json({ error: 'Invalid URL' });

    console.log(`[SCRAPER] Fetching URL dynamically with Puppeteer: ${url}`);
    
    // Launch a headless browser
    const browser = await puppeteer.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    const page = await browser.newPage();
    // Go to URL and wait until there are no network connections for at least 500ms
    // This allows the React SPA to finish rendering its content
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 }).catch(e => console.log('Navigation timeout/error, continuing anyway:', e));
    
    // Get the fully rendered HTML
    const html = await page.content();
    await browser.close();

    const $ = cheerio.load(html);

    // Extract all text chunks from leaf nodes
    const textBlocks: string[] = [];
    $('*').each((i, el) => {
      if ($(el).children().length === 0) {
        const text = $(el).text().trim();
        if (text) textBlocks.push(text);
      }
    });

    let name = '';
    let batch = '';
    let sku = '';
    
    // We iterate backwards to catch values that might be below the label
    for (let i = 0; i < textBlocks.length; i++) {
      const txt = textBlocks[i].toLowerCase();
      // Brand Name
      if (txt.includes('brand name') || txt.includes('proper and generic name')) {
        name = textBlocks[i + 1] || textBlocks[i].split(':')[1] || name;
      }
      // Batch
      if (txt.includes('batch number') || txt.includes('batch no')) {
        batch = textBlocks[i + 1] || textBlocks[i].split(':')[1] || batch;
      }
      // SKU / Code
      if (txt.includes('identification code') || txt.includes('gtin')) {
        sku = textBlocks[i + 1] || textBlocks[i].split(':')[1] || sku;
      }
    }

    // Fallback cleanup
    if (name) name = name.replace(/Brand Name:|Proper and Generic name.*/i, '').trim();
    if (batch) batch = batch.replace(/Batch number:|Batch No./i, '').trim();
    if (sku) sku = sku.replace(/Unique product identification code:|GTIN/i, '').trim();

    // If we still don't have a SKU, try extracting it from the URL
    if (!sku) {
       const parts = url.split('/');
       sku = parts[parts.length - 1] || parts[parts.length - 2];
    }

    console.log(`[SCRAPER] Extracted - Name: ${name}, Batch: ${batch}, SKU: ${sku}`);
    res.json({ name, batch, sku });
  } catch (error) {
    console.error('[SCRAPER] Error parsing QR URL:', error);
    res.status(500).json({ error: 'Failed to parse URL' });
  }
});

// --- AUTH ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
  console.log("Signup Request Body:", req.body);
  try {
    const { email, password, name, role, phone, address } = req.body;
    const existing = await prisma.profile.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });
    
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    // In a real app we'd hash the password, but since it's an MVP let's store it simply or rely on mock auth
    const profile = await prisma.profile.create({
      data: { email, name, role: role || 'patient', phone, address, password: hashedPassword }
    });
    
    const token = jwt.sign({ userId: profile.id, role: profile.role }, JWT_SECRET);
    res.json({ token, profile });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login rate limiter: max 5 attempts per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/auth/login', loginLimiter, async (req: any, res: any) => {
  console.log("Login Request Body:", req.body);
  const { email, password } = req.body;
  try {
    const profile = await prisma.profile.findUnique({ where: { email } });
    if (!profile) return res.status(404).json({ error: 'User not registered' });
    
    if (!profile.password) {
       return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = await bcrypt.compare(password, profile.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign({ userId: profile.id, role: profile.role }, JWT_SECRET);
    await createAuditLog(profile.id, 'LOGIN', JSON.stringify({ email: profile.email }), req.traceId);
    res.json({ token, profile });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const profile = await prisma.profile.findUnique({ where: { id: decoded.userId } });
    res.json(profile);
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// --- MEDICINE ROUTES ---
app.get('/api/medicines', async (req, res) => {
  const meds = await prisma.medicine.findMany({ orderBy: { name: 'asc' } });
  res.json(meds);
});

app.post('/api/medicines', async (req, res) => {
  const med = await prisma.medicine.create({ data: req.body });
  res.json(med);
});

app.put('/api/medicines/:id', async (req, res) => {
  const med = await prisma.medicine.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(med);
});

// --- CUSTOMER ROUTES ---
app.get('/api/customers', async (req, res) => {
  const custs = await prisma.customer.findMany();
  res.json(custs);
});

app.post('/api/customers', async (req, res) => {
  console.log("Received POST /api/customers request with body:", req.body);
  try {
    const cust = await prisma.customer.create({ data: req.body });
    res.json(cust);
  } catch (error) {
    console.error("Error creating customer in DB:", error, "Request body:", req.body);
    res.status(500).json({ error: "Failed to create customer" });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  const cust = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body
  });
  res.json(cust);
});

// --- ORDER ROUTES ---
app.get('/api/orders', async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(orders);
});

app.post('/api/orders', async (req: any, res: any) => {
  try {
    const { items, ...orderData } = req.body;
    
    // Remove fields not in Prisma schema (like category, unit)
    const cleanItems = items.map((i: any) => ({
      medicineId: i.medicineId,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      purchasePrice: i.purchasePrice
    }));

    const order = await prisma.order.create({
      data: {
        ...orderData,
        items: { create: cleanItems }
      },
      include: { items: true }
    } as any);
    res.json(order);
  } catch (error: any) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: "Failed to create order" });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
    include: { items: true, user: true }
  } as any);

  // Phase 4: Customer Loyalty & Refills Webhook
  if (req.body.status === 'Delivered') {
      fireWebhook('customer-loyalty', {
          orderId: order.id,
          userId: order.userId,
          userEmail: (order as any).user?.email,
          totalAmount: order.total,
          items: (order as any).items.map((i: any) => i.name)
      });
  }

  res.json(order);
});

// --- TRANSACTION ROUTES ---
app.get('/api/transactions', async (req, res) => {
  const tx = await prisma.transaction.findMany({
    include: { items: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(tx);
});

app.post('/api/transactions', async (req: any, res: any) => {
  const { items, customerId, cashierId, ...txData } = req.body;
  
  // Create transaction
  const tx = await prisma.transaction.create({
    data: {
      ...txData,
      customerId,
      cashierId,
      items: { create: items }
    },
    include: { items: true }
  } as any);

  const controlledItems: any[] = [];

  // Deduct inventory
  for (const item of items) {
     const med = await prisma.medicine.findUnique({ where: { id: item.medicineId } });
     if (med) {
         // simplified logic for MVP, assuming box unit
         const newStock = Math.max(0, med.stock - item.quantity);
         await prisma.medicine.update({
             where: { id: med.id },
             data: { stock: newStock }
         });

         // Phase 1: Inventory Webhook Trigger
         if (med.reorderPoint !== null && newStock <= med.reorderPoint) {
            fireWebhook('inventory-alert', {
                medicineId: med.id,
                medicineName: med.name,
                currentStock: newStock,
                reorderPoint: med.reorderPoint,
                category: med.category
            });
         }

         // Phase 2: Collect controlled items for MOHAP
         if (med.category === 'Controlled') {
             controlledItems.push({ medicineName: med.name, quantity: item.quantity });
         }
     }
  }

  // Phase 2: MOHAP Compliance Webhook
  if (controlledItems.length > 0) {
      fireWebhook('mohap-compliance', {
          transactionId: tx.id,
          date: tx.createdAt,
          items: controlledItems
      });
  }

  await createAuditLog(cashierId || null, 'PROCESS_SALE', JSON.stringify({ transactionId: tx.id, total: tx.total, itemsCount: items.length, customerId }), req.traceId);
  res.json(tx);
});

// --- RX SUBMISSIONS ---
app.get('/api/rx', async (req, res) => {
  const rx = await prisma.rxSubmission.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(rx);
});

app.post('/api/rx', async (req, res) => {
  try {
    const rx = await prisma.rxSubmission.create({ data: req.body });
    
    // Fetch profile info to supply n8n with contact details
    let profile = null;
    if (rx.userId) {
      profile = await prisma.profile.findUnique({ where: { id: rx.userId } });
    }
    
    fireWebhook('prescription-auto-process', {
      rxId: rx.id,
      userId: rx.userId,
      userEmail: profile?.email || '',
      userName: profile?.name || 'Valued Customer',
      userPhone: profile?.phone || '',
      imageUrl: rx.imageUrl,
      createdAt: rx.createdAt
    });
    
    res.json(rx);
  } catch (error: any) {
    console.error("Error creating Rx submission:", error);
    res.status(500).json({ error: "Failed to submit prescription" });
  }
});

app.put('/api/rx/:id/status', async (req: any, res: any) => {
  const status = req.body.status;
  
  // Set timestamps based on status
  const updateData: any = { status };
  if (req.body.rejectionReason) updateData.rejectionReason = req.body.rejectionReason;
  if (req.body.associatedMedicines) updateData.associatedMedicines = req.body.associatedMedicines;
  
  if (status === 'Processed') {
    updateData.processedAt = new Date();
  } else if (status === 'Picked Up') {
    updateData.pickedUpAt = new Date();
  } else if (status === 'Returned to Stock') {
    updateData.returnedToStockAt = new Date();
  }

  const rx = await prisma.rxSubmission.update({
    where: { id: req.params.id },
    data: updateData,
    include: { user: true }
  } as any);

  // Webhooks
  if (status === 'Approved' || status === 'Processed') {
     await createAuditLog(null, `RX_${status.toUpperCase()}`, JSON.stringify({ rxId: rx.id, patientEmail: (rx as any).user?.email }), req.traceId);
     // Phase 2: MOHAP for Controlled Rx
     if (rx.associatedMedicines && rx.associatedMedicines.length > 0) {
         const meds = await prisma.medicine.findMany({ where: { id: { in: rx.associatedMedicines } } });
         const controlled = meds.filter(m => m.category === 'Controlled');
         if (controlled.length > 0) {
             fireWebhook('mohap-compliance', { rxId: rx.id, patientEmail: (rx as any).user?.email, items: controlled.map((m: any) => m.name) });
         }
     }
  } else if (status === 'Rejected' && req.body.rejectionReason) {
     await createAuditLog(null, 'RX_REJECTED', JSON.stringify({ rxId: rx.id, reason: req.body.rejectionReason }), req.traceId);
     // Phase 3: Rx Mismatch Alert
     fireWebhook('rx-mismatch', { rxId: rx.id, patientEmail: (rx as any).user?.email, reason: req.body.rejectionReason });
  }

  res.json(rx);
});

// --- AUDIT LOGS ---
app.get('/api/logs', async (req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(logs);
});

async function seedDefaultProfiles() {
  try {
    const adminEmail = 'admin@pharmacy.com';
    const patientEmail = 'patient@example.com';
    const adminHashed = await bcrypt.hash('admin123', 10);
    const patientHashed = await bcrypt.hash('patient123', 10);
    
    await prisma.profile.upsert({
      where: { email: adminEmail },
      update: { password: adminHashed },
      create: {
        email: adminEmail,
        name: 'Sample Pharmacist',
        role: 'admin',
        password: adminHashed
      }
    });
    
    await prisma.profile.upsert({
      where: { email: patientEmail },
      update: { password: patientHashed },
      create: {
        email: patientEmail,
        name: 'Sample Patient',
        role: 'patient',
        password: patientHashed
      }
    });
    console.log('✅ Default profiles seeded/verified in DB.');
  } catch (error) {
    console.error('❌ Failed to seed default profiles:', error);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  await seedDefaultProfiles();
});
