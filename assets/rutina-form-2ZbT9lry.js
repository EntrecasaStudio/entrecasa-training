import{u as L,n as k,g as N,H as R,h as A,I as T,J as D,p as H,K as q,i as $}from"./index-DbzCAPI6.js";const K=["Pecho","Espalda","Piernas","Core","Brazos","Glúteos","Hombros"],U=2,C=4,E=6,I=15,M={Pecho:["Pecho"],Espalda:["Espalda"],Piernas:["Piernas","Glúteos"],Core:["Core"],Brazos:["Brazos","Hombros"],Glúteos:["Glúteos"],Hombros:["Hombros"]};function S(){return{id:R(),nombre:"",repsObjetivo:10,pesoKg:0}}function B(){return{id:R(),grupoMuscular:"Pecho",ejercicios:[S(),S()]}}let i=null,r=null,l="",b=!1;function _(a,e){const t=i.circuitos[a],s=M[t.grupoMuscular]||[t.grupoMuscular],m=q(s,l),n=l.trim().toLowerCase(),c=n&&m.some(o=>o.nombre.toLowerCase()===n),v=m.map(o=>`
    <button class="ej-picker-option" data-action="select-ejercicio"
            data-circ="${a}" data-ej="${e}" data-nombre="${o.nombre}">
      <span class="ej-picker-option-name">${o.nombre}</span>
      <span class="ej-item-type ${o.tipo}">${o.tipo==="maquina"?"Máquina":"Funcional"}</span>
    </button>
  `).join(""),u=n&&!c?`<button class="ej-picker-add" data-action="add-custom-ejercicio"
                  data-circ="${a}" data-ej="${e}" data-nombre="${l.trim()}">
           + Agregar "${l.trim()}"
         </button>`:"";return`
    <div class="ej-picker-panel">
      <div class="ej-picker-header">
        <input type="text" class="input ej-picker-search" placeholder="Buscar ejercicio..."
               value="${l}" autofocus>
        <button class="ej-picker-close" data-action="close-picker">${$.close}</button>
      </div>
      <div class="ej-picker-list">
        ${v||'<div class="ej-picker-empty">No hay ejercicios en esta categoría</div>'}
      </div>
      ${u}
    </div>
  `}function F(a,e,t,s){const m=r&&r.circIdx===e&&r.ejIdx===t,n=a.nombre?"ej-picker-trigger has-value":"ej-picker-trigger",c=t>0,v=t<s-1;return`
    <div class="ejercicio-form-row" data-circ="${e}" data-ej="${t}">
      <div class="ej-picker-wrap">
        <button class="${n}" data-action="open-picker"
                data-circ="${e}" data-ej="${t}">
          ${a.nombre||"Seleccionar ejercicio..."}
        </button>
        ${m?_(e,t):""}
      </div>
      <div class="ejercicio-form-fields">
        <div class="ej-reorder">
          <button class="btn-reorder" data-action="move-ejercicio-up" data-circ="${e}" data-ej="${t}"
                  ${c?"":"disabled"} title="Mover arriba">${$.chevronUp||"▲"}</button>
          <button class="btn-reorder" data-action="move-ejercicio-down" data-circ="${e}" data-ej="${t}"
                  ${v?"":"disabled"} title="Mover abajo">${$.chevronDown||"▼"}</button>
        </div>
        <div class="field field-sm">
          <label class="input-label">Reps</label>
          <input type="number" class="input" inputmode="numeric" min="${E}" max="${I}"
                 value="${a.repsObjetivo}" data-field="repsObjetivo" data-circ="${e}" data-ej="${t}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Kg</label>
          <input type="number" class="input" inputmode="decimal" min="0" step="0.5"
                 value="${a.pesoKg}" data-field="pesoKg" data-circ="${e}" data-ej="${t}">
        </div>
        <button class="btn-remove" data-action="remove-ejercicio" data-circ="${e}" data-ej="${t}"
                title="Eliminar ejercicio">${$.close}</button>
      </div>
    </div>
  `}function J(a,e){const t=K.map(c=>`<option value="${c}" ${a.grupoMuscular===c?"selected":""}>${c}</option>`).join(""),s=a.ejercicios.length,m=a.ejercicios.map((c,v)=>F(c,e,v,s)).join(""),n=a.ejercicios.length<C;return`
    <div class="card circuito-form-card" data-circuito-idx="${e}">
      <div class="circuito-form-header">
        <span class="circuito-form-number">${e+1}</span>
        <select class="input" data-action="change-grupo" data-circ="${e}">
          ${t}
        </select>
        <button class="btn-remove" data-action="remove-circuito" data-circ="${e}"
                title="Eliminar circuito" style="${i.circuitos.length<=1?"visibility:hidden":""}">${$.trash}</button>
      </div>
      <div class="ejercicios-list">
        ${m}
      </div>
      <button class="add-ejercicio-btn" data-action="add-ejercicio" data-circ="${e}"
              ${n?"":"disabled"}>
        + Agregar ejercicio ${n?"":`(max ${C})`}
      </button>
    </div>
  `}function x(a){const e=a.mode==="editar";if(e&&a.id){const t=L(a.id);if(t)i=JSON.parse(JSON.stringify(t));else return k("/"),""}else i={id:R(),nombre:"",tipo:"gimnasio",usuario:N(),diaSemana:null,creada:new Date().toISOString(),circuitos:[B()]};return r=null,l="",b=!1,G(e)}function G(a){const e=i.circuitos.map((t,s)=>J(t,s)).join("");return`
    <div class="view-header">
      <button class="btn-back" data-action="back">${$.back}</button>
      <div class="view-header-title">${a?"Editar Rutina":"Nueva Rutina"}</div>
    </div>

    <div class="form-section">
      <label class="input-label">Nombre de la rutina</label>
      <input type="text" class="input" id="rutina-nombre" placeholder="Ej: Pecho y espalda"
             value="${i.nombre}">
    </div>

    <div class="form-section">
      <label class="input-label">Tipo</label>
      <div class="user-toggle" data-active="${i.tipo==="cross"?"1":"0"}">
        <button class="user-toggle-btn ${i.tipo!=="cross"?"active":""}" data-action="set-tipo" data-tipo="gimnasio">🏋️ Gimnasio</button>
        <button class="user-toggle-btn ${i.tipo==="cross"?"active":""}" data-action="set-tipo" data-tipo="cross">🏃 Cross</button>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Circuitos</div>
      <div id="circuitos-container">
        ${e}
      </div>
      <button class="add-circuito-btn" data-action="add-circuito">+ Agregar circuito</button>
    </div>

    <div class="form-footer">
      <button class="btn btn-primary btn-full" data-action="save">Guardar Rutina</button>
      ${a?'<button class="btn btn-ghost btn-full" data-action="back">Cancelar</button>':""}
    </div>
  `}function g(){const a=document.getElementById("app"),e=!!L(i.id);if(a.innerHTML=G(e),r){const t=a.querySelector(".ej-picker-panel");if(t){t.scrollIntoView({behavior:"smooth",block:"nearest"});const s=t.querySelector(".ej-picker-search");s&&(s.focus(),s.setSelectionRange(s.value.length,s.value.length))}}}function j(){const a=document.getElementById("rutina-nombre");a&&(i.nombre=a.value.trim()),document.querySelectorAll(".ejercicio-form-row").forEach(e=>{const t=parseInt(e.dataset.circ),s=parseInt(e.dataset.ej);!i.circuitos[t]||!i.circuitos[t].ejercicios[s]||e.querySelectorAll("[data-field]").forEach(m=>{const n=m.dataset.field,c=m.value;n==="repsObjetivo"?i.circuitos[t].ejercicios[s].repsObjetivo=parseInt(c)||E:n==="pesoKg"&&(i.circuitos[t].ejercicios[s].pesoKg=parseFloat(c)||0)})})}function z(){if(!i.nombre)return"Ingresa un nombre para la rutina.";for(let a=0;a<i.circuitos.length;a++){const e=i.circuitos[a];for(let t=0;t<e.ejercicios.length;t++){if(!e.ejercicios[t].nombre.trim())return`Circuito ${a+1}: el ejercicio ${t+1} necesita un nombre.`;const s=e.ejercicios[t].repsObjetivo;if(s<E||s>I)return`Circuito ${a+1}, ejercicio ${t+1}: las repeticiones deben ser entre ${E} y ${I}.`}}return null}function O(a,e,t){i.circuitos[a].ejercicios[e].nombre=t,r=null,l="",g()}function X(a){const e=document.getElementById("app"),t=n=>{const c=n.target.closest("[data-action]");if(!c)return;const v=c.dataset.action,u=parseInt(c.dataset.circ);switch(v){case"back":b?H({title:"Descartar cambios",body:"Tienes cambios sin guardar. ¿Deseas descartarlos?",confirmText:"Descartar",cancelText:"Seguir editando",danger:!0,onConfirm:()=>k("/rutinas")}):k("/rutinas");break;case"set-tipo":{j(),i.tipo=c.dataset.tipo,b=!0,g();break}case"add-circuito":j(),b=!0,r=null,l="",i.circuitos.push(B()),g();break;case"remove-circuito":i.circuitos.length>1&&(j(),b=!0,r=null,i.circuitos.splice(u,1),g());break;case"add-ejercicio":i.circuitos[u].ejercicios.length<C&&(j(),b=!0,r=null,i.circuitos[u].ejercicios.push(S()),g());break;case"remove-ejercicio":{const o=parseInt(c.dataset.ej);i.circuitos[u].ejercicios.length>U&&(j(),b=!0,r=null,i.circuitos[u].ejercicios.splice(o,1),g());break}case"open-picker":{const o=parseInt(c.dataset.ej);j(),r&&r.circIdx===u&&r.ejIdx===o?(r=null,l=""):(r={circIdx:u,ejIdx:o},l=""),g();break}case"select-ejercicio":{const o=parseInt(c.dataset.ej);j(),b=!0,O(u,o,c.dataset.nombre);break}case"add-custom-ejercicio":{const o=parseInt(c.dataset.ej),d=c.dataset.nombre,f=i.circuitos[u],y=(M[f.grupoMuscular]||[f.grupoMuscular])[0];j(),b=!0,D(d,y),O(u,o,d);break}case"close-picker":r=null,l="",g();break;case"move-ejercicio-up":{const o=parseInt(c.dataset.ej);if(o>0){j(),b=!0;const d=i.circuitos[u].ejercicios;[d[o-1],d[o]]=[d[o],d[o-1]],r=null,g()}break}case"move-ejercicio-down":{const o=parseInt(c.dataset.ej),d=i.circuitos[u].ejercicios;o<d.length-1&&(j(),b=!0,[d[o],d[o+1]]=[d[o+1],d[o]],r=null,g());break}case"save":j();{const o=z();if(o){A(o,"error");return}T(i),A("Rutina guardada"),k("/rutinas")}break}},s=n=>{if(n.target.matches('[data-action="change-grupo"]')){const c=parseInt(n.target.dataset.circ);i.circuitos[c].grupoMuscular=n.target.value,b=!0,r&&r.circIdx===c&&(r=null,l="")}n.target.matches("[data-field]")&&(b=!0)},m=n=>{if(n.target.matches(".ej-picker-search")){l=n.target.value;const c=n.target.closest(".ej-picker-panel");if(c&&r){const{circIdx:v,ejIdx:u}=r,o=i.circuitos[v],d=M[o.grupoMuscular]||[o.grupoMuscular],f=q(d,l),h=l.trim().toLowerCase(),y=h&&f.some(p=>p.nombre.toLowerCase()===h),w=c.querySelector(".ej-picker-list");w&&(w.innerHTML=f.length?f.map(p=>`
                <button class="ej-picker-option" data-action="select-ejercicio"
                        data-circ="${v}" data-ej="${u}" data-nombre="${p.nombre}">
                  <span class="ej-picker-option-name">${p.nombre}</span>
                  <span class="ej-item-type ${p.tipo}">${p.tipo==="maquina"?"Máquina":"Funcional"}</span>
                </button>
              `).join(""):'<div class="ej-picker-empty">Sin resultados</div>');const P=c.querySelector(".ej-picker-add");if(P&&P.remove(),h&&!y){const p=document.createElement("button");p.className="ej-picker-add",p.dataset.action="add-custom-ejercicio",p.dataset.circ=v,p.dataset.ej=u,p.dataset.nombre=l.trim(),p.textContent=`+ Agregar "${l.trim()}"`,c.appendChild(p)}}}};return e.addEventListener("click",t),e.addEventListener("change",s),e.addEventListener("input",m),()=>{e.removeEventListener("click",t),e.removeEventListener("change",s),e.removeEventListener("input",m),i=null,r=null,l=""}}export{X as mount,x as render};
