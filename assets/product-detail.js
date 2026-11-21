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
    const p=data;
    if(p.status==="published"){db.from("product_views").insert({product_id:String(p.id)}).then(({error:viewError})=>{if(viewError)console.warn("Product view tracking is not configured yet:",viewError.message)});}
    const images=[p.image_url,...(Array.isArray(p.images)?p.images:[])].filter((x,i,a)=>x&&a.indexOf(x)===i);
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
    const galleryMarkup="<div class=\"dynamic-gallery-wrap\"><div class=\"dynamic-product-gallery\" id=\"detailGallery\"><button type=\"button\" class=\"dynamic-gallery-zoom\" id=\"detailZoomOpen\" aria-label=\"Zoom product image\"><img id=\"detailMainImage\" src=\""+esc(images[0]||"https://placehold.co/800x900/f4f0eb/8d7770?text=BRIOLLORA")+"\" alt=\""+esc(p.name)+"\" loading=\"eager\"></button>"+(images.length>1?"<button type=\"button\" class=\"dynamic-gallery-arrow prev\" id=\"detailPrev\" aria-label=\"Previous image\">‹</button><button type=\"button\" class=\"dynamic-gallery-arrow next\" id=\"detailNext\" aria-label=\"Next image\">›</button><span class=\"dynamic-gallery-count\" id=\"detailImageCount\">1 / "+images.length+"</span>":"<span class=\"dynamic-gallery-count\">Click image to zoom</span>")+"</div><div class=\"dynamic-gallery-thumbs\">"+images.map((src,i)=>'<button type="button" data-image="'+i+'" aria-label="View product image '+(i+1)+'" class="'+(i===0?"active":"")+'"><img src="'+esc(src)+'" alt=""></button>').join("")+"</div><div class=\"dynamic-zoom-overlay\" id=\"detailZoomOverlay\" hidden role=\"dialog\" aria-modal=\"true\" aria-label=\"Zoomed product images\"><button type=\"button\" class=\"dynamic-zoom-close\" id=\"detailZoomClose\" aria-label=\"Close zoom\">×</button><button type=\"button\" class=\"dynamic-zoom-arrow prev\" id=\"detailZoomPrev\" aria-label=\"Previous image\">‹</button><img id=\"detailZoomImage\" src=\""+esc(images[0]||"")+"\" alt=\""+esc(p.name)+"\"><button type=\"button\" class=\"dynamic-zoom-arrow next\" id=\"detailZoomNext\" aria-label=\"Next image\">›</button><span class=\"dynamic-zoom-count\" id=\"detailZoomCount\">1 / "+images.length+"</span></div></div>";
    root.innerHTML='<nav class="product-breadcrumb"><a href="index.html">Home</a> / <a href="index.html#shop">Shop</a> / <span>'+esc(p.name)+'</span></nav><section class="dynamic-product-grid">'+galleryMarkup+'<div class="dynamic-product-copy"><p class="eyebrow">'+esc(p.category||"BRIOLLORA collection")+'</p><h1>'+esc(p.name)+'</h1><p class="dynamic-price">'+(prices.length&&Math.min(...prices)!==Math.max(...prices)?money(Math.min(...prices))+" – "+money(Math.max(...prices)):money(price))+'</p><p class="dynamic-product-description dynamic-description">'+esc(p.description||"Discover this piece from the BRIOLLORA collection.")+'</p>'+(highlights.length?'<h2>Product highlights</h2><ul class="dynamic-highlights">'+highlights.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':"")+'<h2>Choose an option</h2><p class="dynamic-variant-label">Available options</p><ul class="product-seo-variants">'+(variants.length?variants.map(v=>'<li>'+esc(v.label)+' — '+money(v.price)+(Number(v.stock||0)<=0?' (Out of stock)':'')+'</li>').join(""):'<li>Contact us to confirm options</li>')+'</ul><p class="product-seo-note">Please confirm current availability and delivery details before ordering.</p><div class="dynamic-actions"><a class="primary-button" id="detailOrderLink" href="index.html?product='+encodeURIComponent(p.id)+'&amp;variant=0#shop">Choose options &amp; order ↗</a><a class="dynamic-secondary" href="index.html#shop">Continue shopping</a></div><p class="product-seo-back"><a href="index.html#shop">Browse more products at BRIOLLORA</a></p></div></section>';
    let activeImage=0;const mainImage=document.getElementById("detailMainImage"),zoomImage=document.getElementById("detailZoomImage"),zoomOverlay=document.getElementById("detailZoomOverlay");
    function showImage(index){activeImage=(index+images.length)%images.length;mainImage.src=images[activeImage];zoomImage.src=images[activeImage];document.querySelectorAll("[data-image]").forEach((b,i)=>{b.classList.toggle("active",i===activeImage);b.setAttribute("aria-current",i===activeImage?"true":"false")});const count=(activeImage+1)+" / "+images.length;const mainCount=document.getElementById("detailImageCount"),zoomCount=document.getElementById("detailZoomCount");if(mainCount)mainCount.textContent=count;if(zoomCount)zoomCount.textContent=count;}
    document.querySelectorAll("[data-image]").forEach(b=>b.addEventListener("click",()=>showImage(Number(b.dataset.image))));
    ["detailPrev","detailZoomPrev"].forEach(id=>document.getElementById(id)?.addEventListener("click",()=>showImage(activeImage-1)));
    ["detailNext","detailZoomNext"].forEach(id=>document.getElementById(id)?.addEventListener("click",()=>showImage(activeImage+1)));
    function openZoom(){zoomOverlay.hidden=false;document.body.classList.add("gallery-zoom-open");document.getElementById("detailZoomClose").focus();}
    function closeZoom(){zoomOverlay.hidden=true;document.body.classList.remove("gallery-zoom-open");document.getElementById("detailZoomOpen").focus();}
    document.getElementById("detailZoomOpen").addEventListener("click",openZoom);document.getElementById("detailZoomClose").addEventListener("click",closeZoom);
    zoomOverlay.addEventListener("click",e=>{if(e.target===zoomOverlay)closeZoom()});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!zoomOverlay.hidden)closeZoom();if(e.key==="ArrowRight")showImage(activeImage+1);if(e.key==="ArrowLeft")showImage(activeImage-1)});
    let touchStartX=0;[document.getElementById("detailGallery"),zoomOverlay].forEach(el=>{el.addEventListener("touchstart",e=>{touchStartX=e.changedTouches[0].screenX},{passive:true});el.addEventListener("touchend",e=>{const dx=e.changedTouches[0].screenX-touchStartX;if(Math.abs(dx)>45)showImage(activeImage+(dx<0?1:-1))},{passive:true})});showImage(0);
    const orderLink=document.getElementById("detailOrderLink");
    if(orderLink){orderLink.href="index.html?product="+encodeURIComponent(p.id)+"&variant=0#shop";}
  }
  init().catch(error=>{console.error("Product page error:",error);root.innerHTML='<section class="dynamic-notice"><h1>Product could not be loaded</h1><p>Please try again in a moment.</p><a class="primary-button" href="index.html#shop">Browse the collection</a></section>';});
})();