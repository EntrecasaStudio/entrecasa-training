import{O as $,n as g,g as b,u as f,i as d,Q as h,B as R}from"./index-0HqlbGei.js";const P={Core:"tag-core",Piernas:"tag-piernas",Pecho:"tag-pecho",Espalda:"tag-espalda",Brazos:"tag-brazos",Gluteos:"tag-gluteos",Hombros:"tag-hombros"};function j(a){return new Date(a).toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}function u(a,e){return e==null?"":a>e?`<span class="progress-up">${d.arrowUp} +${a-e}</span>`:a<e?`<span class="progress-down">${d.arrowDown} -${e-a}</span>`:`<span class="progress-same">${d.equal}</span>`}function k(a){const e=h(a.rutinaId),s=e.findIndex(i=>i.id===a.id);return s>=0&&s<e.length-1?e[s+1]:null}function y(a){const e=Math.round(R(a)),s=a.circuitos.reduce((i,c)=>i+c.ejercicios.length,0);return`
    <div class="detalle-stats-strip animate-in">
      <div class="detalle-stat">
        <div class="detalle-stat-value">${a.duracionMin}</div>
        <div class="detalle-stat-label">min</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${e.toLocaleString()}</div>
        <div class="detalle-stat-label">kg vol</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${s}</div>
        <div class="detalle-stat-label">ejercicios</div>
      </div>
      <div class="detalle-stat-divider"></div>
      <div class="detalle-stat">
        <div class="detalle-stat-value">${a.circuitos.length}</div>
        <div class="detalle-stat-label">circuitos</div>
      </div>
    </div>
  `}function S(a,e,s,i){const c=a.ejercicios.map((t,n)=>{var v;const l=(v=s==null?void 0:s.ejercicios)==null?void 0:v[n],o=l?u(t.pesoRealKg,l.pesoRealKg):"",p=l?u(t.repsReal,l.repsReal):"",r=i[t.nombre],m=r&&t.pesoRealKg>0&&t.pesoRealKg>=r.maxPeso?'<span class="pr-badge">PR</span>':"";return`
        <div class="ejercicio-detalle-row">
          <div class="ejercicio-detalle-name">${t.nombre} ${m}</div>
          <div class="ejercicio-detalle-values">
            <div class="ejercicio-detalle-col">
              <div class="ejercicio-detalle-col-label">Reps</div>
              <div class="ejercicio-detalle-col-value">${t.repsReal} ${p}</div>
            </div>
            <div class="ejercicio-detalle-col">
              <div class="ejercicio-detalle-col-label">Peso</div>
              <div class="ejercicio-detalle-col-value">${t.pesoRealKg} kg ${o}</div>
            </div>
          </div>
        </div>
      `}).join("");return`
    <div class="card circuito-detalle-card animate-in" style="animation-delay:${100+e*80}ms">
      <div class="circuito-detalle-header">
        <span class="tag ${P[a.grupoMuscular]||""}">${a.grupoMuscular}</span>
      </div>
      ${c}
    </div>
  `}function E(a){const e=$(a.id);if(!e)return g("/historial"),"";const s=k(e),i=e.usuario||b(),c=f(i),t=e.circuitos.map((n,l)=>{var o;return S(n,l,(o=s==null?void 0:s.circuitos)==null?void 0:o[l],c)}).join("");return`
    <div class="view-header">
      <button class="btn-back" data-action="back">${d.back}</button>
      <div class="view-header-title">${e.rutinaNombre}</div>
    </div>

    <div class="sesion-detalle-fecha animate-in">${j(e.fecha)}</div>

    ${y(e)}

    ${s?'<p class="detalle-comparison-note animate-in" style="animation-delay:80ms">Comparado con sesion anterior</p>':""}

    ${t}
  `}function I(){const a=document.getElementById("app"),e=s=>{s.target.closest('[data-action="back"]')&&g("/historial")};return a.addEventListener("click",e),()=>{a.removeEventListener("click",e)}}export{I as mount,E as render};
