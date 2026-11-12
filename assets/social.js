/* Shared BRIOLLORA social links for every storefront page. */
(() => {
 const cfg=window.BRIOLLORA_CONFIG||{};
 const links=[
 ["Instagram",cfg.INSTAGRAM_URL,'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" class="social-fill"/></svg>'],
 ["Daraz",cfg.DARAZ_URL,'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 13H4L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/><path d="M9 14h6"/></svg>'],
 ["Facebook",cfg.FACEBOOK_URL,'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21v-8h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.4C17.3 1.2 16.2 1 15 1c-3.5 0-5.5 2.1-5.5 5.8V9H6v4h3.5v8H14Z" class="social-fill social-no-stroke"/></svg>'],
 ["TikTok",cfg.TIKTOK_URL,'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3v11.2a4.2 4.2 0 1 1-3.5-4.1"/><path d="M14 3c.6 3.1 2.4 5 5.5 5.4"/></svg>'],
 ["YouTube",cfg.YOUTUBE_URL,'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3Z" class="social-fill social-no-stroke"/></svg>']
 ];
 const nav='<nav class="social-links" aria-label="BRIOLLORA social accounts">'+links.filter(x=>x[1]).map(x=>'<a class="social-icon" href="'+x[1]+'" target="_blank" rel="noopener noreferrer" aria-label="'+x[0]+'" title="'+x[0]+'">'+x[2]+'</a>').join("")+'</nav>';
 const header=document.querySelector(".header-actions");
 if(header&&!header.querySelector(".social-links"))header.insertAdjacentHTML("afterbegin",nav);
 const footer=document.querySelector(".footer");
 if(footer&&!footer.querySelector(".footer-social"))footer.insertAdjacentHTML("beforeend",'<div class="footer-social"><span>Follow BRIOLLORA</span>'+nav+'</div>');
})();