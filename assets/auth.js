/* BRIOLLORA customer authentication — Supabase Auth */
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
  modal.innerHTML=`<section class="auth-panel" role="dialog" aria-modal="true" aria-labelledby="authTitle">
    <button class="close-button auth-close" type="button" aria-label="Close">×</button>
    <p class="eyebrow">Welcome to BRIOLLORA</p><h2 id="authTitle">Welcome back</h2>
    <p class="auth-subtitle">Create an account or sign in to keep your shopping connected.</p>
    <div class="auth-actions"><button class="auth-tab active" type="button" data-mode="login">Log in</button><button class="auth-tab" type="button" data-mode="signup">Create account</button></div>
    <form id="authForm">
      <div id="authNameWrap" hidden><label for="authName">Full name</label><input id="authName" maxlength="80" autocomplete="name" placeholder="Your full name"></div>
      <label for="authEmail">Email address</label><input id="authEmail" type="email" required autocomplete="email" placeholder="you@example.com">
      <label for="authPassword">Password</label><input id="authPassword" type="password" required minlength="8" autocomplete="current-password" placeholder="At least 8 characters">
      <p class="auth-message" id="authMessage" aria-live="polite"></p><button class="primary-button full-button" id="authSubmit" type="submit">Log in</button>
    </form>
    <button class="auth-link" id="forgotPassword" type="button">Forgot password?</button>
    <div id="authSignedIn" hidden><p class="auth-user-email" id="authUserEmail"></p><p class="auth-subtitle">You are signed in. Order history will be connected in the next step.</p><button class="primary-button full-button" id="authLogout" type="button">Log out</button></div>
  </section>`;
  document.body.appendChild(modal);
  const $=id=>document.getElementById(id); let mode="login",user=null;
  const msg=t=>$("authMessage").textContent=t||"";
  function setMode(next){mode=next;document.querySelectorAll(".auth-tab").forEach(x=>x.classList.toggle("active",x.dataset.mode===mode));$("authNameWrap").hidden=mode!=="signup";$("authName").required=mode==="signup";$("authPassword").autocomplete=mode==="signup"?"new-password":"current-password";$("authSubmit").textContent=mode==="signup"?"Create account":"Log in";$("forgotPassword").hidden=mode==="signup"||!!user;$("authForm").hidden=!!user;$("authSignedIn").hidden=!user;$("authTitle").textContent=user?"Your account":mode==="signup"?"Create your account":"Welcome back";msg("");}
  function render(u){user=u||null;button.textContent=user?"My Account ✓":"My Account";$("authForm").hidden=!!user;$("authSignedIn").hidden=!user;$("forgotPassword").hidden=!!user||mode==="signup";$("authUserEmail").textContent=user?.email||"";$("authTitle").textContent=user?"Your account":mode==="signup"?"Create your account":"Welcome back";}
  button.addEventListener("click",async()=>{const {data}=await client.auth.getUser();render(data.user);modal.classList.add("show");msg("");});
  modal.querySelector(".auth-close").addEventListener("click",()=>modal.classList.remove("show"));
  modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show");});
  document.querySelectorAll(".auth-tab").forEach(x=>x.addEventListener("click",()=>setMode(x.dataset.mode)));
  $("authForm").addEventListener("submit",async e=>{e.preventDefault();$("authSubmit").disabled=true;msg(mode==="signup"?"Creating account…":"Signing in…");const email=$("authEmail").value.trim(),password=$("authPassword").value;let r;
    if(mode==="signup"){r=await client.auth.signUp({email,password,options:{data:{full_name:$("authName").value.trim()},emailRedirectTo:"https://briollora.netlify.app/"}});if(!r.error){$("authForm").reset();msg(r.data.session?"Account created and signed in.":"Account created. Check your email and confirm your address before logging in.");}}
    else{r=await client.auth.signInWithPassword({email,password});if(!r.error){msg("Signed in successfully.");setTimeout(()=>modal.classList.remove("show"),700);}}
    if(r?.error)msg(r.error.message);$("authSubmit").disabled=false;
  });
  $("forgotPassword").addEventListener("click",async()=>{const email=$("authEmail").value.trim();if(!email){msg("Enter your email address first.");return;}msg("Sending reset email…");const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:"https://briollora.netlify.app/"});msg(error?error.message:"If the address is registered, a password reset email has been sent.");});
  $("authLogout").addEventListener("click",async()=>{const {error}=await client.auth.signOut();msg(error?.message||"You have logged out.");if(!error)render(null);});
  client.auth.onAuthStateChange((_event,session)=>render(session?.user||null));client.auth.getUser().then(({data})=>render(data.user));setMode("login");
})();