/* ==============================
   IMPORTS + SUPABASE CONFIG
============================== */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://prteyzbjjzkfyogphwrg.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydGV5emJqanprZnlvZ3Bod3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODI0MTYsImV4cCI6MjA4NTA1ODQxNn0.VWJS8IcAhXSucmgQiOw9fpl79apwCYOmTdaC31_Invw";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ==============================
   DOM REFERENCES (BASE)
============================== */

const menuEl = document.getElementById("menu");
const stateEl = document.getElementById("state");
const searchInput = document.getElementById("searchInput");
const clearSearch = document.getElementById("clearSearch");
const priceFilter = document.getElementById("priceFilter");

/* ==============================
   MODAL DOM
============================== */

const modalOverlay = document.getElementById("modalOverlay");
const modalImg = document.getElementById("modalImg");
const modalTitle = document.getElementById("modalTitle");
const modalPrice = document.getElementById("modalPrice");
const modalDesc = document.getElementById("modalDesc");
const closeModal = document.getElementById("closeModal");

/* ==============================
   CART DOM
============================== */

const cartBtn = document.getElementById("cartBtn");
const cartDrawer = document.getElementById("cartDrawer");
const closeCart = document.getElementById("closeCart");
const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const cartCountEl = document.getElementById("cartCount");
const checkoutBtn = document.getElementById("checkoutBtn");
const cartOverlay = document.getElementById("cartOverlay");

/* ==============================
   MODAL BUTTONS
============================== */

const modalAddCart = document.getElementById("modalAddCart");
const modalOrderNow = document.getElementById("modalOrderNow");

// 🔒 Prevent modal overlay from hijacking button clicks (iOS fix)
modalAddCart.addEventListener("click", (e) => {
  e.stopPropagation();
});

modalOrderNow.addEventListener("click", (e) => {
  e.stopPropagation();
});


/* ==============================
   STATE
============================== */

let allItems = [];
let activeItem = null;
let cart = [];

let checkoutStep = "cart"; // "cart" | "location"
let map, marker;
let selectedLat = null;
let selectedLng = null;
let pendingCart = [];



/* ==============================
   MODAL BEHAVIOR
============================== */

closeModal.onclick = () => {
  modalOverlay.classList.remove("active");
};

// Prevent clicks inside modal from bubbling
document.querySelector(".modal").onclick = (e) => {
  e.stopPropagation();
};

/* ==============================
   FETCH + RENDER MENU
============================== */

async function fetchItems() {
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    stateEl.textContent = error.message;
    return;
  }

  if (!data.length) {
    stateEl.className = "empty";
    stateEl.textContent = "Menu is currently unavailable";
    return;
  }

  stateEl.remove();
  allItems = data;
  renderItems(allItems);
}

function renderItems(items) {
  menuEl.innerHTML = "";

  if (!items.length) {
    menuEl.innerHTML = '<p class="empty">No items found</p>';
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    card.dataset.id = item.id;
    card.dataset.name = item.name;
    card.dataset.price = item.price;
    card.dataset.desc = item.description || "";
    card.dataset.img = item.image_url;

    card.innerHTML = `
      <img src="${item.image_url}" alt="${item.name}" />
      <div class="card-content">
        <div class="card-header">
          <h3>${item.name}</h3>
          <div class="price">₱${item.price}</div>
        </div>
        <div class="desc clamp">${item.description || ""}</div>
        <div class="card-actions">
          <button class="add-cart">Add to Cart</button>
        </div>
      </div>
    `;

    menuEl.appendChild(card);
  });
}


// BRANDING

 const BRANDING_ID = "11327357-0269-422d-ae06-3f3835868e85";

const logoEl = document.getElementById("brandLogo");
const nameEl = document.getElementById("brandName");
const sloganEl = document.getElementById("brandSlogan");

async function loadBranding() {
  const { data, error } = await supabase
    .from("menu_settings")
    .select("brand, slogan, logo_path")
    .eq("id", BRANDING_ID)
    .single();

  if (error || !data) {
    console.error("Branding load failed", error);
    nameEl.textContent = "Menu";
    return;
  }

  // Text
  nameEl.textContent = data.brand || "Menu";
  sloganEl.textContent = data.slogan || "";

  // Logo (CACHE-SAFE)
  if (data.logo_path) {
    const { data: pub } = supabase.storage
      .from("menu-images")
      .getPublicUrl(data.logo_path);

    logoEl.src = `${pub.publicUrl}?v=${Date.now()}`;
  }
}

