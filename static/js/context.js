import { ICON, svg } from './icons.js';

const dialog = document.getElementById('context-dialog');
const zoneInput = document.getElementById('context-zone');
const countryInput = document.getElementById('context-country');
const trigger = document.getElementById('context-trigger');
let selectedZone = null;
let selectedCountry = null;

export function clientContext() {
  const options = Intl.DateTimeFormat().resolvedOptions();
  return { time_zone: selectedZone || options.timeZone || null, locale: options.locale, country_code: selectedCountry };
}

function updateLabel() {
  const zone = clientContext().time_zone;
  trigger.innerHTML = `${svg(ICON.globe)}<span>${(zone || 'Time zone unknown').replaceAll('_', ' ')}</span>`;
}

export function initContext() {
  if (Intl.supportedValuesOf) {
    document.getElementById('context-zones').replaceChildren(...['UTC', ...Intl.supportedValuesOf('timeZone')].map(zone => new Option(zone, zone)));
  }
  if (Intl.DisplayNames) {
    const names = new Intl.DisplayNames(['en'], { type: 'region' });
    const codes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(' ');
    const options = codes.map(code => new Option(names.of(code), code)).sort((a, b) => a.text.localeCompare(b.text));
    countryInput.replaceChildren(new Option('Not specified', ''), ...options);
  }
  updateLabel();
  trigger.addEventListener('click', () => {
    zoneInput.value = clientContext().time_zone || '';
    countryInput.value = selectedCountry || '';
    dialog.showModal();
  });
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  zoneInput.addEventListener('input', () => zoneInput.setCustomValidity(''));
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    try { Intl.DateTimeFormat('en', { timeZone: zoneInput.value.trim() }); }
    catch { zoneInput.setCustomValidity('Enter a time zone such as Asia/Kolkata or Europe/London.'); zoneInput.reportValidity(); return; }
    selectedZone = zoneInput.value.trim();
    selectedCountry = countryInput.value || null;
    updateLabel();
    dialog.close();
  });
}
