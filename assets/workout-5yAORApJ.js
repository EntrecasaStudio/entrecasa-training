import{p as A,L as g,a as M,D as q,n as I,K as B,g as C,E as D,M as P,N as F}from"./index-0HqlbGei.js";import{f as T}from"./stats-helpers-oRTORz5r.js";let w=null;function W(){return w||(w=new(window.AudioContext||window.webkitAudioContext)),w}function L(t=880,e=.15){try{const s=W(),r=s.createOscillator(),i=s.createGain();r.type="sine",r.frequency.value=t,i.gain.value=.3,i.gain.exponentialRampToValueAtTime(.001,s.currentTime+e),r.connect(i),i.connect(s.destination),r.start(s.currentTime),r.stop(s.currentTime+e)}catch{}}function N(){L(660,.08)}function z(){L(988,.25)}let o=null,k=null,d=null,p=0;const y=[1,2.5,5],h=[60,90,120];let S=1,R=1;function _(t){const e=M();if(e&&e.rutinaId===t){o=e;return}const s=q(t);if(!s){I("/");return}const r=B(s.id),i={};r&&r.circuitos.forEach(a=>{a.ejercicios.forEach(c=>{i[c.nombre]={reps:c.repsReal,peso:c.pesoRealKg}})}),o={rutinaId:s.id,rutinaNombre:s.nombre,usuario:s.usuario||C(),inicioISO:new Date().toISOString(),circuitoActual:0,resultados:s.circuitos.map(a=>({grupoMuscular:a.grupoMuscular,ejercicios:a.ejercicios.map(c=>{const n=i[c.nombre];return{nombre:c.nombre,repsObjetivo:c.repsObjetivo,repsReal:n?n.reps:c.repsObjetivo,pesoObjetivoKg:c.pesoKg,pesoRealKg:n?n.peso:c.pesoKg}})}))},g(o)}function O(){if(!o)return"00:00";const t=new Date(o.inicioISO),e=Math.floor((Date.now()-t.getTime())/1e3),s=Math.floor(e/60),r=e%60;return`${String(s).padStart(2,"0")}:${String(r).padStart(2,"0")}`}function H(){const t=o.resultados.length,e=o.circuitoActual/t*100,s=o.resultados.map((r,i)=>{let a="workout-progress-dot";return i<o.circuitoActual?a+=" done":i===o.circuitoActual&&(a+=" current"),`<span class="${a}"></span>`}).join("");return`
    <div class="workout-progress-bar-wrap">
      <div class="workout-progress-bar">
        <div class="workout-progress-fill" style="width:${e}%"></div>
      </div>
      <div class="workout-progress-dots">${s}</div>
    </div>
  `}function U(t){if(!o)return"";const e=T(o.usuario,t);return e.length===0?"":`<div class="workout-ej-history">${e.slice(-3).map(i=>`${i.reps}r@${i.peso}kg`).join(" → ")}</div>`}function G(t,e){if(!o)return!1;const s=T(o.usuario,t);return s.length<2?!1:s.slice(-2).every(i=>i.reps>=e.repsObjetivo&&i.peso>=e.pesoObjetivoKg)}function V(t,e){const s=G(t.nombre,t);return`
    <div class="workout-ejercicio animate-in" style="animation-delay:${e*60}ms">
      <div class="workout-ejercicio-name">${t.nombre}</div>
      <div class="workout-ejercicio-target">
        Objetivo: ${t.repsObjetivo} reps &middot; ${t.pesoObjetivoKg} kg
      </div>
      ${s?'<div class="workout-overload-hint">&#9650; Subir peso?</div>':""}
      ${U(t.nombre)}
      <div class="workout-ejercicio-inputs">
        <div class="workout-input-group">
          <span class="workout-input-label">Reps</span>
          <div class="stepper workout-stepper">
            <button class="stepper-btn" data-action="dec" data-ej="${e}" data-field="repsReal">-</button>
            <input type="number" class="stepper-value" inputmode="numeric"
                   value="${t.repsReal}" data-ej="${e}" data-field="repsReal">
            <button class="stepper-btn" data-action="inc" data-ej="${e}" data-field="repsReal">+</button>
          </div>
        </div>
        <div class="workout-input-group">
          <span class="workout-input-label">Peso (kg)</span>
          <div class="stepper workout-stepper">
            <button class="stepper-btn" data-action="dec" data-ej="${e}" data-field="pesoRealKg">-</button>
            <input type="number" class="stepper-value" inputmode="decimal" step="0.5"
                   value="${t.pesoRealKg}" data-ej="${e}" data-field="pesoRealKg">
            <button class="stepper-btn" data-action="inc" data-ej="${e}" data-field="pesoRealKg">+</button>
          </div>
        </div>
      </div>
    </div>
  `}function J(t){if(_(t.id),!o)return"";const e=o.resultados[o.circuitoActual],s=o.circuitoActual===o.resultados.length-1,r=e.ejercicios.map((i,a)=>V(i,a)).join("");return`
    <div class="workout-header">
      <div>
        <div style="font-weight:var(--fw-semibold);font-size:var(--text-base)">${o.rutinaNombre}</div>
        <div class="workout-timer" id="workout-timer">${O()}</div>
      </div>
      <button class="workout-end-btn" data-action="end-workout">Salir</button>
    </div>

    <div class="workout-progress">
      ${H()}
      <span class="workout-progress-label">${o.circuitoActual+1}/${o.resultados.length} &middot; ${e.grupoMuscular}</span>
    </div>

    ${r}

    <div class="peso-step-toggle">
      <span class="peso-step-label">Incremento peso:</span>
      ${y.map((i,a)=>`<button class="peso-step-btn ${a===S?"active":""}" data-action="set-peso-step" data-idx="${a}">${i} kg</button>`).join("")}
    </div>

    <div class="workout-nav-btns">
      ${o.circuitoActual>0?'<button class="btn btn-ghost workout-prev-btn" data-action="prev-circuit">← Anterior</button>':""}
      <button class="btn btn-primary btn-full" data-action="${s?"finish":"next-circuit"}">
        ${s?"Finalizar Entrenamiento":"Siguiente Circuito →"}
      </button>
    </div>
  `}function f(){if(!o)return;const t=o.resultados[o.circuitoActual];document.querySelectorAll(".stepper-value").forEach(e=>{const s=parseInt(e.dataset.ej),r=e.dataset.field;if(t.ejercicios[s]){const i=parseFloat(e.value)||0;t.ejercicios[s][r]=i}}),g(o)}function Q(){f();const t=new Date(o.inicioISO),e=Math.round((Date.now()-t.getTime())/6e4),s={id:D(),rutinaId:o.rutinaId,rutinaNombre:o.rutinaNombre,usuario:o.usuario||C(),fecha:o.inicioISO,duracionMin:e,circuitos:o.resultados};P(s),F(),$(),o=null,I(`/summary/${s.id}`)}function j(t,e){d&&(clearInterval(d),d=null);const s=document.getElementById("rest-overlay-container");s&&s.remove(),o.circuitoActual++,g(o),E(x(),e,"next")}function X(){k=setInterval(()=>{const t=document.getElementById("workout-timer");t&&(t.textContent=O())},1e3)}function $(){k&&(clearInterval(k),k=null),d&&(clearInterval(d),d=null)}function x(){return document.querySelector("#view-container .other-view")||document.getElementById("app")}function E(t,e,s){const r=s==="next"?"circuit-exit-left":"circuit-exit-right",i=s==="next"?"circuit-enter-right":"circuit-enter-left";t.classList.add(r),t.addEventListener("animationend",()=>{t.classList.remove(r),t.innerHTML=J(e),t.classList.add(i),t.addEventListener("animationend",()=>{t.classList.remove(i)},{once:!0})},{once:!0})}function tt(t){X();const e=document.getElementById("app"),s=i=>{const a=i.target.closest("[data-action]");if(!a)return;const c=a.dataset.action;switch(c){case"inc":case"dec":{const n=parseInt(a.dataset.ej),v=a.dataset.field,u=document.querySelector(`.stepper-value[data-ej="${n}"][data-field="${v}"]`);if(!u)return;const m=v==="pesoRealKg"?y[S]:1;let l=parseFloat(u.value)||0;l=c==="inc"?l+m:Math.max(0,l-m),u.value=l,navigator.vibrate&&navigator.vibrate(30),u.classList.remove("value-bump"),u.offsetWidth,u.classList.add("value-bump"),f();break}case"prev-circuit":o.circuitoActual>0&&(f(),o.circuitoActual--,g(o),E(x(),t,"prev"));break;case"next-circuit":f(),o.circuitoActual++,g(o),E(x(),t,"next");break;case"skip-rest":j(e,t);break;case"set-rest-step":{const n=parseInt(a.dataset.idx);if(n>=0&&n<h.length){R=n,p=h[n];const v=document.getElementById("rest-timer-value");v&&(v.textContent=p),document.querySelectorAll(".rest-step-btn").forEach((l,b)=>{l.classList.toggle("active",b===n)});const u=document.querySelector(".rest-ring-progress");u&&(u.style.strokeDashoffset="0"),d&&clearInterval(d);const m=339.3;d=setInterval(()=>{p--;const l=document.getElementById("rest-timer-value"),b=document.querySelector(".rest-ring-progress");if(l&&(l.textContent=p),b){const K=p/h[R];b.style.strokeDashoffset=m*(1-K)}p>0&&p<=3&&(N(),navigator.vibrate&&navigator.vibrate([80,40,80])),p<=0&&(z(),navigator.vibrate&&navigator.vibrate([200,100,200]),j(e,t))},1e3)}break}case"finish":A({title:"Finalizar entrenamiento",body:"Se guardara esta sesion en tu historial.",confirmText:"Finalizar",onConfirm:()=>Q()});break;case"set-peso-step":{const n=parseInt(a.dataset.idx);n>=0&&n<y.length&&(S=n,document.querySelectorAll(".peso-step-btn").forEach((v,u)=>{v.classList.toggle("active",u===n)}));break}case"end-workout":A({title:"Salir del entrenamiento",body:"Tu progreso queda guardado. Podés retomarlo cuando quieras.",confirmText:"Salir",cancelText:"Continuar",danger:!0,onConfirm:()=>{f(),$(),o=null,I("/")}});break}},r=i=>{i.target.matches(".stepper-value")&&f()};return e.addEventListener("click",s),e.addEventListener("change",r),()=>{e.removeEventListener("click",s),e.removeEventListener("change",r),$()}}export{tt as mount,J as render};
