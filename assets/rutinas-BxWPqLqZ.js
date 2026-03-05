import{g as v,k as b,i as l,p as g,q as $,n as d,r as f,m as h,t as m}from"./index-0HqlbGei.js";import{a as y,d as k,g as w,f as E,e as C,r as L,c as R}from"./rutina-helpers-4NSVI9Ih.js";let p=0;function S(a){const n=k[a.diaSemana]||"",e=n?`<div class="rutina-card-day">${n}</div>`:"",s=w(a),r=E(a.numero),o=C(a.tipo),i=[r,o].filter(Boolean),t=i.length?`<div class="rutina-card-volanta">${i.join(" · ")}</div>`:"";return`
    <div class="rutina-card card animate-in" style="animation-delay:${p++*60}ms" data-rutina-id="${a.id}">
      ${e}
      <div class="rutina-card-name">${s}</div>
      ${t}
      <div class="rutina-card-tags">${L(a,!0)}</div>
      <div class="rutina-card-footer">
        <span class="rutina-card-meta">${R(a)}</span>
        <div class="rutina-card-actions">
          <button class="btn-icon-action" data-action="start" data-id="${a.id}">${l.play}</button>
          <button class="btn-icon-action" data-action="duplicate" data-id="${a.id}">${l.copy}</button>
          <button class="btn-icon-action" data-action="edit" data-id="${a.id}">${l.edit}</button>
        </div>
      </div>
    </div>
  `}function u(a,n,e,s=!1){return e.length===0?"":`
    <div class="section-header ${s?"section-header-spaced":""}">
      <span class="section-title">${a} <span class="section-count">(${n})</span></span>
    </div>
    <div class="rutinas-list">${e.map(S).join("")}</div>
  `}function A(){p=0;const a=v(),n=b().filter(t=>t.usuario===a),e=n.filter(t=>t.diaSemana!=null).sort((t,c)=>t.diaSemana-c.diaSemana),s=n.filter(t=>t.tipo==="gimnasio").sort((t,c)=>(c.numero||0)-(t.numero||0)),r=n.filter(t=>t.tipo==="cross").sort((t,c)=>(c.numero||0)-(t.numero||0)),o=`
    <div class="rutinas-header">
      <h1 class="rutinas-title">Rutinas</h1>
      <button class="btn-icon-header" data-action="new-rutina">
        ${l.plus}
      </button>
    </div>
  `;let i="";return n.length===0?i=`
      <div class="empty-state">
        <div class="empty-state-icon">${h("kettlebell")}</div>
        <div class="empty-state-text">No tienes rutinas creadas.<br>Crea tu primera rutina para empezar.</div>
        <button class="btn btn-primary" data-action="new-rutina">${l.plus} Nueva rutina</button>
      </div>`:(i+=u("Programadas",e.length,e),i+=u("Gimnasio",s.length,s,e.length>0),i+=u("Cross Training",r.length,r,!0)),`
    ${o}
    ${i}
  `}function D(){const a=document.getElementById("app"),n=e=>{const s=e.target.closest("[data-action]");if(!s)return;const r=s.dataset.action,o=s.dataset.id;switch(r){case"new-rutina":d("/rutina/nueva");break;case"start":y(o);break;case"edit":d(`/rutina/editar/${o}`);break;case"duplicate":{const i=$(o);i&&(d("/rutinas"),f("Rutina duplicada","Deshacer",()=>{m(i.id),d("/rutinas")}));break}case"delete":g({title:"Eliminar rutina",body:"Esta accion no se puede deshacer.",confirmText:"Eliminar",danger:!0,onConfirm:()=>{m(o),d("/rutinas")}});break}};return a.addEventListener("click",n),()=>{a.removeEventListener("click",n)}}export{D as mount,A as render};
