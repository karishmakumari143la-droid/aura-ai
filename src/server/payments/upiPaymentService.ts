import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UPIOrder, UPIOrderStatus, UPIConfig } from '../../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const UPI_ORDERS_FILE = path.join(DATA_DIR, 'upi-orders.json');

// In-memory cache of orders keyed by orderId
const ordersById = new Map<string, UPIOrder>();

function ensureStorageDir(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('[UPI] Could not create data directory:', err);
  }
}

function loadOrders(): void {
  try {
    ensureStorageDir();
    if (fs.existsSync(UPI_ORDERS_FILE)) {
      const raw = fs.readFileSync(UPI_ORDERS_FILE, 'utf-8');
      const list: UPIOrder[] = JSON.parse(raw);
      ordersById.clear();
      for (const ord of list) {
        ordersById.set(ord.orderId, ord);
      }
      console.log(`[UPI] Loaded ${ordersById.size} UPI orders from disk.`);
    }
  } catch (err) {
    console.error('[UPI] Error loading orders from disk:', err);
  }
}

function saveOrders(): void {
  try {
    ensureStorageDir();
    const list = Array.from(ordersById.values());
    fs.writeFileSync(UPI_ORDERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('[UPI] Error saving orders to disk:', err);
  }
}

// Initial load
loadOrders();

/**
 * Return current server UPI Configuration.
 * Defaults to '9818691915@pytes' if not specified in env.
 */
export function getUPIConfig(): UPIConfig {
  const upiId = (process.env.UPI_ID || '9818691915@pytes').trim();
  const payeeName = (process.env.UPI_PAYEE_NAME || 'AURA AI').trim();

  return {
    upiId,
    payeeName,
    enabled: true,
    gatewayFree: true, // Direct P2P/P2M - Zero 3rd party gateway
    supportedApps: [
      'Google Pay',
      'PhonePe',
      'Paytm',
      'BHIM UPI',
      'CRED',
      'Amazon Pay',
      'Navi',
      'Any UPI App'
    ]
  };
}

/**
 * Generate standard NPCI compliant UPI payment URI.
 * Format: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>&tr=<ref>
 */
export function generateUPIUri(params: {
  vpa: string;
  payeeName: string;
  amount: number;
  txnRef: string;
  note: string;
}): string {
  const { vpa, payeeName, amount, txnRef, note } = params;
  const url = new URL('upi://pay');
  url.searchParams.set('pa', vpa);
  url.searchParams.set('pn', payeeName);
  url.searchParams.set('am', amount.toFixed(2));
  url.searchParams.set('cu', 'INR');
  url.searchParams.set('tn', note);
  url.searchParams.set('tr', txnRef);
  return url.toString();
}

/**
 * Generate high-resolution QR code data URL from UPI URI.
 */
export async function generateUPIQRCode(upiUri: string): Promise<string> {
  return QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#020617', // slate-950
      light: '#ffffff'
    }
  });
}

/**
 * Create a new UPI Order for a customer.
 */
export async function createUPIOrder(params: {
  userId: string;
  userEmail: string;
  userName?: string;
  planId: string;
  planName: string;
  amount: number;
}): Promise<UPIOrder> {
  const config = getUPIConfig();
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const orderId = `AURA-ORD-${timestamp}-${randomSuffix}`;
  const txnRef = `AURATXN${timestamp.toString().slice(-6)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

  const note = `AURA AI ${params.planName} - ${orderId}`;
  const upiUri = generateUPIUri({
    vpa: config.upiId,
    payeeName: config.payeeName,
    amount: params.amount,
    txnRef,
    note
  });

  const qrDataUrl = await generateUPIQRCode(upiUri);

  const newOrder: UPIOrder = {
    orderId,
    txnRef,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName,
    amount: params.amount,
    currency: 'INR',
    planId: params.planId,
    planName: params.planName,
    payeeVpa: config.upiId,
    payeeName: config.payeeName,
    upiUri,
    qrDataUrl,
    status: 'CREATED',
    createdAt: new Date().toISOString()
  };

  ordersById.set(orderId, newOrder);
  saveOrders();
  console.log(`[UPI] Created order ${orderId} for ₹${params.amount} by ${params.userEmail}`);

  return newOrder;
}

/**
 * Submit customer's 12-digit UPI UTR / Transaction Reference Number.
 * Validates format and checks for duplicates.
 * Changes status strictly to PENDING_VERIFICATION (never auto-success!).
 */
export function submitOrderUTR(orderId: string, utr: string, userId: string): {
  success: boolean;
  order?: UPIOrder;
  error?: string;
} {
  const order = ordersById.get(orderId);
  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  if (order.userId !== userId) {
    return { success: false, error: 'Unauthorized to modify this order' };
  }

  const cleanUtr = utr.trim().replace(/\s+/g, '');

  // NPCI UTR / RRN is standardized as a 12-digit number
  if (!/^\d{12}$/.test(cleanUtr)) {
    return {
      success: false,
      error: 'Invalid UTR format. Indian UPI Reference / UTR must be exactly 12 numeric digits.'
    };
  }

  // Check for duplicate UTR usage across other verified or pending orders
  for (const [otherId, otherOrd] of ordersById.entries()) {
    if (
      otherId !== orderId &&
      otherOrd.customerUtr === cleanUtr &&
      (otherOrd.status === 'VERIFIED' || otherOrd.status === 'PENDING_VERIFICATION')
    ) {
      return {
        success: false,
        error: 'This UPI UTR reference has already been submitted for another order. Each payment requires a unique reference.'
      };
    }
  }

  order.customerUtr = cleanUtr;
  order.utrSubmittedAt = new Date().toISOString();
  order.status = 'PENDING_VERIFICATION';

  saveOrders();
  console.log(`[UPI] Order ${orderId} UTR submitted: ${cleanUtr}. Status: PENDING_VERIFICATION`);

  return { success: true, order };
}

/**
 * Owner / Admin verification of an order after confirming bank statement credit.
 */
export function verifyUPIOrder(orderId: string, verifiedBy: string): {
  success: boolean;
  order?: UPIOrder;
  error?: string;
} {
  const order = ordersById.get(orderId);
  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  if (!order.customerUtr) {
    return { success: false, error: 'Cannot verify an order without a submitted UTR' };
  }

  order.status = 'VERIFIED';
  order.verifiedAt = new Date().toISOString();
  order.verifiedBy = verifiedBy;
  order.rejectionReason = undefined;

  saveOrders();
  console.log(`[UPI] Order ${orderId} marked VERIFIED by ${verifiedBy}`);

  return { success: true, order };
}

/**
 * Owner / Admin rejection of an order if credit is missing or forged.
 */
export function rejectUPIOrder(orderId: string, reason: string): {
  success: boolean;
  order?: UPIOrder;
  error?: string;
} {
  const order = ordersById.get(orderId);
  if (!order) {
    return { success: false, error: 'Order not found' };
  }

  order.status = 'REJECTED';
  order.rejectionReason = reason;

  saveOrders();
  console.log(`[UPI] Order ${orderId} marked REJECTED. Reason: ${reason}`);

  return { success: true, order };
}

/**
 * Retrieve an order by ID.
 */
export function getUPIOrder(orderId: string): UPIOrder | undefined {
  return ordersById.get(orderId);
}

/**
 * List orders, optionally filtered by user ID.
 */
export function listUPIOrders(userId?: string): UPIOrder[] {
  const list = Array.from(ordersById.values());
  if (userId) {
    return list.filter(o => o.userId === userId);
  }
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
