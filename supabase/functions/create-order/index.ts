import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const H={"Access-Control-Allow-Origin":"https://briollora.netlify.app","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:H});
Deno.serve(async req=>{
if(req.method==="OPTIONS")return new Response("ok",{headers:H});if(req.method!=="POST")return out({error:"Method not allowed."},405);
try{
const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");if(!token)return out({error:"Please sign in."},401);
const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!anon||!key)return out({error:"Checkout service is not configured."},500);
const auth=createClient(url,anon,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}}),{data:u,error:ae}=await auth.auth.getUser(token);if(ae||!u.user)return out({error:"Session invalid. Please log in again."},401);
const body=await req.json(),c=body.customer||{},items=body.items,paymentMethod=cleanPayment(body.payment_method),clean=(v:unknown,n:number)=>String(v??"").trim().slice(0,n);
const customer={name:clean(c.name,80),phone:clean(c.phone,25),country:clean(c.country,60),city:clean(c.city,60),address:clean(c.address,400),order_type:clean(c.order_type,80),notes:clean(c.notes,300)};
if(Object.values(customer).slice(0,6).some(x=>!x))return out({error:"Complete all required delivery details."},400);
if(!Array.isArray(items)||!items.length||items.length>30)return out({error:"Invalid order items."},400);
const cr=await fetch("https://raw.githubusercontent.com/riazelahi9-cyber/briol-lora-online-store/main/data/products.json",{headers:{"Cache-Control":"no-cache"}});if(!cr.ok)throw Error("Product catalogue unavailable.");const catalog=await cr.json(),lines=[],seen=new Set();let total=0;
for(const i of items){const id=clean(i.product_id,40),label=clean(i.variant_label,160),qty=Number(i.quantity);if(!id||!label||!Number.isSafeInteger(qty)||qty<1||qty>20)return out({error:"Invalid product quantity or option."},400);const k=id+"::"+label;if(seen.has(k))return out({error:"Duplicate cart item. Refresh your bag."},400);seen.add(k);
const p=catalog.find((x:any)=>String(x.id)===id),v=p?.variants?.find((x:any)=>String(x.label)===label);if(!p||!v)return out({error:"A selected option is no longer available. Refresh the page."},409);if(!Number.isFinite(Number(v.price))||Number(v.price)<0||Number(v.stock)<qty)return out({error:"A selected product is unavailable in this quantity."},409);
total+=Number(v.price)*qty;lines.push({product_name:clean(p.name,180)+" — "+label,product_image:clean(p.image,1000),quantity:qty,unit_price:Number(v.price)});}
if(total<=0||total>10000000) return out({error:"Invalid order total."},400);
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}),{data:o,error:oe}=await db.from("orders").insert({customer_id:u.user.id,full_name:customer.name,phone:customer.phone,country:customer.country,city:customer.city,address:customer.address,order_type:customer.order_type,notes:customer.notes||null,total_amount:total,status:"Pending",payment_method:"cod",payment_status:"unpaid"}).select("id,order_number,total_amount,status,created_at").single();
if(oe||!o)throw Error("Could not save order.");const {error:ie}=await db.from("order_items").insert(lines.map((x:any)=>({...x,order_id:o.id})));if(ie){await db.from("orders").delete().eq("id",o.id);throw Error("Could not save order items.");}
return out({order:o,items:lines.map((x:any)=>({product_name:x.product_name,quantity:x.quantity,unit_price:x.unit_price}))},201);
}catch(e){console.error(e);return out({error:e instanceof Error?e.message:"Unexpected checkout error."},500);}
});