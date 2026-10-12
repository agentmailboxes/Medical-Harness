const base = 'https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/glaucoma';
const states = [
  { name: 'Fluid flow', title: 'Fluid is constantly moving', text: 'Aqueous fluid moves through the space at the front of the eye, then leaves through drainage tissue where the iris and cornea meet.', source: `${base}/glaucoma-and-eye-pressure`, label: 'NEI · Eye pressure', mode: 'flow' },
  { name: 'Less drainage', title: 'Slower drainage can raise pressure', text: 'In open-angle glaucoma, fluid passes too slowly through the drainage tissue. Pressure can build up and put the optic nerve at risk. High pressure alone does not establish a glaucoma diagnosis.', source: `${base}/glaucoma-and-eye-pressure`, label: 'NEI · Eye pressure', mode: 'pressure' },
  { name: 'Laser', title: 'Helping the existing drainage pathway', text: 'Laser trabeculoplasty helps fluid drain in open-angle glaucoma. Other glaucoma types use different treatments. Benefits vary, and medicine or repeat treatment may still be needed.', source: `${base}/treatment`, label: 'NEI · Laser treatment', mode: 'laser' },
  { name: 'Surgery', title: 'Creating or improving an exit for fluid', text: 'Some operations create a new opening or use a small drainage tube; other procedures improve drainage. The aim is to lower pressure and protect remaining vision, not restore lost sight. Surgery has risks, including pressure that becomes too low and vision loss.', source: `${base}/glaucoma-surgery`, label: 'NEI · Surgery options and risks', mode: 'surgery' },
];
function diagram() {
  return `<svg class="eye-diagram" viewBox="0 0 500 330" role="img" aria-labelledby="eye-diagram-title eye-diagram-desc">
    <title id="eye-diagram-title">A simplified cross-section of the eye</title>
    <desc id="eye-diagram-desc">The front of the eye is on the left. Arrows show fluid leaving the anterior chamber through drainage tissue near the cornea and iris. The optic nerve is at the back on the right. This conceptual diagram is not to scale.</desc>
    <path class="eye-shell" d="M138 62C217 3 362 42 388 132L443 137V188L388 193C362 283 217 322 138 263C91 240 61 205 61 162S91 84 138 62Z"/>
    <path class="eye-inner" d="M144 77C223 28 348 57 373 143M373 183C348 267 223 297 144 248"/>
    <path class="eye-cornea" d="M138 62C37 87 36 237 138 263"/>
    <path class="eye-chamber" d="M136 78C58 107 58 218 136 247L137 184L124 162L137 140Z"/>
    <path class="eye-iris" d="M138 82V140M138 184V244"/>
    <ellipse class="eye-lens" cx="166" cy="162" rx="23" ry="48"/>
    <path class="fluid-path" d="M170 103C126 115 126 148 112 155C88 167 88 121 123 88"/>
    <path class="fluid-path" d="M170 221C126 209 126 176 112 169C88 157 88 203 123 236"/>
    <path class="flow-arrow" d="m112 93 11-5-1 12m-10 131 11 5-1-12"/>
    <circle class="drain-point" cx="128" cy="80" r="9"/><circle class="drain-point" cx="128" cy="245" r="9"/>
    <path class="surgery-path" d="M102 119Q143 30 221 39"/>
    <path class="diagram-leader" d="M65 160H29M166 199V285M345 164H455M129 80L103 34H32"/>
    <text x="26" y="181">Cornea</text><text x="150" y="308">Lens</text><text x="374" y="212">Optic nerve</text><text x="28" y="24">Drainage tissue</text>
  </svg>`;
}


export const eyeGuide = {
  states, diagram, motion: true,
  intro: 'Follow the fluid. See what treatments aim to change.',
  caption: 'Conceptual illustration · not to scale · not your eye',
  note: { title: 'Where do eye drops fit in?', text: 'Prescription drops also lower eye pressure. An eye specialist decides whether medicine, laser, surgery, or monitoring is appropriate. This guide does not choose a treatment for you.', source: base, label: 'NEI · Glaucoma treatment overview' },
  caution: { text: 'Sudden severe eye pain, red eye, blurred vision, or nausea can require immediate medical care. Do not wait for an online explanation.', source: base, label: 'NEI · Warning signs' },
  footer: 'Original educational illustration informed by the National Eye Institute. It does not show a procedure, predict pressure readings, or replace an examination.',
};
