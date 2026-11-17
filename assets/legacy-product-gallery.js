(() => {
  "use strict";
  const init = () => {
    const stage = document.querySelector(".product-seo-image");
    const main = stage?.querySelector("img");
    if (!stage || !main || stage.dataset.galleryReady) return;
    stage.dataset.galleryReady = "1";

    let images = [main.currentSrc || main.src];
    document.querySelectorAll('script[type="application/ld+json"]').forEach(node => {
      try {
        const data = JSON.parse(node.textContent);
        if (data && data["@type"] === "Product" && Array.isArray(data.image)) images = data.image;
      } catch (_) {}
    });
    images = [...new Set(images.filter(Boolean))];
    if (!images.length) return;

    const style = document.createElement("style");
    style.textContent = `
      .legacy-gallery{width:100%;position:relative}
      .legacy-gallery-stage{position:relative;background:var(--cream,#f4f0eb);display:grid;place-items:center;min-height:340px;overflow:hidden}
      .legacy-gallery-stage>button{display:block;border:0;padding:0;background:transparent;width:100%;cursor:zoom-in}
      .legacy-gallery-stage img{display:block;width:100%;max-height:650px;aspect-ratio:1/1;object-fit:contain}
      .legacy-gallery-arrow{position:absolute;top:50%;transform:translateY(-50%);width:40px;height:40px;border:1px solid #d9cec3;border-radius:50%;background:#fffdf9ed;color:#292522;font-size:27px;line-height:1;cursor:pointer;display:grid;place-items:center;z-index:2}
      .legacy-gallery-arrow.prev{left:12px}.legacy-gallery-arrow.next{right:12px}
      .legacy-gallery-count{position:absolute;bottom:12px;right:12px;padding:6px 10px;border-radius:20px;background:#fffdf0ed;color:#292522;font:12px Arial,sans-serif;z-index:2}
      .legacy-gallery-thumbs{display:flex;gap:9px;overflow-x:auto;padding:10px 2px 5px;scrollbar-width:thin}
      .legacy-gallery-thumbs button{flex:0 0 68px;width:68px;height:68px;padding:3px;border:1px solid #ddd4cb;background:#fff;cursor:pointer;border-radius:3px}
      .legacy-gallery-thumbs button.active{border:2px solid #a96e64}
      .legacy-gallery-thumbs img{width:100%;height:100%;object-fit:cover;display:block}
      .legacy-zoom[hidden]{display:none}.legacy-zoom{position:fixed;inset:0;z-index:99999;background:rgba(20,18,16,.95);display:flex;align-items:center;justify-content:center;padding:60px 70px}
      .legacy-zoom>img{max-width:92vw;max-height:84vh;width:auto;height:auto;object-fit:contain}
      .legacy-zoom-close{position:absolute;top:16px;right:20px;width:44px;height:44px;border:1px solid #ffffff66;border-radius:50%;background:#fff;color:#292522;font-size:28px;cursor:pointer}
      .legacy-zoom-count{position:absolute;bottom:18px;left:50%;transform:translateX(-50%);padding:6px 11px;border-radius:20px;background:#fff;color:#292522;font:12px Arial,sans-serif}
      body.legacy-zoom-open{overflow:hidden}
      @media(max-width:760px){.legacy-gallery-stage{min-height:250px}.legacy-gallery-arrow{width:35px;height:35px}.legacy-gallery-thumbs button{flex-basis:60px;width:60px;height:60px}.legacy-zoom{padding:55px 10px}.legacy-zoom>img{max-width:96vw;max-height:78vh}}
    `;
    document.head.appendChild(style);

    const gallery = document.createElement("div");
    gallery.className = "legacy-gallery";
    const stageWrap = document.createElement("div");
    stageWrap.className = "legacy-gallery-stage";
    const open = document.createElement("button");
    open.type = "button";
    open.setAttribute("aria-label", "Zoom product images");
    const hero = document.createElement("img");
    hero.src = images[0];
    hero.alt = main.alt || document.title;
    hero.loading = "eager";
    open.appendChild(hero);
    stageWrap.appendChild(open);
    const count = document.createElement("span");
    count.className = "legacy-gallery-count";
    stageWrap.appendChild(count);

    const thumbs = document.createElement("div");
    thumbs.className = "legacy-gallery-thumbs";
    let index = 0;
    const zoom = document.createElement("div");
    zoom.className = "legacy-zoom";
    zoom.hidden = true;
    zoom.setAttribute("role", "dialog");
    zoom.setAttribute("aria-modal", "true");
    zoom.setAttribute("aria-label", "Product image zoom");
    const zoomImg = document.createElement("img");
    const close = document.createElement("button");
    close.className = "legacy-zoom-close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Close zoom");
    const zoomCount = document.createElement("span");
    zoomCount.className = "legacy-zoom-count";
    zoom.append(close, zoomImg, zoomCount);
    document.body.appendChild(zoom);

    const prev = document.createElement("button");
    const next = document.createElement("button");
    [prev, next].forEach((b, i) => {
      b.type = "button";
      b.className = "legacy-gallery-arrow " + (i ? "next" : "prev");
      b.textContent = i ? "›" : "‹";
      b.setAttribute("aria-label", i ? "Next image" : "Previous image");
      stageWrap.appendChild(b);
    });
    const thumbButtons = images.map((src, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "View image " + (i + 1));
      const im = document.createElement("img");
      im.src = src;
      im.alt = "";
      b.appendChild(im);
      b.addEventListener("click", () => show(i));
      thumbs.appendChild(b);
      return b;
    });
    function show(i) {
      index = (i + images.length) % images.length;
      hero.src = images[index];
      zoomImg.src = images[index];
      count.textContent = (index + 1) + " / " + images.length;
      zoomCount.textContent = count.textContent;
      thumbButtons.forEach((b, n) => b.classList.toggle("active", n === index));
      thumbButtons[index]?.scrollIntoView({block:"nearest",inline:"nearest"});
      prev.hidden = next.hidden = images.length < 2;
    }
    function openZoom() { show(index); zoom.hidden = false; document.body.classList.add("legacy-zoom-open"); close.focus(); }
    function closeZoom() { zoom.hidden = true; document.body.classList.remove("legacy-zoom-open"); open.focus(); }
    prev.addEventListener("click", () => show(index - 1));
    next.addEventListener("click", () => show(index + 1));
    open.addEventListener("click", openZoom);
    close.addEventListener("click", closeZoom);
    zoom.addEventListener("click", e => { if (e.target === zoom) closeZoom(); });
    document.addEventListener("keydown", e => {
      if (zoom.hidden) return;
      if (e.key === "Escape") closeZoom();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    let touchX = 0;
    stageWrap.addEventListener("touchstart", e => { touchX = e.changedTouches[0].clientX; }, {passive:true});
    stageWrap.addEventListener("touchend", e => {
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 45) show(index + (dx < 0 ? 1 : -1));
    }, {passive:true});
    show(0);
    gallery.append(stageWrap, thumbs);
    stage.replaceChildren(gallery);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();