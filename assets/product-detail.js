(() => {
  "use strict";
  const cfg=window.BRIOLLORA_CONFIG||{};
  const root=document.getElementById("productRoot");
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>"Rs. "+Number(n||0).toLocaleString("en-PK",{maximumFractionDigits:0});
  const meta=(selector,value)=>{const el=document.querySelector(selector);if(el)el.setAttribute("content",value)};
  function notFound(){root.innerHTML='<section class="dynamic-notice"><h1>Product not found</h1><p>This product may be unavailable or no longer published.</p><a class="primary-button" href="index.html#shop">Browse the collection</a></section>';document.title="Product not found | BRIOLLORA";}
  async function init(){
    const params=new URLSearchParams(location.search),slug=params.get("slug"),id=params.get("id");
    if(!slug&&!id){notFound();return;}
    if(!window.supabase||!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY){root.textContent="Product details are temporarily unavailable.";return;}
    const db=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
    let query=db.from("products").select("id,name,slug,category,description,highlights,image_url,images,min_price,max_price,min_regular,stock_quantity,variants,seo_title,seo_description,status");
    query=slug?query.eq("slug",slug):query.eq("id",id);
    const {data,error}=await query.maybeSingle();
    if(error||!data){notFound();return;}
    if(data.status!=="published"){const {data:{session}}=await db.auth.getSession();if(!session){notFound();return;}const {data:role,error:roleError}=await db.from("user_roles").select("role").eq("user_id",session.user.id).maybeSingle();if(roleError||role?.role!=="admin"){notFound();return;}}
    const p=data,images=[p.image_url,...(Array.isArray(p.images)?p.images:[])].filter((x,i,a)=>x&&a.indexOf(x)===i);
    const variants=Array.isArray(p.variants)?p.variants:[];
    const prices=variants.map(v=>Number(v.price)).filter(Number.isFinite);
    const price=prices.length?Math.min(...prices):Number(p.min_price||0);
    const canonical="https://briollora.netlify.app/product.html?slug="+encodeURIComponent(p.slug||p.id);
    const title=p.seo_title||p.name+" | BRIOLLORA";
    const description=(p.seo_description||p.description||("Shop "+p.name+" at BRIOLLORA.")).slice(0,300);
    document.title=title;
    meta('meta[name="description"]',description);meta('meta[property="og:title"]',title);meta('meta[property="og:description"]',description);meta('meta[property="og:url"]',canonical);meta('meta[property="og:image"]',images[0]||"");
    const canonicalEl=document.querySelector('link[rel="canonical"]');if(canonicalEl)canonicalEl.href=canonical;
    const schema={"@context":"https://schema.org","@type":"Product","name":p.name,"description":description,"image":images,"sku":p.id,"category":p.category,"offers":{"@type":"Offer","url":canonical,"priceCurrency":"PKR","price":String(price),"availability":Number(p.stock_quantity||0)>0?"https://schema.org/InStock":"https://schema.org/OutOfStock","seller":{"@type":"Organization","name":"BRIOLLORA"}}};
    const ld=document.createElement("script");ld.type="application/ld+json";ld.textContent=JSON.stringify(schema);document.head.appendChild(ld);
    const highlights=String(p.highlights||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    root.innerHTML='<nav class="product-breadcrumb"><a href="index.html">Home</a> / <a href="index.html#shop">Shop</a> / <span>'+esc(p.name)+'</span></nav><section class="dynamic-product-grid"><div><div class="dynamic-product-gallery"><img id="detailMainImage" src="'+esc(images[0]||"https://placehold.co/800x900/f4f0eb/8d7770?text=BRIOLLORA")+'" alt="'+esc(p.name)+'" loading="eager"></div><div class="dynamic-gallery-thumbs">'+images.map((src,i)=>'<button type="button" data-image="'+i+'" aria-label="View product image '+(i+1)+'"><img src="'+esc(src)+'" alt=""></button>').join("")+'</div></div><div class="dynamic-product-copy"><p class="eyebrow">'+esc(p.category||"BRIOLLORA collection")+'</p><h1>'+esc(p.name)+'</h1><p class="dynamic-price">'+(prices.length&&Math.min(...prices)!==Math.max(...prices)?money(Math.min(...prices))+" – "+money(Math.max(...prices)):money(price))+'</p><p class="dynamic-product-description dynamic-description">'+esc(p.description||"Discover this piece from the BRIOLLORA collection.")+'</p>'+(highlights.length?'<h2>Product highlights</h2><ul class="dynamic-highlights">'+highlights.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"")+'<h2>Available options</h2><ul class="product-seo-variants">'+(variants.length?variants.map(v=>'<li>'+esc(v.label)+' — '+money(v.price)+'</li>').join(""):'<li>Contact us to confirm available options.</li>')+'</ul><p class="product-seo-note">Please confirm current availability and delivery details before ordering.</p><div class="dynamic-actions"><a class="primary-button" href="index.html?product='+encodeURIComponent(p.id)+'#shop">Choose options &amp; order ↗</a><a class="dynamic-secondary" href="index.html#shop">Continue shopping</a></div><p class="product-seo-back"><a href="index.html#shop">Browse more products at BRIOLLORA</a></p></div></section>';
    document.querySelectorAll("[data-image]").forEach(b=>b.addEventListener("click",()=>{document.getElementById("detailMainImage").src=images[Number(b.dataset.image)]}));
  }
  init().catch(error=>{console.error("Product page error:",error);root.innerHTML='<section class="dynamic-notice"><h1>Product could not be loaded</h1><p>Please try again in a moment.</p><a class="primary-button" href="index.html#shop">Browse the collection</a></section>';});
})();