// Initial load
loadBranding();






/* ==============================
   SEARCH + SORT
============================== */

function applyFilters() {
  const term = searchInput.value.toLowerCase().trim();
  const sort = priceFilter.value;

  let filtered = allItems.filter(
    (item) =>
      item.name.toLowerCase().includes(term) ||
      (item.description || "").toLowerCase().includes(term)
  );

  if (sort === "low-high") filtered.sort((a, b) => a.price - b.price);
  if (sort === "high-low") filtered.sort((a, b) => b.price - a.price);

  renderItems(filtered);
}

function resetFilters() {
  searchInput.value = "";
  priceFilter.value = "";
  renderItems(allItems);
}

/* 🔑 CORE EVENTS — iOS SAFE */

// Fires on typing (most cases)
searchInput.addEventListener("input", applyFilters);

// Fallback for older iOS when clear button is tapped
searchInput.addEventListener("keyup", () => {
  if (searchInput.value === "") resetFilters();
});

// Custom clear button (guaranteed to work)
clearSearch.addEventListener("click", () => {
  resetFilters();
  searchInput.focus();
});

// Sorting
priceFilter.addEventListener("change", applyFilters);






/* ==============================
   MENU CLICK HANDLERS
============================== */

menuEl.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (!card) return;

  // Prevent modal opening from buttons
  if (e.target.classList.contains("add-cart")) {
    addToCart({
      id: card.dataset.id,
      name: card.dataset.name,
      price: Number(card.dataset.price),
    });
    return;
  }

  activeItem = {
    id: card.dataset.id,
    name: card.dataset.name,
    price: Number(card.dataset.price),
  };

  modalImg.src = card.dataset.img;
  modalTitle.textContent = card.dataset.name;
  modalPrice.textContent = `₱${card.dataset.price}`;
  modalDesc.textContent = card.dataset.desc || "No description available.";

  modalOverlay.classList.add("active");
});

/* ==============================
   CART DRAWER
============================== */

cartBtn.onclick = () => {
  cartDrawer.classList.add("active");
  cartOverlay.classList.add("active");
  document.body.classList.add("cart-open");
};

function closeCartDrawer() {
  cartDrawer.classList.remove("active");
  cartOverlay.classList.remove("active");
  document.body.classList.remove("cart-open");
}

closeCart.onclick = closeCartDrawer;
cartOverlay.onclick = closeCartDrawer;

cartDrawer.onclick = (e) => e.stopPropagation();

/* ==============================
   CART LOGIC
============================== */

modalAddCart.onclick = () => {
  if (!activeItem) return;
  addToCart(activeItem);
  cartDrawer.classList.add("active");
};

modalOrderNow.onclick = (e) => {
  e.stopPropagation();
  if (!activeItem) return;

  // Add item
  addToCart(activeItem);

  // Close modal FIRST
  modalOverlay.classList.remove("active");

  // Open cart (Safari-safe)
  requestAnimationFrame(() => {
    cartDrawer.classList.add("active");
    cartOverlay.classList.add("active");
    document.body.classList.add("cart-open");
  });
};



function addToCart(item) {
  const existing = cart.find((i) => i.id === item.id);

  if (existing) existing.qty++;
  else cart.push({ ...item, qty: 1 });

  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  renderCart();
}

function increaseQty(id) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;
  item.qty++;
  renderCart();
}

function decreaseQty(id) {
  const item = cart.find((i) => i.id === id);
  if (!item) return;

  if (item.qty > 1) item.qty--;
  else removeFromCart(id);

  renderCart();
}

/* ==============================
   RENDER CART
============================== */

