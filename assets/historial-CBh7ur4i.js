import{g as d,F as l,m as u,n as v,G as p}from"./index-DbzCAPI6.js";function m(a){return new Date(a).toLocaleDateString("es-MX",{day:"numeric",month:"short"})}function g(a){const t=new Date(a).toLocaleDateString("es-MX",{month:"long",year:"numeric"});return t.charAt(0).toUpperCase()+t.slice(1)}function h(a){const s=new Set;for(const t of a.circuitos)t.grupoMuscular&&s.add(t.grupoMuscular);return[...s]}const f={Core:"tag-core",Piernas:"tag-piernas",Pecho:"tag-pecho",Espalda:"tag-espalda",Brazos:"tag-brazos",Gluteos:"tag-gluteos",Hombros:"tag-hombros"};let r=0;function $(a){const s=a.circuitos.reduce((o,c)=>o+c.ejercicios.length,0),t=Math.round(p(a)),e=h(a),n=r++*60,i=e.map(o=>`<span class="tag tag-sm ${f[o]||""}">${o}</span>`).join("");return`
    <div class="card sesion-card animate-in" style="animation-delay:${n}ms" data-action="detail" data-id="${a.id}">
      <div class="sesion-card-top">
        <div class="sesion-card-date">${m(a.fecha)}</div>
        <div class="sesion-card-tags">${i}</div>
      </div>
      <div class="sesion-card-name">${a.rutinaNombre}</div>
      <div class="sesion-card-stats">
        <span><span class="sesion-card-stat-value">${a.duracionMin}</span> min</span>
        <span><span class="sesion-card-stat-value">${t.toLocaleString()}</span> kg vol</span>
        <span><span class="sesion-card-stat-value">${s}</span> ej</span>
        <span><span class="sesion-card-stat-value">${a.circuitos.length}</span> circ</span>
      </div>
    </div>
  `}function b(){r=0;const a=d(),s=l().filter(n=>!n.usuario||n.usuario===a);if(s.length===0)return`
      <div class="view-header">
        <div class="view-header-title">Historial</div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">${u("barChart")}</div>
        <div class="empty-state-text">Aun no tienes entrenamientos registrados.<br>Inicia una rutina para ver tu historial.</div>
        <a href="#/" class="btn btn-primary" style="margin-top:var(--space-md)">Ir a rutinas</a>
      </div>
    `;let t="",e="";for(const n of s){const i=g(n.fecha);i!==t&&(t=i,e+=`<div class="historial-month-header animate-in" style="animation-delay:${r*60}ms">${i}</div>`),e+=$(n)}return`
    <div class="view-header">
      <div class="view-header-title">Historial</div>
    </div>
    ${e}
  `}function M(){const a=document.getElementById("app"),s=t=>{const e=t.target.closest('[data-action="detail"]');e&&v(`/sesion/${e.dataset.id}`)};return a.addEventListener("click",s),()=>{a.removeEventListener("click",s)}}export{M as mount,b as render};
