let map;
let markers = [];
let chartMetrics;
let chartTrends;

// Local State
const state = {
    theme: 'dark',
    lang: 'ko', // Added for i18n
    currentSido: '전국',
    activeLayers: ['청소년 수련시설', '청소년쉼터', '청소년상담복지센터'],
    facilityListOpen: false,
    pano: null, // Naver Panorama
    currentRoute: null,
    data: {
        facilities: [],
        metrics: [],
        hotlines: [],
        trends: { years: [], values: [] },
        gradeMetrics: [],
        indicatorSummary: [],
        dataInfo: null
    }
};

// I18N Dictionary
const i18n = {
    ko: {
        pred_title: "AI 정신건강 트렌드 예측",
        label_indicator: "지표 선택",
        label_region: "지역 선택",
        label_horizon: "예측 기간 (년)",
        label_model: "모델 선택",
        btn_analyze: "분석 실행",
        label_latest_val: "최근 기록값",
        label_change: "직전 대비 변화",
        label_pred_final: "AI 최종 예측값",
        tab_forecast: "AI 예측 분석",
        tab_comparison: "성능 비교",
        th_date: "연도",
        th_actual: "실제값",
        th_pred: "예측값",
        th_error: "오차",
        th_error_pct: "오차율(%)",
        btn_analyzing: "분석 중..."
    },
    en: {
        pred_title: "AI Mental Health Trend Prediction",
        label_indicator: "Indicator",
        label_region: "Region",
        label_horizon: "Forecast Horizon (Years)",
        label_model: "Model",
        btn_analyze: "Run Analysis",
        label_latest_val: "Latest Value",
        label_change: "Change",
        label_pred_final: "AI Forecasted Value",
        tab_forecast: "AI Forecast",
        tab_comparison: "Accuracy Metrics",
        th_date: "Year",
        th_actual: "Actual",
        th_pred: "Predicted",
        th_error: "Error",
        th_error_pct: "Error %",
        btn_analyzing: "Analyzing..."
    }
};

// Global Exposure for HTML onclick
window.setTheme = setTheme;
window.setLanguage = setLanguage; // Added
window.navigateTo = navigateTo;
window.zoomToKorea = zoomToKorea;
window.toggle3D = toggle3D;
window.toggleLayer = toggleLayer;
window.toggleFacilityList = toggleFacilityList;
window.toggleRiskLayer = toggleRiskLayer;
window.toggleRouteBox = toggleRouteBox;
window.openReportModal = openReportModal;
window.closeReportModal = closeReportModal;
window.pickFromMap = pickFromMap;
window.pickRoutePoint = pickRoutePoint; // Add
window.submitReport = submitReport;
window.pickFromMap = pickFromMap;
window.submitReport = submitReport;
window.findSafeRoute = findSafeRoute;
window.openNavGuide = openNavGuide;
window.closeNavGuide = closeNavGuide;
window.pickRoutePoint = pickRoutePoint;
window.handleRoutePick = handleRoutePick;

window.onload = function() {
    initApp();
};

function initApp() {
    console.log("Save to youth: Initializing application...");
    initMap();
    initTheme();
    loadDashboard();
    setupEventListeners();
    applyLanguage(); // Initial lang apply
}

function setLanguage(lang) {
    console.log("Switching language to:", lang);
    state.lang = lang;
    
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    
    applyLanguage();
    if (chartPred) updatePrediction(); // Redraw if needed
}

function applyLanguage() {
    const dict = i18n[state.lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) el.innerText = dict[key];
    });
}


function initMap() {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [127.5, 36.5],
        zoom: 7,
        pitch: 45,
        bearing: 0,
        antialias: true
    });

    map.on('load', () => {
        map.addLayer({
            'id': '3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
                'fill-extrusion-color': '#aaa',
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-base': ['get', 'min_height'],
                'fill-extrusion-opacity': 0.6
            }
        });

        map.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
        });
        map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
        
        console.log("Mapbox 3D Terrain & Buildings loaded.");
        renderFacilitiesOnMap();
    });

    map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
}

function updateMapTiles(theme) {
    const style = theme === 'dark' || theme === 'blue' || theme === 'peach'
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11';
    
    if (map) map.setStyle(style);
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    console.log("Switching theme to:", theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        const titleMatch = btn.title.toLowerCase() === theme.toLowerCase();
        btn.classList.toggle('active', titleMatch);
    });

    updateMapTiles(theme);
    if (chartMetrics) updateChartTheme(chartMetrics);
    if (chartTrends) updateChartTheme(chartTrends);
}

function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const targetId = item.getAttribute('data-target');
            navigateTo(targetId);
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });

    document.getElementById('sido-select').addEventListener('change', (e) => {
        state.currentSido = e.target.value;
        loadDashboard();
        updateMapForSido(e.target.value);
    });
}

function navigateTo(targetId) {
    console.log("Navigating to section:", targetId);
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
    
    const target = document.getElementById(targetId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
        if (targetId === 'map-view') {
            setTimeout(() => { map.resize(); }, 200);
        } else if (targetId === 'analysis') {
            renderCharts();
        }
    }
}

async function loadDashboard() {
    await Promise.all([
        fetchFacilities(),
        fetchMetrics(),
        fetchHotlines(),
        fetchTrends(),
        fetchGradeMetrics(),
        fetchIndicatorSummary(),
        fetchDataInfo(),
        fetchLatestYear()
    ]);
    renderFacilitiesOnMap();
    renderHotlines();
    renderDataInfo();
    renderFacilityList();
}

async function fetchFacilities() {
    const res = await fetch(`/api/facilities_${{state.currentSido}.json`);
    state.data.facilities = await res.json();
    document.getElementById('fac-count').innerText = `${state.data.facilities.length}개`;
}

async function fetchMetrics() {
    const res = await fetch(`/api/metrics_${{state.currentSido}.json`);
    state.data.metrics = await res.json();
    updateStatCards();
}