function renderCart() {
  cartItemsEl.innerHTML = "";

  if (!cart.length) {
    cartItemsEl.innerHTML = `<p class="empty-cart">Your cart is empty</p>`;
    cartTotalEl.textContent = "₱0";
    cartCountEl.textContent = "0";
    return;
  }

  let total = 0;
  let count = 0;

  cart.forEach((item) => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;
    count += item.qty;

    cartItemsEl.innerHTML += `
      <div class="cart-item">
        <div class="cart-info">
          <strong>${item.name}</strong>
          <span>₱${item.price}</span>
        </div>

        <div class="cart-controls">
          <button onclick="decreaseQty('${item.id}')">−</button>
          <span>${item.qty}</span>
          <button onclick="increaseQty('${item.id}')">+</button>
        </div>

        <button class="cart-remove" onclick="removeFromCart('${item.id}')">×</button>
      </div>
    `;
  });

  cartTotalEl.textContent = `${total}`;
  cartCountEl.textContent = count;
}

/* ==============================
   CHECKOUT + MESSENGER
============================== */




function openMessenger(items) {
  if (!items || !items.length) return;

  if (!selectedLat || !selectedLng) {
    alert("Delivery location not available");
    return;
  }

  /* ==============================
     BUILD MESSAGE
  ============================== */

  let message = `🧾 ORDER SUMMARY\n`;
  message += `——————————————\n`;

  let total = 0;

  items.forEach((item, i) => {
    const lineTotal = item.price * item.qty;
    total += lineTotal;

    message += `${i + 1}. ${item.name}\n`;
    message += `   ₱${item.price} × ${item.qty} = ₱${lineTotal}\n`;
  });

  message += `——————————————\n`;
  message += `💰 TOTAL: ₱${total}\n\n`;
  message += `📍 DELIVERY LOCATION\n`;
  message += `https://maps.google.com/?q=${selectedLat},${selectedLng}\n\n`;
  message += `Ordered via Web Kiosk`;

  const encoded = encodeURIComponent(message);
  const url = `https://m.me/Phrimeuniverse?text=${encoded}`;

  // 🛡️ PRIMARY: try opening new tab
  const win = window.open(url, "_blank");

  // 🛡️ FALLBACK: force redirect (iOS-safe)
  if (!win || win.closed || typeof win.closed === "undefined") {
    window.location.href = url;
  }
}





/* ==============================
   GLOBAL EXPORTS (INLINE HTML)
============================== */

window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.increaseQty = increaseQty;
window.decreaseQty = decreaseQty;

/* ==============================
   INIT
============================== */

fetchItems();

/* ==============================
   LOCATION + CHECKOUT (WORKING)
============================== */



// OVERRIDE checkout click
checkoutBtn.onclick = () => {
  // STEP 1 — from cart → show map
  if (checkoutStep === "cart") {
    if (!cart || !cart.length) {
      alert("Cart is empty");
      return;
    }

    pendingCart = [...cart];
    checkoutStep = "location";
    checkoutBtn.textContent = "Confirm & Send";

    requestLocationImmediately();
    openLocationStep();
    return;
  }

  // STEP 2 — confirm & send
  if (checkoutStep === "location") {
    if (!selectedLat || !selectedLng) {
      alert("Location not ready yet");
      return;
    }

    openMessenger(pendingCart);
    resetCheckout();
  }
};

function requestLocationImmediately() {
  const step = document.getElementById("locationStep");
  step.style.display = "block";

  if (!navigator.geolocation) {
    fallbackMap();
    return;
  }

  let resolved = false;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      resolved = true;
      initMap(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      fallbackMap();
    },
    {
      enableHighAccuracy: true,
      timeout: 7000,       // 👈 REQUIRED for iOS
      maximumAge: 0
    }
  );

  // ⏱ HARD FAILSAFE (older iPhones)
  setTimeout(() => {
    if (!resolved) fallbackMap();
  }, 8000);
}


function fallbackMap() {
  // Manila default (change if needed)
  const fallbackLat = 14.5995;
  const fallbackLng = 120.9842;

  initMap(fallbackLat, fallbackLng);
}



function openLocationStep() {
  const step = document.getElementById("locationStep");
  step.style.display = "block";

  if (!navigator.geolocation) {
    alert("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      initMap(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      alert("Please allow location access");
      console.error(err);
    },
    { enableHighAccuracy: true }
  );
}


function initMap(lat, lng) {
  if (!map) {
    map = L.map("map").setView([lat, lng], 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    // Track map center as selected location
    map.on("moveend", () => {
      const center = map.getCenter();
      selectedLat = center.lat;
      selectedLng = center.lng;
    });
  } else {
    map.setView([lat, lng], 16);
  }

  selectedLat = lat;
  selectedLng = lng;
}




