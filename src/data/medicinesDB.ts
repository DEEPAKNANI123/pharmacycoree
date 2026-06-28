export type MedicineCategory = 'Prescription (Rx)' | 'OTC' | 'Cold Chain' | 'Controlled';
export type StorageType = 'Room temp' | 'Cold' | 'Controlled';

export interface Medicine {
  id: string;
  name: string;
  sku: string; // Box Barcode
  stripSku?: string; // Strip Barcode
  category: MedicineCategory;
  batch: string;
  expiryDate: string; // YYYY-MM-DD
  price: number; // Box Price
  stripPrice?: number; // Strip Price
  purchasePrice: number;
  stock: number; // Total boxes
  stripStock: number; // Loose strips (not in boxes)
  unitsPerBox: number; // Conversion factor (Strips per Box)
  pieceStock?: number; // Loose pieces/tablets
  piecesPerStrip?: number; // Pieces per Strip
  piecePrice?: number; // Price per Piece
  reorderPoint: number;
  storage: StorageType;
  isPerishable: boolean;
}

const names = ["Amoxicillin", "Paracetamol", "Insulin Glargine", "Ibuprofen", "Metformin", "Vitamin D3", "Tramadol", "Omeprazole", "Amlodipine", "Lisinopril", "Losartan", "Atorvastatin", "Simvastatin", "Levothyroxine", "Azithromycin", "Ciprofloxacin", "Augmentin", "Cefalexin", "Doxycycline", "Cetirizine", "Loratadine", "Diphenhydramine", "Fluoxetine", "Sertraline", "Escitalopram", "Citalopram", "Alprazolam", "Clonazepam", "Lorazepam", "Diazepam", "Gabapentin", "Pregabalin", "Montelukast", "Albuterol", "Fluticasone", "Budesonide", "Salmeterol", "Pantoprazole", "Lansoprazole", "Esomeprazole", "Ranitidine", "Famotidine", "Ondansetron", "Metoclopramide", "Hydrochlorothiazide", "Furosemide", "Spironolactone", "Carvedilol", "Metoprolol", "Atenolol"];

const dosages = ["500mg", "200mg", "50mg", "850mg", "1000IU", "20mg", "5mg", "10mg", "40mg", "100mcg", "250mg", "100mg", "25mg", "15mg"];

export const generateMockMedicines = (): Medicine[] => {
  const medicines: Medicine[] = [];
  const today = new Date();
  
  for (let i = 0; i < 50; i++) {
    const baseName = names[i % names.length];
    const name = `${baseName} ${dosages[i % dosages.length]}`;
    
    let category: MedicineCategory = 'Prescription (Rx)';
    let storage: StorageType = 'Room temp';
    
    if (name.includes("Vitamin") || name.includes("Paracetamol") || name.includes("Ibuprofen") || name.includes("Cetirizine") || name.includes("Loratadine") || name.includes("Omeprazole") || name.includes("Ranitidine") || name.includes("Famotidine")) {
      category = 'OTC';
    } else if (name.includes("Insulin") || name.includes("Budesonide")) {
      category = 'Cold Chain';
      storage = 'Cold';
    } else if (name.includes("Tramadol") || name.includes("Alprazolam") || name.includes("Clonazepam") || name.includes("Diazepam") || name.includes("Lorazepam") || name.includes("Pregabalin")) {
      category = 'Controlled';
      storage = 'Controlled';
    }

    const expDate = new Date();
    // Higher chance to be expiring within 7 days or already expired
    const rand = Math.random();
    if (rand < 0.05) {
      // Already expired
      expDate.setDate(today.getDate() - Math.floor(Math.random() * 30 + 1));
    } else if (rand < 0.15) {
      // Expiring within 7 days
      expDate.setDate(today.getDate() + Math.floor(Math.random() * 7));
    } else {
      expDate.setFullYear(today.getFullYear() + Math.floor(Math.random() * 3) + 1);
      expDate.setMonth(Math.floor(Math.random() * 12));
      expDate.setDate(Math.floor(Math.random() * 28) + 1);
    }
    const isoExpiry = expDate.toISOString().split('T')[0];

    let stock = Math.floor(Math.random() * 300) + 10;
    const reorderPoint = Math.floor(Math.random() * 50) + 10;
    
    // 15% chance to be in Low or Critical stock
    const stockRand = Math.random();
    if (stockRand < 0.05) {
      stock = Math.floor(Math.random() * 3); // Critical (< 3)
    } else if (stockRand < 0.15) {
      stock = Math.floor(Math.random() * 7) + 3; // Low (3-9)
    }

    const price = parseFloat(((Math.random() * 50) + 5).toFixed(2));
    const purchasePrice = parseFloat((price * (0.6 + Math.random() * 0.2)).toFixed(2));

    medicines.push({
      id: `MED-${1000 + i}`,
      name,
      sku: `SKU-${1000 + i}`,
      stripSku: `STRIP-${1000 + i}`,
      category,
      batch: `B-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      expiryDate: isoExpiry,
      price,
      stripPrice: parseFloat((price / 10).toFixed(2)),
      purchasePrice,
      stock,
      stripStock: Math.floor(Math.random() * 10),
      unitsPerBox: 10,
      pieceStock: Math.floor(Math.random() * 10),
      piecesPerStrip: 10,
      piecePrice: parseFloat((price / 100).toFixed(2)),
      reorderPoint,
      storage,
      isPerishable: storage === 'Cold' || name.includes("Insulin") || Math.random() < 0.1
    });
  }
  
  return medicines;
};

export const defaultMedicines = generateMockMedicines();
