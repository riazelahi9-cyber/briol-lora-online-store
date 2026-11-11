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
 const {data,error}=await db.from("orders").select("id,order_number,full_name,phone,country,city,address,order_type,notes,total_amount,status,payment_method,payment_status,payment_provider,payment_reference,courier,tracking_number,created_at,order_items(id,product_name,quantity,unit_price)").order("created_at",{ascending:false}).limit(200);
 if(error){$("adminState").textContent="Could not load orders: "+error.message;return;}
 const orders=data||[];$("adminState").textContent=orders.length+" orders";
 $("orderCards").innerHTML=orders.length?orders.map(o=>`<article class="admin-order"><div class="admin-order-head"><div><span class="admin-kicker">ORDER #${esc(o.order_number||o.id.slice(0,8))}</span><h2>${esc(o.full_name)}</h2><p>${new Date(o.created_at).toLocaleString("en-PK")}</p></div><strong>${money(o.total_amount)}</strong></div>
 <div class="admin-order-grid"><div><b>Payment</b><p>Method: ${esc(o.payment_method||"cod").toUpperCase()}<br>Status: ${esc(o.payment_status||"unpaid")}<br>Provider: ${esc(o.payment_provider||"—")}<br>Reference: ${esc(o.payment_reference||"—")}</p><b>Customer & delivery</b><p>${esc(o.phone)}<br>${esc(o.country)} · ${esc(o.city)}</p><p>${esc(o.address)}</p><p>${esc(o.order_type)}</p>${o.notes?`<p>Notes: ${esc(o.notes)}</p>`:""}</div><div><b>Items</b>${(o.order_items||[]).map(i=>`<p>${esc(i.product_name)} × ${i.quantity} — ${money(i.unit_price*i.quantity)}</p>`).join("")||"<p>No items</p>"}</div></div>
 <div class="admin-order-actions"><label>Status<select data-status="${esc(o.id)}">${statuses.map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></label><label>Courier<input data-courier="${esc(o.id)}" value="${esc(o.courier||"")}" placeholder="Courier name"></label><label>Tracking number<input data-tracking="${esc(o.id)}" value="${esc(o.tracking_number||"")}" placeholder="Tracking number"></label><button class="admin-save" data-save="${esc(o.id)}">Save updates</button></div></article>`).join(""):"<p>No orders found yet.</p>";
 document.querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>saveOrder(b.dataset.save,b)));
}
async function saveOrder(id,button){
 const status=document.querySelector(`[data-status="${CSS.escape(id)}"]`).value,courier=document.querySelector(`[data-courier="${CSS.escape(id)}"]`).value.trim(),tracking_number=document.querySelector(`[data-tracking="${CSS.escape(id)}"]`).value.trim();
 button.disabled=true;button.textContent="Saving…";
 const {error}=await db.from("orders").update({status,courier:courier||null,tracking_number:tracking_number||null,updated_at:new Date().toISOString()}).eq("id",id);
 button.disabled=false;button.textContent=error?"Try again":"Saved";
 $("adminState").textContent=error?"Update failed: "+error.message:"Order updated.";
}
$("adminLoginForm").addEventListener("submit",async e=>{e.preventDefault();$("adminLoginButton").disabled=true;$("adminState").textContent="Signing in…";const {error}=await db.auth.signInWithPassword({email:$("adminEmailInput").value.trim(),password:$("adminPasswordInput").value});$("adminLoginButton").disabled=false;if(error){$("adminState").textContent=error.message;return;}await guard();});
$("adminRefresh").addEventListener("click",loadOrders);$("adminLogout").addEventListener("click",async()=>{await db.auth.signOut();login("You have logged out.");});
db.auth.onAuthStateChange(()=>setTimeout(guard,0));guard();
})();