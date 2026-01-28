import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

      const SUPABASE_URL = "https://prteyzbjjzkfyogphwrg.supabase.co";
      const SUPABASE_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydGV5emJqanprZnlvZ3Bod3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODI0MTYsImV4cCI6MjA4NTA1ODQxNn0.VWJS8IcAhXSucmgQiOw9fpl79apwCYOmTdaC31_Invw";

      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

      const menuEl = document.getElementById("menu");
      const stateEl = document.getElementById("state");
      const searchInput = document.getElementById("searchInput");
      const priceFilter = document.getElementById("priceFilter");

      const modalOverlay = document.getElementById("modalOverlay");
      const modalImg = document.getElementById("modalImg");
      const modalTitle = document.getElementById("modalTitle");
      const modalPrice = document.getElementById("modalPrice");
      const modalDesc = document.getElementById("modalDesc");
      const closeModal = document.getElementById("closeModal");

      closeModal.onclick = () => {
        modalOverlay.classList.remove("active");
      };

      // Prevent clicks inside modal from bubbling to overlay / menu
      document.querySelector(".modal").onclick = (e) => {
        e.stopPropagation();
      };

      let allItems = [];

      let activeItem = null;

      /* ==============================
         FETCH + RENDER
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

          card.dataset.id = item.id; // ✅ ADD THIS LINE
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
              <div class="desc clamp">
                ${item.description || ""}
              </div>
              <div class="card-actions">
  <button class="add-cart">Add to Cart</button>
  <!-- <button class="order-now">Order</button> -->
</div>

            </div>
          `;

          menuEl.appendChild(card);
        });
      }

      /* ==============================
         SEARCH + SORT
      ============================== */

      function applyFilters() {
        const term = searchInput.value.toLowerCase().trim();
        const sort = priceFilter.value;

        let filtered = allItems.filter(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            (item.description || "").toLowerCase().includes(term),
        );

        if (sort === "low-high") {
          filtered.sort((a, b) => a.price - b.price);
        }

        if (sort === "high-low") {
          filtered.sort((a, b) => b.price - a.price);
        }

        renderItems(filtered);
      }

      clearSearch.onclick = () => {
        searchInput.value = "";
        applyFilters();
        searchInput.focus();
      };

      searchInput.addEventListener("input", applyFilters);
      priceFilter.addEventListener("change", applyFilters);

      /* ==============================
         MODAL
      ============================== */

      menuEl.addEventListener("click", (e) => {
        if (modalOverlay.classList.contains("active")) return;

        const card = e.target.closest(".card");
        if (!card) return;

        // ❌ Prevent modal opening when clicking buttons
        if (
          e.target.classList.contains("add-cart") ||
          e.target.classList.contains("order-now")
        ) {
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
        modalDesc.textContent =
          card.dataset.desc || "No description available.";

        modalOverlay.classList.add("active");
      });

      /* ==============================
   INIT
============================== */

      fetchItems();

      const cartBtn = document.getElementById("cartBtn");
      const cartDrawer = document.getElementById("cartDrawer");
      const closeCart = document.getElementById("closeCart");
      const cartItemsEl = document.getElementById("cartItems");
      const cartTotalEl = document.getElementById("cartTotal");
      const cartCountEl = document.getElementById("cartCount");
      const checkoutBtn = document.getElementById("checkoutBtn");
      const cartOverlay = document.getElementById("cartOverlay");

      let cart = [];

      /* OPEN CART */
      cartBtn.onclick = () => {
        cartDrawer.classList.add("active");
        cartOverlay.classList.add("active");
        document.body.classList.add("cart-open");
      };

      /* CLOSE CART */
      function closeCartDrawer() {
        cartDrawer.classList.remove("active");
        cartOverlay.classList.remove("active");
        document.body.classList.remove("cart-open");
      }

      closeCart.onclick = closeCartDrawer;

      /* CLICK OUTSIDE = CLOSE */
      cartOverlay.onclick = closeCartDrawer;

      /* PREVENT INSIDE CLICKS FROM CLOSING */
      cartDrawer.onclick = (e) => {
        e.stopPropagation();
      };

      /* ==============================
   CART LOGIC
============================== */

      const modalAddCart = document.getElementById("modalAddCart");
      const modalOrderNow = document.getElementById("modalOrderNow");

      modalAddCart.onclick = () => {
        if (!activeItem) return;
        addToCart(activeItem);
        cartDrawer.classList.add("active"); // nice UX
      };

      modalOrderNow.onclick = () => {
        if (!activeItem) return;
        openMessenger([{ ...activeItem, qty: 1 }]);
      };

      function addToCart(item) {
        const existing = cart.find((i) => i.id === item.id);

        if (existing) {
          existing.qty++;
        } else {
          cart.push({ ...item, qty: 1 });
        }

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

        if (item.qty > 1) {
          item.qty--;
        } else {
          removeFromCart(id);
          return;
        }

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

        <button
          class="cart-remove"
          onclick="removeFromCart('${item.id}')">
          ×
        </button>
      </div>
    `;
        });

        cartTotalEl.textContent = `${total}`;
        cartCountEl.textContent = count;
      }

      /* ==============================
   MENU BUTTON HANDLERS
============================== */

      menuEl.addEventListener("click", (e) => {
        const card = e.target.closest(".card");
        if (!card) return;

        const item = {
          id: card.dataset.id,
          name: card.dataset.name,
          price: Number(card.dataset.price),
        };

        if (e.target.classList.contains("add-cart")) {
          addToCart(item);
        }

        if (e.target.classList.contains("order-now")) {
          openMessenger([{ ...item, qty: 1 }]);
        }
      });

      /* ==============================
   CHECKOUT
============================== */

      checkoutBtn.onclick = () => {
        openMessenger(cart);
      };

      /* ==============================
   MESSENGER ORDER
============================== */

      function openMessenger(items) {
        if (!items.length) return;

        let message = "🧾 Order from Web Kiosk:\n\n";
        let total = 0;

        items.forEach((item, i) => {
          const lineTotal = item.price * item.qty;
          message += `${i + 1}. ${item.name} × ${item.qty} — ₱${lineTotal}\n`;
          total += lineTotal;
        });

        message += `\nTotal: ₱${total}`;

        const url = `https://m.me/Phrimeuniverse?text=${encodeURIComponent(message)}`;
        window.open(url, "_blank");
      }

      window.addToCart = addToCart;
      window.removeFromCart = removeFromCart;
      window.increaseQty = increaseQty;
      window.decreaseQty = decreaseQty;