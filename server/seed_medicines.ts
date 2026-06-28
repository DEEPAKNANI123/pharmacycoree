import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const medicinesToSeed = [
  // Syringes
  {
    name: 'Insulin Syringe 1ml 30G',
    sku: 'SYR-INS-001',
    category: 'Medical Device',
    price: 15.0,
    purchasePrice: 8.0,
    stock: 500,
    unitsPerBox: 100,
  },
  {
    name: 'Disposable Syringe 3ml with Needle',
    sku: 'SYR-DIS-003',
    category: 'Medical Device',
    price: 10.0,
    purchasePrice: 4.5,
    stock: 1000,
    unitsPerBox: 100,
  },
  {
    name: 'Disposable Syringe 5ml',
    sku: 'SYR-DIS-005',
    category: 'Medical Device',
    price: 12.0,
    purchasePrice: 5.0,
    stock: 800,
    unitsPerBox: 100,
  },
  {
    name: 'Disposable Syringe 10ml',
    sku: 'SYR-DIS-010',
    category: 'Medical Device',
    price: 18.0,
    purchasePrice: 9.0,
    stock: 600,
    unitsPerBox: 50,
  },
  // Tonics
  {
    name: 'Iron & Vitamin Tonic 200ml',
    sku: 'TON-IRV-200',
    category: 'Supplement',
    price: 45.0,
    purchasePrice: 20.0,
    stock: 150,
  },
  {
    name: 'Calcium + D3 Liquid Tonic 250ml',
    sku: 'TON-CAL-250',
    category: 'Supplement',
    price: 55.0,
    purchasePrice: 25.0,
    stock: 120,
  },
  {
    name: 'Multivitamin Syrup for Kids 150ml',
    sku: 'TON-MV-150',
    category: 'Supplement',
    price: 35.0,
    purchasePrice: 15.0,
    stock: 200,
  },
  // Other Medical Items
  {
    name: 'Digital Thermometer',
    sku: 'MED-THR-DIG',
    category: 'Medical Device',
    price: 25.0,
    purchasePrice: 12.0,
    stock: 80,
  },
  {
    name: 'Cotton Rolls 500g',
    sku: 'MED-COT-500',
    category: 'First Aid',
    price: 20.0,
    purchasePrice: 8.0,
    stock: 300,
  },
  {
    name: 'Sterile Gauze Pads 10x10cm',
    sku: 'MED-GAU-10X10',
    category: 'First Aid',
    price: 15.0,
    purchasePrice: 5.0,
    stock: 400,
  },
  {
    name: 'Surgical Tape 1-inch',
    sku: 'MED-TAP-1IN',
    category: 'First Aid',
    price: 8.0,
    purchasePrice: 3.0,
    stock: 500,
  },
  {
    name: 'Alcohol Swabs 100s',
    sku: 'MED-ALC-100',
    category: 'First Aid',
    price: 12.0,
    purchasePrice: 5.0,
    stock: 600,
  },
  {
    name: 'Band-Aid Plasters 100s',
    sku: 'MED-BND-100',
    category: 'First Aid',
    price: 25.0,
    purchasePrice: 10.0,
    stock: 400,
  },
  {
    name: 'Paracetamol 500mg Tablets',
    sku: 'MED-PAR-500',
    category: 'Pain Relief',
    price: 15.0,
    purchasePrice: 5.0,
    stock: 1000,
    piecesPerStrip: 10,
  },
  {
    name: 'Ibuprofen 400mg Tablets',
    sku: 'MED-IBU-400',
    category: 'Pain Relief',
    price: 20.0,
    purchasePrice: 8.0,
    stock: 800,
    piecesPerStrip: 10,
  },
  {
    name: 'Amoxicillin 500mg Capsules',
    sku: 'MED-AMX-500',
    category: 'Antibiotics',
    price: 45.0,
    purchasePrice: 20.0,
    stock: 500,
    piecesPerStrip: 10,
  },
  {
    name: 'Saline Solution 500ml',
    sku: 'MED-SAL-500',
    category: 'Fluid Therapy',
    price: 10.0,
    purchasePrice: 4.0,
    stock: 300,
  },
  {
    name: 'Blood Pressure Monitor',
    sku: 'MED-BPM-001',
    category: 'Medical Device',
    price: 150.0,
    purchasePrice: 80.0,
    stock: 50,
  },
  {
    name: 'Pulse Oximeter',
    sku: 'MED-POX-001',
    category: 'Medical Device',
    price: 85.0,
    purchasePrice: 40.0,
    stock: 100,
  }
];

async function main() {
  console.log('Seeding medicines to the database...');
  for (const med of medicinesToSeed) {
    // Check if it already exists based on sku
    const exists = await prisma.medicine.findFirst({
      where: { sku: med.sku }
    });
    
    if (!exists) {
      await prisma.medicine.create({
        data: med
      });
      console.log(`Created: ${med.name}`);
    } else {
      console.log(`Already exists: ${med.name}`);
    }
  }
  console.log('Seeding complete!');
}

main()
  .catch(e => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
