import{g as b,a as D,b as M,c as A,d as W,i as y,e as L,s as x,n as f,l as P,f as O,h as U,j as S,k as N,m as C,o as Y}from"./index-0HqlbGei.js";import{s as _,a as F,D as w,b as G,r as J,c as H,g as K,d as V}from"./rutina-helpers-4NSVI9Ih.js";import{g as z,a as Q,b as X,c as Z,d as aa,e as ta}from"./stats-helpers-oRTORz5r.js";let g=new Date().getFullYear(),m=new Date().getMonth();const q=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],ea=["L","M","M","J","V","S","D"];function T(a){const r=ta(a,g,m),l=new Date,o=g===l.getFullYear()&&m===l.getMonth(),n=new Date(g,m,1).getDay(),t=n===0?6:n-1,e=new Date(g,m+1,0).getDate(),s=new Date(g,m,0).getDate(),c=ea.map(i=>`<div class="cal-weekday">${i}</div>`).join("");let d="";for(let i=t-1;i>=0;i--)d+=`<div class="cal-day cal-day--outside">${s-i}</div>`;for(let i=1;i<=e;i++){const $=o&&i===l.getDate(),v=r.has(i);let h="cal-day";$&&(h+=" cal-day--today"),v&&(h+=" cal-day--active");const k=v?` data-action="cal-day-tap" data-cal-year="${g}" data-cal-month="${m}" data-cal-day="${i}"`:"";d+=`<div class="${h}"${k}>${i}</div>`}const u=t+e,p=u%7===0?0:7-u%7;for(let i=1;i<=p;i++)d+=`<div class="cal-day cal-day--outside">${i}</div>`;return`
    <div class="month-calendar animate-in" id="month-calendar">
      <div class="cal-header">
        <button class="cal-nav-btn" data-action="cal-prev">${y.chevronLeft||"‹"}</button>
        <span class="cal-header-title">${q[m]} ${g}</span>
        <button class="cal-nav-btn" data-action="cal-next">${y.chevronRight||"›"}</button>
      </div>
      <div class="cal-grid">
        ${c}
        ${d}
      </div>
    </div>
  `}function sa(a){const r=new Date().getHours();return`${r<12?"Buenos dias":r<19?"Buenas tardes":"Buenas noches"}, ${a}`}function na(a){const r=Q(a),l=X(a),o=Z(a),n=aa(a),t=n===null?"--":n===0?"Hoy":n===1?"Ayer":`${n}d`;return`
    <div class="home-quick-stats animate-in" style="animation-delay:50ms">
      <div class="home-quick-stat">
        <span class="home-quick-stat-value">${r}</span>
        <span class="home-quick-stat-label">sem racha</span>
      </div>
      <div class="home-quick-stat-divider"></div>
      <div class="home-quick-stat">
        <span class="home-quick-stat-value">${l}${o>0?`/${o}`:""}</span>
        <span class="home-quick-stat-label">esta sem</span>
      </div>
      <div class="home-quick-stat-divider"></div>
      <div class="home-quick-stat">
        <span class="home-quick-stat-value">${t}</span>
        <span class="home-quick-stat-label">ultimo</span>
      </div>
    </div>
  `}function j(a){const r=new Date().getDay(),l=L(a),o=N().filter(t=>t.usuario===a);return`
    <div id="week-section">
      <div class="week-planner">${w.map(t=>{const e=l[t]||"",s=t===r,c=e==="gimnasio"?"🏋️":e==="cross"?"🏃":"",d=s&&e?"pulse-today":"",u=e?o.find(i=>i.diaSemana===t):null,p=u?`<span class="day-circle-rutina">${u.nombre}</span>`:"";return`
      <div class="day-circle">
        <button class="day-circle-btn ${e} ${d}" data-action="toggle-day" data-day="${t}">
          ${c}
        </button>
        <span class="day-circle-label ${s?"today":""}">${G[t]}</span>
        ${p}
      </div>
    `}).join("")}</div>
      <div class="week-planner-legend">
        <span><span class="legend-dot gimnasio"></span>Gimnasio</span>
        <span><span class="legend-dot cross"></span>Cross</span>
      </div>
    </div>
  `}function I(a){const r=a.circuitos.length,l=a.circuitos.reduce((o,n)=>o+n.ejercicios.length,0);return`
    <div class="entreno-hero">
      <div class="entreno-label">Hoy</div>
      <div class="entreno-routine-name">${a.nombre}</div>
      <div class="entreno-tags">${J(a)}</div>
      <div class="entreno-meta">
        ${r} circuitos &middot; ${l} ejercicios &middot; ${H(a)}
      </div>
      <button class="entreno-cta" data-action="start" data-id="${a.id}">
        <span class="entreno-cta-icon">${C("kettlebell",48)}</span>
      </button>
      <div class="entreno-cta-label">Iniciar entrenamiento</div>
    </div>
  `}function R(a){return`
    <div class="entreno-hero">
      <div class="rest-day-icon">${C("kettlebell")}</div>
      <div class="rest-day-title">Hoy descansas</div>
      ${a?`<div class="rest-day-next">
              Proximo: <strong>${a.rutina.nombre}</strong> &middot; ${a.diaNombre}
            </div>`:""}
    </div>
  `}function B(a){const r=new Date().getDay(),l=L(a),o=N().filter(t=>t.usuario===a),n=w.filter(t=>l[t]).map(t=>{const e=l[t],s=t===r,c=o.find(v=>v.diaSemana===t)||o.find(v=>v.tipo===e&&v.diaSemana==null),d=c?K(c):e==="gimnasio"?"Gimnasio":"Cross Training",u=c?H(c):"",p=e==="gimnasio"?"Gym":"Cross",i=c?`<button class="btn-icon-action" data-action="start" data-id="${c.id}">${y.play}</button>`:"",$=w.filter(v=>l[v]).indexOf(t);return`
        <div class="mini-card animate-in ${s?"today":""}" style="animation-delay:${$*60}ms" ${c?`data-action="preview-routine" data-id="${c.id}"`:""}>
          <div class="mini-card-left">
            <div class="mini-card-day">${V[t]} · ${p}</div>
            <div class="mini-card-name">${d}</div>
            ${u?`<div class="mini-card-meta">${u}</div>`:""}
          </div>
          <div class="mini-card-actions">
            ${i}
          </div>
        </div>
      `}).join("");return n?`
    <div id="weekly-section">
      <div class="section-header">
        <span class="section-title">Esta semana</span>
      </div>
      ${n}
    </div>
  `:'<div id="weekly-section"></div>'}function da(){var k;const a=b(),r=D(),l=M(a),o=A(a),n=W(),t=r&&(!r.usuario||r.usuario===a),e=t?`<div class="workout-banner" data-action="resume-workout">
        <span class="workout-banner-icon">${y.kettlebell}</span>
        <div class="workout-banner-text">
          <div class="workout-banner-title">Entrenamiento en curso</div>
          <div class="workout-banner-sub">${r.rutinaNombre}</div>
        </div>
        <span class="workout-banner-arrow">${y.arrowRight}</span>
      </div>`:"",s=((k=n==null?void 0:n.displayName)==null?void 0:k.split(" ")[0])||a;let c="";n?c=`
      <div class="user-header">
        <button class="user-header-info" data-action="switch-account" title="Cambiar cuenta">
          ${n.photoURL?`<img class="user-avatar" src="${n.photoURL}" alt="" referrerpolicy="no-referrer" />`:`<div class="user-avatar-placeholder">${s[0]||"?"}</div>`}
          <span class="user-switch-hint">${y.chevronDown}</span>
        </button>
        <div class="user-header-actions">
          <button class="btn-icon-action" data-action="logout" title="Cerrar sesion">
            ${y.logOut}
          </button>
        </div>
      </div>
    `:Y||(c=`
      <div class="user-toggle" data-active="${a==="Nat"?"1":"0"}">
        <button class="user-toggle-btn ${a==="Lean"?"active":""}" data-action="switch-user" data-user="Lean">Lean</button>
        <button class="user-toggle-btn ${a==="Nat"?"active":""}" data-action="switch-user" data-user="Nat">Nat</button>
      </div>
    `);const d=`<div class="home-greeting animate-in">${sa(s)}</div>`,u=na(a),p=j(a),i=l&&!t?I(l):"",$=!l&&!t?R(o):"",v=B(a),h=T(a);return`
    ${c}
    ${d}
    ${p}
    ${u}
    ${e}
    <div id="hero-section">${i}${$}</div>
    ${v}
    ${h}
  `}function E(){const a=b(),r=document.getElementById("week-section");r&&(r.outerHTML=j(a));const l=document.getElementById("weekly-section");l&&(l.outerHTML=B(a));const o=document.getElementById("hero-section");if(o){const n=M(a),t=D(),e=t&&(!t.usuario||t.usuario===a),s=n&&!e?I(n):"",c=!n&&!e?R(A(a)):"";o.innerHTML=s+c}}function ia(a,r,l){const o=`${r} de ${q[l]}`,n=a.map(s=>{const c=s.duracionMin?`<span class="cal-detail-dur">${s.duracionMin} min</span>`:"",d=s.circuitos.map(u=>{const p=u.ejercicios.map(i=>{const $=i.pesoRealKg??i.pesoKg??0,v=i.repsReal??i.repsObjetivo??0;return`<div class="cal-detail-ej">
          <span class="cal-detail-ej-name">${i.nombre}</span>
          <span class="cal-detail-ej-val">${v}r × ${$}kg</span>
        </div>`}).join("");return`
        <div class="cal-detail-circuit">
          <div class="cal-detail-circuit-head">${u.grupoMuscular}</div>
          ${p}
        </div>
      `}).join("");return`
      <div class="cal-detail-session">
        <div class="cal-detail-header">
          <span class="cal-detail-name">${s.rutinaNombre}</span>
          ${c}
        </div>
        ${d}
      </div>
    `}).join(""),t=document.createElement("div");t.className="modal-overlay",t.innerHTML=`
    <div class="modal-box cal-detail-modal">
      <div class="modal-title">${o}</div>
      <div class="modal-body">${n}</div>
    </div>
  `,document.body.appendChild(t);const e=()=>{t.classList.add("modal-closing"),t.addEventListener("animationend",()=>t.remove(),{once:!0})};t.addEventListener("click",s=>{s.target===t&&e()})}function ua(){const a=document.getElementById("app"),r=l=>{const o=l.target.closest("[data-action]");if(!o)return;const n=o.dataset.action,t=o.dataset.id;switch(n){case"switch-user":{const e=o.dataset.user,s=document.querySelector(".user-toggle");s?(s.dataset.active=e==="Nat"?"1":"0",s.querySelectorAll(".user-toggle-btn").forEach(c=>{c.classList.toggle("active",c.dataset.user===e)}),setTimeout(()=>{S(e),f("/")},250)):(S(e),f("/"));break}case"switch-account":O().catch(e=>{e.code!=="auth/popup-closed-by-user"&&(U("Error al cambiar cuenta"),console.warn("[home] switchAccount error:",e))});break;case"logout":confirm("¿Cerrar sesion?")&&P();break;case"start":case"preview-routine":F(t);break;case"resume-workout":{const e=D();e&&f(`/workout/${e.rutinaId}`);break}case"toggle-day":{const e=b(),s=Number(o.dataset.day),d=L(e)[s]||"";d===""?(x(e,s,"gimnasio"),E()):_(e,s,d,()=>E());break}case"cal-prev":case"cal-next":{n==="cal-prev"?(m--,m<0&&(m=11,g--)):(m++,m>11&&(m=0,g++));const e=document.getElementById("month-calendar");if(e){const s=b();e.outerHTML=T(s)}break}case"cal-day-tap":{const e=Number(o.dataset.calYear),s=Number(o.dataset.calMonth),c=Number(o.dataset.calDay),d=b(),u=z(d,e,s,c);u.length>0&&ia(u,c,s);break}}};return a.addEventListener("click",r),()=>{a.removeEventListener("click",r)}}export{ua as mount,da as render};
