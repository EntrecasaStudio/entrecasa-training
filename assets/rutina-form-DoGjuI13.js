import{D as B,n as h,g as E,E as A,h as C,F as H,G as U,H as F,k as N,p as D,I as _,i as k,e as K}from"./index-0HqlbGei.js";import{D as x,b as z,d as J}from"./rutina-helpers-4NSVI9Ih.js";const V=["Pecho","Espalda","Piernas","Core","Brazos","Glúteos","Hombros"],X=2,I=4,S=6,R=15,M={Pecho:["Pecho"],Espalda:["Espalda"],Piernas:["Piernas","Glúteos"],Core:["Core"],Brazos:["Brazos","Hombros"],Glúteos:["Glúteos"],Hombros:["Hombros"]};function w(){return{id:A(),nombre:"",repsObjetivo:10,pesoKg:0}}function G(){return{id:A(),grupoMuscular:"Pecho",ejercicios:[w(),w()]}}let i=null,n=null,p="",b=!1;function Q(c,e){const t=i.circuitos[c],o=M[t.grupoMuscular]||[t.grupoMuscular],l=_(o,p),s=p.trim().toLowerCase(),r=s&&l.some(a=>a.nombre.toLowerCase()===s),m=l.map(a=>`
    <button class="ej-picker-option" data-action="select-ejercicio"
            data-circ="${c}" data-ej="${e}" data-nombre="${a.nombre}">
      <span class="ej-picker-option-name">${a.nombre}</span>
      <span class="ej-item-type ${a.tipo}">${a.tipo==="maquina"?"Máquina":"Funcional"}</span>
    </button>
  `).join(""),d=s&&!r?`<button class="ej-picker-add" data-action="add-custom-ejercicio"
                  data-circ="${c}" data-ej="${e}" data-nombre="${p.trim()}">
           + Agregar "${p.trim()}"
         </button>`:"";return`
    <div class="ej-picker-panel">
      <div class="ej-picker-header">
        <input type="text" class="input ej-picker-search" placeholder="Buscar ejercicio..."
               value="${p}" autofocus>
        <button class="ej-picker-close" data-action="close-picker">${k.close}</button>
      </div>
      <div class="ej-picker-list">
        ${m||'<div class="ej-picker-empty">No hay ejercicios en esta categoría</div>'}
      </div>
      ${d}
    </div>
  `}function W(c,e,t,o){const l=n&&n.circIdx===e&&n.ejIdx===t,s=c.nombre?"ej-picker-trigger has-value":"ej-picker-trigger",r=t>0,m=t<o-1;return`
    <div class="ejercicio-form-row" data-circ="${e}" data-ej="${t}">
      <div class="ej-picker-wrap">
        <button class="${s}" data-action="open-picker"
                data-circ="${e}" data-ej="${t}">
          ${c.nombre||"Seleccionar ejercicio..."}
        </button>
        ${l?Q(e,t):""}
      </div>
      <div class="ejercicio-form-fields">
        <div class="ej-reorder">
          <button class="btn-reorder" data-action="move-ejercicio-up" data-circ="${e}" data-ej="${t}"
                  ${r?"":"disabled"} title="Mover arriba">${k.chevronUp||"▲"}</button>
          <button class="btn-reorder" data-action="move-ejercicio-down" data-circ="${e}" data-ej="${t}"
                  ${m?"":"disabled"} title="Mover abajo">${k.chevronDown||"▼"}</button>
        </div>
        <div class="field field-sm">
          <label class="input-label">Reps</label>
          <input type="number" class="input" inputmode="numeric" min="${S}" max="${R}"
                 value="${c.repsObjetivo}" data-field="repsObjetivo" data-circ="${e}" data-ej="${t}">
        </div>
        <div class="field field-sm">
          <label class="input-label">Kg</label>
          <input type="number" class="input" inputmode="decimal" min="0" step="0.5"
                 value="${c.pesoKg}" data-field="pesoKg" data-circ="${e}" data-ej="${t}">
        </div>
        <button class="btn-remove" data-action="remove-ejercicio" data-circ="${e}" data-ej="${t}"
                title="Eliminar ejercicio">${k.close}</button>
      </div>
    </div>
  `}function Y(c,e){const t=V.map(r=>`<option value="${r}" ${c.grupoMuscular===r?"selected":""}>${r}</option>`).join(""),o=c.ejercicios.length,l=c.ejercicios.map((r,m)=>W(r,e,m,o)).join(""),s=c.ejercicios.length<I;return`
    <div class="card circuito-form-card" data-circuito-idx="${e}">
      <div class="circuito-form-header">
        <span class="circuito-form-number">${e+1}</span>
        <select class="input" data-action="change-grupo" data-circ="${e}">
          ${t}
        </select>
        <button class="btn-remove" data-action="remove-circuito" data-circ="${e}"
                title="Eliminar circuito" style="${i.circuitos.length<=1?"visibility:hidden":""}">${k.trash}</button>
      </div>
      <div class="ejercicios-list">
        ${l}
      </div>
      <button class="add-ejercicio-btn" data-action="add-ejercicio" data-circ="${e}"
              ${s?"":"disabled"}>
        + Agregar ejercicio ${s?"":`(max ${I})`}
      </button>
    </div>
  `}function ie(c){const e=c.mode==="editar";if(e&&c.id){const t=B(c.id);if(t)i=JSON.parse(JSON.stringify(t));else return h("/"),""}else i={id:A(),nombre:"",usuario:E(),diaSemana:null,creada:new Date().toISOString(),circuitos:[G()]};return n=null,p="",b=!1,T(e)}function L(c,e){return c?c.length>e?c.substring(0,e)+"…":c:""}function Z(){const c=i.usuario||E(),e=K(c),t=N().filter(l=>l.usuario===c&&l.id!==i.id),o=x.map(l=>{const s=e[l]||"",r=i.diaSemana===l,m=t.find(f=>f.diaSemana===l),d=s==="gimnasio"?"🏋️":s==="cross"?"🏃":"";let a="week-strip-btn";r?a+=" selected":m?a+=s?` ${s}`:" occupied":s&&(a+=` ${s} plan-only`);let u="";return r?u=`<span class="week-strip-name selected">${L(i.nombre,5)||"·"}</span>`:m&&(u=`<span class="week-strip-name">${L(m.nombre,5)}</span>`),`
      <div class="week-strip-day">
        <button class="${a}" data-action="set-dia" data-dia="${l}">
          ${r?"✓":d}
        </button>
        <span class="week-strip-label">${z[l]}</span>
        ${u}
      </div>
    `}).join("");return`
    <div class="form-section">
      <div class="week-strip-header">
        <label class="input-label">Dia de entrenamiento</label>
        <button class="week-strip-cal-btn" data-action="open-calendar" title="Calendario (proximamente)">
          ${k.calendar}
        </button>
      </div>
      <div class="week-strip">${o}</div>
    </div>
  `}function T(c){const e=i.circuitos.map((t,o)=>Y(t,o)).join("");return`
    <div class="view-header">
      <button class="btn-back" data-action="back">${k.back}</button>
      <div class="view-header-title">${c?"Editar Rutina":"Nueva Rutina"}</div>
    </div>

    <div class="form-section">
      <label class="input-label">Nombre de la rutina</label>
      <input type="text" class="input" id="rutina-nombre" placeholder="Ej: Pecho y espalda"
             value="${i.nombre}">
    </div>

    ${Z()}

    <div class="form-section">
      <div class="form-section-title">Circuitos</div>
      <div id="circuitos-container">
        ${e}
      </div>
      <button class="add-circuito-btn" data-action="add-circuito">+ Agregar circuito</button>
    </div>

    <div class="form-footer">
      <button class="btn btn-primary btn-full" data-action="save">Guardar Rutina</button>
      ${c?'<button class="btn btn-ghost btn-full" data-action="back">Cancelar</button>':""}
    </div>
  `}function j(){const c=document.getElementById("app"),e=!!B(i.id);if(c.innerHTML=T(e),n){const t=c.querySelector(".ej-picker-panel");if(t){t.scrollIntoView({behavior:"smooth",block:"nearest"});const o=t.querySelector(".ej-picker-search");o&&(o.focus(),o.setSelectionRange(o.value.length,o.value.length))}}}function g(){const c=document.getElementById("rutina-nombre");c&&(i.nombre=c.value.trim()),document.querySelectorAll(".ejercicio-form-row").forEach(e=>{const t=parseInt(e.dataset.circ),o=parseInt(e.dataset.ej);!i.circuitos[t]||!i.circuitos[t].ejercicios[o]||e.querySelectorAll("[data-field]").forEach(l=>{const s=l.dataset.field,r=l.value;s==="repsObjetivo"?i.circuitos[t].ejercicios[o].repsObjetivo=parseInt(r)||S:s==="pesoKg"&&(i.circuitos[t].ejercicios[o].pesoKg=parseFloat(r)||0)})})}function ee(){if(!i.nombre)return"Ingresa un nombre para la rutina.";for(let c=0;c<i.circuitos.length;c++){const e=i.circuitos[c];for(let t=0;t<e.ejercicios.length;t++){if(!e.ejercicios[t].nombre.trim())return`Circuito ${c+1}: el ejercicio ${t+1} necesita un nombre.`;const o=e.ejercicios[t].repsObjetivo;if(o<S||o>R)return`Circuito ${c+1}, ejercicio ${t+1}: las repeticiones deben ser entre ${S} y ${R}.`}}return null}function q(c,e,t){i.circuitos[c].ejercicios[e].nombre=t,n=null,p="",j()}function ce(c){const e=document.getElementById("app"),t=s=>{const r=s.target.closest("[data-action]");if(!r)return;const m=r.dataset.action,d=parseInt(r.dataset.circ);switch(m){case"back":b?D({title:"Descartar cambios",body:"Tienes cambios sin guardar. ¿Deseas descartarlos?",confirmText:"Descartar",cancelText:"Seguir editando",danger:!0,onConfirm:()=>h("/")}):h("/");break;case"set-dia":{const a=parseInt(r.dataset.dia);if(g(),i.diaSemana===a){i.diaSemana=null,b=!0,j();break}const f=N().filter($=>$.usuario===(i.usuario||E())&&$.id!==i.id).find($=>$.diaSemana===a);f?D({title:`${J[a]} ya tiene rutina`,body:`"${f.nombre}" esta asignada a este dia. ¿Reemplazarla?`,confirmText:"Reemplazar",onConfirm:()=>{i.diaSemana=a,b=!0,j()}}):(i.diaSemana=a,b=!0,j());break}case"open-calendar":C("Calendario: proximamente");break;case"add-circuito":g(),b=!0,n=null,p="",i.circuitos.push(G()),j();break;case"remove-circuito":i.circuitos.length>1&&(g(),b=!0,n=null,i.circuitos.splice(d,1),j());break;case"add-ejercicio":i.circuitos[d].ejercicios.length<I&&(g(),b=!0,n=null,i.circuitos[d].ejercicios.push(w()),j());break;case"remove-ejercicio":{const a=parseInt(r.dataset.ej);i.circuitos[d].ejercicios.length>X&&(g(),b=!0,n=null,i.circuitos[d].ejercicios.splice(a,1),j());break}case"open-picker":{const a=parseInt(r.dataset.ej);g(),n&&n.circIdx===d&&n.ejIdx===a?(n=null,p=""):(n={circIdx:d,ejIdx:a},p=""),j();break}case"select-ejercicio":{const a=parseInt(r.dataset.ej);g(),b=!0,q(d,a,r.dataset.nombre);break}case"add-custom-ejercicio":{const a=parseInt(r.dataset.ej),u=r.dataset.nombre,f=i.circuitos[d],y=(M[f.grupoMuscular]||[f.grupoMuscular])[0];g(),b=!0,F(u,y),q(d,a,u);break}case"close-picker":n=null,p="",j();break;case"move-ejercicio-up":{const a=parseInt(r.dataset.ej);if(a>0){g(),b=!0;const u=i.circuitos[d].ejercicios;[u[a-1],u[a]]=[u[a],u[a-1]],n=null,j()}break}case"move-ejercicio-down":{const a=parseInt(r.dataset.ej),u=i.circuitos[d].ejercicios;a<u.length-1&&(g(),b=!0,[u[a],u[a+1]]=[u[a+1],u[a]],n=null,j());break}case"save":g();{const a=ee();if(a){C(a,"error");return}H(i),i.diaSemana!==null&&U(i.id,i.diaSemana,i.usuario||E()),C("Rutina guardada"),h("/")}break}},o=s=>{if(s.target.matches('[data-action="change-grupo"]')){const r=parseInt(s.target.dataset.circ);i.circuitos[r].grupoMuscular=s.target.value,b=!0,n&&n.circIdx===r&&(n=null,p="")}s.target.matches("[data-field]")&&(b=!0)},l=s=>{if(s.target.matches(".ej-picker-search")){p=s.target.value;const r=s.target.closest(".ej-picker-panel");if(r&&n){const{circIdx:m,ejIdx:d}=n,a=i.circuitos[m],u=M[a.grupoMuscular]||[a.grupoMuscular],f=_(u,p),$=p.trim().toLowerCase(),y=$&&f.some(v=>v.nombre.toLowerCase()===$),P=r.querySelector(".ej-picker-list");P&&(P.innerHTML=f.length?f.map(v=>`
                <button class="ej-picker-option" data-action="select-ejercicio"
                        data-circ="${m}" data-ej="${d}" data-nombre="${v.nombre}">
                  <span class="ej-picker-option-name">${v.nombre}</span>
                  <span class="ej-item-type ${v.tipo}">${v.tipo==="maquina"?"Máquina":"Funcional"}</span>
                </button>
              `).join(""):'<div class="ej-picker-empty">Sin resultados</div>');const O=r.querySelector(".ej-picker-add");if(O&&O.remove(),$&&!y){const v=document.createElement("button");v.className="ej-picker-add",v.dataset.action="add-custom-ejercicio",v.dataset.circ=m,v.dataset.ej=d,v.dataset.nombre=p.trim(),v.textContent=`+ Agregar "${p.trim()}"`,r.appendChild(v)}}}};return e.addEventListener("click",t),e.addEventListener("change",o),e.addEventListener("input",l),()=>{e.removeEventListener("click",t),e.removeEventListener("change",o),e.removeEventListener("input",l),i=null,n=null,p=""}}export{ce as mount,ie as render};
