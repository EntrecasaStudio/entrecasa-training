import{O as v,n as u,g as p,y,P as g,G as m,h as $,i as l}from"./index-BTNJYZkc.js";function b(o){if(o<60)return`${o} min`;const s=Math.floor(o/60),n=o%60;return`${s}h ${n}m`}function d(o,s,n="",e=!1){return`
    <div class="summary-stat ${e?"summary-stat-accent":""}">
      <div class="summary-stat-value">${s}<span class="summary-stat-unit">${n}</span></div>
      <div class="summary-stat-label">${o}</div>
    </div>
  `}function f(o,s){if(!s)return"";const n=m(o),e=m(s),a=n-e,t=e>0?Math.round(a/e*100):0,r=a>0?"progress-up":a<0?"progress-down":"progress-same",i=a>0?l.arrowUp:a<0?l.arrowDown:l.equal,c=a>0?"+":"";return`
    <div class="summary-comparison animate-in" style="animation-delay:400ms">
      <div class="summary-section-title">vs. sesion anterior</div>
      <div class="summary-comparison-row">
        <span>Volumen total</span>
        <span class="${r}">${i} ${c}${Math.round(a)} kg (${c}${t}%)</span>
      </div>
    </div>
  `}function h(o,s){const n=[];for(const a of o.circuitos)for(const t of a.ejercicios){const r=s[t.nombre];r&&t.pesoRealKg>=r.maxPeso&&t.pesoRealKg>0&&n.push({nombre:t.nombre,peso:t.pesoRealKg})}return n.length===0?"":`
    <div class="summary-prs">
      <div class="summary-section-title">Records personales</div>
      ${n.map((a,t)=>`
    <div class="summary-pr-card animate-in" style="animation-delay:${500+t*80}ms">
      <span class="summary-pr-icon">&#127942;</span>
      <div class="summary-pr-info">
        <div class="summary-pr-name">${a.nombre}</div>
        <div class="summary-pr-value">${a.peso} kg</div>
      </div>
    </div>
  `).join("")}
    </div>
  `}function w(o){const s=v(o.id);if(!s)return u("/"),"";const n=s.usuario||p(),e=y(n),a=g(s),t=Math.round(m(s)),r=s.circuitos.reduce((i,c)=>i+c.ejercicios.length,0);return`
    <div class="summary-page">
      <div class="summary-header animate-in">
        <div class="summary-check">&#10003;</div>
        <div class="summary-title">Entrenamiento completado</div>
        <div class="summary-subtitle">${s.rutinaNombre}</div>
      </div>

      <div class="summary-stats">
        ${d("Duracion",b(s.duracionMin),"",!0)}
        ${d("Volumen",t.toLocaleString(),"kg")}
        ${d("Ejercicios",r)}
        ${d("Circuitos",s.circuitos.length)}
      </div>

      ${f(s,a)}
      ${h(s,e)}

      <div class="summary-actions animate-in" style="animation-delay:600ms">
        <button class="btn btn-primary btn-full" data-action="detail" data-id="${s.id}">Ver Detalle</button>
        <button class="btn btn-ghost btn-full" data-action="share" data-id="${s.id}">Compartir Resumen</button>
        <button class="btn btn-ghost btn-full" data-action="home">Volver al Inicio</button>
      </div>
    </div>
  `}function C(o){const s=document.getElementById("app"),n=e=>{const a=e.target.closest("[data-action]");if(a)switch(a.dataset.action){case"detail":u(`/sesion/${a.dataset.id}`);break;case"share":{const t=v(a.dataset.id);if(!t)break;const r=Math.round(m(t)),i=`${t.rutinaNombre} — ${t.duracionMin} min — ${r.toLocaleString()} kg volumen 💪`;navigator.share?navigator.share({title:"Entrenamiento",text:i}).catch(()=>{}):navigator.clipboard.writeText(i).then(()=>$("Copiado al portapapeles"));break}case"home":u("/");break}};return s.addEventListener("click",n),()=>{s.removeEventListener("click",n)}}export{C as mount,w as render};