async function fetchTrends() {
    const res = await fetch(`/api/trends`);
    state.data.trends = await res.json();
}

async function fetchHotlines() {
    const res = await fetch('api/hotlines');
    state.data.hotlines = await res.json();
}

function updateStatCards() {
    const depression = state.data.metrics.find(m => m.indicator === "우울감")?.value || "--";
    const selected = state.data.metrics.find(m => m.is_selected);
    const displayedDepression = selected ? selected.value : depression;
    
    document.getElementById('stat-depression').innerText = displayedDepression + (displayedDepression !== "--" ? "%" : "");
    document.getElementById('stat-stress').innerText = "40.1%";
}

function renderFacilitiesOnMap() {
    markers.forEach(m => m.remove());
    markers = [];

    const filtered = state.data.facilities.filter(f => state.activeLayers.includes(f.category));
    filtered.forEach(fac => {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.backgroundColor = getCategoryColor(fac.category);
        el.style.width = '12px'; el.style.height = '12px';
        el.style.borderRadius = '50%'; el.style.border = '2px solid white';
        el.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="font-family: 'Inter', sans-serif; color: #333; line-height: 1.4; padding: 5px;">
                <b style="font-size: 1rem;">${fac.title}</b><br>
                <span style="color: #666; font-size: 0.85rem;">${fac.category}</span><hr style="margin: 8px 0; opacity: 0.2">
                <p style="margin: 5px 0 0; font-size: 0.9rem;">📞 ${fac.phone}</p>
                <p style="margin: 3px 0 0; font-size: 0.85rem; color: #555;">${fac.address}</p>
            </div>
        `);

        const marker = new mapboxgl.Marker(el)
            .setLngLat([fac.lon, fac.lat])
            .setPopup(popup)
            .addTo(map);
        
        markers.push(marker);
    });
}

function getCategoryColor(cat) {
    switch(cat) {
        default: return '#818cf8';
    }
}

function getSchoolColor(type) {
    return type === 'absolute' ? '#f43f5e' : '#f59e0b';
}

function renderSchoolZones() {
    // Remove existing school markers
    markers = markers.filter(m => {
        if (m.isSchoolMarker) { m.remove(); return false; }
        return true;
    });

    if (!state.activeLayers.includes('안전 교육구역')) {
        if (map.getLayer('school-zones-absolute')) map.removeLayer('school-zones-absolute');
        if (map.getLayer('school-zones-relative')) map.removeLayer('school-zones-relative');
        if (map.getSource('school-zones')) map.removeSource('school-zones');
        return;
    }

    const schools = [
        { name: "도산 고등학교", lat: 37.5218, lon: 127.0360 },
        { name: "청담 중학교", lat: 37.5250, lon: 127.0510 },
        { name: "압구정 초등학교", lat: 37.5310, lon: 127.0320 }
    ];

    const harmfulFacilities = [
        { name: "OO 스웨디시 (안마)", type: "유해업소", lat: 37.5215, lon: 127.0365 }, // Absolute zone of Dosan
        { name: "XX 코인노래연습장", type: "유해업소", lat: 37.5255, lon: 127.0520 }  // Relative zone of Cheongdam
    ];

    // Add Markers for Schools
    schools.forEach(school => {
        const el = document.createElement('div');
        el.className = 'school-marker pulse-animation';
        el.innerHTML = '🏫';
        el.style.fontSize = '24px';
        
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="color: #333; padding: 10px;">
                <h4 style="margin:0; color:var(--accent-primary)">🛡️ ${school.name}</h4>
                <p style="margin:5px 0; font-size:0.85rem">교육환경 보호구역 (학교 보건법 준수)</p>
                <div style="display:flex; gap:5px; margin-top:8px;">
                    <span style="background:#fee2e2; color:#f43f5e; padding:2px 6px; border-radius:4px; font-size:0.7rem">절대구역 50m</span>
                    <span style="background:#ffedd5; color:#f59e0b; padding:2px 6px; border-radius:4px; font-size:0.7rem">상대구역 200m</span>
                </div>
            </div>
        `);

        const m = new mapboxgl.Marker(el).setLngLat([school.lon, school.lat]).setPopup(popup).addTo(map);
        m.isSchoolMarker = true;
        markers.push(m);
    });

    // Add Markers for Harmful Facilities (Only show if layer active)
    harmfulFacilities.forEach(fac => {
        const el = document.createElement('div');
        el.className = 'harmful-marker';
        el.innerHTML = '🔞';
        el.style.fontSize = '20px';
        el.style.filter = 'drop-shadow(0 0 5px red)';
        
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="color: #333; padding: 10px;">
                <h4 style="margin:0; color:#f43f5e">🚫 ${fac.name}</h4>
                <p style="margin:5px 0; font-size:0.85rem">청소년 유해환경 시설 (출입/고용 제한)</p>
                <p style="color: #666; font-size:0.8rem">※ 학교 반경 200m 내 위치 주의</p>
            </div>
        `);
        const m = new mapboxgl.Marker(el).setLngLat([fac.lon, fac.lat]).setPopup(popup).addTo(map);
        m.isSchoolMarker = true;
        markers.push(m);
    });

    // Draw Circles (using simple circle layers)
    const features = schools.map(s => ([
        { type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { radius: 0.05, type: 'absolute' } },
        { type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { radius: 0.2, type: 'relative' } }
    ])).flat();

    // Source for circles
    if (map.getSource('school-zones')) {
        map.getSource('school-zones').setData({ type: 'FeatureCollection', features });
    } else {
        map.addSource('school-zones', { type: 'geojson', data: { type: 'FeatureCollection', features } });
    }

    // Relative Zone (200m)
    if (!map.getLayer('school-zones-relative')) {
        map.addLayer({
            id: 'school-zones-relative', type: 'circle', source: 'school-zones',
            filter: ['==', 'type', 'relative'],
            paint: { 'circle-radius': { base: 1.75, stops: [[12, 2], [22, 180]] }, 'circle-color': '#f59e0b', 'circle-opacity': 0.18, 'circle-stroke-width': 1.5, 'circle-stroke-color': '#fbbf24' }
        });
    }

    // Absolute Zone (50m)
    if (!map.getLayer('school-zones-absolute')) {
        map.addLayer({
            id: 'school-zones-absolute', type: 'circle', source: 'school-zones',
            filter: ['==', 'type', 'absolute'],
            paint: { 'circle-radius': { base: 1.75, stops: [[12, 1], [22, 45]] }, 'circle-color': '#f43f5e', 'circle-opacity': 0.3, 'circle-stroke-width': 2, 'circle-stroke-color': '#fb7185' }
        });
    }
}

async function updateMapForSido(sido) {
    if (!map) return;
    if (sido === '전국') {
        map.flyTo({ center: [127.5, 36.5], zoom: 7 });
        return;
    }
    const res = await fetch(`/api/coords_${{sido}.json`);
    const { coords } = await res.json();
    map.flyTo({ center: [coords[1], coords[0]], zoom: 11, duration: 1500 });
}

function externalTooltipHandler(context) {
    const { chart, tooltip } = context;
    const tooltipEl = document.getElementById('chart-tooltip-custom');

    if (tooltip.opacity === 0) {
        tooltipEl.style.opacity = 0;
        return;
    }

    if (tooltip.body) {
        const titleLines = tooltip.title || [];
        const bodyLines = tooltip.body.map(b => b.lines);

        let innerHtml = '<thead>';
        titleLines.forEach(title => { innerHtml += '<tr><th>' + title + '</th></tr>'; });
        innerHtml += '</thead><tbody>';

        bodyLines.forEach((body, i) => {
            const colors = tooltip.labelColors[i];
            const span = '<span style="background:' + colors.backgroundColor + '; border-color:' + colors.borderColor + '; border-width: 2px; margin-right: 10px; height: 10px; width: 10px; display: inline-block;"></span>';
            innerHtml += '<tr><td>' + span + body + '</td></tr>';
        });
        innerHtml += '</tbody>';
        tooltipEl.innerHTML = '<table style="margin: 0;">' + innerHtml + '</table>';
    }

    const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;

    tooltipEl.style.opacity = 1;
    tooltipEl.style.left = positionX + tooltip.caretX + 'px';
    tooltipEl.style.top = positionY + tooltip.caretY + 'px';
    tooltipEl.style.font = tooltip.options.bodyFont.string;
    tooltipEl.style.padding = tooltip.options.padding + 'px ' + tooltip.options.padding + 'px';
}

function renderHotlines() {
    const container = document.getElementById('hotline-list');
    if (!container) return;
    container.innerHTML = '';
    
    state.data.hotlines.forEach(h => {
        const card = document.createElement('div');
        card.className = 'card animate-up';
        card.innerHTML = `
            <div class="card-title" style="color: var(--accent-primary)">${h.name}</div>
            <div style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem;">☎ ${h.phone}</div>
            <div style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">${h.desc}</div>
        `;
        container.appendChild(card);
    });
}

function renderCharts() {
    const ctxMetrics = document.getElementById('chart-metrics').getContext('2d');
    
    // Create Premium Gradient for Bars
    const gradient = ctxMetrics.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
    gradient.addColorStop(1, 'rgba(56, 189, 248, 0.1)');

    const highlightGradient = ctxMetrics.createLinearGradient(0, 0, 0, 400);
    highlightGradient.addColorStop(0, 'rgba(129, 140, 248, 1)');
    highlightGradient.addColorStop(1, 'rgba(129, 140, 248, 0.2)');

    // Fix: Remove potential duplicates in labels/data
    const uniqueMetrics = state.data.metrics.filter((m, index, self) => 
        index === self.findIndex((t) => t.region_name === m.region_name)
    );

    const ctxTrends = document.getElementById('chart-trends').getContext('2d');
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#94a3b8';

    if (chartMetrics) chartMetrics.destroy();
    if (chartTrends) chartTrends.destroy();

    chartMetrics = new Chart(ctxMetrics, {
        type: 'bar',
        data: {
            labels: uniqueMetrics.map(m => m.region_name),
            datasets: [{
                label: state.lang === 'ko' ? '우울감 인지율 (%)' : 'Depression Rate (%)',
                data: uniqueMetrics.map(m => m.value),
                backgroundColor: uniqueMetrics.map(m => m.is_selected ? highlightGradient : gradient),
                borderRadius: 8, borderWidth: 0,
                hoverBackgroundColor: '#818cf8'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 14, weight: 'bold' },
                    padding: 12, cornerRadius: 10,
                    borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor, font: { weight: '600' } } }
            }
        }
    });

    chartTrends = new Chart(ctxTrends, {
        type: 'line',
        data: {
            labels: state.data.trends.years,
            datasets: [{
                label: state.lang === 'ko' ? '스트레스 지수 추이' : 'Stress Index Trend',
                data: state.data.trends.values,
                borderColor: '#818cf8', borderWidth: 3, pointBackgroundColor: '#818cf8',
                pointRadius: 4, tension: 0.4, fill: true, backgroundColor: 'rgba(129, 140, 248, 0.1)'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor, font: { weight: '600' } } }
            }
        }
    });

    renderGradeChart();
    renderDonutChart();
    updateInterpretations();
}

function updateInterpretations() {
    // 1. Regional Metrics Interpretation
    const metricsIterpEl = document.getElementById('analysis-interp');
    if (metricsIterpEl && state.data.metrics.length > 0) {
        const avg = state.data.metrics.reduce((acc, m) => acc + m.value, 0) / state.data.metrics.length;
        const selected = state.data.metrics.find(m => m.is_selected);
        if (selected) {
            const diff = (selected.value - avg).toFixed(1);
            const status = diff > 0 ? '빨간색' : '파란색'; // Simplified indicator
            const evalText = diff > 0 ? '<span style="color:#f43f5e">평균보다 높음 (주의)</span>' : '<span style="color:#10b981">평균보다 낮음 (양호)</span>';
            metricsIterpEl.innerHTML = `현재 선택된 <b>${selected.region_name}</b>의 우울감 인지율은 ${selected.value}%로, 비교 지역 평균(${avg.toFixed(1)}%) 대비 ${evalText} 상태입니다.`;
        } else {
            metricsIterpEl.innerHTML = `전국 평균 우울감 인지율은 약 ${avg.toFixed(1)}%로 나타납니다. 지역별 편차에 주목하세요.`;
        }
    }

    // 2. Trend Interpretation
    const trendInterpEl = document.getElementById('trend-interp');
    if (trendInterpEl && state.data.trends.values.length > 1) {
        const vals = state.data.trends.values;
        const latest = vals[vals.length - 1];
        const prev = vals[vals.length - 2];
        const trend = latest > prev ? '<span style="color:#f43f5e">상승세 (악화)</span>' : '<span style="color:#10b981">하락세 (개선)</span>';
        trendInterpEl.innerHTML = `최근 스트레스 인지율은 ${prev}%에서 ${latest}%로 ${trend}를 보이고 있어, 지속적인 관심과 관리가 요구됩니다.`;
    }

    // 3. Grade Trend Interpretation
    const gradeInterpEl = document.getElementById('grade-interp');
    if (gradeInterpEl && state.data.gradeMetrics.length > 1) {
        const first = state.data.gradeMetrics[0].value;
        const last = state.data.gradeMetrics[state.data.gradeMetrics.length - 1].value;
        const trend = last > first ? '학년이 올라갈수록 심화되는 경향' : '학년별로 완화되거나 유지되는 경향';
        gradeInterpEl.innerHTML = `중학교 1학년(${first}%) 대비 고등학교 3학년(${last}%)의 우울감 비율이 ${trend}을 보이고 있습니다.`;
    }

    // 4. Donut Interpretation
    const donutInterpEl = document.getElementById('donut-interp');
    if (donutInterpEl && state.data.indicatorSummary.length > 0) {
        const top = [...state.data.indicatorSummary].sort((a,b) => b.value - a.value)[0];
        donutInterpEl.innerHTML = `정신건강 세부 지표 중 <b>${top.indicator}</b>(${top.value}%)가 가장 높은 비중을 차지하고 있어 해당 분야의 우선적인 개입이 권장됩니다.`;
    }
}

function updateChartTheme(chart) {
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#94a3b8';
    if (chart && chart.options && chart.options.scales) {
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.y.ticks.color = textColor;
        chart.update();
    }
}

function zoomToKorea() { map.flyTo({ center: [127.5, 36.5], zoom: 7, pitch: 0, bearing: 0 }); }
function toggle3D() { map.easeTo({ pitch: 60, bearing: -20, zoom: 16, duration: 2000 }); }

let chartGrade; let chartDonut;

async function fetchGradeMetrics() {
    const res = await fetch('api/metrics-by-grade?indicator=우울감');
    state.data.gradeMetrics = await res.json();
}
async function fetchIndicatorSummary() {
    const res = await fetch('api/indicator-summary');
    state.data.indicatorSummary = await res.json();
}
async function fetchDataInfo() {
    const res = await fetch('api/data-info');
    state.data.dataInfo = await res.json();
}
async function fetchLatestYear() {
    const res = await fetch('api/latest-year');
    const d = await res.json();
    document.querySelectorAll('.chart-year').forEach(el => el.innerText = d.year);
    
    // Trigger countup for hero stats
    countUp('stat-depression', 26.8);
    countUp('stat-stress', 40.1);
}

function countUp(id, target, duration = 1500) {
    const el = document.getElementById(id);
    if (!el) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            el.innerText = target.toFixed(1) + '%';
            clearInterval(timer);
        } else {
            el.innerText = start.toFixed(1) + '%';
        }
    }, 16);
}

function toggleLayer(btn) {
    const layer = btn.getAttribute('data-layer');
    const idx = state.activeLayers.indexOf(layer);
    if (idx === -1) {
        state.activeLayers.push(layer);
        btn.classList.add('active');
    } else {
        state.activeLayers.splice(idx, 1);
        btn.classList.remove('active');
    }
    renderFacilitiesOnMap(); 
    renderFacilityList();
    renderSchoolZones();
}

function toggleFacilityList() {
    const panel = document.getElementById('facility-list-panel');
    const btn = document.getElementById('btn-show-list');
    state.facilityListOpen = !state.facilityListOpen;
    if (state.facilityListOpen) { panel.classList.add('open'); btn.style.display = 'none'; }
    else { panel.classList.remove('open'); btn.style.display = 'block'; }
}

function renderFacilityList() {
    const body = document.getElementById('facility-list-body');
    const filtered = state.data.facilities.filter(f => state.activeLayers.includes(f.category));
    if (!body) return;
    body.innerHTML = filtered.map(fac => `
        <div class="facility-item">
            <div class="facility-item-header">
                <span class="facility-dot" style="background:${getCategoryColor(fac.category)}"></span>
                <strong>${fac.title}</strong>
            </div>
            <div class="facility-item-meta">${fac.category} · ${fac.address}</div>
            <a href="tel:${fac.phone}" class="facility-call-btn">📞 ${fac.phone}</a>
        </div>
    `).join('');
}

function renderGradeChart() {
    const ctx = document.getElementById('chart-grade');
    if (!ctx || state.data.gradeMetrics.length === 0) return;
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#94a3b8';
    if (chartGrade) chartGrade.destroy();
    chartGrade = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: state.data.gradeMetrics.map(m => m.grade),
            datasets: [{
                label: state.lang === 'ko' ? '우울감 경험률 (%)' : 'Depression Rate (%)',
                data: state.data.gradeMetrics.map(m => m.value),
                backgroundColor: ['#38bdf8','#60a5fa','#818cf8','#a78bfa','#c084fc','#e879f9'],
                borderRadius: 10, borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: { enabled: false, external: externalTooltipHandler }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: textColor } },
                x: { grid: { display: false }, ticks: { color: textColor, font: { weight: '600' } } }
            }
        }
    });
}

function renderDonutChart() {
    const ctx = document.getElementById('chart-donut');
    if (!ctx || state.data.indicatorSummary.length === 0) return;
    if (chartDonut) chartDonut.destroy();
    chartDonut = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: state.data.indicatorSummary.map(s => s.indicator),
            datasets: [{
                data: state.data.indicatorSummary.map(s => s.value),
                backgroundColor: ['#38bdf8', '#f59e0b', '#f43f5e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { 
                legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 20 } },
                tooltip: { enabled: false, external: externalTooltipHandler }
            },
            cutout: '55%'
        }
    });
}

function renderDataInfo() {
    const container = document.getElementById('data-info-list');
    if (!container || !state.data.dataInfo) return;
    container.innerHTML = state.data.dataInfo.indicators.map(ind => `
        <div class="card data-info-card">
            <div class="card-title">${ind.name}</div>
            <div class="data-def"><strong>출처:</strong> ${ind.source}</div>
            <a href="${ind.source_url}" target="_blank" class="data-link">원문 확인</a>
        </div>
    `).join('');
}

async function searchAddress() {
    const query = document.getElementById('map-search').value;
    if (!query) return;
    const res = await fetch(`/api/latest-year.json`);
    const { coords } = await res.json();
    map.flyTo({ center: [coords[1], coords[0]], zoom: 12, pitch: 45 });
}

// ========== AI PREDICTION LOGIC (REFECTORED) ==========

let chartPred;
let chartDecomp = {};

// Register global functions
window.updatePrediction = updatePrediction;
window.switchPredTab = switchPredTab;

// Extend navigateTo to handle prediction section initialization
const _originalNavigateTo = navigateTo;
navigateTo = function(targetId) {
    _originalNavigateTo(targetId);
    if (targetId === 'prediction') {
        initPrediction();
    }
};

async function initPrediction() {
    console.log("Initializing Mental Health Prediction...");
    const indicatorSelect = document.getElementById('pred-indicator');
    const regionSelect = document.getElementById('pred-region');
    
    if (indicatorSelect.children.length === 0) {
        try {
            const [indicators, regions] = await Promise.all([
                fetch('api/prediction/indicators').then(res => res.json()),
                fetch('api/prediction/regions').then(res => res.json())
            ]);
            
            indicatorSelect.innerHTML = indicators.map(i => `<option value="${i}">${i}</option>`).join('');
            regionSelect.innerHTML = regions.map(r => `<option value="${r}">${r}</option>`).join('');
            
            // Trigger first load
            updatePrediction();
        } catch(e) { console.error("Failed to initialize prediction selects", e); }
    }
}

async function updatePrediction() {
    const indicator = document.getElementById('pred-indicator').value;
    const region = document.getElementById('pred-region').value;
    const horizon = document.getElementById('pred-horizon').value;
    const model = document.querySelector('input[name="pred-model"]:checked').value;
    
    const btn = document.querySelector('.btn-hero.primary.mini');
    btn.innerText = i18n[state.lang].btn_analyzing;
    btn.disabled = true;

    try {
        const res = await fetch(`/api/prediction/data?indicator=${encodeURIComponent(indicator)}&region=${encodeURIComponent(region)}&forecast_years=${horizon}&model_type=${model}`);
        const data = await res.json();
        
        if (data.error) {
            console.warn(data.error);
            return;
        }

        renderPredictionChart(data, model);
        updatePredictionStats(data);
        renderPredictionTable(data);
        fetchDecomposition(indicator, region);
        
    } catch(e) {
        console.error("Prediction update failed", e);
    } finally {
        btn.innerText = i18n[state.lang].btn_analyze;
        btn.disabled = false;
    }
}

function updatePredictionStats(data) {
    const hist = data.historical.values;
    const latest = hist[hist.length - 1];
    const prev = hist[hist.length - 2];
    const change = latest - prev;
    const final = data.pred_future[data.pred_future.length - 1];
    const m = data.metrics;

    // Reliability Logic (Harness Engineering)
    let status = 'Excellent';
    let statusColor = '#10b981';
    if (m.rmse > 5) { status = 'Warning'; statusColor = '#f59e0b'; }
    if (m.rmse > 10) { status = 'Critical'; statusColor = '#f43f5e'; }

    document.getElementById('pred-latest-views').innerText = latest.toFixed(1) + '%';
    document.getElementById('pred-change').innerText = (change >= 0 ? '+' : '') + change.toFixed(1) + '%';
    document.getElementById('pred-final-val').innerText = final.toFixed(1) + '%';
    
    // Summary Text
    const interpEl = document.getElementById('pred-interp');
    if (interpEl) {
        const trend = final > latest ? '<span style="color:#f43f5e">증가할 것으로 예측(부정적)</span>' : '<span style="color:#10b981">감소할 것으로 예측(긍정적)</span>';
        const years = data.pred_future.length;
        interpEl.innerHTML = `
            <i class="ri-robot-line" style="margin-right:8px; color:var(--accent-primary)"></i>
            <b>AI 분석 요약:</b> 
            ${data.region}의 ${data.indicator} 데이터 분석 결과, 향후 ${years}년 동안 지표가 ${trend}됩니다. 
            최근 수치는 ${latest.toFixed(1)}% 이며, 모델 예측 결과 최종적으로 ${final.toFixed(1)}% 수준에 도달할 것으로 보입니다. 
            (모델 신뢰도: ${status}, 분산 RMSE: ${data.metrics.rmse})
        `;
    }

    const mBox = document.getElementById('pred-metrics-box');
    mBox.innerHTML = `
        <div class="metric-item">
            <div class="metric-name">RMSE</div>
            <div class="metric-val">${m.rmse}</div>
        </div>
        <div class="metric-item">
            <div class="metric-name">MAE</div>
            <div class="metric-val">${m.mae}</div>
        </div>
        <div class="metric-item">
            <div class="metric-name" style="color: ${statusColor}">Reliability</div>
            <div class="metric-val" style="color: ${statusColor}">${status}</div>
        </div>
        <div class="metric-item" style="margin-left: auto; color: var(--text-secondary); font-size: 0.8rem; display: flex; align-items: center;">
            <span class="status-dot ${status.toLowerCase()}" style="background: ${statusColor}; width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; box-shadow: 0 0 8px ${statusColor}"></span>
            ${state.lang === 'ko' ? 'MLOps Harness Monitoring Active' : 'MLOps Harness Monitoring Active'}
        </div>
    `;
}

function renderPredictionChart(data, modelName) {
    const ctx = document.getElementById('chart-prediction').getContext('2d');
    if (chartPred) chartPred.destroy();

    const textColor = getComputedStyle(document.body).getPropertyValue('--text-secondary').trim() || '#94a3b8';
    const std = data.metrics.rmse || 1.0;
    
    const allDates = [...data.historical.dates, ...data.future_dates];
    const historicalSet = {
        label: state.lang === 'ko' ? '기록값' : 'Historical',
        data: data.historical.values,
        borderColor: 'rgba(148, 163, 184, 0.4)',
        borderWidth: 2,
        pointRadius: 4,
        fill: false
    };

    const testSet = {
        label: state.lang === 'ko' ? '검증용 AI 예측' : 'Validation Pred',
        data: Array(data.historical.values.length - data.pred_test.length).fill(null).concat(data.pred_test),
        borderColor: '#f43f5e',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false
    };

    const forecastData = Array(data.historical.values.length).fill(null).concat(data.pred_future);
    const forecastSet = {
        label: state.lang === 'ko' ? `${modelName} 미래 예측` : `${modelName} Forecast`,
        data: forecastData,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        borderWidth: 4,
        pointRadius: 6,
        fill: false
    };

    const upperData = Array(data.historical.values.length).fill(null).concat(data.pred_future.map(v => v + 1.96 * std));
    const lowerData = Array(data.historical.values.length).fill(null).concat(data.pred_future.map(v => Math.max(0, v - 1.96 * std)));

    chartPred = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allDates,
            datasets: [
                forecastSet,
                {
                    label: '95% CI',
                    data: upperData,
                    borderColor: 'transparent',
                    pointRadius: 0,
                    fill: '+1',
                    backgroundColor: 'rgba(56, 189, 248, 0.05)'
                },
                {
                    label: 'CI Lower',
                    data: lowerData,
                    borderColor: 'transparent',
                    pointRadius: 0,
                    fill: false
                },
                testSet,
                historicalSet
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { color: textColor, filter: (item) => !item.text.includes('CI') } },
                tooltip: {
                    enabled: false,
                    external: externalTooltipHandler
                }
            },
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: textColor, callback: v => v + '%' } },
                x: { grid: { display: false }, ticks: { color: textColor } }
            }
        }
    });
}

async function fetchDecomposition(indicator, region) {
    try {
        const res = await fetch(`/api/prediction/decompose?indicator=${encodeURIComponent(indicator)}&region=${encodeURIComponent(region)}`);
        const data = await res.json();
        if (data.error) return;
        
        renderDecompChart('chart-decomp-observed', 'Observed', data.dates, data.observed, '#94a3b8');
        renderDecompChart('chart-decomp-trend', 'Trend', data.dates, data.trend, '#38bdf8');
        renderDecompChart('chart-decomp-seasonal', 'Seasonal', data.dates, data.seasonal, '#f59e0b');
        renderDecompChart('chart-decomp-resid', 'Residual', data.dates, data.resid, '#f43f5e');
    } catch(e) {}
}

function renderDecompChart(id, title, labels, data, color) {
    const ctx = document.getElementById(id).getContext('2d');
    if (chartDecomp[id]) chartDecomp[id].destroy();
    chartDecomp[id] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: title, data: data, borderColor: color, borderWidth: 2, pointRadius: 2, fill: false }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: true, labels: { color: '#94a3b8', boxWidth: 10 } } },
            scales: { y: { display: true, ticks: { display: false } }, x: { display: true, ticks: { color: '#666', font: { size: 10 } } } }
        }
    });
}

function renderPredictionTable(data) {
    const tbody = document.querySelector('#pred-comp-table tbody');
    tbody.innerHTML = '';
    for (let i = 0; i < data.test_dates.length; i++) {
        const actual = data.actual_test[i];
        const pred = data.pred_test[i];
        const error = actual - pred;
        const errorPct = ((error / actual) * 100).toFixed(2);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${data.test_dates[i]}</td>
            <td>${actual.toFixed(2)}%</td>
            <td>${pred.toFixed(2)}%</td>
            <td style="color: ${error >= 0 ? '#10b981' : '#f43f5e'}">${(error >= 0 ? '+' : '')}${error.toFixed(2)}%</td>
            <td>${errorPct}%</td>
        `;
        tbody.appendChild(tr);
    }
}

function switchPredTab(btn, tabId) {
    const parent = btn.closest('.prediction-card');
    parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    parent.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
}
// ========== RISK ZONES & REPORTING & ROUTING ==========

let riskLayerActive = false;
let riskMarkers = [];
let routeLayerId = 'safe-route-line';

async function toggleRiskLayer() {
    riskLayerActive = !riskLayerActive;
    const btn = document.getElementById('btn-risk');
    btn.classList.toggle('active', riskLayerActive);

    if (!riskLayerActive) {
        removeRiskLayers();
        return;
    }

    const res = await fetch('api/risk-zones');
    const points = await res.json();
    renderRiskPoints(points);
}

function renderRiskPoints(points) {
    removeRiskLayers();
    
    // Create 3D Bars for Statistics/Trends
    const statPoints = points.filter(p => p.type === 'stat');
    const reportPoints = points.filter(p => p.type === 'report');

    // Stats as 3D Bars (Simulated with Markers for simplicity or Mapbox Extrusions)
    statPoints.forEach(p => {
        const el = document.createElement('div');
        el.className = 'risk-bar';
        const height = (p.intensity / 100) * 80; // normalized height
        el.style.height = `${height}px`;
        el.style.width = '10px';
        el.style.backgroundColor = 'rgba(244, 63, 94, 0.7)';
        el.style.borderRadius = '5px';
        el.title = `${p.region}: ${p.intensity}% Stress`;

        const marker = new mapboxgl.Marker(el, { anchor: 'bottom' })
            .setLngLat([p.lon, p.lat])
            .addTo(map);
        riskMarkers.push(marker);
    });

    // Reports as Icons
    reportPoints.forEach(p => {
        const el = document.createElement('div');
        el.className = 'report-marker';
        el.innerHTML = '<i class="ri-error-warning-fill" style="color:#f59e0b; font-size: 24px;"></i>';
        
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div class="popup-report">
                <h4>🚩 제보: ${p.region}</h4>
                <p>${p.content}</p>
                <div class="risk-badge">위험도: ${p.intensity / 10}</div>
            </div>
        `);

        const marker = new mapboxgl.Marker(el)
            .setLngLat([p.lon, p.lat])
            .setPopup(popup)
            .addTo(map);
        riskMarkers.push(marker);
    });
}

function removeRiskLayers() {
    riskMarkers.forEach(m => m.remove());
    riskMarkers = [];
}

function toggleRouteBox() {
    const box = document.getElementById('route-box');
    box.classList.toggle('hidden');
    document.getElementById('btn-safe-route').classList.toggle('active');
}

function openReportModal() {
    document.getElementById('report-modal').classList.remove('hidden');
}

function closeReportModal() {
    document.getElementById('report-modal').classList.add('hidden');
    map.getCanvas().style.cursor = '';
    map.off('click', handleMapPick);
}

function pickFromMap() {
    alert("지도의 특정 지점을 클릭하여 위치를 선택하세요.");
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', handleMapPick);
}

function handleMapPick(e) {
    document.getElementById('report-lat').value = e.lngLat.lat.toFixed(6);
    document.getElementById('report-lon').value = e.lngLat.lng.toFixed(6);
    map.getCanvas().style.cursor = '';
    map.off('click', handleMapPick);
    alert("위치가 선택되었습니다.");
}

let activeRouteTarget = 'start';
function pickRoutePoint(target) {
    activeRouteTarget = target;
    alert(`${target === 'start' ? '출발지' : '도착지'}를 지도의 특정 지점을 클릭하여 선택하세요.`);
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', handleRoutePick);
}

async function handleRoutePick(e) {
    const coords = [e.lngLat.lat.toFixed(6), e.lngLat.lng.toFixed(6)];
    const elId = activeRouteTarget === 'start' ? 'route-start' : 'route-end';
    
    // Reverse geocode if possible or just set coords
    document.getElementById(elId).value = `${coords[0]}, ${coords[1]}`;
    document.getElementById(elId).dataset.lat = coords[0];
    document.getElementById(elId).dataset.lon = coords[1];
    
    map.getCanvas().style.cursor = '';
    map.off('click', handleRoutePick);

    // Check if picked point is in danger zone
    checkPointDanger(e.lngLat.lat, e.lngLat.lng, activeRouteTarget === 'start' ? '출발지' : '도착지');
}

async function checkPointDanger(lat, lon, label) {
    const res = await fetch('api/risk-zones');
    const riskZones = await res.json();
    
    // Find closest risk zone
    let found = false;
    riskZones.forEach(zone => {
        if (zone.type === 'report' || zone.intensity > 40) {
            const dist = getDistance(lat, lon, zone.lat, zone.lon);
            if (dist < 0.5) { // within 500m
                alert(`⚠️ 주의: ${label} 주변에 위험 지역 제보가 있습니다.\n- 내용: ${zone.content || '높은 스트레스/위험 지수'}`);
                found = true;
            }
        }
    });
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function submitReport() {
    const report = {
        title: document.getElementById('report-title').value,
        lat: parseFloat(document.getElementById('report-lat').value),
        lon: parseFloat(document.getElementById('report-lon').value),
        risk_level: parseInt(document.getElementById('report-risk').value),
        content: document.getElementById('report-content').value
    };

    if (!report.title || isNaN(report.lat)) {
        alert("모든 정보를 입력해주세요.");
        return;
    }

    const res = await fetch('api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
    });

    const result = await res.json();
    if (result.status.includes('success')) {
        alert("제보가 성공적으로 접수되었습니다.");
        closeReportModal();
        if (riskLayerActive) toggleRiskLayer(); // Refresh
    } else {
        alert("오류가 발생했습니다: " + result.error);
    }
}

async function findSafeRoute() {
    const startQ = document.getElementById('route-start').value;
    const endQ = document.getElementById('route-end').value;
    
    if (!startQ || !endQ) return alert("출발지와 도착지를 입력하세요.");

    const resStart = await fetch(`/api/search?q=${encodeURIComponent(startQ)}`);
    const { coords: startRaw } = await resStart.json();

    const resEnd = await fetch(`/api/search?q=${encodeURIComponent(endQ)}`);
    const { coords: endRaw } = await resEnd.json();

    // Use dataset coords if available (from map pick), otherwise from search
    const startLat = document.getElementById('route-start').dataset.lat || startRaw[0];
    const startLon = document.getElementById('route-start').dataset.lon || startRaw[1];
    const endLat = document.getElementById('route-end').dataset.lat || endRaw[0];
    const endLon = document.getElementById('route-end').dataset.lon || endRaw[1];

    const routeRes = await fetch(`/api/safe-route?start_lat=${startLat}&start_lon=${startLon}&end_lat=${endLat}&end_lon=${endLon}`);
    const data = await routeRes.json();

    if (data.routes && data.routes.length > 0) {
        drawRoute(data.routes[0]);
        const points = data.routes[0].geometry.coordinates; // [lng, lat]
        
        // --- School Zone Avoidance Check ---
        const schools = [
            { name: "도산 고등학교", lat: 37.5218, lon: 127.0360 },
            { name: "청담 중학교", lat: 37.5250, lon: 127.0510 }
        ];

        let warning = "";
        schools.forEach(s => {
            points.forEach(p => {
                const dist = getDistance(p[1], p[0], s.lat, s.lon);
                if (dist < 0.05) { // Absolute Zone 50m
                    warning = `<div class="safety-warning-card fadeIn">
                        <div class="warning-header"><i class="ri-error-warning-fill"></i> 절대보호구역 진입주의</div>
                        <p style="font-size: 0.85rem; margin-top: 0.4rem; color:var(--text-secondary); line-height:1.5;"><b>${s.name}</b> 출입문 50m 내 <b>절대구역</b>을 통과합니다. 유해시설 노출 위험에 각별히 유의하십시오.</p>
                    </div>`;
                } else if (dist < 0.2 && !warning) { // Relative Zone 200m
                    warning = `<div class="safety-warning-card fadeIn" style="border-color: rgba(245, 158, 11, 0.4); background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%);">
                        <div class="warning-header" style="color: #f59e0b;"><i class="ri-shield-check-fill"></i> 교육환경 상대보호구역</div>
                        <p style="font-size: 0.85rem; margin-top: 0.4rem; color:var(--text-secondary); line-height:1.5;"><b>${s.name}</b> 주변 200m <b>상대구역</b> 구간입니다. 교육환경 유해 환경 노출에 주의가 필요합니다.</p>
                    </div>`;
                }
            });
        });

        map.fitBounds([
            [startLon, startLat],
            [endLon, endLat]
        ], { padding: 50 });
        
        const duration = (data.routes[0].duration / 60).toFixed(1);
        const distance = (data.routes[0].distance / 1000).toFixed(1);
        document.getElementById('route-result').innerHTML = `
            <div class="route-summary">
                <p>📏 거리: ${distance} km</p>
                <p>⏱️ 예상 소요: ${duration} 분 (도보)</p>
                ${warning}
            </div>
            <button class="btn-hero primary mini full" style="margin-top:10px" onclick="openNavGuide()">🛡️ 로드뷰 가이드 시작</button>
        `;
    } else {
        alert("경로를 찾을 수 없습니다.");
    }
}

function drawRoute(route) {
    state.currentRoute = route; // Store for guide
    if (map.getSource('route')) {
        map.getSource('route').setData(route.geometry);
    } else {
        map.addSource('route', {
            'type': 'geojson',
            'data': route.geometry
        });
        map.addLayer({
            'id': routeLayerId,
            'type': 'line',
            'source': 'route',
            'layout': { 'line-join': 'round', 'line-cap': 'round' },
            'paint': { 'line-color': '#10b981', 'line-width': 6, 'line-opacity': 0.8 }
        });
    }
}

// ========== NAVER ROADVIEW (PANORAMA) NAVIGATION ==========

function openNavGuide() {
    if (!state.currentRoute) return alert("먼저 경로를 탐색하세요.");
    
    document.getElementById('nav-guide-overlay').classList.remove('hidden');
    
    document.querySelector('.main-area').addEventListener('scroll', (e) => {
        const el = e.target;
        const scrollPercent = (el.scrollTop / (el.scrollHeight - el.clientHeight));
        const progressBar = document.querySelector('.scroll-progress');
        if (progressBar) progressBar.style.transform = `scaleX(${scrollPercent})`;
    });

    // Initialize Panorama
    if (!state.pano) {
        state.pano = new naver.maps.Panorama('pano', {
            position: new naver.maps.LatLng(37.566, 126.978),
            pov: { pan: -135, tilt: 29, fov: 100 }
        });
    }
    
    renderStepList();
}

function closeNavGuide() {
    document.getElementById('nav-guide-overlay').classList.add('hidden');
}

function renderStepList() {
    const list = document.getElementById('turn-by-turn-list');
    const route = state.currentRoute;
    if (!route || !route.legs) return;
    
    const steps = route.legs[0].steps;
    document.getElementById('guide-dist').innerText = (route.distance / 1000).toFixed(1) + ' km';
    
    list.innerHTML = steps.map((s, idx) => `
        <div class="step-card" onclick="jumpToStep(${idx})">
            <div class="step-idx">${idx + 1}</div>
            <div class="step-instr">${s.maneuver.instruction}</div>
            <div class="step-dist">${s.distance.toFixed(0)}m</div>
        </div>
    `).join('');
    
    // Jump to 1st step
    jumpToStep(0);
}

function jumpToStep(idx) {
    const step = state.currentRoute.legs[0].steps[idx];
    if (!step) return;
    
    const coords = step.maneuver.location; // [lng, lat]
    const pos = new naver.maps.LatLng(coords[1], coords[0]);
    
    // Update Panorama
    state.pano.setPosition(pos);
    
    // Smooth transition
    const heading = step.maneuver.bearing_after || 0;
    state.pano.setPov({ pan: heading, tilt: 10, fov: 100 });
    
    // Map Fly
    map.flyTo({ center: coords, zoom: 18, pitch: 45, bearing: heading });
    
    // Highlight step
    document.querySelectorAll('.step-card').forEach((c, i) => {
        c.classList.toggle('active', i === idx);
    });
}
