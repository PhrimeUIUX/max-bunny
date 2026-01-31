import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

      const SUPABASE_URL = "https://prteyzbjjzkfyogphwrg.supabase.co";
      const SUPABASE_KEY =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBydGV5emJqanprZnlvZ3Bod3JnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0ODI0MTYsImV4cCI6MjA4NTA1ODQxNn0.VWJS8IcAhXSucmgQiOw9fpl79apwCYOmTdaC31_Invw";

      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      const BRANDING_ID = "11327357-0269-422d-ae06-3f3835868e85";

      // State
      let editingItemId = null;
      let oldImagePath = null;
      let pendingDeleteId = null;
      let statusTimeout;

      // Elements
      const loginScreen = document.getElementById("loginScreen");
      const dashboardScreen = document.getElementById("dashboardScreen");

      const emailEl = document.getElementById("email");
      const passwordEl = document.getElementById("password");
      const loginBtn = document.getElementById("loginBtn");

      const menuTableBody = document.getElementById("menuTableBody");
      const emptyState = document.getElementById("emptyState");

      const itemModal = document.getElementById("itemModal");
      const modalTitle = document.getElementById("modalTitle");
      const itemName = document.getElementById("itemName");
      const itemPrice = document.getElementById("itemPrice");
      const itemDescription = document.getElementById("itemDescription");
      const itemImage = document.getElementById("itemImage");
      const itemImagePreview = document.getElementById("itemImagePreview");
      const saveItemBtn = document.getElementById("saveItemBtn");
      const cancelItemBtn = document.getElementById("cancelItemBtn");

      const deleteModal = document.getElementById("deleteModal");
      const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
      const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

      const logoutModal = document.getElementById("logoutModal");
      const logoutBtn = document.getElementById("logoutBtn");
      const confirmLogoutBtn = document.getElementById("confirmLogoutBtn");
      const cancelLogoutBtn = document.getElementById("cancelLogoutBtn");

      const brandNameInput = document.getElementById("brandNameInput");
      const brandSloganInput = document.getElementById("brandSloganInput");
      const brandLogoInput = document.getElementById("brandLogoInput");
      const brandLogoPreview = document.getElementById("brandLogoPreview");
      const saveBrandingBtn = document.getElementById("saveBrandingBtn");

      const statusToast = document.getElementById("statusToast");
      const statusMessage = document.getElementById("statusMessage");

      // ============================================
      // NAVIGATION
      // ============================================

      document.querySelectorAll(".nav-item").forEach((item) => {
        item.addEventListener("click", () => {
          const section = item.dataset.section;

          // Update nav active state
          document.querySelectorAll(".nav-item").forEach((n) => {
            n.classList.remove("active");
          });
          item.classList.add("active");

          // Update sections
          document.querySelectorAll(".section").forEach((s) => {
            s.classList.remove("active");
          });

          if (section === "menu") {
            document.getElementById("menuSection").classList.add("active");
            document.getElementById("headerTitle").textContent = "Menu Items";
            document.getElementById("addItemBtn").style.display = "flex";
          } else if (section === "branding") {
            document.getElementById("brandingSection").classList.add("active");
            document.getElementById("headerTitle").textContent = "Branding";
            document.getElementById("addItemBtn").style.display = "none";
          }
        });
      });

      // ============================================
      // STATUS TOAST
      // ============================================

      function showStatus(message, isSuccess = true, duration = 3000) {
        if (statusTimeout) clearTimeout(statusTimeout);

        statusMessage.textContent = message;
        statusToast.className = `status-toast ${isSuccess ? "success" : "error"} show`;

        statusTimeout = setTimeout(() => {
          statusToast.classList.remove("show");
        }, duration);
      }

      // ============================================
      // AUTH
      // ============================================

      supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          loginScreen.style.display = "none";
          dashboardScreen.style.display = "block";
          loadItems();
          loadBranding();
        } else {
          loginScreen.style.display = "flex";
          dashboardScreen.style.display = "none";
        }
      });

      async function checkSession() {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          loginScreen.style.display = "none";
          dashboardScreen.style.display = "block";
          loadItems();
          loadBranding();
        }
      }

      loginBtn.addEventListener("click", async () => {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailEl.value.trim(),
          password: passwordEl.value.trim(),
        });

        if (error) {
          showStatus(error.message, false);
        } else {
          checkSession();
        }
      });

      logoutBtn.addEventListener("click", () => {
        logoutModal.classList.add("show");
      });

      cancelLogoutBtn.addEventListener("click", () => {
        logoutModal.classList.remove("show");
      });

      confirmLogoutBtn.addEventListener("click", async () => {
        logoutModal.classList.remove("show");
        await supabase.auth.signOut();
        showStatus("Logged out successfully");
      });

      // ============================================
      // BRANDING
      // ============================================

      async function loadBranding() {
        const { data, error } = await supabase
          .from("menu_settings")
          .select("*")
          .eq("id", BRANDING_ID)
          .single();

        if (error) {
          console.error(error);
          return;
        }

        const brandName = data.brand || "Admin";
        const slogan = data.slogan || "Dashboard";
        const logoUrl = data.logo_url
          ? data.logo_url + "?t=" + Date.now()
          : "";

        // Update all brand elements
        brandNameInput.value = brandName;
        brandSloganInput.value = slogan;

        document.getElementById("loginBrand").textContent = brandName;
        document.getElementById("loginSlogan").textContent =
          slogan || "Sign in to manage your menu";
        document.getElementById("sidebarBrand").textContent = brandName;
        document.getElementById("sidebarSlogan").textContent = slogan;
        document.getElementById("brandingPreviewName").textContent = brandName;
        document.getElementById("brandingPreviewSlogan").textContent = slogan;

        if (logoUrl) {
          document.getElementById("loginLogo").src = logoUrl;
          document.getElementById("sidebarLogo").src = logoUrl;
          document.getElementById("brandingPreviewLogo").src = logoUrl;
        }
      }

      brandLogoInput.addEventListener("change", () => {
        if (!brandLogoInput.files[0]) return;

        const file = brandLogoInput.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
          brandLogoPreview.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
        };

        reader.readAsDataURL(file);
      });

      saveBrandingBtn.addEventListener("click", async () => {
        try {
          saveBrandingBtn.disabled = true;
          saveBrandingBtn.innerHTML =
            '<span class="spinner"></span> Saving...';

          const { data: existing, error: fetchErr } = await supabase
            .from("menu_settings")
            .select("logo_path")
            .eq("id", BRANDING_ID)
            .single();

          if (fetchErr) throw fetchErr;

          let logo_path = existing.logo_path || null;
          let logo_url = null;

          if (brandLogoInput.files[0]) {
            const file = brandLogoInput.files[0];

            if (logo_path) {
              await supabase.storage.from("menu-images").remove([logo_path]);
            }

            logo_path = `logo/brand-${Date.now()}.jpg`;

            const upload = await supabase.storage
              .from("menu-images")
              .upload(logo_path, file, {
                contentType: file.type,
                upsert: false,
              });

            if (upload.error) throw upload.error;

            const { data: pub } = supabase.storage
              .from("menu-images")
              .getPublicUrl(logo_path);

            logo_url = pub.publicUrl;
          }

          const { error } = await supabase
            .from("menu_settings")
            .update({
              brand: brandNameInput.value.trim(),
              slogan: brandSloganInput.value.trim(),
              ...(logo_path && logo_url ? { logo_path, logo_url } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", BRANDING_ID);

          if (error) throw error;

          showStatus("Branding updated successfully");
          brandLogoInput.value = "";
          brandLogoPreview.innerHTML = "";
          loadBranding();
        } catch (err) {
          console.error(err);
          showStatus("Failed to save branding", false);
        } finally {
          saveBrandingBtn.disabled = false;
          saveBrandingBtn.textContent = "Save Branding";
        }
      });

      // ============================================
      // MENU ITEMS
      // ============================================

      async function loadItems() {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error(error);
          return;
        }

        if (!data || data.length === 0) {
          menuTableBody.innerHTML = "";
          emptyState.style.display = "block";
          return;
        }

        emptyState.style.display = "none";

        menuTableBody.innerHTML = data
          .map(
            (item) => `
          <tr>
            <td><img src="${item.image_url}" alt="${item.name}" class="table-image" /></td>
            <td class="table-name">${item.name}</td>
            <td class="table-price">₱${parseFloat(item.price).toFixed(2)}</td>
            <td class="table-description">${item.description || ""}</td>
            <td>
              <div class="table-actions">
                <button class="btn-icon" onclick="editItem('${item.id}')">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                </button>
                <button class="btn-icon danger" onclick="deleteItem('${item.id}')">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        `,
          )
          .join("");
      }

      document.getElementById("addItemBtn").addEventListener("click", () => {
        editingItemId = null;
        oldImagePath = null;
        modalTitle.textContent = "Add Menu Item";
        saveItemBtn.textContent = "Save Item";

        itemName.value = "";
        itemPrice.value = "";
        itemDescription.value = "";
        itemImage.value = "";
        itemImagePreview.innerHTML = "";

        itemModal.classList.add("show");
      });

      window.editItem = async (id) => {
        const { data, error } = await supabase
          .from("menu_items")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          showStatus("Failed to load item", false);
          return;
        }

        editingItemId = id;
        oldImagePath = data.image_path;
        modalTitle.textContent = "Edit Menu Item";
        saveItemBtn.textContent = "Update Item";

        itemName.value = data.name;
        itemPrice.value = data.price;
        itemDescription.value = data.description || "";
        itemImage.value = "";
        itemImagePreview.innerHTML = `<img src="${data.image_url}" alt="Current image" />`;

        itemModal.classList.add("show");
      };

      itemImage.addEventListener("change", () => {
        if (!itemImage.files[0]) return;

        const file = itemImage.files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
          itemImagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
        };

        reader.readAsDataURL(file);
      });

      cancelItemBtn.addEventListener("click", () => {
        itemModal.classList.remove("show");
      });

      saveItemBtn.addEventListener("click", async () => {
        try {
          if (!itemName.value || !itemPrice.value) {
            throw new Error("Name and price are required");
          }

          const isEditing = !!editingItemId;

          saveItemBtn.disabled = true;
          saveItemBtn.innerHTML = `<span class="spinner"></span> ${isEditing ? "Updating..." : "Saving..."}`;

          let image_url = null;
          let image_path = null;

          if (itemImage.files[0]) {
            const resizedBlob = await resizeImage(itemImage.files[0], 1500, 0.8);
            const file = new File([resizedBlob], "menu.jpg", {
              type: "image/jpeg",
            });

            const safeName = itemName.value
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "-");
            image_path = `items/${safeName}-${Date.now()}.jpg`;

            const upload = await supabase.storage
              .from("menu-images")
              .upload(image_path, file);

            if (upload.error) throw upload.error;

            const { data: img } = supabase.storage
              .from("menu-images")
              .getPublicUrl(image_path);

            image_url = img.publicUrl;
          }

          if (isEditing) {
            const updateData = {
              name: itemName.value,
              price: itemPrice.value,
              description: itemDescription.value,
            };

            if (image_url) {
              updateData.image_url = image_url;
              updateData.image_path = image_path;
            }

            const { error } = await supabase
              .from("menu_items")
              .update(updateData)
              .eq("id", editingItemId);

            if (error) throw error;

            if (image_url && oldImagePath) {
              await supabase.storage.from("menu-images").remove([oldImagePath]);
            }

            showStatus("Item updated successfully");
          } else {
            if (!image_url) throw new Error("Image is required");

            const { error } = await supabase.from("menu_items").insert({
              name: itemName.value,
              price: itemPrice.value,
              description: itemDescription.value,
              image_url,
              image_path,
            });

            if (error) throw error;

            showStatus("Item added successfully");
          }

          itemModal.classList.remove("show");
          loadItems();
        } catch (err) {
          showStatus(err.message, false);
        } finally {
          saveItemBtn.disabled = false;
          saveItemBtn.textContent = editingItemId ? "Update Item" : "Save Item";
        }
      });

      window.deleteItem = (id) => {
        pendingDeleteId = id;
        deleteModal.classList.add("show");
      };

      cancelDeleteBtn.addEventListener("click", () => {
        deleteModal.classList.remove("show");
        pendingDeleteId = null;
      });

      confirmDeleteBtn.addEventListener("click", async () => {
        if (!pendingDeleteId) return;

        try {
          confirmDeleteBtn.disabled = true;
          confirmDeleteBtn.innerHTML =
            '<span class="spinner"></span> Deleting...';

          const { data: item, error: fetchError } = await supabase
            .from("menu_items")
            .select("image_path")
            .eq("id", pendingDeleteId)
            .single();

          if (fetchError) throw fetchError;

          if (item.image_path) {
            const { error: storageError } = await supabase.storage
              .from("menu-images")
              .remove([item.image_path]);

            if (storageError) throw storageError;
          }

          const { error: deleteError } = await supabase
            .from("menu_items")
            .delete()
            .eq("id", pendingDeleteId);

          if (deleteError) throw deleteError;

          showStatus("Item deleted successfully");
          deleteModal.classList.remove("show");
          loadItems();
        } catch (err) {
          console.error(err);
          showStatus("Failed to delete item", false);
        } finally {
          confirmDeleteBtn.disabled = false;
          confirmDeleteBtn.textContent = "Delete";
          pendingDeleteId = null;
        }
      });

      // ============================================
      // IMAGE RESIZE
      // ============================================

      async function resizeImage(file, maxWidth = 1500, quality = 0.8) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          const img = new Image();

          reader.onload = (e) => (img.src = e.target.result);
          reader.onerror = reject;

          img.onload = () => {
            const scale = Math.min(1, maxWidth / img.width);
            const width = Math.round(img.width * scale);
            const height = Math.round(img.height * scale);

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) return reject(new Error("Image resize failed"));
                resolve(blob);
              },
              "image/jpeg",
              quality,
            );
          };

          img.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // Initialize
      checkSession();