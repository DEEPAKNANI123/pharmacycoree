import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Medicine } from '../data/medicinesDB';
import { defaultMedicines } from '../data/medicinesDB';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface CartItem {
  medicineId: string;
  quantity: number;
  price: number;
  purchasePrice: number;
  name: string;
  category: string;
  unit: 'Box' | 'Strip' | 'Piece';
}

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'patient';
  name: string;
  password?: string;
  address?: string;
  phone?: string;
  familyMembers?: string[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  emiratesId?: string;
  rewardPoints: number;
  lastVisit: string;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  vat: number;
  total: number;
  status: 'Order Placed' | 'Processing' | 'Packed' | 'Out for Delivery' | 'Delivered';
  deliveryType: 'Instant' | 'Scheduled' | 'Pickup';
  paymentMethod: 'COD' | 'Card';
  date: string;
}

export interface RxSubmission {
  id: string;
  userId: string;
  imageUrl?: string; // Optional because e-Prescribe drafts might not have an image
  date: string;
  status: 'Reviewing' | 'Approved' | 'Rejected' | 'Processed' | 'Picked Up' | 'Returned to Stock' | 'Pending Prescriber Approval';
  rejectionReason?: string;
  associatedMedicines?: string[];
  isRefill?: boolean;
  processedAt?: string;
  pickedUpAt?: string;
  returnedToStockAt?: string;
  createdAt?: string;
  refillsAllowed?: number;
  refillsRemaining?: number;
  rxExpiryDate?: string;
  diagnosisCode?: string;
  isControlledSubstance?: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  items: CartItem[];
  subtotal: number;
  vat: number;
  total: number;
  paymentMethod: 'Cash' | 'Card';
  customerId?: string | null;
  cashierId?: string | null;
}

