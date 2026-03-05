import{g,k as $,i as r,p as b,q as h,n as d,r as f,m as y,t as u}from"./index-DbzCAPI6.js";import{a as k,d as w,g as L,f as C,e as E,r as R,c as I}from"./rutina-helpers-OchHkmjU.js";let v=0;function S(t){const s=w[t.diaSemana]||"",i=s?`<div class="rutina-card-day">${s}</div>`:"",n=L(t),c=C(t.numero),e=E(t.tipo),a=[c,e].filter(Boolean),o=a.length?`<div class="rutina-card-volanta">${a.join(" · ")}</div>`:"";return`
    <div class="rutina-card card animate-in" style="animation-delay:${v++*60}ms" data-rutina-id="${t.id}">
      ${i}
      <div class="rutina-card-name">${n}</div>
      ${o}
      <div class="rutina-card-tags">${R(t,!0)}</div>
      <div class="rutina-card-footer">
        <span class="rutina-card-meta">${I(t)}</span>
        <div class="rutina-card-actions">
          <button class="btn-icon-action" data-action="start" data-id="${t.id}">${r.play}</button>
          <button class="btn-icon-action" data-action="duplicate" data-id="${t.id}">${r.copy}</button>
          <button class="btn-icon-action" data-action="edit" data-id="${t.id}">${r.edit}</button>
        </div>
      </div>
    </div>
  `}function p(t,s,i,n=!0){if(i.length===0)return"";const c=t.toLowerCase().replace(/\s+/g,"-");return`
    <div class="rutinas-section" data-section="${c}">
      <button class="rutinas-section-header" data-action="toggle-section" data-section="${c}">
        <span class="section-title">${t} <span class="section-count">(${s})</span></span>
        <span class="rutinas-section-chevron ${n?"":"open"}">${r.chevronRight}</span>
      </button>
      <div class="rutinas-section-list ${n?"collapsed":""}">
        ${i.map(S).join("")}
      </div>
    </div>
  `}function q(){v=0;const t=g(),s=$().filter(a=>a.usuario===t),i=s.filter(a=>a.tipo==="gimnasio"||!a.tipo).sort((a,o)=>(o.numero||0)-(a.numero||0)),n=s.filter(a=>a.tipo==="cross").sort((a,o)=>(o.numero||0)-(a.numero||0)),c=`
    <div class="rutinas-header">
      <h1 class="rutinas-title">Rutinas</h1>
      <button class="btn-icon-header" data-action="new-rutina">
        ${r.plus}
      </button>
    </div>
  `;let e="";return s.length===0?e=`
      <div class="empty-state">
        <div class="empty-state-icon">${y("kettlebell")}</div>
        <div class="empty-state-text">No tienes rutinas creadas.<br>Crea tu primera rutina para empezar.</div>
        <button class="btn btn-primary" data-action="new-rutina">${r.plus} Nueva rutina</button>
      </div>`:(e+=p("Gimnasio",i.length,i),e+=p("Cross Training",n.length,n)),`
    ${c}
    ${e}
  `}function A(){const t=document.getElementById("app"),s=i=>{const n=i.target.closest("[data-action]");if(!n)return;const c=n.dataset.action,e=n.dataset.id;switch(c){case"new-rutina":d("/rutina/nueva");break;case"start":k(e);break;case"edit":d(`/rutina/editar/${e}`);break;case"duplicate":{const a=h(e);a&&(d("/rutinas"),f("Rutina duplicada","Deshacer",()=>{u(a.id),d("/rutinas")}));break}case"toggle-section":{const a=n.dataset.section,o=document.querySelector(`.rutinas-section[data-section="${a}"]`);if(o){const l=o.querySelector(".rutinas-section-list"),m=o.querySelector(".rutinas-section-chevron");l.classList.toggle("collapsed"),m.classList.toggle("open")}break}case"delete":b({title:"Eliminar rutina",body:"Esta accion no se puede deshacer.",confirmText:"Eliminar",danger:!0,onConfirm:()=>{u(e),d("/rutinas")}});break}};return t.addEventListener("click",s),()=>{t.removeEventListener("click",s)}}export{A as mount,q as render};
