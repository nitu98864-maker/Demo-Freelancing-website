// ---- Shared helpers ----
function qs(s, r=document){ return r.querySelector(s); }
function qsa(s, r=document){ return Array.from(r.querySelectorAll(s)); }

// ---- Typing effect (Home) ----
(function typing(){
  const el = qs("#typed");
  if(!el) return;
  const phrases = JSON.parse(el.getAttribute("data-phrases") || "[]");
  let i=0, j=0, del=false;
  function tick(){
    if(!phrases.length) return;
    const cur = phrases[i];
    el.textContent = cur.slice(0, j += del?-1:1);
    if(!del && j > cur.length + 8) del = true;
    if(del && j < 0){ del=false; i=(i+1)%phrases.length; }
    setTimeout(tick, del?40:70);
  }
  tick();
})();

// ---- Scroll reveal ----
(function revealOnScroll(){
  const io = new IntersectionObserver(es=>{
    es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add("visible"); io.unobserve(e.target); }});
  },{threshold:.15});
  qsa(".reveal").forEach(el=>io.observe(el));
})();

// ---- Nav active ----
(function setActive(){
  const path = location.pathname.split("/").pop() || "index.html";
  qsa(".nav a").forEach(a=>{
    const href = a.getAttribute("href");
    if(href === path) a.classList.add("active");
  });
})();

// ---- Load mock DB ----
let DB = { projects:[], freelancers:[] };
(async function loadData(){
  if(!document.body) return;
  // static file
  if(typeof window.DATA !== "undefined"){ DB = window.DATA; }
  // merge local posted projects
  const local = JSON.parse(localStorage.getItem("postedProjects")||"[]");
  DB.projects = [...local, ...DB.projects];
  initPages();
})();

// ---- Pages init ----
function initPages(){
  projectsPage();
  projectFormPage();
  profilesPage();
  profilePage();
  messagesPage();
  authPages();
  dashboardPage();
}

// ---- Projects list + search/sort ----
function projectsPage(){
  const list = qs("#projectList");
  if(!list) return;
  const search = qs("#projectSearch");
  const sortSel = qs("#projectSort");
  function render(){
    const q = (search?.value||"").toLowerCase();
    const sort = sortSel?.value||"new";
    let arr = DB.projects.filter(p =>
      (p.title+p.skills+p.budget).toLowerCase().includes(q)
    );
    if(sort==="budget") arr = arr.sort((a,b)=> (parseInt(b.budget||0)-parseInt(a.budget||0)));
    if(sort==="new") arr = arr.sort((a,b)=> new Date(b.date)-new Date(a.date));
    list.innerHTML = arr.map(p=>`
      <div class="item">
        <div class="icon">📌</div>
        <div>
          <h3><a href="profile.html?id=${encodeURIComponent(p.ownerId||'client')}">${p.title}</a></h3>
          <div class="meta">Budget: ₹${p.budget||'—'} • Posted: ${new Date(p.date).toLocaleDateString()}</div>
          <div>${p.desc}</div>
          <div style="margin-top:6px;">
            ${(p.skills||'').split(',').map(s=>`<span class="badge">${s.trim()}</span>`).join('')}
          </div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <a class="btn ghost" href="messages.html?to=${encodeURIComponent(p.ownerId||'client')}">Message</a>
          <button class="btn primary" onclick="alert('Demo: Proposal sent!')">Send Proposal</button>
        </div>
      </div>
    `).join("") || `<div class="muted">No projects found.</div>`;
  }
  search?.addEventListener("input", render);
  sortSel?.addEventListener("change", render);
  render();
}

// ---- New project form (saves to localStorage) ----
function projectFormPage(){
  const form = qs("#projectNewForm");
  if(!form) return;
  form.addEventListener("submit",(e)=>{
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      id: "local-"+Date.now(),
      title: data.title, desc: data.desc, budget: data.budget, skills: data.skills,
      ownerId: "you", date: new Date().toISOString()
    };
    const posted = JSON.parse(localStorage.getItem("postedProjects")||"[]");
    posted.unshift(payload);
    localStorage.setItem("postedProjects", JSON.stringify(posted));
    alert("Demo: Project posted (saved locally).");
    location.href = "projects.html";
  });
}