interface DatabaseContextType {
  inventory: Medicine[];
  transactions: Transaction[];
  users: User[];
  orders: Order[];
  rxQueue: RxSubmission[];
  currentUser: User | null;
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  isLoading: boolean;
  isOffline: boolean;
  addToCart: (medicine: Medicine, quantity: number, unit?: 'Box' | 'Strip' | 'Piece') => void;
  updateCartQuantity: (medicineId: string, delta: number, unit?: 'Box' | 'Strip' | 'Piece') => void;
  removeFromCart: (medicineId: string, unit?: 'Box' | 'Strip' | 'Piece') => void;
  clearCart: () => void;
  processSale: (cartItems: CartItem[], paymentMethod: 'Cash' | 'Card', customerId?: string) => Promise<string | null>;
  createOrder: (orderData: Omit<Order, 'id' | 'date' | 'status'>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  submitPrescription: (imageUrl: string) => Promise<void>;
  draftPrescription: (data: Partial<RxSubmission>) => void;
  requestRefill: (rxId: string) => void;
  approveManualPrescription: (imageUrl: string, medIds: string[]) => void;
  updateRxStatus: (rxId: string, status: RxSubmission['status'], reason?: string, medIds?: string[]) => Promise<void>;
  signup: (userData: Omit<User, 'id'>, password: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  resetDatabase: () => Promise<void>;
  reviewedAlerts: string[];
  markAlertAsReviewed: (id: string) => void;
  markAllAlertsAsReviewed: (ids: string[]) => void;
  updateMedicine: (id: string, updates: Partial<Medicine>) => Promise<void>;
  addMedicine: (medicine: Omit<Medicine, 'id'>) => Promise<Medicine>;
  receiveStock: (id: string, quantity: number) => Promise<void>;
  customers: Customer[];
  addCustomer: (customerData: Omit<Customer, 'id' | 'rewardPoints' | 'lastVisit'>) => Promise<Customer>;
  recordCustomerVisit: (customerId: string, spentAmount: number) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

// Sample Credentials
const SAMPLE_ADMIN = { email: 'admin@pharmacy.com', password: 'admin123' };
const SAMPLE_PATIENT = { email: 'patient@example.com', password: 'patient123' };

const defaultCustomers: Customer[] = [
  { 
    id: 'CUST-1', 
    name: 'Ahmed Al Rashid', 
    phone: '+971 50 123 4567', 
    email: 'ahmed@example.com',
    emiratesId: '784-1980-1234567-1',
    rewardPoints: 2840, 
    lastVisit: 'Today' 
  },
  { 
    id: 'CUST-2', 
    name: 'Sara Hassan', 
    phone: '+971 55 987 6543', 
    email: 'sara@example.com',
    emiratesId: '784-1992-7654321-2',
    rewardPoints: 1220, 
    lastVisit: 'Apr 7' 
  },
  { 
    id: 'CUST-3', 
    name: 'Fatima Al Zaabi', 
    phone: '+971 52 444 5566', 
    email: 'fatima@example.com',
    emiratesId: '784-1988-9998887-3',
    rewardPoints: 540, 
    lastVisit: 'Apr 5' 
  }
];

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<Medicine[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rxQueue, setRxQueue] = useState<RxSubmission[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [reviewedAlerts, setReviewedAlerts] = useState<string[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Initialize from Postgres Backend or Fallback to Sample
  useEffect(() => {
    const initData = async () => {
      console.log('🔄 DatabaseContext: Starting data initialization...');
      setIsLoading(true);
      
      try {
        // 1. Session Check
        const token = localStorage.getItem('pharma_token');
        if (token) {
           const res = await fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
           if (res.ok) {
              const profile = await res.json();
              setCurrentUser({
                id: profile.id,
                email: profile.email,
                name: profile.name,
                role: profile.role,
                address: profile.address,
                phone: profile.phone,
                familyMembers: profile.familyMembers
              });
           }
        } else {
            console.log('ℹ️ No active session.');
            const savedSampleUser = localStorage.getItem('pharma_sample_user');
            if (savedSampleUser) {
                console.log('🧪 Using saved Sample User profile.');
                setCurrentUser(JSON.parse(savedSampleUser));
                setIsOffline(true);
            }
        }

        // 2. Fetch Data from Backend
        const [medsRes, custRes, ordersRes, txRes, rxRes] = await Promise.all([
          fetch(`${API_URL}/api/medicines`),
          fetch(`${API_URL}/api/customers`),
          fetch(`${API_URL}/api/orders`),
          fetch(`${API_URL}/api/transactions`),
          fetch(`${API_URL}/api/rx`)
        ]);

        if (medsRes.ok) {
           setInventory(await medsRes.json());
           setIsOffline(false);
        } else throw new Error("Failed to fetch medicines");

        if (custRes.ok) setCustomers(await custRes.json());
        if (ordersRes.ok) setOrders(await ordersRes.json());
        if (txRes.ok) setTransactions(await txRes.json());
        if (rxRes.ok) setRxQueue(await rxRes.json());

      } catch (err: any) {
        console.error('🚨 CONNECTION FAILED - Switching to Sample/Local Mode:', err.message || err);
        setIsOffline(true);
        
        // Restore local session if backend fails
        const savedSampleUser = localStorage.getItem('pharma_sample_user');
        if (savedSampleUser) {
            console.log('🧪 Using saved Sample User profile (Offline fallback).');
            setCurrentUser(JSON.parse(savedSampleUser));
        }

        // Load default mock data
        const savedInv = localStorage.getItem('pharma_inventory');
        const finalInv = savedInv ? JSON.parse(savedInv) : defaultMedicines;
        console.log(`🏠 Loaded ${finalInv.length} medicines from local storage/defaults.`);
        setInventory(finalInv);
        
        const savedOrders = localStorage.getItem('pharma_orders');
        if (savedOrders) setOrders(JSON.parse(savedOrders));

        const savedTx = localStorage.getItem('pharma_transactions');
        if (savedTx) setTransactions(JSON.parse(savedTx));

        const savedCust = localStorage.getItem('pharma_customers');
        if (savedCust) setCustomers(JSON.parse(savedCust));
        else {
          setCustomers(defaultCustomers);
          localStorage.setItem('pharma_customers', JSON.stringify(defaultCustomers));
        }
      } finally {
        const savedReviewed = localStorage.getItem('pharma_reviewed_alerts');
        if (savedReviewed) setReviewedAlerts(JSON.parse(savedReviewed));
        
        const savedPatients = localStorage.getItem('pharma_patients');
        const savedPharmacists = localStorage.getItem('pharma_pharmacists');
        const allUsers = [
          ...(savedPatients ? JSON.parse(savedPatients) : []),
          ...(savedPharmacists ? JSON.parse(savedPharmacists) : [])
        ];
        if (allUsers.length > 0) setUsers(allUsers);
        
        setIsLoading(false);
      }
    };

    initData();
  }, []);

  // Listen for user changes to load their specific cart
  useEffect(() => {
    if (isLoading) return;
    
    const guestCartStr = localStorage.getItem('pharma_cart_guest');
    const guestCart = guestCartStr ? JSON.parse(guestCartStr) : [];
    
    if (currentUser) {
      const userCartKey = `pharma_cart_${currentUser.id}`;
      const userCartStr = localStorage.getItem(userCartKey);
      let userCart = userCartStr ? JSON.parse(userCartStr) : [];
      
      // Merge guest cart into user cart if guest added items before logging in
      if (guestCart.length > 0) {
         userCart = [...userCart, ...guestCart];
         localStorage.setItem(userCartKey, JSON.stringify(userCart));
         localStorage.removeItem('pharma_cart_guest');
      }
      setCart(userCart);
    } else {
      setCart(guestCart);
    }
  }, [currentUser, isLoading]);

  const addToCart = (medicine: Medicine, quantity: number, unit: 'Box' | 'Strip' | 'Piece' = 'Box') => {
    setCart(prev => {
      const existing = prev.find(item => item.medicineId === medicine.id && item.unit === unit);
      let updated;
      
      let price = medicine.price;
      let purchasePrice = medicine.purchasePrice;
      if (unit === 'Strip') {
        price = medicine.stripPrice || (medicine.price / (medicine.unitsPerBox || 1));
        purchasePrice = medicine.purchasePrice / (medicine.unitsPerBox || 1);
      } else if (unit === 'Piece') {
        price = medicine.piecePrice || ((medicine.stripPrice || (medicine.price / (medicine.unitsPerBox || 1))) / (medicine.piecesPerStrip || 1));
        purchasePrice = (medicine.purchasePrice / (medicine.unitsPerBox || 1)) / (medicine.piecesPerStrip || 1);
      }

      if (existing) {
        updated = prev.map(item => (item.medicineId === medicine.id && item.unit === unit) ? { ...item, quantity: item.quantity + quantity } : item);
      } else {
        updated = [...prev, {
          medicineId: medicine.id,
          quantity,
          price: price,
          purchasePrice: purchasePrice,
          name: medicine.name,
          category: medicine.category,
          unit: unit
        }];
      }
      const cartKey = currentUser ? `pharma_cart_${currentUser.id}` : 'pharma_cart_guest';
      localStorage.setItem(cartKey, JSON.stringify(updated));
      return updated;
    });
  };

  const updateCartQuantity = (medicineId: string, delta: number, unit: 'Box' | 'Strip' | 'Piece' = 'Box') => {
    setCart(prev => {
      const updated = prev.map(item => (item.medicineId === medicineId && item.unit === unit) ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item);
      const cartKey = currentUser ? `pharma_cart_${currentUser.id}` : 'pharma_cart_guest';
      localStorage.setItem(cartKey, JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromCart = (medicineId: string, unit: 'Box' | 'Strip' | 'Piece' = 'Box') => {
    setCart(prev => {
      const updated = prev.filter(item => !(item.medicineId === medicineId && item.unit === unit));
      const cartKey = currentUser ? `pharma_cart_${currentUser.id}` : 'pharma_cart_guest';
      localStorage.setItem(cartKey, JSON.stringify(updated));
      return updated;
    });
  };

  const clearCart = () => {
    setCart([]);
    const cartKey = currentUser ? `pharma_cart_${currentUser.id}` : 'pharma_cart_guest';
    localStorage.removeItem(cartKey);
  };

  const processSale = async (cartItems: CartItem[], paymentMethod: 'Cash' | 'Card', customerId?: string) => {
    if (cartItems.length === 0) return null;
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * 0.05;
    const total = subtotal + vat;
    const date = new Date().toISOString();

    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/transactions`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ items: cartItems, subtotal, vat, total, paymentMethod, customerId, cashierId: currentUser?.id })
        });
        if (res.ok) {
           const tx = await res.json();
           const medsRes = await fetch(`${API_URL}/api/medicines`);
           if (medsRes.ok) setInventory(await medsRes.json());
           return tx.id;
        }
      } catch (err) { console.error('Sale sync failed, using local only:', err); }
    }

    // Local Logic (Offline/Sample)
    const newTx: Transaction = { id: `SAMPLE-TXN-${Date.now()}`, date, items: cartItems, subtotal, vat, total, paymentMethod, customerId, cashierId: currentUser?.id };
    setTransactions(prev => {
      const updated = [newTx, ...prev];
      localStorage.setItem('pharma_transactions', JSON.stringify(updated));
      return updated;
    });
    setInventory(prev => {
      const updated = prev.map(med => {
        const cartItemsForMed = cartItems.filter(item => item.medicineId === med.id);
        if (cartItemsForMed.length === 0) return med;
        
        const uPerBox = med.unitsPerBox || 1;
        const pPerStrip = med.piecesPerStrip || 10;
        let totalPieces = (med.stock * uPerBox * pPerStrip) + ((med.stripStock || 0) * pPerStrip) + (med.pieceStock || 0);
        
        cartItemsForMed.forEach(item => {
          if (item.unit === 'Box') totalPieces -= (item.quantity * uPerBox * pPerStrip);
          else if (item.unit === 'Strip') totalPieces -= (item.quantity * pPerStrip);
          else if (item.unit === 'Piece') totalPieces -= item.quantity;
        });

        totalPieces = Math.max(0, totalPieces);
        
        const newStock = Math.floor(totalPieces / (uPerBox * pPerStrip));
        const remainingPieces = totalPieces % (uPerBox * pPerStrip);
        const newStripStock = Math.floor(remainingPieces / pPerStrip);
        const newPieceStock = remainingPieces % pPerStrip;

        return { 
          ...med, 
          stock: newStock, 
          stripStock: newStripStock,
          pieceStock: newPieceStock
        };
      });
      localStorage.setItem('pharma_inventory', JSON.stringify(updated));
      return updated;
    });
    return newTx.id;
  };

  const signup = async (userData: Omit<User, 'id'>, password: string) => {
    try {
      if (!isOffline) {
        const res = await fetch(`${API_URL}/api/auth/signup`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ ...userData, password })
        });
        
        if (!res.ok) {
           const errData = await res.json();
           throw new Error(errData.error || 'Registration failed on server');
        }
      }
    } catch (e: any) {
      if (!isOffline && e.message !== 'Failed to fetch') {
         throw e; // Throw actual backend errors (like email already exists)
      }
      console.warn("Backend sync failed during signup. Falling back to local.", e);
    }

    // Save to local storage for "real" local auth simulation
    const newUser: User = {
      ...userData,
      id: `USER-${Date.now()}`,
      password
    };
    
    // Segregate into different tables
    const tableKey = userData.role === 'patient' ? 'pharma_patients' : 'pharma_pharmacists';
    const existingStr = localStorage.getItem(tableKey);
    const existingArr = existingStr ? JSON.parse(existingStr) : [];
    const updatedArr = [...existingArr, newUser];
    localStorage.setItem(tableKey, JSON.stringify(updatedArr));
    
    setUsers(prev => [...prev, newUser]);

    // If patient, also add them to the Customer CRM database table
    if (userData.role === 'patient') {
      const newCustomer: Customer = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone || '',
        rewardPoints: 0,
        lastVisit: 'New Register'
      };
      setCustomers(prev => {
        const updated = [...prev, newCustomer];
        localStorage.setItem('pharma_customers', JSON.stringify(updated));
        return updated;
      });
    }
    
    return true;
  };

  const login = async (email: string, password: string) => {
    // 1. Try Custom Backend Auth First
    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ email, password })
        });
        
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('pharma_token', data.token);
          
          const user: User = { 
             id: data.profile.id, 
             email: data.profile.email, 
             name: data.profile.name, 
             role: data.profile.role, 
             address: data.profile.address, 
             phone: data.profile.phone, 
             familyMembers: data.profile.familyMembers 
          };
          
          setCurrentUser(user);
          localStorage.removeItem('pharma_sample_user');
          setIsOffline(false);
          return user;
        } else {
          if (res.status === 404) throw new Error('user not registered');
          if (res.status === 401) throw new Error('invalid password or username');
          throw new Error('Invalid credentials');
        }
      } catch (err: any) {
        if (err.message === 'user not registered' || err.message === 'invalid password or username') throw err;
        console.error('Backend login failed or unreachable, attempting local/sample fallback:', err);
      }
    }

    // 2. Real Local Auth Check
    const patientsStr = localStorage.getItem('pharma_patients');
    const pharmacistsStr = localStorage.getItem('pharma_pharmacists');
    
    const localUsers: User[] = [
      ...(patientsStr ? JSON.parse(patientsStr) : []),
      ...(pharmacistsStr ? JSON.parse(pharmacistsStr) : [])
    ];
    
    // 3. Sample Bypass (Local / Offline Fallback)
    if (email === SAMPLE_ADMIN.email) {
      if (password === SAMPLE_ADMIN.password) {
        const user: User = { id: 'SAMPLE-ADMIN', email: email, name: 'Sample Pharmacist', role: 'admin' };
        setCurrentUser(user);
        localStorage.setItem('pharma_sample_user', JSON.stringify(user));
        setIsOffline(true);
        return user;
      }
      throw new Error('invalid password or username');
    }
    if (email === SAMPLE_PATIENT.email) {
      if (password === SAMPLE_PATIENT.password) {
        const user: User = { id: 'SAMPLE-PATIENT', email: email, name: 'Sample Patient', role: 'patient' };
        setCurrentUser(user);
        localStorage.setItem('pharma_sample_user', JSON.stringify(user));
        setIsOffline(true);
        return user;
      }
      throw new Error('invalid password or username');
    }

    const emailMatch = localUsers.find(u => u.email === email);
    if (!emailMatch) {
      throw new Error('user not registered');
    }

    if (emailMatch.password === password) {
      setCurrentUser(emailMatch);
      localStorage.setItem('pharma_sample_user', JSON.stringify(emailMatch));
      setIsOffline(true);
      return emailMatch;
    } else {
      throw new Error('invalid password or username');
    }
  };

  const logout = async () => {
    localStorage.removeItem('pharma_token');
    setCurrentUser(null);
    localStorage.removeItem('pharma_sample_user');
    setIsOffline(false);
  };

  const createOrder = async (orderData: Omit<Order, 'id' | 'date' | 'status'>) => {
    const date = new Date().toISOString();
    if (!isOffline) {
        try {
            const res = await fetch(`${API_URL}/api/orders`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(orderData)
            });
            if (res.ok) {
               const order = await res.json();
               return order.id;
            }
        } catch (e) { console.error('Order sync failed:', e); }
    }
    const newOrder: Order = { ...orderData, id: `SAMPLE-ORD-${Date.now()}`, date, status: 'Order Placed' };
    setOrders(prev => {
        const updated = [newOrder, ...prev];
        localStorage.setItem('pharma_orders', JSON.stringify(updated));
        return updated;
    });
    return newOrder.id;
  };

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    if (!isOffline) {
       await fetch(`${API_URL}/api/orders/${orderId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status })
       });
    }
    setOrders(prev => {
        const updated = prev.map(o => o.id === orderId ? { ...o, status } : o);
        if (isOffline) localStorage.setItem('pharma_orders', JSON.stringify(updated));
        return updated;
    });
  };

  const submitPrescription = async (imageUrl: string) => {
    if (!currentUser) return;
    if (!isOffline) {
       await fetch(`${API_URL}/api/rx`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id, imageUrl, status: 'Reviewing' })
       });
    }
    const newRx: RxSubmission = { id: `SAMPLE-RX-${Date.now()}`, userId: currentUser.id, imageUrl, date: new Date().toISOString(), status: 'Reviewing' };
    setRxQueue(prev => {
        const updated = [newRx, ...prev];
        if (isOffline) localStorage.setItem('pharma_rx_submissions', JSON.stringify(updated));
        return updated;
    });
  };

  const draftPrescription = (data: Partial<RxSubmission>) => {
    const newRx: RxSubmission = {
      id: `E-RX-${Date.now()}`,
      userId: data.userId || currentUser?.id || 'admin',
      date: new Date().toISOString(),
      status: 'Approved',
      createdAt: new Date().toISOString(),
      ...data
    };
    setRxQueue(prev => {
        const updated = [newRx, ...prev];
        if (isOffline) localStorage.setItem('pharma_rx_submissions', JSON.stringify(updated));
        return updated;
    });
  };

  const requestRefill = (rxId: string) => {
    setRxQueue(prev => {
        const updated = prev.map(rx => {
          if (rx.id === rxId) {
            if (rx.isControlledSubstance || rx.refillsRemaining === 0) {
              return { ...rx, status: 'Pending Prescriber Approval' as const };
            } else {
              return { 
                ...rx, 
                refillsRemaining: (rx.refillsRemaining || 0) - 1, 
                status: 'Reviewing' as const,
                isRefill: true 
              };
            }
          }
          return rx;
        });
        if (isOffline) localStorage.setItem('pharma_rx_submissions', JSON.stringify(updated));
        return updated;
    });
  };

  const approveManualPrescription = (imageUrl: string, medIds: string[]) => {
    const newRx: RxSubmission = { 
      id: `MANUAL-RX-${Date.now()}`, 
      userId: currentUser?.id || 'admin', 
      imageUrl, 
      date: new Date().toISOString(), 
      status: 'Approved',
      associatedMedicines: medIds
    };
    setRxQueue(prev => {
        const updated = [newRx, ...prev];
        if (isOffline) localStorage.setItem('pharma_rx_submissions', JSON.stringify(updated));
        return updated;
    });
  };

  const updateRxStatus = async (rxId: string, status: RxSubmission['status'], reason?: string, medIds?: string[]) => {
    if (!isOffline) {
       await fetch(`${API_URL}/api/rx/${rxId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, rejectionReason: reason, associatedMedicines: medIds })
       });
    }
    setRxQueue(prev => {
        const updated = prev.map(rx => {
          if (rx.id === rxId) {
            const updates: Partial<RxSubmission> = { status, rejectionReason: reason, associatedMedicines: medIds };
            if (status === 'Processed') updates.processedAt = new Date().toISOString();
            else if (status === 'Picked Up') updates.pickedUpAt = new Date().toISOString();
            else if (status === 'Returned to Stock') updates.returnedToStockAt = new Date().toISOString();
            return { ...rx, ...updates };
          }
          return rx;
        });
        if (isOffline) localStorage.setItem('pharma_rx_submissions', JSON.stringify(updated));
        return updated;
    });
  };

  const resetDatabase = async () => {
    localStorage.clear();
    window.location.reload();
  };

  const markAlertAsReviewed = (id: string) => {
    setReviewedAlerts(prev => {
      const updated = [...new Set([...prev, id])];
      localStorage.setItem('pharma_reviewed_alerts', JSON.stringify(updated));
      return updated;
    });
  };

  const markAllAlertsAsReviewed = (ids: string[]) => {
    setReviewedAlerts(prev => {
      const updated = [...new Set([...prev, ...ids])];
      localStorage.setItem('pharma_reviewed_alerts', JSON.stringify(updated));
      return updated;
    });
  };

  const updateMedicine = async (id: string, updates: Partial<Medicine>) => {
    if (!isOffline) {
      try {
        await fetch(`${API_URL}/api/medicines/${id}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(updates)
        });
      } catch (err) {
        console.error('Failed to sync medicine update to API:', err);
      }
    }

