const quickCities = [
  ['Ho Chi Minh City','TP. Hồ Chí Minh','Asia/Ho_Chi_Minh'], ['Hanoi','Hà Nội','Asia/Ho_Chi_Minh'], ['Tokyo','Tokyo','Asia/Tokyo'],
  ['Los Angeles','Los Angeles','America/Los_Angeles']
];
const translations = {
  vi: { topline:'LỊCH PHÁT SÓNG TOÀN CẦU', intro:'Bạn sẽ xem lúc mấy giờ? Nhập tên thành phố để đổi giờ phát sóng sang giờ địa phương.', cityLabel:'THÀNH PHỐ CỦA BẠN', placeholder:'Ví dụ: Los Angeles, London, Tokyo…', countdownNetflix:'NETFLIX PHÁT SAU', countdownYoutube:'YOUTUBE PHÁT SAU', earlier:'SỚM HƠN', free:'MIỄN PHÍ', localTime:'GIỜ ĐỊA PHƯƠNG', premiere:'Buổi công chiếu đầu tiên', rockstarChannel:'Trên kênh Rockstar Games', difference:'YouTube phát sau Netflix', hours:'giờ', sameContent:'cùng một nội dung', converted:'Đã chuyển đổi từ giờ ET (UTC−4)', source:'Nguồn: Rockstar Games ↗', quick:'Hoặc chọn nhanh:', searching:'Đang tìm thành phố…', choose:'Chọn thành phố để xem giờ địa phương.', empty:'Không tìm thấy — thử thêm tên quốc gia.', offline:'Không kết nối được dữ liệu thành phố. Thử lại sau nhé.' },
  en: { topline:'GLOBAL PREMIERE TIMES', intro:'What time will you watch? Enter your city to convert the release times to your local time.', cityLabel:'YOUR CITY', placeholder:'e.g. Los Angeles, London, Tokyo…', countdownNetflix:'NETFLIX PREMIERE IN', countdownYoutube:'YOUTUBE PREMIERE IN', earlier:'EARLIER', free:'FREE', localTime:'LOCAL TIME', premiere:'The first premiere', rockstarChannel:'On Rockstar Games channel', difference:'YouTube goes live after Netflix', hours:'hours', sameContent:'same content', converted:'Converted from ET (UTC−4)', source:'Source: Rockstar Games ↗', quick:'Quick picks:', searching:'Finding cities…', choose:'Choose a city to see local times.', empty:'No results — try adding a country.', offline:'Could not connect to city data. Try again.' },
  fr: { topline:'HORAIRES DE PREMIÈRE MONDIALE', intro:'À quelle heure allez-vous regarder ? Entrez votre ville pour convertir les horaires dans votre fuseau local.', cityLabel:'VOTRE VILLE', placeholder:'ex. Los Angeles, Londres, Tokyo…', countdownNetflix:'PREMIÈRE NETFLIX DANS', countdownYoutube:'PREMIÈRE YOUTUBE DANS', earlier:'EN AVANCE', free:'GRATUIT', localTime:'HEURE LOCALE', premiere:'La première diffusion', rockstarChannel:'Sur la chaîne Rockstar Games', difference:'YouTube sera disponible après Netflix', hours:'heures', sameContent:'même contenu', converted:'Converti depuis l’ET (UTC−4)', source:'Source : Rockstar Games ↗', quick:'Choix rapides :', searching:'Recherche de villes…', choose:'Choisissez une ville pour voir l’heure locale.', empty:'Aucun résultat — essayez avec un pays.', offline:'Impossible de joindre les données. Réessayez.' }
};
let currentLang = 'vi';
let currentPlace = { displayName: 'TP. Hồ Chí Minh', timezone: 'Asia/Ho_Chi_Minh' };

const input = document.querySelector('#cityInput');
const suggestions = document.querySelector('#suggestions');
const clearBtn = document.querySelector('#clearBtn');
const status = document.querySelector('#searchStatus');
const countdownLabel = document.querySelector('#countdownLabel');
const countdownValue = document.querySelector('#countdownValue');
const parts = {
  city: document.querySelector('#cityName'), zone: document.querySelector('#timezoneName'),
  netflixDate: document.querySelector('#netflixDate'), netflixTime: document.querySelector('#netflixTime'),
  youtubeDate: document.querySelector('#youtubeDate'), youtubeTime: document.querySelector('#youtubeTime')
};
const baseTimes = { netflix: '2026-08-27T19:00:00Z', youtube: '2026-08-28T01:00:00Z' };
let fmtTime = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
let fmtDate = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
let searchTimer;
let requestId = 0;

