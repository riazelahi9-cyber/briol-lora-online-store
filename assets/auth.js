/* BRIOLLORA customer authentication and account dashboard */
(() => {
  const cfg = window.BRIOLLORA_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_PUBLISHABLE_KEY) {
    console.error("BRIOLLORA authentication is not configured."); return;
  }
  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
  const header = document.querySelector(".header-actions"); if (!header) return;
  const button = document.createElement("button");
  button.className="account-button"; button.type="button"; button.textContent="My Account";
  header.insertBefore(button,header.querySelector("#cartOpen"));
  const modal=document.createElement("div"); modal.className="auth-backdrop";
  modal.innerHTML=`<section class="auth-panel account-panel" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <button class="close-button auth-close" type="button" aria-label="Close">×</button>
    <p class="eyebrow">Welcome to BRIOLLORA</p><h2 id="authTitle">Welcome back</h2>
    <p class="auth-subtitle" id="authSubtitle">Create an account or sign in to keep your shopping connected.</p>
    <div class="auth-actions" id="authTabs"><button class="auth-tab active" type="button" data-mode="login">Log in</button><button class="auth-tab" type="button" data-mode="signup">Create account</button></div>
    <form id="authForm">
      <div id="authNameWrap" hidden><label for="authName">Full name</label><input id="authName" maxlength="80" autocomplete="name" placeholder="Your full name"></div>
      <label for="authEmail">Email address</label><input id="authEmail" type="email" required autocomplete="email" placeholder="you@example.com">
      <label for="authPassword">Password</label><input id="authPassword" type="password" required minlength="8" autocomplete="current-password" placeholder="At least 8 characters">
      <p class="auth-message" id="authMessage" aria-live="polite"></p><button class="primary-button full-button" id="authSubmit" type="submit">Log in</button>
    </form>
    <button class="auth-link" id="forgotPassword" type="button">Forgot password?</button>
    <div id="authSignedIn" hidden>
      <p class="auth-user-email" id="authUserEmail"></p>
      <div class="account-section"><h3>My Profile</h3>
        <label for="profileName">Full name</label><input id="profileName" maxlength="80" autocomplete="name">
        <label for="profilePhone">WhatsApp number</label><input id="profilePhone" maxlength="25" autocomplete="tel" placeholder="+92...">
        <button class="primary-button full-button account-save" id="saveProfile" type="button">Save profile</button>
        <p class="auth-message" id="profileMessage" aria-live="polite"></p>
      </div>
      <div class="account-section"><div class="account-section-head"><h3>My Orders</h3><button class="auth-link" id="refreshOrders" type="button">Refresh</button></div>
        <div id="ordersList"><p class="auth-subtitle">Loading your orders…</p></div>
      </div>
      <button class="primary-button full-button" id="authLogout" type="button">Log out</button>
    </div>
  </section>`;
  document.body.appendChild(modal);
  const $=id=>document.getElementById(id); let mode="login",user=null;
  const msg=t=>$("authMessage").textContent=t||"";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function setMode(next){mode=next;document.querySelectorAll(".auth-tab").forEach(x=>x.classList.toggle("active",x.dataset.mode===mode));$("authNameWrap").hidden=mode!=="signup";$("authName").required=mode==="signup";$("authPassword").autocomplete=mode==="signup"?"new-password":"current-password";$("authSubmit").textContent=mode==="signup"?"Create account":"Log in";$("forgotPassword").hidden=mode==="signup"||!!user;$("authForm").hidden=!!user;$("authSignedIn").hidden=!user;$("authTabs").hidden=!!user;$("authTitle").textContent=user?"Your account":mode==="signup"?"Create your account":"Welcome back";$("authSubtitle").hidden=!!user;msg("");}
  function render(u){user=u||null;button.textContent=user?"My Account ✓":"My Account";$("authForm").hidden=!!user;$("authSignedIn").hidden=!user;$("authTabs").hidden=!!user;$("forgotPassword").hidden=!!user||mode==="signup";$("authUserEmail").textContent=user?.email||"";$("authTitle").textContent=user?"Your account":mode==="signup"?"Create your account":"Welcome back";$("authSubtitle").hidden=!!user;if(user)loadAccount();}
  async function loadAccount(){
    $("ordersList").innerHTML='<p class="auth-subtitle">Loading your orders…</p>';
    const [{data:profile,error:profileError},{data:orders,error:ordersError}]=await Promise.all([
      client.from("profiles").select("full_name,phone").eq("id",user.id).maybeSingle(),
      client.from("orders").select("id,order_number,total_amount,status,courier,tracking_number,created_at").eq("customer_id",user.id).order("created_at",{ascending:false}).limit(50)
    ]);
    if(!user)return;
    if(profileError)$("profileMessage").textContent="Could not load profile: "+profileError.message;
    $("profileName").value=profile?.full_name||user.user_metadata?.full_name||"";
    $("profilePhone").value=profile?.phone||"";
    if(ordersError){$("ordersList").innerHTML='<p class="auth-message">Could not load orders. Please refresh and try again.</p>';return;}
    if(!orders?.length){$("ordersList").innerHTML='<p class="auth-subtitle">You have no orders yet. Your placed orders will appear here.</p>';return;}
    $("ordersList").innerHTML=orders.map(o=>`<article class="account-order"><div class="account-order-top"><strong>Order #${esc(o.order_number||o.id.slice(0,8))}</strong><span class="order-status">${esc(o.status)}</span></div><p>Rs. ${Number(o.total_amount||0).toLocaleString("en-PK")} · ${new Date(o.created_at).toLocaleDateString("en-PK")}</p>${o.courier?'<p>Courier: '+esc(o.courier)+'</p>':''}${o.tracking_number?'<p>Tracking: <strong>'+esc(o.tracking_number)+'</strong></p>':''}<div class="order-items" id="items-${esc(o.id)}">Loading items…</div></article>`).join("");
    for(const o of orders){const {data:items,error}=await client.from("order_items").select("product_name,quantity,unit_price").eq("order_id",o.id);const el=$("items-"+o.id);if(el)el.innerHTML=error?"":(items||[]).map(i=>'<p>'+esc(i.product_name)+' × '+esc(i.quantity)+' — Rs. '+Number(i.unit_price||0).toLocaleString("en-PK")+'</p>').join("")}
  }
  button.addEventListener("click",async()=>{const {data}=await client.auth.getUser();render(data.user);modal.classList.add("show");msg("");});
  modal.querySelector(".auth-close").addEventListener("click",()=>modal.classList.remove("show"));
  modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show");});
  document.querySelectorAll(".auth-tab").forEach(x=>x.addEventListener("click",()=>setMode(x.dataset.mode)));
  $("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authSubmit").disabled=true;msg(mode==="signup"?"Creating account…":"Signing in…");const email=$("authEmail").value.trim(),password=$("authPassword").value;let r;
    if(mode==="signup"){r=await client.auth.signUp({email,password,options:{data:{full_name:$("authName").value.trim()},emailRedirectTo:"https://briollora.netlify.app/"}});if(!r.error){$("authForm").reset();msg(r.data.session?"Account created and signed in.":"Account created. Check your email and confirm your address before logging in.");}}
    else{r=await client.auth.signInWithPassword({email,password});if(!r.error){msg("Signed in successfully.");render(r.data.user);setTimeout(()=>modal.classList.remove("show"),700);}}
    if(r?.error)msg(r.error.message);$("authSubmit").disabled=false;
  });
  $("forgotPassword").addEventListener("click",async()=>{const email=$("authEmail").value.trim();if(!email){msg("Enter your email address first.");return;}msg("Sending reset email…");const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:"https://briollora.netlify.app/"});msg(error?error.message:"If the address is registered, a password reset email has been sent.");});
  $("saveProfile").addEventListener("click",async()=>{if(!user)return;$("saveProfile").disabled=true;$("profileMessage").textContent="Saving…";const {error}=await client.from("profiles").upsert({id:user.id,full_name:$("profileName").value.trim(),phone:$("profilePhone").value.trim()},{onConflict:"id"});$("profileMessage").textContent=error?"Could not save profile: "+error.message:"Profile saved successfully.";$("saveProfile").disabled=false;});
  $("refreshOrders").addEventListener("click",loadAccount);
  $("authLogout").addEventListener("click",async()=>{const {error}=await client.auth.signOut();if(error){$("profileMessage").textContent=error.message;return;}render(null);setMode("login");msg("You have logged out.");});
  client.auth.onAuthStateChange((_event,session)=>render(session?.user||null));client.auth.getUser().then(({data})=>render(data.user));setMode("login");
})();