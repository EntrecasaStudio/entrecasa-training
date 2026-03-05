import{g as k,i as x,u as j}from"./index-0HqlbGei.js";import{f as C,h as w,a as M,b as T,c as W,d as D,i as R,j as A}from"./stats-helpers-oRTORz5r.js";function E(e,s,o={}){if(!e||s.length<2)return;const{lineColor:i="#FFCD00",fillColor:a="rgba(255, 205, 0, 0.15)",dotColor:n="#FFCD00",lineWidth:l=2,dotRadius:v=3,padding:c=8}=o,t=e.getContext("2d"),m=window.devicePixelRatio||1,y=e.offsetWidth,p=e.offsetHeight;e.width=y*m,e.height=p*m,t.scale(m,m);const h=Math.min(...s),S=Math.max(...s)-h||1,b=y-c*2,f=p-c*2;function d(r){return c+r/(s.length-1)*b}function g(r){return c+f-(r-h)/S*f}t.beginPath(),t.moveTo(d(0),g(s[0]));for(let r=1;r<s.length;r++)t.lineTo(d(r),g(s[r]));t.lineTo(d(s.length-1),p-c),t.lineTo(d(0),p-c),t.closePath();const u=t.createLinearGradient(0,c,0,p-c);u.addColorStop(0,a),u.addColorStop(1,"transparent"),t.fillStyle=u,t.fill(),t.beginPath(),t.moveTo(d(0),g(s[0]));for(let r=1;r<s.length;r++)t.lineTo(d(r),g(s[r]));t.strokeStyle=i,t.lineWidth=l,t.lineJoin="round",t.lineCap="round",t.stroke();const $=s.length-1;t.beginPath(),t.arc(d($),g(s[$]),v,0,Math.PI*2),t.fillStyle=n,t.fill()}function F(e){const s=w(e),o=M(e),i=T(e),a=W(e),n=D(e),l=n===null?"Sin datos":n===0?"Hoy":n===1?"Ayer":`Hace ${n}d`;return`
    <div class="progress-quick-stats">
      <div class="progress-stat-card animate-in" style="animation-delay:100ms">
        <div class="progress-stat-value">${s.totalSesiones}</div>
        <div class="progress-stat-label">Sesiones</div>
      </div>
      <div class="progress-stat-card animate-in" style="animation-delay:150ms">
        <div class="progress-stat-value">${o}<span class="progress-stat-unit">sem</span></div>
        <div class="progress-stat-label">Racha</div>
      </div>
      <div class="progress-stat-card animate-in" style="animation-delay:200ms">
        <div class="progress-stat-value">${i}${a>0?`<span class="progress-stat-unit">/${a}</span>`:""}</div>
        <div class="progress-stat-label">Esta semana</div>
      </div>
      <div class="progress-stat-card animate-in" style="animation-delay:250ms">
        <div class="progress-stat-value progress-stat-value-sm">${l}</div>
        <div class="progress-stat-label">Ultimo</div>
      </div>
    </div>
  `}function H(e){const s=R(e,12);if(s.every(a=>a.count===0))return"";const o=Math.max(...s.map(a=>a.count),1);return`
    <div class="progress-section animate-in" style="animation-delay:300ms">
      <div class="progress-section-title">Actividad (12 semanas)</div>
      <div class="activity-grid">${s.map((a,n)=>`<div class="activity-cell level-${a.count===0?0:Math.min(Math.ceil(a.count/o*3),3)} animate-in" style="animation-delay:${300+n*30}ms" title="${a.count} sesiones"></div>`).join("")}</div>
      <div class="activity-legend">
        <span>Menos</span>
        <div class="activity-cell level-0"></div>
        <div class="activity-cell level-1"></div>
        <div class="activity-cell level-2"></div>
        <div class="activity-cell level-3"></div>
        <span>Mas</span>
      </div>
    </div>
  `}function G(e){const s=A(e,6);return s.length===0?"":`
    <div class="progress-section animate-in" style="animation-delay:400ms">
      <div class="progress-section-title">Progreso por ejercicio</div>
      ${s.map((i,a)=>{const n=i.mejora>0?x.arrowUp:i.mejora<0?x.arrowDown:"",l=i.mejora>0?"progress-up":i.mejora<0?"progress-down":"",v=i.mejora>0?"+":"";return`
      <div class="exercise-progress-card animate-in" style="animation-delay:${400+a*60}ms">
        <div class="exercise-progress-info">
          <div class="exercise-progress-name">${i.nombre}</div>
          <div class="exercise-progress-detail">
            <span class="exercise-progress-max">${i.maxPeso} kg</span>
            ${i.mejora!==0?`<span class="exercise-progress-trend ${l}">${n} ${v}${i.mejora} kg</span>`:""}
          </div>
        </div>
        <canvas class="exercise-sparkline" data-exercise="${i.nombre}" width="100" height="40"></canvas>
      </div>
    `}).join("")}
    </div>
  `}function L(e){const s=j(e),o=Object.entries(s);if(o.length===0)return"";const i=o.filter(([,n])=>n.maxPeso>0).sort((n,l)=>new Date(l[1].fecha)-new Date(n[1].fecha)).slice(0,5);return i.length===0?"":`
    <div class="progress-section animate-in" style="animation-delay:500ms">
      <div class="progress-section-title">Records personales</div>
      ${i.map(([n,l],v)=>`
    <div class="pr-list-item animate-in" style="animation-delay:${500+v*50}ms">
      <span class="pr-list-icon">&#127942;</span>
      <span class="pr-list-name">${n}</span>
      <span class="pr-list-value">${l.maxPeso} kg</span>
    </div>
  `).join("")}
    </div>
  `}function I(){const e=k();return`
    <div class="progreso-page">
      <div class="progreso-header animate-in">
        <div class="progreso-title">Progreso</div>
      </div>
      ${F(e)}
      ${H(e)}
      ${G(e)}
      ${L(e)}
    </div>
  `}function J(){const e=k();document.querySelectorAll(".exercise-sparkline").forEach(s=>{const o=s.dataset.exercise,i=C(e,o);i.length>=2&&E(s,i.map(a=>a.peso))})}export{J as mount,I as render};