    setInventory(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, ...updates } : m);
      localStorage.setItem('pharma_inventory', JSON.stringify(updated));
      return updated;
    });
  };

  const addMedicine = async (medicine: Omit<Medicine, 'id'>) => {
    const id = `MED-${Math.floor(10000 + Math.random() * 90000)}`;
    const newMed: Medicine = { ...medicine, id };

    if (!isOffline) {
      try {
        await fetch(`${API_URL}/api/medicines`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(newMed)
        });
      } catch (err) {
        console.error('Failed to sync new medicine to API:', err);
      }
    }

    setInventory(prev => {
      const updated = [...prev, newMed].sort((a,b) => a.name.localeCompare(b.name));
      localStorage.setItem('pharma_inventory', JSON.stringify(updated));
      return updated;
    });
    return newMed;
  };

  const receiveStock = async (id: string, quantity: number) => {
    const med = inventory.find(m => m.id === id);
    if (!med) return;

    const newStock = med.stock + quantity;
    
    if (!isOffline) {
      try {
        await fetch(`${API_URL}/api/medicines/${id}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ stock: newStock })
        });
      } catch (err) {
        console.error('Failed to sync stock receipt to API:', err);
      }
    }

    setInventory(prev => {
        const updated = prev.map(m => m.id === id ? { ...m, stock: newStock } : m);
        localStorage.setItem('pharma_inventory', JSON.stringify(updated));
        return updated;
    });

    console.log(`[AUDIT LOG] Received ${quantity} units of ${med.name}. New total: ${newStock}`);
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'rewardPoints' | 'lastVisit'>) => {
    const id = `CUST-${Math.floor(10000 + Math.random() * 90000)}`;
    const newCustomer: Customer = {
      ...customerData,
      id,
      rewardPoints: 10,
      lastVisit: new Date().toLocaleDateString('en-GB')
    };

    if (!isOffline) {
      try {
        const res = await fetch(`${API_URL}/api/customers`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(newCustomer)
        });
        if (!res.ok) throw new Error(`API returned ${res.status}`);
      } catch (err) {
        console.error('Failed to sync new customer to API:', err);
        throw new Error('Failed to save customer to database.');
      }
    }

    setCustomers(prev => {
      const updated = [...prev, newCustomer];
      localStorage.setItem('pharma_customers', JSON.stringify(updated));
      return updated;
    });

    return newCustomer;
  };

  const recordCustomerVisit = async (customerId: string, spentAmount: number) => {
    const pointsEarned = Math.floor(spentAmount * 0.1);
    const today = new Date().toLocaleDateString('en-GB');

    if (!isOffline) {
      try {
        const cust = customers.find(c => c.id === customerId);
        if (cust) {
           await fetch(`${API_URL}/api/customers/${customerId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lastVisit: today, rewardPoints: cust.rewardPoints + pointsEarned })
           });
        }
      } catch (err) {
        console.error('Failed to sync customer visit to API:', err);
      }
    }

    setCustomers(prev => {
      const updated = prev.map(c => c.id === customerId ? {
        ...c,
        lastVisit: today,
        rewardPoints: c.rewardPoints + pointsEarned
      } : c);
      localStorage.setItem('pharma_customers', JSON.stringify(updated));
      return updated;
    });
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    if (!isOffline) {
      try {
        await fetch(`${API_URL}/api/customers/${id}`, {
           method: 'PUT',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(updates)
        });
      } catch (err) {
        console.error('Failed to sync customer update to API:', err);
      }
    }

    setCustomers(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      localStorage.setItem('pharma_customers', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <DatabaseContext.Provider value={{ inventory, transactions, users, orders, rxQueue, currentUser, cart, isCartOpen, setIsCartOpen, isLoading, isOffline, addToCart, updateCartQuantity, removeFromCart, clearCart, processSale, createOrder, updateOrderStatus, submitPrescription, draftPrescription, requestRefill, approveManualPrescription, updateRxStatus, signup, login, logout, resetDatabase, reviewedAlerts, markAlertAsReviewed, markAllAlertsAsReviewed, updateMedicine, addMedicine, receiveStock, customers, addCustomer, recordCustomerVisit, updateCustomer }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (context === undefined) throw new Error('useDatabase must be used within a DatabaseProvider');
  return context;
}
