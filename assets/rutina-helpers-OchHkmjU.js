import{u as D,p as k,i as S,n as L,k as M,v as q,w as l,s as p,x}from"./index-DbzCAPI6.js";const v={Core:"tag-core",Piernas:"tag-piernas",Pecho:"tag-pecho",Espalda:"tag-espalda",Brazos:"tag-brazos",Glúteos:"tag-gluteos",Hombros:"tag-hombros"},A={1:"Lunes",2:"Martes",3:"Miercoles",4:"Jueves",5:"Viernes",6:"Sabado",0:"Domingo"},T={1:"L",2:"M",3:"X",4:"J",5:"V",6:"S",0:"D"},C=[1,2,3,4,5,6,0];function E(s){if(!s||!s.nombre)return"";const a=s.nombre.match(/^Día \d+ [-–] (.+)$/i);return a?a[1]:s.nombre}function H(s){return s?`#${String(s).padStart(3,"0")}`:""}function I(s){return s==="gimnasio"?"🏋️":s==="cross"?"🏃":""}function N(s,a=!1){const i=[...new Set(s.circuitos.map(e=>e.grupoMuscular))],n=a?"tag-sm":"";return i.map(e=>`<span class="tag ${n} ${v[e]||""}">${e}</span>`).join("")}function j(s){const a=x(s.id);if(!a)return'<span class="rutina-last-done">Sin registros</span>';const i=new Date(a.fecha),n=Math.floor((Date.now()-i.getTime())/864e5);return`<span class="rutina-last-done">${n===0?"Hoy":n===1?"Ayer":`Hace ${n} dias`}</span>`}function B(s){const a=D(s);if(!a)return;const i=a.circuitos.map((n,e)=>`
      <div class="preview-circuit">
        <div class="preview-circuit-header">
          <span class="preview-circuit-num">${e+1}</span>
          <span class="tag ${v[n.grupoMuscular]||""}">${n.grupoMuscular}</span>
        </div>
        <div class="preview-exercises">
          ${n.ejercicios.map(o=>`<div class="preview-exercise">${o.nombre} <span class="preview-exercise-meta">${o.repsObjetivo}r &middot; ${o.pesoKg}kg</span></div>`).join("")}
        </div>
      </div>
    `).join("");k({title:a.nombre,body:`<div class="preview-body">${i}</div>`,confirmText:`${S.kettlebell} Iniciar`,cancelText:"Volver",onConfirm:()=>L(`/workout/${s}`),html:!0})}function G(s,a,i,n){const e=A[a],o=i==="gimnasio"?"cross":"gimnasio",b=o==="gimnasio"?"🏋️":"🏃",y=o==="gimnasio"?"Gimnasio":"Cross",$=i==="gimnasio"?"🏋️":"🏃",g=M().filter(t=>t.usuario===s&&t.tipo===i),u=g.find(t=>t.diaSemana===a),f=g.map(t=>`<button class="day-assign-option ${u&&t.id===u.id?"active":""}" data-assign-rutina="${t.id}">${t.nombre}</button>`).join(""),m=i==="gimnasio"?"Gimnasio":"Cross",w=`<div style="color:var(--color-text-muted);padding:var(--space-sm) 0">No hay rutinas de ${m}</div>`,h=`
    <div class="day-assign-body">
      <div class="day-assign-quick-actions">
        <button class="day-assign-quick-btn day-assign-quick-switch" data-assign-switch="${o}">
          <span class="day-assign-quick-icon">${b}</span>
          <span>${y}</span>
        </button>
        <button class="day-assign-quick-btn day-assign-quick-clear" data-assign-clear>
          <span class="day-assign-quick-icon">✕</span>
          <span>Sin rutina</span>
        </button>
        <button class="day-assign-quick-btn day-assign-quick-rest" data-assign-rest>
          <span class="day-assign-quick-icon">😴</span>
          <span>Descanso</span>
        </button>
      </div>
      <div class="day-assign-divider"></div>
      <div class="day-assign-section-label">${$} Rutinas de ${m}</div>
      ${f||w}
    </div>
  `,c=document.createElement("div");c.className="modal-overlay",c.innerHTML=`
    <div class="modal-box">
      <div class="modal-title">${e}</div>
      <div class="modal-body">${h}</div>
    </div>
  `,document.body.appendChild(c);const r=()=>{c.classList.add("modal-closing"),c.addEventListener("animationend",()=>c.remove(),{once:!0})};c.addEventListener("click",t=>{if(t.target===c){r();return}const d=t.target.closest("[data-assign-rutina]");if(d){q(d.dataset.assignRutina,a,s),r(),n();return}if(t.target.closest("[data-assign-switch]")){l(a,s),p(s,a,o),r(),n();return}if(t.target.closest("[data-assign-clear]")){l(a,s),r(),n();return}if(t.target.closest("[data-assign-rest]")){l(a,s),p(s,a,null),r(),n();return}})}export{C as D,B as a,T as b,j as c,A as d,I as e,H as f,E as g,N as r,G as s};