// ---- Profiles list ----
function profilesPage(){
  const wrap = qs("#profileList");
  if(!wrap) return;
  const qEl = qs("#profileSearch");
  function render(){
    const q = (qEl?.value||"").toLowerCase();
    const arr = DB.freelancers.filter(f=> (f.name+f.skills+f.title).toLowerCase().includes(q));
    wrap.innerHTML = arr.map(f=>`
      <div class="item">
        <div class="icon">👤</div>
        <div>
          <h3><a href="profile.html?id=${encodeURIComponent(f.id)}">${f.name}</a></h3>
          <div class="meta">${f.title}</div>
          <div>${f.bio}</div>
          <div style="margin-top:6px;">
            ${f.skills.split(',').map(s=>`<span class="badge">${s.trim()}</span>`).join('')}
          </div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px;">
          <a class="btn ghost" href="messages.html?to=${encodeURIComponent(f.id)}">Message</a>
          <button class="btn primary" onclick="alert('Demo: Invite sent!')">Invite</button>
        </div>
      </div>
    `).join("");
  }
  qEl?.addEventListener("input", render);
  render();
}

// ---- Single profile ----
function profilePage(){
  const wrap = qs("#profileDetail");
  if(!wrap) return;
  const id = new URLSearchParams(location.search).get("id") || "f1";
  const f = DB.freelancers.find(x=>x.id===id) || DB.freelancers[0];
  wrap.innerHTML = `
    <div class="card">
      <h2>${f.name}</h2>
      <div class="muted">${f.title}</div>
      <p style="margin-top:8px">${f.bio}</p>
      <div style="margin:8px 0;">${f.skills.split(',').map(s=>`<span class="badge">${s.trim()}</span>`).join('')}</div>
      <a class="btn primary" href="messages.html?to=${encodeURIComponent(f.id)}">Message</a>
      <button class="btn ghost" onclick="alert('Demo: Hired!')">Hire</button>
    </div>
  `;
}

// ---- Messages (mock chat) ----
function messagesPage(){
  const box = qs("#chatBox");
  if(!box) return;
  const to = new URLSearchParams(location.search).get("to") || "f1";
  const input = qs("#chatInput");
  const list = qs("#chatList");
  const msgs = JSON.parse(localStorage.getItem("chat-"+to)||"[]");
  function render(){ list.innerHTML = msgs.map(m=>`<div class="item"><div><b>${m.me?'You':'Them'}:</b> ${m.text}</div></div>`).join(""); }
  render();
  box.addEventListener("submit",(e)=>{
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    msgs.push({me:true,text});
    localStorage.setItem("chat-"+to, JSON.stringify(msgs));
    input.value=""; render();
    setTimeout(()=>{ msgs.push({me:false,text:"(auto) Thanks for your message!"}); localStorage.setItem("chat-"+to, JSON.stringify(msgs)); render(); }, 600);
  });
}

// ---- Auth & redirects (demo) ----
function authPages(){
  const lf = qs("#loginForm"); const rf = qs("#registerForm");
  if(lf){ lf.addEventListener("submit",(e)=>{ e.preventDefault(); location.href="dashboard.html?role=client"; }); }
  if(rf){ rf.addEventListener("submit",(e)=>{ e.preventDefault(); const role=qs("#role").value||"freelancer"; location.href="dashboard.html?role="+encodeURIComponent(role); }); }
}

// ---- Dashboard ----
function dashboardPage(){
  const title = qs("#dashTitle");
  if(!title) return;
  const role = new URLSearchParams(location.search).get("role") || "guest";
  qs("#dashSub").textContent = role==="client" ? "Manage projects, proposals & messages"
    : role==="freelancer" ? "Browse jobs, send proposals & manage profile" : "Demo dashboard";
  qs("#dashRole").textContent = role;
  const tbl = qs("#dashTable");
  if(role==="client"){
    const rows = (DB.projects.slice(0,6)).map(p=>`<tr><td>${p.title}</td><td>₹${p.budget||'—'}</td><td>${new Date(p.date).toLocaleDateString()}</td></tr>`).join("");
    tbl.innerHTML = `<tr><th>Project</th><th>Budget</th><th>Date</th></tr>${rows}`;
  }else{
    const rows = DB.projects.slice(0,6).map(p=>`<tr><td>${p.title}</td><td>${p.skills}</td><td><a class="btn ghost" href="messages.html?to=${encodeURIComponent(p.ownerId||'client')}">Message</a></td></tr>`).join("");
    tbl.innerHTML = `<tr><th>Project</th><th>Skills</th><th>Action</th></tr>${rows}`;
  }
}