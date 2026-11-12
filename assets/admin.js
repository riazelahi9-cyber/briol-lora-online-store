(() => {
const cfg=window.BRIOLLORA_CONFIG||{},$=id=>document.getElementById(id),statuses=["Pending","Confirmed","Shipped","Out for Delivery","Delivered","Cancelled"];
if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){$("adminState").textContent="Admin service is not configured.";return;}
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"Rs. "+Number(n||0).toLocaleString("en-PK");
function login(message){$("adminLogin").hidden=false;$("adminPanel").hidden=true;$("adminState").textContent=message;}
async function guard(){
 const {data:{session}}=await db.auth.getSession();
 if(!session){login("Sign in with your administrator account.");return;}
 const {data:role,error}=await db.from("user_roles").select("role").eq("user_id",session.user.id).maybeSingle();
 if(error||role?.role!=="admin"){await db.auth.signOut();login("Access denied. This account does not have the admin role.");return;}
 $("adminLogin").hidden=true;$("adminPanel").hidden=false;$("adminEmail").textContent=session.user.email||"Administrator";await loadOrders();
}
async function loadOrders(){
 $("adminState").textContent="Loading orders…";
 const {data,error}=await db.from("orders").select("id,order_number,customer_id,full_name,phone,country,city,address,order_type,notes,product_subtotal,discount_amount,coupon_code,total_amount,status,payment_method,payment_status,payment_provider,payment_reference,courier,tracking_number,created_at,order_items(id,product_name,quantity,unit_price)").order("created_at",{ascending:false}).limit(200);
 if(error){$("adminState").textContent="Could not load orders: "+error.message;return;}
 const orders=data||[];$("adminState").textContent=orders.length+" orders";
 $("orderCards").innerHTML=orders.length?orders.map(o=>`<article class="admin-order"><div class="admin-order-head"><div><span class="admin-kicker">ORDER #${esc(o.order_number||o.id.slice(0,8))}</span><h2>${esc(o.full_name)}</h2><p>${o.customer_id?"Registered customer":"Guest checkout"} · ${new Date(o.created_at).toLocaleString("en-PK")}</p></div><strong>${money(o.total_amount)}</strong></div>
 <div class="admin-order-grid"><div><b>Payment</b><p>Method: ${esc(o.payment_method||"cod").toUpperCase()}<br>Status: ${esc(o.payment_status||"unpaid")}<br>Provider: ${esc(o.payment_provider||"—")}<br>Reference: ${esc(o.payment_reference||"—")}</p><b>Order totals</b><p>Products: ${money(o.product_subtotal)}<br>${o.discount_amount?("Coupon "+esc(o.coupon_code)+": -"+money(o.discount_amount)+"<br>"):""}Shipping: ${money(399)}<br>Grand total: ${money(o.total_amount)}</p><b>Customer & delivery</b><p>${esc(o.phone)}<br>${esc(o.country)} · ${esc(o.city)}</p><p>${esc(o.address)}</p><p>${esc(o.order_type)}</p>${o.notes?`<p>Notes: ${esc(o.notes)}</p>`:""}</div><div><b>Items</b>${(o.order_items||[]).map(i=>`<p>${esc(i.product_name)} × ${i.quantity} — ${money(i.unit_price*i.quantity)}</p>`).join("")||"<p>No items</p>"}</div></div>
 <div class="admin-order-actions"><label>Status<select data-status="${esc(o.id)}">${statuses.map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></label><label>Courier<input data-courier="${esc(o.id)}" value="${esc(o.courier||"")}" placeholder="Courier name"></label><label>Tracking number<input data-tracking="${esc(o.id)}" value="${esc(o.tracking_number||"")}" placeholder="Tracking number"></label><button class="admin-save" data-save="${esc(o.id)}">Save updates</button></div></article>`).join(""):"<p>No orders found yet.</p>";
 document.querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>saveOrder(b.dataset.save,b)));
}

async function loadCustomers(){
 const box=$("customerCards");box.innerHTML='<p class="admin-subtitle">Loading customers…</p>';$("customerState").textContent="Loading registered accounts…";
 const [{data:customers,error:customerError},{data:orderRows,error:orderError}]=await Promise.all([
  db.from("profiles").select("id,email,full_name,phone,created_at").order("created_at",{ascending:false}).limit(1000),
  db.from("orders").select("customer_id").not("customer_id","is",null).limit(5000)
 ]);
 if(customerError){$("customerState").textContent="Could not load customers: "+customerError.message;box.innerHTML="";return;}
 if(orderError){$("customerState").textContent="Customers loaded, but order counts could not be read: "+orderError.message;return;}
 const counts={};(orderRows||[]).forEach(o=>{if(o.customer_id)counts[o.customer_id]=(counts[o.customer_id]||0)+1;});
 $("customerState").textContent=(customers||[]).length+" registered accounts";
 box.innerHTML=customers?.length?customers.map(c=>`<article class="customer-card"><div><h3>${esc(c.full_name||"Name not added")}</h3><p>${esc(c.email||"Email unavailable")}</p><p>WhatsApp: ${esc(c.phone||"Not provided")}</p><small>Joined: ${c.created_at?new Date(c.created_at).toLocaleDateString("en-PK"):"—"}</small></div><strong>${counts[c.id]||0} order${counts[c.id]===1?"":"s"}</strong></article>`).join(""):"<p>No registered customer profiles found yet.</p>";
}
async function saveOrder(id,button){
 const status=document.querySelector(`[data-status="${CSS.escape(id)}"]`).value,courier=document.querySelector(`[data-courier="${CSS.escape(id)}"]`).value.trim(),tracking_number=document.querySelector(`[data-tracking="${CSS.escape(id)}"]`).value.trim();
 button.disabled=true;button.textContent="Saving…";
 const {error}=await db.from("orders").update({status,courier:courier||null,tracking_number:tracking_number||null,updated_at:new Date().toISOString()}).eq("id",id);
 button.disabled=false;button.textContent=error?"Try again":"Saved";
 $("adminState").textContent=error?"Update failed: "+error.message:"Order updated.";
}
$("adminLoginForm").addEventListener("submit",async e=>{e.preventDefault();$("adminLoginButton").disabled=true;$("adminState").textContent="Signing in…";const {error}=await db.auth.signInWithPassword({email:$("adminEmailInput").value.trim(),password:$("adminPasswordInput").value});$("adminLoginButton").disabled=false;if(error){$("adminState").textContent=error.message;return;}await guard();});
$("adminRefresh").addEventListener("click",loadOrders);
$("customerRefresh").addEventListener("click",loadCustomers);
$("showOrders").addEventListener("click",()=>{$("ordersSection").hidden=false;$("customersSection").hidden=true;$("showOrders").classList.add("active");$("showCustomers").classList.remove("active");});
$("showCustomers").addEventListener("click",()=>{$("ordersSection").hidden=true;$("customersSection").hidden=false;$("showCustomers").classList.add("active");$("showOrders").classList.remove("active");loadCustomers();});$("adminLogout").addEventListener("click",async()=>{await db.auth.signOut();login("You have logged out.");});
db.auth.onAuthStateChange(()=>setTimeout(guard,0));guard();
})();