function t(key) { return translations[currentLang][key]; }

function updateCountdown() {
  const netflix = new Date(baseTimes.netflix).getTime();
  const youtube = new Date(baseTimes.youtube).getTime();
  const now = Date.now();
  const target = now < netflix ? netflix : youtube;
  countdownLabel.textContent = now < netflix ? t('countdownNetflix') : t('countdownYoutube');
  const remaining = Math.max(0, target - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  countdownValue.textContent = `${days}d ${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;
}

function setQuickStatus() {
  status.textContent = '';
}

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = t(node.dataset.i18nPlaceholder); });
  fmtTime = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : lang === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  fmtDate = new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : lang === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.querySelectorAll('.langs button').forEach(button => button.classList.toggle('active', button.dataset.lang === lang));
  setQuickStatus();
  updateCountdown();
  if (input.value) searchPlaces(input.value.trim());
  else render(currentPlace);
}

function localDateParts(iso, timezone) {
  const items = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(iso)).reduce((out, item) => ({ ...out, [item.type]: item.value }), {});
  return new Date(`${items.year}-${items.month}-${items.day}T${items.hour}:${items.minute}:00`);
}

function offset(timezone, date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeZoneName: 'longOffset' })
    .formatToParts(date).find(item => item.type === 'timeZoneName')?.value || timezone;
}

function render(place) {
  currentPlace = place;
  const netflixDate = new Date(baseTimes.netflix);
  parts.city.textContent = place.displayName;
  parts.zone.textContent = offset(place.timezone, netflixDate);
  parts.netflixTime.textContent = fmtTime.format(localDateParts(baseTimes.netflix, place.timezone));
  parts.youtubeTime.textContent = fmtTime.format(localDateParts(baseTimes.youtube, place.timezone));
  parts.netflixDate.textContent = fmtDate.format(localDateParts(baseTimes.netflix, place.timezone)).toUpperCase();
  parts.youtubeDate.textContent = fmtDate.format(localDateParts(baseTimes.youtube, place.timezone)).toUpperCase();
}

function placeFromApi(result) {
  const area = result.admin1 ? `, ${result.admin1}` : '';
  return { displayName: `${result.name}${area}, ${result.country}`, timezone: result.timezone };
}

function showResults(results) {
  suggestions.innerHTML = results.map((place, index) => `
    <button class="suggestion" data-index="${index}">
      <strong>${place.name}</strong><span> · ${place.admin1 || place.country}</span>
      <small>${place.country} · ${place.timezone}</small>
    </button>`).join('');
  suggestions.hidden = results.length === 0;
  suggestions.querySelectorAll('.suggestion').forEach(button => button.onclick = () => {
    const place = placeFromApi(results[Number(button.dataset.index)]);
    input.value = place.displayName;
    suggestions.hidden = true;
    clearBtn.style.display = 'block';
    render(place);
  });
}

async function searchPlaces(query) {
  const currentRequest = ++requestId;
  if (query.length < 2) { suggestions.hidden = true; return; }
  status.textContent = t('searching');
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=${currentLang}&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    if (currentRequest !== requestId) return;
    showResults(data.results || []);
    status.textContent = data.results?.length ? t('choose') : t('empty');
  } catch {
    if (currentRequest !== requestId) return;
    suggestions.hidden = true;
    status.textContent = t('offline');
  }
}

input.addEventListener('input', () => {
  clearBtn.style.display = input.value ? 'block' : 'none';
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchPlaces(input.value.trim()), 280);
});

clearBtn.onclick = () => {
  requestId++;
  input.value = '';
  clearBtn.style.display = 'none';
  suggestions.hidden = true;
  setQuickStatus();
  input.focus();
};

function bindQuickCities() {
  document.querySelectorAll('.quick-city').forEach(button => button.onclick = () => {
    const place = quickCities.find(city => city[0] === button.dataset.city);
    input.value = place[1];
    clearBtn.style.display = 'block';
    suggestions.hidden = true;
    render({ displayName: place[1], timezone: place[2] });
  });
}

document.addEventListener('click', event => { if (!event.target.closest('.search-wrap')) suggestions.hidden = true; });
document.querySelectorAll('.langs button').forEach(button => button.onclick = () => applyLanguage(button.dataset.lang));
applyLanguage('en');
render({ displayName: 'Los Angeles', timezone: 'America/Los_Angeles' });
updateCountdown();
setInterval(updateCountdown, 1000);
