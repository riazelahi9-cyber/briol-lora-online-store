(() => {
"use strict";
const cfg=window.BRIOLLORA_CONFIG||{};
if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)return;
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"Rs. "+Number(n||0).toLocaleString("en-PK");
let active=false,records=[];
function state(t){$("productState").textContent=t||""}
async function verify(){
 const {data:{session}}=await db.auth.getSession();
 if(!session){active=false;return}
 const {data:role,error}=await db.from("user_roles").select("role").eq("user_id",session.user.id).maybeSingle();
 active=!error&&role?.role==="admin";
}
function setTab(){
 $("ordersSection").hidden=true;$("customersSection").hidden=true;$("productsSection").hidden=false;
 ["showOrders","showCustomers","showProducts"].forEach(id=>$(id).classList.toggle("active",id==="showProducts"));
 loadProducts();
}
async function loadProducts(){
 if(!active){await verify();if(!active){state("Please sign in with the authorized admin account.");return}}
 state("Loading products…");
 const {data,error}=await db.from("products").select("*").order("updated_at",{ascending:false});
 if(error){state("Could not load products: "+error.message);return}
 records=data||[];state(records.length+" products · Drafts are hidden from customers.");
 $("productCards").innerHTML=records.length?records.map(p=>'<article class="product-row"><img src="'+esc(p.image_url||"https://placehold.co/120x140?text=Product")+'" alt=""><div><h3>'+esc(p.name)+'</h3><p>'+esc(p.category||"Uncategorised")+' · '+money(p.min_price)+' · Stock '+Number(p.stock_quantity||0)+'</p><p class="product-status">'+esc(p.status||"draft")+'</p></div><div class="product-row-actions"><button type="button" data-edit-product="'+esc(p.id)+'">Edit</button><button type="button" data-delete-product="'+esc(p.id)+'">Delete</button></div></article>').join(""):"<p>No products in database yet. Add your first product above.</p>";
 document.querySelectorAll("[data-edit-product]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.editProduct)));
 document.querySelectorAll("[data-delete-product]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.deleteProduct)));
}
function clearForm(){
 $("productForm").reset();$("pId").value="";$("pStock").value="0";$("pStatus").value="draft";$("productEditorTitle").textContent="Add product";$("productEditor").hidden=false;
}
function editProduct(id){
 const p=records.find(x=>x.id===id);if(!p)return;
 $("pId").value=p.id;$("pName").value=p.name||"";$("pCategory").value=p.category||"";$("pSlug").value=p.slug||"";
 $("pPrice").value=p.min_price??0;$("pRegular").value=p.min_regular??"";
 $("pStock").value=p.stock_quantity??0;$("pImage").value=p.image_url||"";
 $("pImages").value=(p.images||[]).join("\n");$("pDescription").value=p.description||"";
 $("pHighlights").value=p.highlights||"";$("pVariants").value=JSON.stringify(p.variants||[],null,2);
 $("pSeoTitle").value=p.seo_title||"";$("pSeoDescription").value=p.seo_description||"";
 $("pStatus").value=p.status||"draft";$("productEditorTitle").textContent="Edit product";$("productEditor").hidden=false;
 $("productEditor").scrollIntoView({behavior:"smooth",block:"start"});
}
function slugify(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,150)}
async function saveProduct(e){
 e.preventDefault();if(!active)return;
 const id=$("pId").value||("br-"+crypto.randomUUID());
 let variants=[];try{variants=JSON.parse($("pVariants").value||"[]");if(!Array.isArray(variants))throw Error("Variants must be a JSON array.");}catch(err){state("Invalid variants JSON: "+err.message);return}
 const name=$("pName").value.trim(),price=Number($("pPrice").value),regular=$("pRegular").value===""?null:Number($("pRegular").value),stock=Number($("pStock").value||0);
 if(!name||!Number.isFinite(price)||price<0||!Number.isFinite(stock)||stock<0){state("Enter a valid product name, price and stock quantity.");return}
 if(!variants.length)variants=[{label:"Default",price,regular,stock,sku:id}];
 if(variants.some(v=>!v||typeof v.label!=="string"||!v.label.trim()||!Number.isFinite(Number(v.price))||Number(v.price)<0||!Number.isFinite(Number(v.stock??0))||Number(v.stock??0)<0)){state("Each variant needs a label, valid price and valid stock quantity.");return}
 let images=$("pImages").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),image=$("pImage").value.trim()||images[0]||null;
 const files=Array.from($("pUpload").files||[]);
 for(const file of files){
  if(file.size>6*1024*1024){state(file.name+" exceeds the 6 MB upload limit.");return}
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
  const path=id+"/"+crypto.randomUUID()+"."+ext;
  const {error:uploadError}=await db.storage.from("product-images").upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});
  if(uploadError){state("Image upload failed: "+uploadError.message);return}
  const {data:publicData}=db.storage.from("product-images").getPublicUrl(path);
  images.push(publicData.publicUrl);if(!image)image=publicData.publicUrl;
 }
 const payload={id,name,slug:slugify($("pSlug").value||name)+"-"+id,category:$("pCategory").value.trim(),
 description:$("pDescription").value.trim(),highlights:$("pHighlights").value.trim(),image_url:image,images,
 min_price:price,max_price:price,min_regular:regular,stock_quantity:stock,variants,
 seo_title:$("pSeoTitle").value.trim()||name,seo_description:$("pSeoDescription").value.trim()||$("pDescription").value.trim().slice(0,300),
 status:$("pStatus").value,updated_at:new Date().toISOString()};
 const btn=$("saveProductBtn");btn.disabled=true;btn.textContent="Saving…";state("Saving product…");
 const {error}=await db.from("products").upsert(payload,{onConflict:"id"});
 btn.disabled=false;btn.textContent="Save product";
 if(error){state("Save failed: "+error.message);return}
 $("productEditor").hidden=true;state("Product saved successfully.");await loadProducts();
}
async function deleteProduct(id){
 const p=records.find(x=>x.id===id);if(!p||!confirm('Delete "'+p.name+'"? This cannot be undone.'))return;
 state("Deleting…");const {error}=await db.from("products").delete().eq("id",id);
 if(error){state("Delete failed: "+error.message);return}state("Product deleted.");await loadProducts();
}
$("showProducts").addEventListener("click",setTab);
$("newProductBtn").addEventListener("click",clearForm);
$("cancelProductBtn").addEventListener("click",()=>$("productEditor").hidden=true);
$("productForm").addEventListener("submit",saveProduct);
db.auth.onAuthStateChange(()=>setTimeout(async()=>{await verify();if(!$("productsSection").hidden&&active)loadProducts()},0));
verify();
})();