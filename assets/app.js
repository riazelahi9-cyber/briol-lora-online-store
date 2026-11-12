/* Load shared social icons after storefront config is available. */
(() => { const s=document.createElement("script"); s.src="assets/social.js"; s.defer=true; document.head.appendChild(s); })();
let products=[],activeCategory="All",searchTerm="",cart=[],selectedProduct=null,directCheckout=false;
const pageCategory=document.body.dataset.category||"all";
const money=n=>"Rs. "+Number(n||0).toLocaleString("en-PK",{maximumFractionDigits:0});
const $=id=>document.getElementById(id);
function safeImage(url){return url||"https://placehold.co/600x700/f4f0eb/8d7770?text=BRIOLLORA"}
function productPagePath(p){const slug=String(p.name||"product").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,65);return "products/"+slug+"-"+p.id+".html"}
function priceLabel(p){return p.minPrice===p.maxPrice?money(p.minPrice):money(p.minPrice)+" – "+money(p.maxPrice)}
function categories(){return ["All",...new Set(products.map(p=>p.category))]}
function renderFilters(){if(!$("categoryFilters"))return;$("categoryFilters").innerHTML=categories().map(c=>`<button class="filter-btn ${c===activeCategory?"active":""}" data-cat="${c}">${c}</button>`).join("");document.querySelectorAll(".filter-btn").forEach(b=>b.addEventListener("click",()=>{activeCategory=b.dataset.cat;renderFilters();renderProducts()}))}
function belongsToPage(p){const n=(p.name||"").toLowerCase(),c=(p.category||"").toLowerCase();if(pageCategory==="all")return true;if(pageCategory==="jewellery")return c==="jewellery";if(pageCategory==="hair")return c==="hair accessories";if(pageCategory==="diy")return c==="diy supplies";if(pageCategory==="bags")return c.includes("bags")||/\b(bag|tote|purse|handbag)\b/.test(n);if(pageCategory==="gifts")return c==="accessories";return true}
function filtered(){let list=products.filter(p=>belongsToPage(p)&&(activeCategory==="All"||p.category===activeCategory)&&(`${p.name} ${p.description} ${p.category}`).toLowerCase().includes(searchTerm));let sort=$("sortSelect").value;if(sort==="low")list.sort((a,b)=>a.minPrice-b.minPrice);if(sort==="high")list.sort((a,b)=>b.minPrice-a.minPrice);if(sort==="az")list.sort((a,b)=>a.name.localeCompare(b.name));return list}
function renderProducts(){let list=filtered();$("resultsCount").textContent=`Showing ${list.length} of ${products.length} products`;$("emptyState").hidden=!!list.length;$("productGrid").innerHTML=list.map(p=>`<article class="product-card" data-id="${p.id}"><div class="product-image"><a class="product-image-link" data-product-link="${p.id}" href="${productPagePath(p)}" aria-label="View ${esc(p.name)}"><img loading="lazy" src="${safeImage(p.image)}" alt="${esc(p.name)}" onerror="this.src='https://placehold.co/600x700/f4f0eb/8d7770?text=BRIOLLORA'"></a><span class="product-label">${p.category}</span><button class="quick-add" data-quick="${p.id}">VIEW OPTIONS +</button></div><h3 class="product-name"><a class="product-seo-link" data-product-link="${p.id}" href="${productPagePath(p)}">${esc(p.name)}</a></h3><div class="product-meta"><span class="price">${priceLabel(p)}</span><span class="category-label">${p.variants.length} option${p.variants.length===1?"":"s"}</span></div></article>`).join("");document.querySelectorAll(".product-card").forEach(c=>c.addEventListener("click",()=>openProduct(c.dataset.id)));document.querySelectorAll("[data-product-link]").forEach(a=>a.addEventListener("click",e=>e.stopPropagation()));document.querySelectorAll("[data-quick]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();openProduct(b.dataset.quick)}))}
function esc(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openProduct(id){selectedProduct=products.find(p=>p.id===String(id));if(!selectedProduct)return;$("modalImage").src=safeImage(selectedProduct.image);$("modalImage").alt=selectedProduct.name;$("modalCategory").textContent=selectedProduct.category;$("modalName").textContent=selectedProduct.name;$("modalDescription").textContent=selectedProduct.description;$("variantSelect").innerHTML=selectedProduct.variants.map((v,i)=>`<option value="${i}">${esc(v.label)} — ${money(v.price)}${v.stock<=0?" (out of stock)":""}</option>`).join("");$("addToBag").textContent=directCheckout?"Continue to checkout":"Add to bag";updateModalPrice();$("productModalBackdrop").classList.add("show")}
function updateModalPrice(){if(!selectedProduct)return;let v=selectedProduct.variants[Number($("variantSelect").value)||0];$("modalPrice").textContent=money(v.price);$("modalStock").textContent=v.stock>0?`${v.stock} shown in seller stock export (confirm availability before order)`:"Stock not available in export; ask before ordering";$("addToBag").disabled=v.stock<=0}
function addCart(p,v){let key=p.id+"_"+v.label;let item=cart.find(x=>x.key===key);if(item)item.qty++;else cart.push({key,id:p.id,name:p.name,image:p.image,variant:v.label,price:v.price,qty:1});renderCart();$("productModalBackdrop").classList.remove("show");if(directCheckout){directCheckout=false;checkout()}else openCart()}
function renderCart(){const subtotal=cart.reduce((n,x)=>n+x.price*x.qty,0),shipping=cart.length?399:0;$("cartCount").textContent=cart.reduce((n,x)=>n+x.qty,0);$("cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-row"><img src="${safeImage(x.image)}" alt=""><div><strong>${esc(x.name)}</strong><small>${esc(x.variant)}</small><div class="qty-controls"><button data-qty="${x.key}" data-change="-1">−</button><span>${x.qty}</span><button data-qty="${x.key}" data-change="1">+</button></div></div><span class="line-price">${money(x.price*x.qty)}</span></div>`).join(""):`<p class="cart-empty">Your bag is waiting for something lovely.</p>`;$("cartSubtotal").textContent=money(subtotal);$("cartShipping").textContent=money(shipping);$("cartTotal").textContent=money(subtotal+shipping);document.querySelectorAll("[data-qty]").forEach(b=>b.addEventListener("click",()=>{let x=cart.find(i=>i.key===b.dataset.qty);if(x){x.qty+=Number(b.dataset.change);if(x.qty<1)cart=cart.filter(i=>i!==x);renderCart()}}))}
function openCart(){$("cartDrawer").classList.add("open");$("drawerBackdrop").classList.add("show")}
function closeCart(){$("cartDrawer").classList.remove("open");$("drawerBackdrop").classList.remove("show")}
function setupPaymentOptions(){const form=$("orderForm");if(!form||form.querySelector("#paymentOptions"))return;const orderType=form.querySelector('[name="orderType"]')?.closest("label");if(!orderType)return;orderType.insertAdjacentHTML("afterend",`<fieldset class="payment-options full-field" id="paymentOptions"><legend>Payment method</legend><label class="payment-choice"><input type="radio" name="paymentMethod" value="cod" checked><span><strong>Cash on Delivery</strong><small>Available now · Order sent on WhatsApp</small></span></label><div class="payment-coming"><strong>Online payments — Coming Soon</strong><span>JazzCash · Easypaisa · Visa · Mastercard</span></div></fieldset><label class="full-field coupon-entry">Signup discount coupon <span class="coupon-offer">Create an account and get Rs. 100 off your first order.</span><input id="couponCode" name="couponCode" maxlength="30" autocomplete="off" placeholder="Enter WELCOME100"><small>WELCOME100 · Registered customers only · One-time use · Discount applies to products, not shipping.</small></label>`)}
async function prefillCheckoutProfile(){
try{
const cfg=window.BRIOLLORA_CONFIG||{};
if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)return;
const client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const {data:sessionData}=await client.auth.getSession();
const session=sessionData?.session;
if(!session?.user?.id)return;
const {data:profile,error}=await client.from("profiles").select("full_name,phone").eq("id",session.user.id).maybeSingle();
if(error)throw error;
const form=$("orderForm");
if(profile?.full_name)form.elements.namedItem("name").value=profile.full_name;
if(profile?.phone)form.elements.namedItem("phone").value=profile.phone;
}catch(error){console.warn("Could not prefill saved checkout profile:",error.message||error)}
}
async function checkout(){if(!cart.length){alert("Your bag is empty. Please add a product first.");return}setupPaymentOptions();closeCart();await prefillCheckoutProfile();$("orderModalBackdrop").classList.add("show")}
async function sendOrder(e){
e.preventDefault();if(!cart.length){alert("Your bag is empty.");return}
const cfg=window.BRIOLLORA_CONFIG||{};if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){alert("Checkout is not configured.");return}
const client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY),{data:s}=await client.auth.getSession(),session=s?.session;
const form=e.target,fd=new FormData(form),btn=form.querySelector('button[type="submit"]'),number=(cfg.WHATSAPP_NUMBER||"").replace(/\D/g,""),couponCode=String(fd.get("couponCode")||"").trim().toUpperCase();if(!number){alert("WhatsApp is not configured.");return}
const tab=window.open("about:blank","_blank");if(btn)btn.disabled=true;
const customer={name:String(fd.get("name")||"").trim(),phone:String(fd.get("phone")||"").trim(),country:String(fd.get("country")||"").trim(),city:String(fd.get("city")||"").trim(),address:String(fd.get("address")||"").trim(),order_type:String(fd.get("orderType")||"").trim(),notes:String(fd.get("notes")||"").trim()};
try{const headers={"Content-Type":"application/json","apikey":cfg.SUPABASE_PUBLISHABLE_KEY};if(session?.access_token)headers.Authorization="Bearer "+session.access_token;
const r=await fetch(cfg.SUPABASE_URL+"/functions/v1/create-order",{method:"POST",headers,body:JSON.stringify({customer,payment_method:"cod",coupon_code:couponCode,items:cart.map(x=>({product_id:String(x.id),variant_label:String(x.variant),quantity:Number(x.qty)}))})});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||"Could not save your order.");
const o=data.order,lines=(data.items||[]).map(x=>"- "+x.product_name+" | Qty "+x.quantity+" | "+money(x.unit_price*x.quantity));
const msg="NEW BRIOLLORA ORDER\nOrder #"+o.order_number+"\nPayment: Cash on Delivery\n\nCustomer: "+customer.name+"\nWhatsApp: "+customer.phone+"\nCountry: "+customer.country+"\nCity: "+customer.city+"\nAddress: "+customer.address+"\nOrder type: "+customer.order_type+"\n\nITEMS\n"+lines.join("\n")+"\n\nProduct subtotal: "+money(data.product_subtotal)+"\n"+(data.discount_amount?"Coupon "+data.coupon_code+" discount: -"+money(data.discount_amount)+"\n":"")+"Shipping: "+money(data.shipping_amount)+"\nGrand total: "+money(o.total_amount)+"\nNotes: "+(customer.notes||"None")+"\n\nPlease confirm stock and delivery details.";
const wa="https://wa.me/"+number+"?text="+encodeURIComponent(msg);$("orderModalBackdrop").classList.remove("show");cart=[];renderCart();if(tab)tab.location.href=wa;else location.href=wa;alert("Order #"+o.order_number+" saved successfully.");
}catch(err){if(tab)tab.close();alert(err.message||"Checkout failed.");}finally{if(btn)btn.disabled=false}
}

function setupSearch(){
  const toggle = $("searchToggle");
  const wrap = $("searchWrap");
  const input = $("searchInput");

  if(!toggle || !wrap || !input) return;

  toggle.addEventListener("click",()=>{
    document.getElementById("shop")?.scrollIntoView({
      behavior:"smooth",
      block:"start"
    });

    wrap.classList.add("search-highlight");
    input.focus({preventScroll:true});

    window.setTimeout(()=>{
      wrap.classList.remove("search-highlight");
    },1200);
  });
}
async function init(){setupSearch();try{let res=await fetch("data/products.json");products=await res.json();renderFilters();renderProducts();const params=new URLSearchParams(location.search);directCheckout=false;const requestedProduct=params.get("product");if(requestedProduct)openProduct(requestedProduct)}catch(e){$("resultsCount").textContent="Could not load product catalogue. Please run this website through a web host or local server."}}
$("searchInput").addEventListener("input",e=>{searchTerm=e.target.value.toLowerCase().trim();renderProducts()});$("sortSelect").addEventListener("change",renderProducts);$("cartOpen").addEventListener("click",openCart);$("cartClose").addEventListener("click",closeCart);$("drawerBackdrop").addEventListener("click",closeCart);$("whatsappCheckout").addEventListener("click",checkout);$("variantSelect").addEventListener("change",updateModalPrice);$("addToBag").addEventListener("click",()=>{if(selectedProduct){let v=selectedProduct.variants[Number($("variantSelect").value)||0];if(v.stock>0)addCart(selectedProduct,v)}});$("modalClose").addEventListener("click",()=>$("productModalBackdrop").classList.remove("show"));$("productModalBackdrop").addEventListener("click",e=>{if(e.target===$("productModalBackdrop"))$("productModalBackdrop").classList.remove("show")});$("menuToggle").addEventListener("click",()=>{let nav=document.querySelector(".desktop-nav");nav.style.display=nav.style.display==="flex"?"none":"flex";nav.style.position="absolute";nav.style.top="68px";nav.style.left="0";nav.style.right="0";nav.style.padding="18px";nav.style.background="#fffdf9";nav.style.flexDirection="column";nav.style.gap="18px"});$("year").textContent=new Date().getFullYear();init();
$("orderClose").addEventListener("click",()=>$("orderModalBackdrop").classList.remove("show"));$("orderModalBackdrop").addEventListener("click",e=>{if(e.target===$("orderModalBackdrop"))$("orderModalBackdrop").classList.remove("show")});$("orderForm").addEventListener("submit",sendOrder);
