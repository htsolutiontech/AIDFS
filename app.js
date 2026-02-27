        // --- 1. DATA CORE & STATE ---
        let map, scenarioChart, hospitalChart, currentDisease = 'ARI', currentScenario = 'short';
        const fullDataset = [], ambulances = [];
        let currentPage = 1;

        const diseaseContext = {
            'ARI': { color: '#00dfee', mae: 4.2, rmse: 6.8, acc: '96.2%', r0: 1.15, infected: 150, risk: 42, advice: 'Sử dụng khẩu trang N95, rà soát tỷ lệ tiêm chủng Phế cầu.' },
            'Dengue': { color: '#ef4444', mae: 12.5, rmse: 18.2, acc: '91.8%', r0: 2.8, infected: 88, risk: 115, advice: 'Diệt lăng quăng, phun hóa chất, rà soát chỉ số Breteau.' },
            'Flu': { color: '#f59e0b', mae: 8.1, rmse: 11.4, acc: '93.5%', r0: 1.4, infected: 42, risk: 12, advice: 'Tiêm nhắc vắc-xin cúm mùa, hạn chế tụ tập đông người.' }
        };

        const sLabels = { 'short': ['T2','T3','T4','T5','T6','T7','CN'], 'medium': ['Tuần 1','Tuần 2','Tuần 3','Tuần 4'], 'long': ['Th1','Th2','Th3','Th4','Th5','Th6'] };
        const sData = {
            'ARI': { 'short': [45,52,68,85,72,58,50], 'medium': [210,340,480,310], 'long': [1200,1800,2500,1100,900,1400] },
            'Dengue': { 'short': [15,25,48,75,95,80,62], 'medium': [110,250,420,310], 'long': [450,900,2100,3200,1500,800] },
            'Flu': { 'short': [20,18,35,55,42,30,22], 'medium': [85,120,190,110], 'long': [400,600,1200,800,350,200] }
        };

        // --- 2. CORE LOGIC FUNCTIONS ---
        function switchDisease(type, el) {
            currentDisease = type;
            document.querySelectorAll('.disease-btn').forEach(b => b.classList.remove('active'));
            el.classList.add('active');
            updateApp();
            
            // Sync GIS
            if(map) {
                map.eachLayer(l => { if(l instanceof L.Circle) map.removeLayer(l); });
                createZones();
            }
        }

        function switchScenario(scenario, el) {
            currentScenario = scenario;
            document.querySelectorAll('.s-tab').forEach(b => b.classList.remove('active'));
            el.classList.add('active');
            updateApp();
        }

        function updateApp() {
            const ctx = diseaseContext[currentDisease];
            // HUD Update
            document.getElementById('maeVal').innerText = ctx.mae;
            document.getElementById('rmseVal').innerText = ctx.rmse;
            document.getElementById('accVal').innerText = ctx.acc;
            document.getElementById('r0Val').innerText = ctx.r0;
            document.getElementById('aiExplainText').innerText = `AI Analysis (${currentDisease}): ` + ctx.advice;
            document.getElementById('chartTitle').innerText = `DỰ BÁO ${currentDisease} - KỊCH BẢN ${currentScenario.toUpperCase()}`;

            // Chart Update
            if(scenarioChart) {
                scenarioChart.data.labels = sLabels[currentScenario];
                scenarioChart.data.datasets[0].data = sData[currentDisease][currentScenario];
                scenarioChart.data.datasets[0].borderColor = ctx.color;
                scenarioChart.update();
            }
        }

        // --- 3. GIS & FLEET ---
        function initMap() {
            map = L.map('map').setView([10.762622, 106.660172], 12);
            L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { maxZoom: 20 }).addTo(map);
            createZones();
            initFleet();
        }

        function createZones() {
            const buildPopup = (name, ctx) => `
                <div class="popup-header">${name}</div>
                <div class="popup-stat"><b>Ca nhiễm:</b> ${ctx.infected} | <b>Nguy cơ:</b> ${ctx.risk}</div>
                <div class="who-advice">
                    <span class="advice-title">KHUYẾN CÁO WHO:</span>
                    <p style="font-size:11px; margin:0;">${ctx.advice}</p>
                </div>
            `;

            L.circle([10.741, 106.671], { color: '#ef4444', radius: 2000, fillOpacity: 0.25 }).addTo(map)
                .bindPopup(buildPopup('CLUSTER QUẬN 8', diseaseContext['Dengue']))
                .on('click', () => updateCoordination('Quận 8', 2000, [10.741, 106.671]));

            L.circle([10.701, 106.601], { color: '#00dfee', radius: 3000, fillOpacity: 0.25 }).addTo(map)
                .bindPopup(buildPopup('BÌNH CHÁNH', diseaseContext['ARI']))
                .on('click', () => updateCoordination('Bình Chánh', 3000, [10.701, 106.601]));
            
            L.polyline([[10.701, 106.601], [10.741, 106.671]], { color: 'var(--flow-color)', weight: 4, dashArray: '10, 20', opacity: 0.7 }).addTo(map);
        }

        const hcmFleet = [
            { id: 'XE-01 (B.Chánh)', lat: 10.705, lng: 106.605, status: 'Trống' },
            { id: 'XE-02 (Quận 8)', lat: 10.742, lng: 106.673, status: 'Đang đón bệnh' },
            { id: 'XE-03 (Quận 1)', lat: 10.776, lng: 106.667, status: 'Trống' }
        ];

        function initFleet() {
            const ambIcon = L.divIcon({ html: '<i class="fas fa-truck-medical" style="color:#ef4444; font-size:24px; filter:drop-shadow(0 0 5px white);"></i>', className: 'amb' });
            hcmFleet.forEach(a => {
                L.marker([a.lat, a.lng], { icon: ambIcon }).addTo(map).bindPopup(`<b>${a.id}</b> - ${a.status}`);
                ambulances.push(a);
            });
        }

        function updateCoordination(zone, r, center) {
            document.getElementById('zone-title').innerText = zone;
            document.getElementById('radius-val').innerText = `${r}m`;
            
            const centerLatLng = L.latLng(center[0], center[1]);
            const nearby = hcmFleet.filter(a => map.distance(centerLatLng, L.latLng(a.lat, a.lng)) <= r);
            
            const fleetBox = document.getElementById('ambulanceFleet');
            if(nearby.length > 0) {
                document.getElementById('fleet-advice').innerHTML = `<i class="fas fa-bolt"></i> XE <b>${nearby[0].id}</b> TRONG VÙNG ĐỆM PHẢN ỨNG NHANH NHẤT.`;
                fleetBox.innerHTML = nearby.map(a => `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05)"><span>${a.id}</span><b style="color:var(--success)">SẴN SÀNG</b></div>`).join('');
            } else {
                document.getElementById('fleet-advice').innerHTML = `<i class="fas fa-exclamation-triangle"></i> KHÔNG CÓ XE TRONG BÁN KÍNH R. ĐIỀU PHỐI XE LÂN CẬN.`;
                fleetBox.innerHTML = `<p style="color:var(--danger)">Cảnh báo: Vùng đệm trống xe trực chiến.</p>`;
            }
            updateHospitalChart([12, 18, 5, 45, 30]);
        }

        // --- 4. CHARTS & DATA ---
        function initScenarioChart() {
            const ctx = document.getElementById('scenarioChart').getContext('2d');
            scenarioChart = new Chart(ctx, {
                type: 'line', data: { labels: sLabels.short, datasets: [{ label: 'SIR Forecasting', data: sData.ARI.short, borderColor: '#00dfee', fill: true, backgroundColor: 'rgba(0, 223, 238, 0.1)', tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } } }
            });
        }

        function updateHospitalChart(data) {
            if(hospitalChart) hospitalChart.destroy();
            const ctx = document.getElementById('hospitalCapacityChart').getContext('2d');
            hospitalChart = new Chart(ctx, {
                type: 'bar', data: { labels: ['Chợ Rẫy', '115', 'Nhiệt Đới', 'Hùng Vương', 'BV Q.8'], datasets: [{ data: data, backgroundColor: 'rgba(0, 223, 238, 0.7)', borderRadius: 10 }] },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }

        function generateData() {
            const ds = ["Quận 1", "Quận 3", "Quận 8", "Bình Chánh", "Thủ Đức"];
            for(let i=1; i<=5000; i++) fullDataset.push({ id: `EPI-${i.toString().padStart(4, '0')}`, dist: ds[Math.floor(Math.random()*5)], type: "Dengue", sym: "Sốt cao, đau cơ", status: "Confirmed" });
            document.getElementById('inventoryBody').innerHTML = ds.map(d => `<tr><td><b>${d}</b></td><td>${Math.floor(Math.random()*1000)}</td><td>200kg</td><td><span class="text-success">READY</span></td></tr>`).join('');
            renderDataset();
        }

        function renderDataset() {
            document.getElementById('datasetBody').innerHTML = fullDataset.slice((currentPage-1)*50, currentPage*50).map(r => `<tr><td><b>${r.id}</b></td><td>${r.dist}</td><td>${r.type}</td><td>${r.sym}</td><td><span class="text-success">Confirmed</span></td></tr>`).join('');
            document.getElementById('pageCurrent').innerText = currentPage;
        }

        function changePage(dir) { currentPage = Math.max(1, Math.min(100, currentPage + dir)); renderDataset(); }

        function triggerZaloAlert(r, zone) {
            const toast = document.getElementById('zaloToast');
            toast.innerHTML = `<i class="fas fa-paper-plane mr-2"></i> <b>BÁO ĐỘNG ZALO:</b> Luồng dịch ${zone} R=${r}m! <br><small>Đã gửi tới Đội PƯN, GĐ CDC & Giám đốc Sở.</small>`;
            toast.style.display = 'block';
            console.warn("[ZALO ALERT]: Đây là thông tin thử nghiệm hệ thống AI.DFS dự báo dịch bệnh.");
            setTimeout(() => { toast.style.display = 'none'; }, 6000);
        }

        function exportToExcel() {
            const ws = XLSX.utils.json_to_sheet(fullDataset);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "CDC_Dataset");
            XLSX.writeFile(wb, "AI_DFS_Final_Master.xlsx");
        }

        function switchView(id, el) {
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            document.getElementById(id + '-view').classList.add('active');
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
            if(id === 'gis') setTimeout(() => map.invalidateSize(), 400);
        }

        window.onload = () => { initMap(); initScenarioChart(); updateHospitalChart([12, 18, 5, 45, 30]); generateData(); updateApp(); };
    
