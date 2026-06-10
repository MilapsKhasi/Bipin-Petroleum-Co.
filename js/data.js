// Offline Storage State Manager using requested localStorage keys:
// - 'companies'
// - 'sales'
// - 'purchase'
// - 'products'
// - 'settings'
(function() {
  
  // Dynamic Dexie loader and IndexedDB setup
  var db;
  function initDexieDB() {
    try {
      if (typeof Dexie !== "undefined") {
        db = new Dexie("BipinPetroleumDB");
        db.version(1).stores({
          companies: "id, user_id, type, name, gst, phone, email, address, openingBalance, pendingSync",
          products: "id, user_id, name, hsn, unit, quantity, purchasePrice, sellingPrice, pendingSync",
          sales: "id, invoiceNo, user_id, date, customerId, customerName, customerGst, customerAddress, items, subtotal, gstAmount, discount, roundOff, grandTotal, paid, pendingSync",
          purchase: "id, billNo, user_id, date, vendorId, vendorName, vendorGst, vendorAddress, items, subtotal, gstAmount, total, previousBalance, receivedAmount, currentBalance, paid, pendingSync",
          settings: "id, user_id, companyName, gstin, address, invoicePrefix, nextInvoiceNo, purchasePrefix, nextPurchaseNo, defaultGstRate, logo, phone, email, website, pan, fssai, bankHolder, bankName, bankAccount, bankBranch, bankIfsc, bankUpi, terms, pendingSync"
        });
        console.log("Dexie IndexedDB configured successfully mapping offline tables!");
        saveAllToDexie().then(() => {
          console.log("IndexedDB populated from local mirror.");
        });
      }
    } catch (e) {
      console.error("Dexie startup fault:", e);
    }
  }

  if (typeof Dexie === "undefined") {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/dexie@4.0.1/dist/dexie.js";
    s.async = false;
    s.onload = () => {
      console.log("Dexie.js CDN script loaded, booting IndexedDB...");
      initDexieDB();
    };
    document.head.appendChild(s);
  } else {
    initDexieDB();
  }

  // Mock/initial seed data for the accounting workspace
  const SEED_COMPANIES = [
    { id: "comp-1", type: "customer", name: "MK Traders", gst: "24ABCDF1234F1Z4", phone: "9876543210", email: "contact@mktraders.co.in", address: "Plot 42, GIDC Industrial Estate, Surat, Gujarat", openingBalance: 15000 },
    { id: "comp-2", type: "customer", name: "Zenith Electronics Ltd", gst: "22AAACT9988G2Z1", phone: "9123456780", email: "procure@zenithelec.com", address: "G-Block, Bandra Kurla Complex, Mumbai, Maharashtra", openingBalance: 0 },
    { id: "comp-3", type: "vendor", name: "Apex Copper Industries", gst: "24AAHCA4455H1Z3", phone: "9898012345", email: "sales@apexcopper.net", address: "Sector 17, GIDC, Ahmedabad, Gujarat", openingBalance: -25000 },
    { id: "comp-4", type: "vendor", name: "Electro Components Corp", gst: "27AABCE9384F1ZG", phone: "8887776665", email: "orders@electrocomp.com", address: "Industrial Zone-C, Pune, Maharashtra", openingBalance: 0 }
  ];

  const SEED_PRODUCTS = [
    { id: "prod-1", name: "Copper Wire Roll 1.5mm", hsn: "7408", unit: "Roll", quantity: 250, purchasePrice: 4200, sellingPrice: 5800 },
    { id: "prod-2", name: "Industrial Power Supply 24V", hsn: "8504", unit: "Pcs", quantity: 15, purchasePrice: 850, sellingPrice: 1250 },
    { id: "prod-3", name: "Relay Module 8-Channel Pro", hsn: "8536", unit: "Pcs", quantity: 8, purchasePrice: 280, sellingPrice: 420 },
    { id: "prod-4", name: "PVC Conduit Pipe 1m Length", hsn: "3917", unit: "Mtr", quantity: 850, purchasePrice: 35, sellingPrice: 65 }
  ];

  const SEED_SALES = [
    {
      id: "sale-1",
      invoiceNo: "INV-101",
      date: "2026-05-12",
      customerId: "comp-1",
      customerName: "MK Traders",
      customerGst: "24ABCDF1234F1Z4",
      customerAddress: "Plot 42, GIDC Industrial Estate, Surat, Gujarat",
      items: [
        { id: "prod-1", name: "Copper Wire Roll 1.5mm", hsn: "7408", qty: 2, rate: 5800, taxable: 11600, gstRate: 18, cgst: 1044, sgst: 1044, total: 13688 },
        { id: "prod-3", name: "Relay Module 8-Channel Pro", hsn: "8536", qty: 5, rate: 420, taxable: 2100, gstRate: 18, cgst: 189, sgst: 189, total: 2478 }
      ],
      subtotal: 13700,
      gstAmount: 2466,
      discount: 200,
      roundOff: 0,
      grandTotal: 15966,
      paid: true
    },
    {
      id: "sale-2",
      invoiceNo: "INV-102",
      date: "2026-05-24",
      customerId: "comp-2",
      customerName: "Zenith Electronics Ltd",
      customerGst: "22AAACT9988G2Z1",
      customerAddress: "G-Block, Bandra Kurla Complex, Mumbai, Maharashtra",
      items: [
        { id: "prod-2", name: "Industrial Power Supply 24V", hsn: "8504", qty: 5, rate: 1250, taxable: 6250, gstRate: 18, cgst: 562.5, sgst: 562.5, total: 7375 }
      ],
      subtotal: 6250,
      gstAmount: 1125,
      discount: 0,
      roundOff: 0,
      grandTotal: 7375,
      paid: false
    }
  ];

  const SEED_PURCHASES = [
    {
      id: "pur-1",
      billNo: "APX-8374",
      date: "2026-05-10",
      vendorId: "comp-3",
      vendorName: "Apex Copper Industries",
      vendorGst: "24AAHCA4455H1Z3",
      vendorAddress: "Sector 17, GIDC, Ahmedabad, Gujarat",
      items: [
        { id: "prod-1", name: "Copper Wire Roll 1.5mm", hsn: "7408", qty: 10, rate: 4200, taxable: 42000, gstRate: 18, cgst: 3780, sgst: 3780, total: 49560 }
      ],
      subtotal: 42000,
      gstAmount: 7560,
      total: 49560,
      paid: true
    }
  ];

  const SEED_SETTINGS = {
    companyName: "Bipin Petroleum Co.",
    gstin: "24CMAPK3117Q1ZZ",
    address: "Shop No. 28, Shiv Om Circle, Golden Point, Surat, Gujarat",
    invoicePrefix: "INV-",
    nextInvoiceNo: 103,
    purchasePrefix: "PUR-",
    nextPurchaseNo: 101,
    defaultGstRate: 18,
    logo: "",
    phone: "+91 9981278197",
    email: "dpravi799@gmail.com",
    website: "www.stockregister.in",
    pan: "AVHPC6971A",
    fssai: "24CMAPK3117Q1ZZ",
    bankHolder: "Bipin Singh",
    bankName: "State Bank of India",
    bankAccount: "38028101723",
    bankBranch: "Surat Main",
    bankIfsc: "SBIN0002836",
    bankUpi: "bipin@paytm",
    terms: "1. Customer will pay the GST\n2. Customer will pay the Delivery charges\n3. Pay due amount within 15 days"
  };

  // Helper to determine if there is a logged-in Supabase user synchronously
  function getSupabaseUserId() {
    try {
      if (window.currentUser && window.currentUser.id) {
        return window.currentUser.id;
      }
      if (window.SUPABASE_URL) {
        const match = window.SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase/);
        if (match && match[1]) {
          const tokenKey = `sb-${match[1]}-auth-token`;
          const tokenStr = localStorage.getItem(tokenKey);
          if (tokenStr) {
            const token = JSON.parse(tokenStr);
            if (token && token.user && token.user.id) {
              return token.user.id;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not retrieve Supabase user ID synchronously", e);
    }
    return null;
  }

  function getScopedKey(key) {
    const userId = getSupabaseUserId();
    if (userId) {
      return key + "_" + userId;
    }
    return key;
  }

  // Helper initializer - only run seeds if user is NOT logged in (unscoped guest key)
  function initializeDB(key, defaultData) {
    const userId = getSupabaseUserId();
    if (!userId) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultData));
      }
    }
  }

  initializeDB("companies", SEED_COMPANIES);
  initializeDB("products", SEED_PRODUCTS);
  initializeDB("sales", SEED_SALES);
  initializeDB("purchase", SEED_PURCHASES);
  initializeDB("settings", SEED_SETTINGS);

  const SEED_ACCOUNTS = [
    { id: "acc-cash", name: "Cash Account", group: "Assets", type: "system", openingBalance: 100000, balance: 100000 },
    { id: "acc-bank", name: "Bank Account (SBI)", group: "Assets", type: "system", openingBalance: 500000, balance: 500000 },
    { id: "acc-sales", name: "Sales Account", group: "Income", type: "system", openingBalance: 0, balance: 0 },
    { id: "acc-purchase", name: "Purchase Account", group: "Expenses", type: "system", openingBalance: 0, balance: 0 },
    { id: "acc-stock", name: "Stock Inventory Account", group: "Assets", type: "system", openingBalance: 0, balance: 0 },
    { id: "acc-capital", name: "Capital Account", group: "Capital", type: "system", openingBalance: 590000, balance: 590000 }
  ];

  function ensureAllAccountsExist() {
    let accounts = [];
    const scopedKey = getScopedKey("accounts");
    const raw = localStorage.getItem(scopedKey);
    if (raw) {
      try {
        accounts = JSON.parse(raw);
      } catch (e) {
        accounts = [...SEED_ACCOUNTS];
      }
    } else {
      accounts = [...SEED_ACCOUNTS];
    }

    const companiesKey = getScopedKey("companies");
    const companiesRaw = localStorage.getItem(companiesKey);
    let companies = SEED_COMPANIES;
    if (companiesRaw) {
      try {
        companies = JSON.parse(companiesRaw);
      } catch (e) {
        companies = SEED_COMPANIES;
      }
    }

    let updated = false;

    // 1. Remove accounts whose companies are no longer in DB
    const originalLength = accounts.length;
    accounts = accounts.filter(acc => {
      if (acc.type !== "party") return true; // keep system & custom heads
      return companies.some(c => c.id === acc.partyId);
    });
    if (accounts.length !== originalLength) {
      updated = true;
    }

    // 2. Add missing ones and keep name/group/opening balance fully synchronized on edits
    companies.forEach(c => {
      const idx = accounts.findIndex(a => a.id === "acc-" + c.id);
      const expectedName = c.name + " (" + (c.type === 'customer' ? 'Customer' : 'Vendor') + ")";
      const expectedGroup = c.type === 'customer' ? 'Sundry Debtors' : 'Sundry Creditors';
      const expectedOpening = c.openingBalance || 0;

      if (idx === -1) {
        accounts.push({
          id: "acc-" + c.id,
          name: expectedName,
          group: expectedGroup,
          type: "party",
          partyId: c.id,
          openingBalance: expectedOpening,
          balance: expectedOpening
        });
        updated = true;
      } else {
        const existingAcc = accounts[idx];
        if (existingAcc.name !== expectedName || existingAcc.group !== expectedGroup || existingAcc.openingBalance !== expectedOpening) {
          existingAcc.name = expectedName;
          existingAcc.group = expectedGroup;
          existingAcc.openingBalance = expectedOpening;
          updated = true;
        }
      }
    });

    if (updated || !raw) {
      localStorage.setItem(scopedKey, JSON.stringify(accounts));
    }
  }

  ensureAllAccountsExist();

  // Migration: If company name is "SK Enterprise" (previous default), update to Bipin Petroleum Co.
  try {
    const stored = localStorage.getItem("settings");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.companyName === "SK Enterprise") {
        parsed.companyName = "Bipin Petroleum Co.";
        localStorage.setItem("settings", JSON.stringify(parsed));
      }
    }
  } catch(e) {}

  // Export getSupabaseUserId globally
  window.getSupabaseUserId = getSupabaseUserId;

  // =========================================================================
  // SYNC MAPPING FUNCTIONS (LocalStorage/Dexie to Supabase)
  // =========================================================================
  function mapCompanyToDb(item) {
    return {
      id: item.id,
      type: item.type,
      name: item.name,
      gst: item.gst || null,
      phone: item.phone || null,
      email: item.email || null,
      address: item.address || null,
      opening_balance: Number(item.openingBalance || 0)
    };
  }

  function mapCompanyToLocal(dbItem) {
    return {
      id: dbItem.id,
      type: dbItem.type,
      name: dbItem.name,
      gst: dbItem.gst || "",
      phone: dbItem.phone || "",
      email: dbItem.email || "",
      address: dbItem.address || "",
      openingBalance: Number(dbItem.opening_balance || 0)
    };
  }

  function mapProductToDb(item) {
    return {
      id: item.id,
      name: item.name,
      hsn: item.hsn || null,
      unit: item.unit || "Pcs",
      quantity: Number(item.quantity || 0),
      purchase_price: Number(item.purchasePrice || 0),
      selling_price: Number(item.sellingPrice || 0)
    };
  }

  function mapProductToLocal(dbItem) {
    return {
      id: dbItem.id,
      name: dbItem.name,
      hsn: dbItem.hsn || "",
      unit: dbItem.unit || "Pcs",
      quantity: Number(dbItem.quantity || 0),
      purchasePrice: Number(dbItem.purchase_price || 0),
      sellingPrice: Number(dbItem.selling_price || 0)
    };
  }

  function mapSalesToDb(item) {
    return {
      id: item.id,
      invoice_no: item.invoiceNo,
      date: item.date,
      customer_id: item.customerId || null,
      customer_name: item.customerName || null,
      customer_gst: item.customerGst || null,
      customer_address: item.customerAddress || null,
      items: typeof item.items === 'string' ? JSON.parse(item.items) : item.items,
      subtotal: Number(item.subtotal || 0),
      gst_amount: Number(item.gstAmount || 0),
      discount: Number(item.discount || 0),
      round_off: Number(item.roundOff || 0),
      grand_total: Number(item.grandTotal || 0),
      paid: item.paid === true || item.paid === "true"
    };
  }

  function mapSalesToLocal(dbItem) {
    return {
      id: dbItem.id,
      invoiceNo: dbItem.invoice_no,
      date: dbItem.date,
      customerId: dbItem.customer_id || "",
      customerName: dbItem.customer_name || "",
      customerGst: dbItem.customer_gst || "",
      customerAddress: dbItem.customer_address || "",
      items: dbItem.items,
      subtotal: Number(dbItem.subtotal || 0),
      gstAmount: Number(dbItem.gst_amount || 0),
      discount: Number(dbItem.discount || 0),
      roundOff: Number(dbItem.round_off || 0),
      grandTotal: Number(dbItem.grand_total || 0),
      paid: dbItem.paid
    };
  }

  function mapPurchaseToDb(item) {
    return {
      id: item.id,
      bill_no: item.billNo,
      date: item.date,
      vendor_id: item.vendorId || null,
      vendor_name: item.vendorName || null,
      vendor_gst: item.vendorGst || null,
      vendor_address: item.vendorAddress || null,
      items: typeof item.items === 'string' ? JSON.parse(item.items) : item.items,
      subtotal: Number(item.subtotal || 0),
      gst_amount: Number(item.gstAmount || 0),
      total: Number(item.total || 0),
      previous_balance: Number(item.previousBalance || 0),
      received_amount: Number(item.receivedAmount || 0),
      current_balance: Number(item.currentBalance || 0),
      paid: item.paid === true || item.paid === "true"
    };
  }

  function mapPurchaseToLocal(dbItem) {
    return {
      id: dbItem.id,
      billNo: dbItem.bill_no,
      date: dbItem.date,
      vendorId: dbItem.vendor_id || "",
      vendorName: dbItem.vendor_name || "",
      vendorGst: dbItem.vendor_gst || "",
      vendorAddress: dbItem.vendor_address || "",
      items: dbItem.items,
      subtotal: Number(dbItem.subtotal || 0),
      gstAmount: Number(dbItem.gst_amount || 0),
      total: Number(dbItem.total || 0),
      previousBalance: Number(dbItem.previous_balance || 0),
      receivedAmount: Number(dbItem.received_amount || 0),
      currentBalance: Number(dbItem.current_balance || 0),
      paid: dbItem.paid
    };
  }

  function mapSettingsToDb(item) {
    return {
      company_name: item.companyName,
      gstin: item.gstin || null,
      address: item.address || null,
      invoice_prefix: item.invoicePrefix,
      next_invoice_no: Number(item.nextInvoiceNo || 1),
      purchase_prefix: item.purchasePrefix,
      next_purchase_no: Number(item.nextPurchaseNo || 1),
      default_gst_rate: Number(item.defaultGstRate || 18.00),
      logo: item.logo || null,
      phone: item.phone || null,
      email: item.email || null,
      website: item.website || null,
      pan: item.pan || null,
      fssai: item.fssai || null,
      bank_holder: item.bankHolder || null,
      bank_name: item.bankName || null,
      bank_account: item.bankAccount || null,
      bank_branch: item.bankBranch || null,
      bank_ifsc: item.bankIfsc || null,
      bank_upi: item.bankUpi || null,
      terms: item.terms || null
    };
  }

  function mapSettingsToLocal(dbItem) {
    return {
      companyName: dbItem.company_name || "Bipin Petroleum Co.",
      gstin: dbItem.gstin || "",
      address: dbItem.address || "",
      invoicePrefix: dbItem.invoice_prefix || "INV-",
      nextInvoiceNo: Number(dbItem.next_invoice_no || 1),
      purchasePrefix: dbItem.purchase_prefix || "PUR-",
      nextPurchaseNo: Number(dbItem.next_purchase_no || 1),
      defaultGstRate: Number(dbItem.default_gst_rate || 18.00),
      logo: dbItem.logo || "",
      phone: dbItem.phone || "+91 9981278197",
      email: dbItem.email || "dpravi799@gmail.com",
      website: dbItem.website || "www.stockregister.in",
      pan: dbItem.pan || "AVHPC6971A",
      fssai: dbItem.fssai || "24CMAPK3117Q1ZZ",
      bankHolder: dbItem.bank_holder || "Bipin Singh",
      bankName: dbItem.bank_name || "State Bank of India",
      bankAccount: dbItem.bank_account || "38028101723",
      bankBranch: dbItem.bank_branch || "Surat Main",
      bankIfsc: dbItem.bank_ifsc || "SBIN0002836",
      bankUpi: dbItem.bank_upi || "bipin@paytm",
      terms: dbItem.terms || "1. Customer will pay the GST\n2. Customer will pay the Delivery charges\n3. Pay due amount within 15 days"
    };
  }

  // =========================================================================
  // DUAL-STORAGE SYNCHRONIZATION MODULES (Dexie + Supabase Cloud)
  // =========================================================================
  async function saveAllToDexie() {
    if (typeof Dexie === "undefined" || !db) return;
    const userId = getSupabaseUserId();
    
    try {
      const settingsKey = getScopedKey("settings");
      const localSettings = localStorage.getItem(settingsKey);
      if (localSettings) {
        await db.settings.put({ id: userId || "guest", user_id: userId || null, ...JSON.parse(localSettings) });
      }

      const tables = ["companies", "products", "sales", "purchase"];
      for (const t of tables) {
        const key = getScopedKey(t);
        const raw = localStorage.getItem(key);
        if (raw) {
          const arr = JSON.parse(raw);
          await db[t].where("user_id").equals(userId || null).delete();
          for (const item of arr) {
            await db[t].put({ user_id: userId || null, ...item });
          }
        }
      }
    } catch (e) {
      console.warn("Mirroring to Dexie failed:", e);
    }
  }

  window.saveKeyToDexie = async function(key, data) {
    if (typeof Dexie === "undefined" || !db) return;
    const userId = getSupabaseUserId();
    try {
      if (key === "settings") {
        await db.settings.put({ id: userId || "guest", user_id: userId || null, ...data });
      } else {
        await db[key].where("user_id").equals(userId || null).delete();
        for (const item of data) {
          await db[key].put({ user_id: userId || null, ...item });
        }
      }
    } catch (e) {
      console.error(`Error saving ${key} to Dexie:`, e);
    }
  };

  async function syncSettingsToSupabase(user, localSettings) {
    if (!window.supabaseClient || !user) return;

    const dbRow = mapSettingsToDb(localSettings);
    dbRow.user_id = user.id;

    const { error } = await window.supabaseClient
      .from("settings")
      .upsert(dbRow, { onConflict: "user_id" });

    if (error) {
      console.error("Failed to sync settings to Supabase:", error);
      throw error;
    }
  }

  async function syncTableToSupabase(user, key, tableName, localData, mapLocalToDb) {
    if (!window.supabaseClient || !user) return;

    const { data: dbRecords, error: fetchErr } = await window.supabaseClient
      .from(tableName)
      .select("id")
      .eq("user_id", user.id);

    if (fetchErr) {
      console.error(`Failed to fetch ${tableName} for sync:`, fetchErr);
      throw fetchErr;
    }

    const dbIds = new Set((dbRecords || []).map(r => r.id));
    const localIds = new Set(localData.map(d => d.id));

    const idsToDelete = [...dbIds].filter(id => !localIds.has(id));
    if (idsToDelete.length > 0) {
      const { error: delErr } = await window.supabaseClient
        .from(tableName)
        .delete()
        .in("id", idsToDelete)
        .eq("user_id", user.id);
      if (delErr) console.error(`Failed to sync deletions for ${tableName}:`, delErr);
    }

    // Load local companies to avoid foreign key (customer_id / vendor_id) mismatch issues
    const localCompaniesScopedKey = getScopedKey("companies");
    const localCompaniesRaw = localStorage.getItem(localCompaniesScopedKey);
    const localCompanies = localCompaniesRaw ? JSON.parse(localCompaniesRaw) : [];
    const validCompanyIds = new Set(localCompanies.map(c => c.id));

    const rowsToUpsert = localData.map(item => {
      const dbRow = mapLocalToDb(item);
      dbRow.user_id = user.id;

      // Safe foreign key resolution:
      if (tableName === "sales" && dbRow.customer_id) {
        if (!validCompanyIds.has(dbRow.customer_id)) {
          dbRow.customer_id = null;
        }
      }
      if (tableName === "purchase" && dbRow.vendor_id) {
        if (!validCompanyIds.has(dbRow.vendor_id)) {
          dbRow.vendor_id = null;
        }
      }

      return dbRow;
    });

    if (rowsToUpsert.length > 0) {
      const { error: upsertErr } = await window.supabaseClient
        .from(tableName)
        .upsert(rowsToUpsert);
      if (upsertErr) {
        console.error(`Failed to upsert records to ${tableName}:`, upsertErr);
        throw upsertErr;
      }
    }
  }

  async function downloadUserDataFromSupabase() {
    if (!window.supabaseClient) return;
    const { data: { user } } = await window.supabaseClient.auth.getUser();
    if (!user) return;

    try {
      console.log("Downloading cloud data from Supabase...");
      
      const { data: dbSettings } = await window.supabaseClient
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (dbSettings) {
        const localSettings = mapSettingsToLocal(dbSettings);
        localStorage.setItem("settings_" + user.id, JSON.stringify(localSettings));
      }

      const { data: dbCompanies } = await window.supabaseClient
        .from("companies")
        .select("*")
        .eq("user_id", user.id);

      if (dbCompanies) {
        const localCompanies = dbCompanies.map(mapCompanyToLocal);
        localStorage.setItem("companies_" + user.id, JSON.stringify(localCompanies));
      }

      const { data: dbProducts } = await window.supabaseClient
        .from("products")
        .select("*")
        .eq("user_id", user.id);

      if (dbProducts) {
        const localProducts = dbProducts.map(mapProductToLocal);
        localStorage.setItem("products_" + user.id, JSON.stringify(localProducts));
      }

      const { data: dbSales } = await window.supabaseClient
        .from("sales")
        .select("*")
        .eq("user_id", user.id);

      if (dbSales) {
        const localSales = dbSales.map(mapSalesToLocal);
        localStorage.setItem("sales_" + user.id, JSON.stringify(localSales));
      }

      const { data: dbPurchase } = await window.supabaseClient
        .from("purchase")
        .select("*")
        .eq("user_id", user.id);

      if (dbPurchase) {
        const localPurchase = dbPurchase.map(mapPurchaseToLocal);
        localStorage.setItem("purchase_" + user.id, JSON.stringify(localPurchase));
      }

      ensureAllAccountsExist();
      await saveAllToDexie();

      window.dispatchEvent(new Event("db-update"));
      console.log("Cloud datasets downloaded completely!");
    } catch (err) {
      console.error("Failed to download cloud records:", err);
    }
  }

  // Global window.DB CRUD interface mapped to the specific storage design
  window.DB = {
    get: function(key) {
      try {
        const scopedKey = getScopedKey(key);
        const userId = getSupabaseUserId();
        const raw = localStorage.getItem(scopedKey);
        if (raw) {
          return JSON.parse(raw);
        }
        
        // If there is no entry yet and we have a logged-in user, return blank/initial states
        if (userId) {
          if (key === "settings") {
            return {
              companyName: "Bipin Petroleum Co.",
              gstin: "",
              address: "",
              invoicePrefix: "INV-",
              nextInvoiceNo: 1,
              purchasePrefix: "PUR-",
              nextPurchaseNo: 1,
              defaultGstRate: 18,
              logo: "",
              phone: "+91 9981278197",
              email: "dpravi799@gmail.com",
              website: "www.stockregister.in",
              pan: "AVHPC6971A",
              fssai: "24CMAPK3117Q1ZZ",
              bankHolder: "Bipin Singh",
              bankName: "State Bank of India",
              bankAccount: "38028101723",
              bankBranch: "Surat Main",
              bankIfsc: "SBIN0002836",
              bankUpi: "bipin@paytm",
              terms: "1. Customer will pay the GST\n2. Customer will pay the Delivery charges\n3. Pay due amount within 15 days"
            };
          }
          return [];
        }

        // Guest fallback (should have been seeded above, but just in case)
        if (key === "settings") {
          const fallbackRaw = localStorage.getItem("settings");
          return fallbackRaw ? JSON.parse(fallbackRaw) : SEED_SETTINGS;
        }
        return [];
      } catch (e) {
        console.error("Error reading localStorage key " + key, e);
        return [];
      }
    },
    save: function(key, data) {
      const scopedKey = getScopedKey(key);
      localStorage.setItem(scopedKey, JSON.stringify(data));
      
      // Mark as pending if logged in
      const userId = getSupabaseUserId();
      if (userId) {
        localStorage.setItem(scopedKey + "_pending", "true");
      }

      // Mirror to Dexie IndexedDB
      if (window.saveKeyToDexie) {
        window.saveKeyToDexie(key, data);
      }

      // Background cloud sync if online
      if (userId && navigator.onLine) {
        this.syncWithCloud(false).catch(err => console.log("Bg sync deferred: ", err));
      }

      window.dispatchEvent(new Event("db-update"));
    },

    getPendingSyncCount: function() {
      try {
        const userId = getSupabaseUserId();
        if (!userId) return 0;
        
        let count = 0;
        const tables = ["companies", "products", "sales", "purchase", "settings"];
        for (const t of tables) {
          const scopedKey = getScopedKey(t);
          const pending = localStorage.getItem(scopedKey + "_pending");
          if (pending === "true") {
            count += 1;
          }
        }
        return count;
      } catch (e) {
        return 0;
      }
    },

    syncWithCloud: async function(isManual = false) {
      if (window.isSyncingInProgress) {
        if (isManual && window.toast && typeof window.toast.show === "function") {
          window.toast.show("Sync is already running...", "error");
        }
        return;
      }
      if (!navigator.onLine) {
        if (isManual && window.toast && typeof window.toast.show === "function") {
          window.toast.show("Cannot sync: Connection offline.", "error");
        }
        return;
      }
      if (!window.supabaseClient) {
        if (isManual && window.toast && typeof window.toast.show === "function") {
          window.toast.show("Cloud sync unavailable: Supabase is unconfigured.", "error");
        }
        return;
      }

      try {
        window.isSyncingInProgress = true;
        if (isManual && window.toast && typeof window.toast.show === "function") {
          window.toast.show("🔄 Syncing data to Supabase...", "success");
        }

        // Get exact current logged-in user asynchronously
        const { data: authData, error: authErr } = await window.supabaseClient.auth.getUser();
        const user = authData ? authData.user : null;
        if (!user) {
          window.isSyncingInProgress = false;
          if (isManual && window.toast && typeof window.toast.show === "function") {
            window.toast.show("Please sign in to run sync.", "error");
          }
          return;
        }

        // Match or create the user in the public.users database schema to prevent foreign key issues
        const { data: userProfileRecord, error: profileErr } = await window.supabaseClient
          .from("users")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!userProfileRecord) {
          console.log("No user profile found in public.users, inserting...");
          const { error: insertUserErr } = await window.supabaseClient
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || "Petroleum Operator",
              license_id: 'LIC-' + Math.random().toString(36).substring(2, 11).toUpperCase()
            });
          if (insertUserErr) {
            console.error("Failed to insert user profile to public.users:", insertUserErr);
          }
        }

        // 1. Sync Settings
        const settingsKey = getScopedKey("settings");
        if (localStorage.getItem(settingsKey + "_pending") === "true") {
          const data = this.getSettings();
          await syncSettingsToSupabase(user, data);
          localStorage.removeItem(settingsKey + "_pending");
        }

        // 2. Sync Tables
        const mappings = [
          { key: "companies", table: "companies", mapper: mapCompanyToDb },
          { key: "products", table: "products", mapper: mapProductToDb },
          { key: "sales", table: "sales", mapper: mapSalesToDb },
          { key: "purchase", table: "purchase", mapper: mapPurchaseToDb }
        ];

        for (const m of mappings) {
          const scopedKey = getScopedKey(m.key);
          if (localStorage.getItem(scopedKey + "_pending") === "true") {
            const data = this.get(m.key);
            await syncTableToSupabase(user, m.key, m.table, data, m.mapper);
            localStorage.removeItem(scopedKey + "_pending");
          }
        }

        window.isSyncingInProgress = false;
        if (isManual && window.toast && typeof window.toast.show === "function") {
          window.toast.show("✅ Cloud Sync completed successfully!", "success");
        }
        window.dispatchEvent(new Event("db-update"));
      } catch (err) {
        window.isSyncingInProgress = false;
        console.error("Sync error:", err);
        if (isManual && window.toast && typeof window.toast.show === "function") {
          window.toast.show("❌ Sync failed: " + (err.message || "Please verify network."), "error");
        }
      }
    },

    bootstrapCloudSync: async function() {
      const userId = getSupabaseUserId();
      if (!userId || !navigator.onLine) return;

      const downloadFlag = "has_downloaded_cloud_" + userId;
      if (!localStorage.getItem(downloadFlag)) {
        try {
          console.log("Bootstrap download triggered...");
          await downloadUserDataFromSupabase();
          localStorage.setItem(downloadFlag, "true");
        } catch(e) {
          console.warn("Bootstrap cloud download deferred:", e);
        }
      } else {
        // If already initialized once, perform incremental sync (up) if any modifications were made offline
        this.syncWithCloud(false).catch(err => console.log("Incremental bg sync deferred: ", err));
      }
    },

    // Companies Wrapper
    getCompanies: function() { return this.get("companies"); },
    saveCompanies: function(all) { this.save("companies", all); },

    // Products Wrapper (Stock Catalog)
    getProducts: function() { return this.get("products"); },
    saveProducts: function(all) { this.save("products", all); },

    // Sales (Invoices) Wrapper
    getSales: function() { return this.get("sales"); },
    saveSales: function(all) { this.save("sales", all); },

    // Purchases (Bills) Wrapper
    getPurchases: function() { return this.get("purchase"); },
    savePurchases: function(all) { this.save("purchase", all); },

    // Settings Wrapper
    getSettings: function() {
      return this.get("settings");
    },
    saveSettings: function(settingsObj) {
      this.save("settings", settingsObj);
    },

    // Helper functions for automatic stock tracking
    stockAdjust: function(productId, qtyDelta) {
      const all = this.getProducts();
      const idx = all.findIndex(p => p.id === productId);
      if (idx !== -1) {
        all[idx].quantity = Math.max(0, Number(all[idx].quantity) + Number(qtyDelta));
        this.saveProducts(all);
      }
    },

    // Accounts operations
    getAccounts: function() { 
      // Ensure we keep the local state synced
      ensureAllAccountsExist();
      return this.get("accounts") || []; 
    },
    saveAccounts: function(all) { 
      this.save("accounts", all); 
    },

    // Dynamic double-entry ledger calculation
    getLedger: function(accountId) {
      const accounts = this.getAccounts();
      const acc = accounts.find(a => a.id === accountId);
      if (!acc) return null;

      const entries = [];
      let runningBalance = acc.openingBalance || 0;

      // Classify normal balances for double entry accounting:
      // Debit Normal: Assets, Sundry Debtors (Customers), Expenses
      // Credit Normal: Liabilities, Capital, Sundry Creditors (Vendors), Income (Sales)
      const isDebitNormal = (acc.group === "Assets" || acc.group === "Sundry Debtors" || acc.group === "Expenses");

      // Opening Balance pseudo entry
      entries.push({
        date: "",
        description: "Opening Balance",
        debit: isDebitNormal ? (runningBalance > 0 ? runningBalance : 0) : (runningBalance < 0 ? -runningBalance : 0),
        credit: isDebitNormal ? (runningBalance < 0 ? -runningBalance : 0) : (runningBalance > 0 ? runningBalance : 0),
        runningBalance: runningBalance
      });

      // Sales entries
      const sales = this.getSales();
      sales.forEach(s => {
        // Customer account
        if (accountId === "acc-" + s.customerId) {
          const debitVal = s.grandTotal;
          runningBalance += isDebitNormal ? debitVal : -debitVal;
          entries.push({
            id: s.id,
            date: s.date,
            description: "Sales Invoice " + s.invoiceNo,
            debit: debitVal,
            credit: 0,
            runningBalance: runningBalance
          });

          if (s.paid === true || s.paid === "true") {
            const creditVal = s.grandTotal;
            runningBalance += isDebitNormal ? -creditVal : creditVal;
            entries.push({
              id: s.id,
              date: s.date,
              description: "Receipt received for " + s.invoiceNo,
              debit: 0,
              credit: creditVal,
              runningBalance: runningBalance
            });
          }
        }

        // Sales Income account
        if (accountId === "acc-sales") {
          const creditVal = s.grandTotal;
          runningBalance += isDebitNormal ? -creditVal : creditVal;
          entries.push({
            id: s.id,
            date: s.date,
            description: "Sales Invoice " + s.invoiceNo + " (Party: " + s.customerName + ")",
            debit: 0,
            credit: creditVal,
            runningBalance: runningBalance
          });
        }

        // Cash/Bank account
        if (s.paid === true || s.paid === "true") {
          if (accountId === "acc-bank") {
            const debitVal = s.grandTotal;
            runningBalance += isDebitNormal ? debitVal : -debitVal;
            entries.push({
              id: s.id,
              date: s.date,
              description: "Bank Receipt: " + s.customerName + " (Inv " + s.invoiceNo + ")",
              debit: debitVal,
              credit: 0,
              runningBalance: runningBalance
            });
          }
        }
      });

      // Purchases entries
      const purchases = this.getPurchases();
      purchases.forEach(p => {
        // Vendor account
        if (accountId === "acc-" + p.vendorId) {
          const creditVal = p.total;
          runningBalance += isDebitNormal ? -creditVal : creditVal;
          entries.push({
            id: p.id,
            date: p.date,
            description: "Purchase Bill " + p.billNo,
            debit: 0,
            credit: creditVal,
            runningBalance: runningBalance
          });

          if (p.paid === true || p.paid === "true") {
            const debitVal = p.total;
            runningBalance += isDebitNormal ? debitVal : -debitVal;
            entries.push({
              id: p.id,
              date: p.date,
              description: "Payment settled for " + p.billNo,
              debit: debitVal,
              credit: 0,
              runningBalance: runningBalance
            });
          }
        }

        // Purchase expense account
        if (accountId === "acc-purchase") {
          const debitVal = p.total;
          runningBalance += isDebitNormal ? debitVal : -debitVal;
          entries.push({
            id: p.id,
            date: p.date,
            description: "Purchase Bill " + p.billNo + " (Vendor: " + p.vendorName + ")",
            debit: debitVal,
            credit: 0,
            runningBalance: runningBalance
          });
        }

        // Cash/Bank account
        if (p.paid === true || p.paid === "true") {
          if (accountId === "acc-bank") {
            const creditVal = p.total;
            runningBalance += isDebitNormal ? -creditVal : creditVal;
            entries.push({
              id: p.id,
              date: p.date,
              description: "Bank Payment: " + p.vendorName + " (Bill " + p.billNo + ")",
              debit: 0,
              credit: creditVal,
              runningBalance: runningBalance
            });
          }
        }
      });

      // Stock Inventory account
      if (accountId === "acc-stock") {
        const products = this.getProducts();
        const currentValuation = products.reduce((sum, pr) => sum + (pr.quantity * pr.purchasePrice), 0);
        runningBalance = currentValuation;

        purchases.forEach(p => {
          entries.push({
            id: p.id,
            date: p.date,
            description: "Stock Inward: " + p.billNo,
            debit: p.total,
            credit: 0,
            runningBalance: runningBalance
          });
        });
        sales.forEach(s => {
          entries.push({
            id: s.id,
            date: s.date,
            description: "Stock Outward: " + s.invoiceNo,
            debit: 0,
            credit: s.subtotal,
            runningBalance: runningBalance
          });
        });
      }

      // Sort transactional entries safely by date while keeping Opening Balance first
      const opening = entries[0];
      const rest = entries.slice(1);
      rest.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      let bal = acc.openingBalance || 0;
      if (accountId === "acc-stock") {
        const products = this.getProducts();
        bal = products.reduce((sum, pr) => sum + (pr.quantity * pr.purchasePrice), 0);
      }

      const finalEntries = [opening];
      let curBal = opening.runningBalance;
      rest.forEach(e => {
        if (e.debit) {
          curBal += isDebitNormal ? e.debit : -e.debit;
        }
        if (e.credit) {
          curBal += isDebitNormal ? -e.credit : e.credit;
        }
        e.runningBalance = curBal;
        finalEntries.push(e);
      });

      return {
        account: acc,
        entries: finalEntries,
        balance: curBal
      };
    },

    // Get the dynamic Trial Balance
    getTrialBalance: function() {
      const accounts = this.getAccounts();
      const tb = [];
      let totalDebit = 0;
      let totalCredit = 0;

      accounts.forEach(acc => {
        const ledgerData = this.getLedger(acc.id);
        const balance = ledgerData ? ledgerData.balance : 0;
        const isDebitNormal = (acc.group === "Assets" || acc.group === "Sundry Debtors" || acc.group === "Expenses");

        let debit = 0;
        let credit = 0;

        if (isDebitNormal) {
          if (balance >= 0) {
            debit = balance;
          } else {
            credit = -balance;
          }
        } else {
          if (balance >= 0) {
            credit = balance;
          } else {
            debit = -balance;
          }
        }

        tb.push({
          accountId: acc.id,
          name: acc.name,
          group: acc.group,
          debit: debit,
          credit: credit
        });

        totalDebit += debit;
        totalCredit += credit;
      });

      return {
        items: tb,
        totalDebit: totalDebit,
        totalCredit: totalCredit
      };
    },

    // Evaluates current workflow state and unlocked status of each module
    getWorkflowStatus: function() {
      const accounts = this.getAccounts();
      const companies = this.getCompanies();
      const products = this.getProducts();

      const customers = companies.filter(c => c.type === "customer");
      const vendors = companies.filter(c => c.type === "vendor");

      const hasCapital = accounts.some(a => a.id === "acc-capital");
      const hasCash = accounts.some(a => a.id === "acc-cash");
      const hasBank = accounts.some(a => a.id === "acc-bank");
      const hasSales = accounts.some(a => a.id === "acc-sales");
      const hasPurchase = accounts.some(a => a.id === "acc-purchase");
      const hasStock = accounts.some(a => a.id === "acc-stock");

      const accountsReady = hasCapital && hasCash && hasBank && hasSales && hasPurchase && hasStock;
      const partyReady = accountsReady && (customers.length > 0 && vendors.length > 0);
      const stockReady = partyReady && (products.length > 0);
      
      const purchaseActive = accountsReady && (vendors.length > 0) && (products.length > 0);
      const salesActive = accountsReady && (customers.length > 0) && (products.length > 0);
      const reportsActive = partyReady && (products.length > 0);

      return {
        accounts: { active: true, completed: accountsReady, req: "Initialize Chart of Accounts" },
        companies: { active: accountsReady, completed: partyReady, req: "Set up the basic ledger accounts first" },
        stock: { active: partyReady, completed: stockReady, req: "Register at least 1 Customer and 1 Vendor first" },
        purchase: { active: purchaseActive, completed: true, req: "Register at least 1 Vendor and 1 Stock item first" },
        sales: { active: salesActive, completed: true, req: "Register at least 1 Customer and 1 Stock item first" },
        reports: { active: reportsActive, completed: true, req: "Register Parties and Stock items first to unlock reports" }
      };
    }
  };
})();
