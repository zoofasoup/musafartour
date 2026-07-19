const url = "https://lcpjuaxiwbdzdozitwzi.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcGp1YXhpd2JkemRveml0d3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDM4NDUsImV4cCI6MjA5OTY3OTg0NX0.vj42rEICtLaREhNm1f2HfgNKbfZonV46ZTrf5lvDFvA";

async function main() {
  const headers = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json"
  };

  const res = await fetch(`${url}/rest/v1/package_items?select=*`, { headers });
  const items = await res.json();
  
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.name)) map.set(item.name, []);
    map.get(item.name).push(item);
  }
  
  for (const [name, arr] of map.entries()) {
    if (arr.length > 1) {
      console.log(`DUPLICATE: ${name} -> ${arr.map(a => `${a.id.substring(0,8)} (type: ${a.type}, is_essential: ${a.is_essential})`).join(', ')}`);
    }
  }
}

main();
