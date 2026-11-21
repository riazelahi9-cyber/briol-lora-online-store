(() => {
"use strict";
const cfg=window.BRIOLLORA_CONFIG||{};
if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)return;
const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"Rs. "+Number(n||0).toLocaleString("en-PK");
let active=false,records=[],autoSlugMode=false;
function state(t){$("productState").textContent=t||""}
function renderVariantRows(variants){
 const rows=Array.isArray(variants)&&variants.length?variants:[{label:"Default",price:"",regular:"",stock:"",sku:""}];
 $("variantRows").innerHTML=rows.map((v,i)=>'<div class="variant-row"><label>Option / variant name<input data-v="label" value="'+esc(v.label||"")+'" placeholder="Black, One Size" required></label><label>Price (PKR)<input data-v="price" type="number" min="0" step="1" value="'+(v.price??"")+'" placeholder="Use default price"></label><label>Regular price<input data-v="regular" type="number" min="0" step="1" value="'+(v.regular??"")+'" placeholder="Optional"></label><label>Stock<input data-v="stock" type="number" min="0" step="1" value="'+(v.stock??"")+'" placeholder="Use product stock"></label><label>SKU<input data-v="sku" value="'+esc(v.sku||"")+'" placeholder="Optional"></label><button type="button" class="variant-remove" aria-label="Remove variant" data-remove-variant>Remove</button></div>').join("");
}
function collectVariantRows(basePrice,baseRegular,baseStock){
 return Array.from($("variantRows").querySelectorAll(".variant-row")).map(row=>{
  const val=name=>row.querySelector('[data-v="'+name+'"]').value.trim();
  const priceRaw=val("price"),regularRaw=val("regular"),stockRaw=val("stock");
  return {label:val("label"),price:priceRaw===""?Number(basePrice):Number(priceRaw),regular:regularRaw===""?(baseRegular===""?null:Number(baseRegular)):Number(regularRaw),stock:stockRaw===""?(row.parentElement.querySelectorAll(".variant-row").length===1?Number(baseStock||0):0):Number(stockRaw),sku:val("sku")};
 });
}
function productUrl(p){return "product.html?slug="+encodeURIComponent(p.slug||p.id)}
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
 state("Loading products and statistics…");
 const [{data,error},{data:viewRows,error:viewError},{data:itemRows,error:itemError}]=await Promise.all([
  db.from("products").select("*").order("updated_at",{ascending:false}),
  db.from("product_views").select("product_id").limit(100000),
  db.from("order_items").select("product_id,order_id,product_name").limit(100000)
 ]);
 if(error){state("Could not load products: "+error.message);return}
 if(viewError){state("Products loaded, but view statistics need the database migration: "+viewError.message);return}
 if(itemError){state("Products loaded, but order statistics could not be read: "+itemError.message);return}
 records=data||[];const viewCounts={},orderSets={};
 (viewRows||[]).forEach(v=>{if(v.product_id)viewCounts[v.product_id]=(viewCounts[v.product_id]||0)+1});
 (itemRows||[]).forEach(i=>{let productId=i.product_id;if(!productId){const p=records.find(x=>i.product_name===x.name||String(i.product_name||"").startsWith(x.name+" — "));productId=p?.id;}if(productId){orderSets[productId]??=new Set();orderSets[productId].add(i.order_id)}});
 state(records.length+" products · Total views and orders shown per product.");
 $("productCards").innerHTML=records.length?records.map(p=>'<article class="product-row"><img src="'+esc(p.image_url||"https://placehold.co/120x140?text=Product")+'" alt=""><div><h3>'+esc(p.name)+'</h3><p>'+esc(p.category||"Uncategorised")+' · '+money(p.min_price)+' · Stock '+Number(p.stock_quantity||0)+'</p><p class="product-status">'+esc(p.status||"draft")+'</p>'+(p.status==="published"?'<p><a href="'+esc(productUrl(p))+'" target="_blank" rel="noopener">View product page ↗</a></p>':'<p><a href="'+esc(productUrl(p))+'" target="_blank" rel="noopener">Preview draft page ↗</a></p><p class="admin-note">Only admins can preview drafts. Publish to make it public.</p>')+'<div class="product-stats"><span><strong>'+Number(viewCounts[p.id]||0).toLocaleString("en-PK")+'</strong><small>Total views</small></span><span><strong>'+Number(orderSets[p.id]?.size||0).toLocaleString("en-PK")+'</strong><small>Total orders</small></span><span><small>Stats from</small><strong>'+esc(p.published_at?new Date(p.published_at).toLocaleDateString("en-PK"):"—")+'</strong></span></div></div><div class="product-row-actions"><button type="button" data-edit-product="'+esc(p.id)+'">Edit</button><button type="button" data-delete-product="'+esc(p.id)+'">Delete</button></div></article>').join(""):"<p>No products in database yet. Add your first product above.</p>";
 document.querySelectorAll("[data-edit-product]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.editProduct)));
 document.querySelectorAll("[data-delete-product]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.deleteProduct)));
}
function clearForm(){
 $("productForm").reset();$("pUploadNote").textContent="Select multiple photos together (Ctrl-click or Shift-click). JPG, PNG or WebP · max 6 MB each.";$("pId").value="br-"+crypto.randomUUID();autoSlugMode=true;$("pSlug").value="";$("pStock").value="0";$("pStatus").value="draft";renderVariantRows([{label:"Default",price:"",regular:"",stock:"",sku:""}]);$("productEditorTitle").textContent="Add product";$("productEditor").hidden=false;
}
function editProduct(id){
 const p=records.find(x=>x.id===id);if(!p)return;autoSlugMode=false;
 $("pId").value=p.id;$("pName").value=p.name||"";$("pCategory").value=p.category||"";$("pSlug").value=p.slug||"";
 $("pPrice").value=p.min_price??0;$("pRegular").value=p.min_regular??"";
 $("pStock").value=p.stock_quantity??0;$("pImage").value=p.image_url||"";
 $("pImages").value=(p.images||[]).join("\n");$("pUploadNote").textContent=(1+(p.images||[]).length)+" saved image(s). Select more photos to add."; $("pDescription").value=p.description||"";
 $("pHighlights").value=p.highlights||"";$("pVariants").value=JSON.stringify(p.variants||[]);renderVariantRows(p.variants||[]);
 $("pSeoTitle").value=p.seo_title||"";$("pSeoDescription").value=p.seo_description||"";
 $("pStatus").value=p.status||"draft";$("productEditorTitle").textContent="Edit product";$("productEditor").hidden=false;
 $("productEditor").scrollIntoView({behavior:"smooth",block:"start"});
}
function slugify(s){return String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,150)}
$("pName").addEventListener("input",()=>{if(autoSlugMode){const nameSlug=slugify($("pName").value);$("pSlug").value=nameSlug?nameSlug+"-"+$("pId").value:"";}});
$("pSlug").addEventListener("input",()=>{if(autoSlugMode&&$("pSlug").value!==slugify($("pName").value)+"-"+$("pId").value)autoSlugMode=false;});
$("pUpload").addEventListener("change",()=>{$("pUploadNote").textContent=$("pUpload").files.length+" new image(s) selected. They will be added to the product gallery when saved.";});
async function saveProduct(e){
 e.preventDefault();if(!active)return;
 const id=$("pId").value||("br-"+crypto.randomUUID());
 const name=$("pName").value.trim(),price=$("pPrice").value===""?NaN:Number($("pPrice").value),regular=$("pRegular").value===""?null:Number($("pRegular").value),stock=Number($("pStock").value||0);
 if(!name||(!Number.isNaN(price)&&(!Number.isFinite(price)||price<0))||!Number.isFinite(stock)||stock<0){state("Enter a valid product name and stock quantity. Any fallback price must be valid.");return}
 const variants=collectVariantRows(price,regular,stock);
 if(!variants.length||variants.some(v=>!v.label||!Number.isFinite(v.price)||v.price<0||!Number.isFinite(v.stock)||v.stock<0||(v.regular!==null&&(!Number.isFinite(v.regular)||v.regular<0)))){state("Each variant needs a name, valid price and valid stock. Regular price must also be valid.");return}
 $("pVariants").value=JSON.stringify(variants);
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
 if(!image){state("Add a main image URL or upload at least one product image.");return}
 const payload={id,name,slug:slugify($("pSlug").value||name),category:$("pCategory").value.trim(),
 description:$("pDescription").value.trim(),highlights:$("pHighlights").value.trim(),image_url:image,images,
 min_price:Math.min(...variants.map(v=>v.price)),max_price:Math.max(...variants.map(v=>v.price)),min_regular:variants.map(v=>v.regular).filter(v=>v!==null).length?Math.min(...variants.map(v=>v.regular).filter(v=>v!==null)):regular,stock_quantity:variants.reduce((sum,v)=>sum+v.stock,0),variants,
 seo_title:$("pSeoTitle").value.trim()||name,seo_description:$("pSeoDescription").value.trim()||$("pDescription").value.trim().slice(0,300),
 status:$("pStatus").value,published_at:$("pStatus").value==="published"?(records.find(p=>String(p.id)===String(id))?.published_at||records.find(p=>String(p.id)===String(id))?.created_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};
 const btn=$("saveProductBtn");btn.disabled=true;btn.textContent="Saving…";state("Saving product…");
 const {error}=await db.from("products").upsert(payload,{onConflict:"id"});
 btn.disabled=false;btn.textContent="Save product";
 if(error){state("Save failed: "+error.message);return}
 $("productEditor").hidden=true;await loadProducts();state("Product saved successfully. ");const saved=records.find(p=>String(p.id)===String(id));if(saved&&saved.status==="published"){const link=document.createElement("a");link.href=productUrl(saved);link.target="_blank";link.rel="noopener";link.textContent="Open product page ↗";$("productState").appendChild(link);}else{$("productState").append("Publish this product to make its detail page visible to customers.");}
}
async function deleteProduct(id){
 const p=records.find(x=>x.id===id);if(!p||!confirm('Delete "'+p.name+'"? This cannot be undone.'))return;
 state("Deleting…");const {error}=await db.from("products").delete().eq("id",id);
 if(error){state("Delete failed: "+error.message);return}state("Product deleted.");await loadProducts();
}
$("showProducts").addEventListener("click",setTab);
$("newProductBtn").addEventListener("click",clearForm);
$("addVariantBtn").addEventListener("click",()=>{const current=Array.from($("variantRows").querySelectorAll(".variant-row")).map(row=>{const get=n=>row.querySelector('[data-v="'+n+'"]').value;return {label:get("label"),price:get("price"),regular:get("regular"),stock:get("stock"),sku:get("sku")}});current.push({label:"",price:"",regular:"",stock:"",sku:""});renderVariantRows(current);});
$("variantRows").addEventListener("click",e=>{const btn=e.target.closest("[data-remove-variant]");if(!btn)return;const row=btn.closest(".variant-row");row.remove();if(!$("variantRows").querySelector(".variant-row"))renderVariantRows([]);});
$("cancelProductBtn").addEventListener("click",()=>$("productEditor").hidden=true);
$("productForm").addEventListener("submit",saveProduct);
db.auth.onAuthStateChange(()=>setTimeout(async()=>{await verify();if(!$("productsSection").hidden&&active)loadProducts()},0));
verify();
})();