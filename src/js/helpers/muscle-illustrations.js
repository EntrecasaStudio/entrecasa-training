/**
 * Encyclopedic muscle group illustrations — fine-line SVG style.
 * Each is a 64x64 SVG showing a front/back human silhouette
 * with the target muscle group highlighted.
 *
 * The body outline is drawn in a subtle color, and the active
 * muscle zone is filled with the category's accent color via CSS var.
 */

const BODY_FRONT = `
  <path d="M32,6 C34.5,6 36,8 36,10.5 C36,13 34.5,15 32,15 C29.5,15 28,13 28,10.5 C28,8 29.5,6 32,6Z" class="body-outline"/>
  <path d="M32,15 L32,18 L26,20 L22,19 L22,32 L24,38 L22,46 L24,48 L26,42 L28,36 L30,42 L30,56 L28,62 L34,62 L32,56 L32,42 L34,42 L34,56 L36,62 L42,62 L40,56 L38,42 L40,36 L42,42 L44,48 L46,46 L44,38 L46,32 L46,19 L42,20 L38,18 L38,15" class="body-outline"/>
`;

const BODY_BACK = `
  <path d="M32,6 C34.5,6 36,8 36,10.5 C36,13 34.5,15 32,15 C29.5,15 28,13 28,10.5 C28,8 29.5,6 32,6Z" class="body-outline"/>
  <path d="M32,15 L32,18 L26,20 L22,19 L22,32 L24,38 L22,46 L24,48 L26,42 L28,36 L30,42 L30,56 L28,62 L34,62 L32,56 L32,42 L34,42 L34,56 L36,62 L42,62 L40,56 L38,42 L40,36 L42,42 L44,48 L46,46 L44,38 L46,32 L46,19 L42,20 L38,18 L38,15" class="body-outline"/>
`;

function svg(bodyTemplate, highlightPaths) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" fill="none" class="muscle-illustration">
  <g stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.35">
    ${bodyTemplate}
  </g>
  <g class="muscle-highlight" stroke-width="0" opacity="0.7">
    ${highlightPaths}
  </g>
</svg>`;
}

export const MUSCLE_GROUP_SVG = {
  Core: svg(BODY_FRONT, `
    <ellipse cx="32" cy="30" rx="5" ry="7" class="muscle-zone"/>
    <rect x="28" y="24" width="2" height="12" rx="0.5" class="muscle-zone" opacity="0.5"/>
    <rect x="34" y="24" width="2" height="12" rx="0.5" class="muscle-zone" opacity="0.5"/>
  `),

  Piernas: svg(BODY_FRONT, `
    <ellipse cx="30" cy="48" rx="2.5" ry="8" class="muscle-zone"/>
    <ellipse cx="34" cy="48" rx="2.5" ry="8" class="muscle-zone"/>
    <ellipse cx="29" cy="38" rx="3" ry="4" class="muscle-zone" opacity="0.5"/>
    <ellipse cx="35" cy="38" rx="3" ry="4" class="muscle-zone" opacity="0.5"/>
  `),

  'Glúteos': svg(BODY_BACK, `
    <ellipse cx="29" cy="36" rx="4" ry="3.5" class="muscle-zone"/>
    <ellipse cx="35" cy="36" rx="4" ry="3.5" class="muscle-zone"/>
  `),

  Pecho: svg(BODY_FRONT, `
    <ellipse cx="28" cy="22" rx="4.5" ry="3" class="muscle-zone"/>
    <ellipse cx="36" cy="22" rx="4.5" ry="3" class="muscle-zone"/>
  `),

  Espalda: svg(BODY_BACK, `
    <path d="M26,20 Q32,18 38,20 L38,32 Q32,30 26,32 Z" class="muscle-zone"/>
  `),

  Hombros: svg(BODY_FRONT, `
    <ellipse cx="23" cy="20" rx="3" ry="2.5" class="muscle-zone" transform="rotate(-15,23,20)"/>
    <ellipse cx="41" cy="20" rx="3" ry="2.5" class="muscle-zone" transform="rotate(15,41,20)"/>
  `),

  Brazos: svg(BODY_FRONT, `
    <ellipse cx="23" cy="28" rx="2" ry="5" class="muscle-zone" transform="rotate(8,23,28)"/>
    <ellipse cx="41" cy="28" rx="2" ry="5" class="muscle-zone" transform="rotate(-8,41,28)"/>
    <ellipse cx="22" cy="38" rx="1.5" ry="4" class="muscle-zone" opacity="0.5" transform="rotate(5,22,38)"/>
    <ellipse cx="42" cy="38" rx="1.5" ry="4" class="muscle-zone" opacity="0.5" transform="rotate(-5,42,38)"/>
  `),
};
