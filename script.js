// [1] 데이터 및 설정
let currentMode = 'individual';
let players = [];
let viewingPlayerIndex = 0;
let activeCountingIndex = 0;
let customLogoData = null; 
let fameIndivData = [];
let fameTeamData = [];
let isSampleMode = false;

// ★ [중요] 사용자가 제공한 Apps Script URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbze3f3-uQvlDAf3uD7sMqrarPjfOZhLiqUqpFe6joQI_4I5vHG2Zp9VWqsVxWe9vQoukQ/exec";

const stockInfo = {
    "SASUNG": { name: "SASUNG", price: 1500, color: "#1428a0" },
    "LGI":    { name: "LGI",   price: 600,  color: "#a50034" },
    "SKEI":   { name: "SKEI",   price: 1600, color: "#ff6600" },
    "CACAO":  { name: "CACAO", price: 4000, color: "#fee500", textColor: "#3c1e1e" },
    "HYUNDAE":{ name: "HYUNDE", price: 6000, color: "#002c5f" },
    "NABER":  { name: "NABER", price: 7000, color: "#03c75a" }
};

window.onload = initStockConfig;

function switchScreen(id){ 
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active-screen')); 
    document.getElementById(id).classList.add('active-screen'); 
    
    document.querySelectorAll('.report-paper').forEach(p => p.classList.remove('active-print'));
    if(id === 'reportScreen') document.getElementById('pdfAreaReport').classList.add('active-print');
    if(id === 'fameScreen') document.getElementById('pdfAreaFame').classList.add('active-print');
}

function initStockConfig() {
    const grid = document.getElementById('stockConfigInputs');
    grid.innerHTML = '';
    for(let k in stockInfo) {
        grid.innerHTML += `<div class="stock-input-item"><label>${stockInfo[k].name}</label><input type="number" id="conf_${k}" value="${stockInfo[k].price}"></div>`;
    }
}
function selectMode(m) {
    currentMode = m;
    document.getElementById('btnIndiv').className = m==='individual' ? 'mode-btn selected' : 'mode-btn';
    document.getElementById('btnTeam').className = m==='team' ? 'mode-btn selected' : 'mode-btn';
    document.getElementById('individualConfig').style.display = m==='individual'?'block':'none';
    document.getElementById('teamConfig').style.display = m==='team'?'block':'none';
}
function generateInputs() {
    const area = document.getElementById('nameInputArea');
    area.innerHTML = '';
    if(currentMode === 'individual') {
        const cnt = document.getElementById('playerCount').value;
        for(let i=0; i<cnt; i++) area.innerHTML += makeInp(`참가자 ${i+1}`, `참가자 ${i+1}`);
    } else {
        const tCnt = document.getElementById('teamCount').value;
        const mCnt = document.getElementById('memberPerTeam').value;
        for(let t=0; t<tCnt; t++){
            let team = String.fromCharCode(65+t)+"팀";
            area.innerHTML += `<div class="team-header">${team} 명단</div>`;
            for(let m=0; m<mCnt; m++) area.innerHTML += makeInp(`${team} 참가자${m+1}`, `참가자${m+1}`, team);
        }
    }
    document.getElementById('startGameBtn').style.display = 'block';
}
function makeInp(lbl, val, team='') {
    return `<div class="p-input-group"><span style="width:110px; font-weight:bold; color:#555; font-size:14px;">${lbl}</span><input type="text" value="${val}" data-team="${team}"></div>`;
}
function startGame() {
    isSampleMode = false;
    document.getElementById('btnEditPrev').style.display = 'inline-flex';
    
    for(let k in stockInfo) {
        const v = document.getElementById(`conf_${k}`).value;
        if(v) stockInfo[k].price = parseInt(v);
    }
    players = [];
    document.querySelectorAll('#nameInputArea input').forEach((inp, i) => {
        players.push({
            id: i, name: inp.value, team: inp.dataset.team || '-',
            assets: initAssets(), total: 0, rankIndiv: 0, rankTeam: 0, teamTotal: 0, manualCash: 0
        });
    });
    if(players.length===0) return alert("명단을 입력하세요.");
    switchScreen('countingScreen');
    renderSidebar();
    selectCountingPlayer(0);
}
function initAssets(){ return { "100":0,"500":0,"1000":0,"5000":0,"10000":0,"50000":0,"SASUNG":0,"LGI":0,"SKEI":0,"CACAO":0,"HYUNDAE":0,"NABER":0 }; }

function renderSidebar() {
    const list = document.getElementById('sidebarList');
    list.innerHTML = '';
    players.forEach((p, i) => {
        list.innerHTML += `<div class="player-list-item" id="pItem_${i}" onclick="selectCountingPlayer(${i})">
            <div>${p.team!=='-'?`<span style='font-size:11px; color:#888;'>[${p.team}]</span> `:''}${p.name}</div>
            <span class="status-badge" id="badge_${i}">대기</span>
        </div>`;
    });
    initStockGrid('stockGridSm', false, true); 
}
function selectCountingPlayer(i) {
    if(players[activeCountingIndex]?.total > 0) {
        document.getElementById(`pItem_${activeCountingIndex}`).classList.remove('active');
        document.getElementById(`pItem_${activeCountingIndex}`).classList.add('done');
        document.getElementById(`badge_${activeCountingIndex}`).innerText="완료";
    }
    activeCountingIndex = i;
    document.getElementById(`pItem_${i}`).classList.add('active');
    updateDash();
}
function updateDash() {
    const p = players[activeCountingIndex];
    document.getElementById('displayPlayerName').innerText = p.name;
    let cash = p.manualCash; 
    let stock = calcStock(p.assets);
    p.total = cash + stock;
    document.getElementById('displayTotalAsset').innerText = p.total.toLocaleString() + " 원";
    document.getElementById('cntCashInput').value = cash;
    document.getElementById('displayStock').innerText = stock.toLocaleString();
    for(let k in stockInfo) {
        document.getElementById(`ui_val_${k}`).innerText = (p.assets[k]*stockInfo[k].price).toLocaleString();
        const input = document.getElementById(`ui_cnt_input_${k}`);
        if(input) input.value = p.assets[k];
    }
}
function updateManualOnCounting() {
    const p = players[activeCountingIndex];
    p.manualCash = parseInt(document.getElementById('cntCashInput').value) || 0;
    for(let k in stockInfo) {
        const input = document.getElementById(`ui_cnt_input_${k}`);
        if(input) p.assets[k] = parseInt(input.value) || 0;
    }
    updateDash(); 
}
function initStockGrid(id, sm, isCountingScreen=false) {
    const grid = document.getElementById(id);
    grid.innerHTML = '';
    for(let k in stockInfo) {
        const s = stockInfo[k];
        const colorStyle = `background:${s.color} !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color:${s.textColor||'#fff'} !important; border:${k==='CACAO'?'1px solid #ddd':'none'};`;
        const prefix = isCountingScreen ? 'ui' : 'rpt';
        const changeHandler = isCountingScreen ? 'updateManualOnCounting()' : 'manualUpdate()';
        const priceDisplay = `<div style="font-size:11px; color:#999; margin-bottom:2px;">1주: ${s.price.toLocaleString()}원</div>`;

        grid.innerHTML += `<div class="${sm?'stock-item-sm':'stock-card'}">
            <div class="stock-logo" style="${colorStyle}">${k[0]}</div>
            <div style="font-weight:bold; color:#555;">${s.name}</div>
            ${priceDisplay}
            <div class="${sm?'':'stock-val'}" id="${prefix}_val_${k}">0원</div>
            <div class="${sm?'':'stock-cnt'}" id="${prefix}_cnt_${k}">
                <input type="number" id="${prefix}_cnt_input_${k}" class="editable-input" style="width:40px;" min="0" onchange="${changeHandler}"> 주
            </div>
        </div>`;
    }
}

function finishGame() {
    if(!confirm("결과를 발표하시겠습니까?")) return;
    recalculateAllRankings();
    switchScreen('reportScreen');
    initStockGrid('rptStockGrid', false, false);
    viewingPlayerIndex = 0;
    showReport(0);
}
function recalculateAllRankings() {
    players.forEach(p => { p.total = p.manualCash + calcStock(p.assets); });
    let sorted = [...players].sort((a,b) => b.total - a.total);
    sorted.forEach((p, i) => p.rankIndiv = i + 1);
    if(currentMode === 'team') {
        let teamMap = {};
        players.forEach(p => { if(!teamMap[p.team]) teamMap[p.team] = 0; teamMap[p.team] += p.total; });
        let sortedTeams = Object.keys(teamMap).sort((a,b) => teamMap[b] - teamMap[a]);
        players.forEach(p => { p.rankTeam = sortedTeams.indexOf(p.team) + 1; p.teamTotal = teamMap[p.team]; });
    }
}
function showReport(idx) {
    const p = players[idx];
    document.getElementById('pageIndicator').innerText = `${idx+1} / ${players.length}`;
    const today = new Date();
    document.getElementById('rptDateInput').value = `${today.getFullYear()}. ${today.getMonth()+1}. ${today.getDate()}.`;
    
    if(customLogoData) {
        document.getElementById('rptLogoImg').src = customLogoData;
        document.getElementById('rptLogoImg').style.display = 'block';
        document.getElementById('rptLogoText').style.display = 'none';
    } else {
        document.getElementById('rptLogoImg').style.display = 'none';
        document.getElementById('rptLogoText').style.display = 'block';
    }
    document.getElementById('rptNameInput').value = p.name;
    if(currentMode === 'team') {
        document.getElementById('rptTeamWrapper').style.display = 'inline-block';
        document.getElementById('rptTeamInput').value = p.team;
    } else {
        document.getElementById('rptTeamWrapper').style.display = 'none';
    }
    document.getElementById('rptCashInput').value = p.manualCash;
    for(let k in stockInfo) {
        document.getElementById(`rpt_cnt_input_${k}`).value = p.assets[k];
        document.getElementById(`rpt_val_${k}`).innerText = (p.assets[k] * stockInfo[k].price).toLocaleString() + "원";
    }
    updateRankUI(p);
    refreshDisplayOnly(p);
}

function updatePlayerName() { players[viewingPlayerIndex].name = document.getElementById('rptNameInput').value; updateTop3List(); }
function updateTeamName() {
    const oldName = players[viewingPlayerIndex].team;
    const newName = document.getElementById('rptTeamInput').value;
    players.forEach(p => { if(p.team === oldName) p.team = newName; });
    recalculateAllRankings();
    showReport(viewingPlayerIndex);
}
function manualUpdate() {
    const p = players[viewingPlayerIndex];
    p.manualCash = parseInt(document.getElementById('rptCashInput').value) || 0;
    for(let k in stockInfo) { p.assets[k] = parseInt(document.getElementById(`rpt_cnt_input_${k}`).value) || 0; }
    recalculateAllRankings();
    updateRankUI(p);
    refreshDisplayOnly(p);
}
function updateRankUI(p) {
    document.getElementById('rptRankIndiv').innerText = p.rankIndiv;
    document.getElementById('rptTotalPlayers').innerText = players.length;
    if(currentMode === 'team') {
        document.getElementById('rptTeamSection').style.display = 'block';
        document.getElementById('rptTeamDisplay').innerText = p.team; 
        document.getElementById('rptRankTeam').innerText = p.rankTeam;
        document.getElementById('rptTeamTotalAsset').innerText = p.teamTotal.toLocaleString();
    } else { document.getElementById('rptTeamSection').style.display = 'none'; }
    updateTop3List();
}
function updateTop3List() {
    const container = document.getElementById('top3Container');
    container.innerHTML = '';
    if(currentMode === 'team') {
        container.innerHTML = `<div class="fame-split-container"><div class="fame-col separator" id="indivTop3"><div class="fame-col-title">개인 TOP 3</div></div><div class="fame-col" id="teamTop3"><div class="fame-col-title">팀 TOP 3</div></div></div>`;
        const indivList = document.getElementById('indivTop3');
        [...players].sort((a,b) => b.total - a.total).slice(0,3).forEach((r, i) => { indivList.innerHTML += makeTop3Html(i, r.name, r.total); });
        const teamMap = {};
        players.forEach(p => { if(!teamMap[p.team]) teamMap[p.team]=0; teamMap[p.team] += p.total; });
        const teamRanked = Object.keys(teamMap).map(k=>({name:k, total:teamMap[k]})).sort((a,b)=>b.total-a.total).slice(0,3);
        const teamList = document.getElementById('teamTop3');
        teamRanked.forEach((t, i) => { teamList.innerHTML += makeTop3Html(i, t.name, t.total); });
    } else {
        [...players].sort((a,b) => b.total - a.total).slice(0,3).forEach((r, i) => { container.innerHTML += makeTop3Html(i, r.name, r.total); });
    }
}
function makeTop3Html(i, name, total) {
    let cls = i===0?'rank-1st':'';
    let medal = i===0?'🥇':(i===1?'🥈':'🥉');
    return `<div class="top3-item"><div style="width:45px; text-align:left; font-weight:bold;" class="${cls}">${medal} ${i+1}위</div><div style="flex:1; text-align:left; font-weight:bold; color:#333; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${name}</div><div style="text-align:right; font-weight:normal; color:#555;">${total.toLocaleString()}원</div></div>`;
}
function refreshDisplayOnly(p) {
    let stockSum = calcStock(p.assets);
    let total = p.manualCash + stockSum;
    document.getElementById('rptTotalAsset').innerText = total.toLocaleString() + " 원";
    document.getElementById('rptStock').innerText = stockSum.toLocaleString();
    for(let k in stockInfo) { document.getElementById(`rpt_val_${k}`).innerText = (p.assets[k] * stockInfo[k].price).toLocaleString() + "원"; }
    let pct = total > 0 ? Math.round((p.manualCash / total) * 100) : 0;
    document.getElementById('rptCashPct').innerText = pct + "%";
    const radius = 50, center = 50;
    if (pct >= 100) document.getElementById('rptSvgPath').setAttribute('d', `M ${center} ${center} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius*2},0 a ${radius},${radius} 0 1,0 -${radius*2},0`);
    else if (pct <= 0) document.getElementById('rptSvgPath').setAttribute('d', '');
    else {
        const angle = (pct / 100) * 360;
        const rad = (angle - 90) * (Math.PI / 180);
        const x = center + radius * Math.cos(rad);
        const y = center + radius * Math.sin(rad);
        const largeArc = angle > 180 ? 1 : 0;
        document.getElementById('rptSvgPath').setAttribute('d', `M ${center} ${center} L ${center} ${center-radius} A ${radius} ${radius} 0 ${largeArc} 1 ${x} ${y} Z`);
    }
}
function prevPlayer() { if(viewingPlayerIndex>0) { viewingPlayerIndex--; showReport(viewingPlayerIndex); } }
function nextPlayer() { if(viewingPlayerIndex<players.length-1) { viewingPlayerIndex++; showReport(viewingPlayerIndex); } }

function downloadPDF(type) {
    const id = type === 'report' ? 'pdfAreaReport' : 'pdfAreaFame';
    const name = type === 'report' ? document.getElementById('rptNameInput').value : '명예의전당';
    html2pdf().set({ margin: 0, filename: `머니빌리지_${name}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(document.getElementById(id)).save();
}
function printReport() { window.print(); }
function printFame() { window.print(); }

async function saveToDrive() {
    if (isSampleMode) {
        alert("⚠️ 견본(샘플) 데이터는 드라이브에 저장할 수 없습니다.\n실제 게임을 진행한 후 저장해주세요.");
        return;
    }

    if (!confirm("현재 게임 결과를 [명예의 전당] 데이터베이스에 저장하시겠습니까?")) return;

    const exportData = {
        individuals: players.map(p => ({
            name: p.name, total: p.total, manualCash: p.manualCash, stockVal: p.total - p.manualCash
        })),
        teams: []
    };
    
    if (currentMode === 'team') {
        let teamMap = {};
        players.forEach(p => {
            if (!teamMap[p.team]) teamMap[p.team] = { total: 0, memberObjs: [] };
            teamMap[p.team].total += p.total;
            teamMap[p.team].memberObjs.push(p);
        });
        
        for (let tName in teamMap) {
            let sortedMembers = teamMap[tName].memberObjs.sort((a,b) => b.total - a.total);
            let memberStr = sortedMembers.map(m => m.name).join(", ");
            exportData.teams.push({
                name: tName, 
                total: teamMap[tName].total, 
                members: memberStr
            });
        }
    }

    const btn = document.getElementById('btnSaveDrive');
    const originalText = btn.innerText;
    btn.innerText = "⏳ 저장 중...";
    btn.disabled = true;

    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(exportData)
        });
        alert("✅ 저장이 완료되었습니다!\n(참고: 데이터 반영까지 약 3~5초 소요될 수 있습니다)");
    } catch (e) {
        console.error(e);
        alert("❌ 저장 실패! 인터넷 연결을 확인해주세요.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// [7] 명예의 전당 로직
function showFameScreen() {
    switchScreen('fameScreen');
    if (customLogoData) {
        document.getElementById('fameLogoImg').src = customLogoData;
        document.getElementById('fameLogoImg').style.display = 'block';
        document.getElementById('fameLogoText').style.display = 'none';
    } else {
        document.getElementById('fameLogoImg').style.display = 'none';
        document.getElementById('fameLogoText').style.display = 'block';
    }
    
    fetchFameData();
}

async function fetchFameData() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    try {
        const response = await fetch(SCRIPT_URL);
        const json = await response.json();
        
        if (json.indiv && json.indiv.length > 0) {
            fameIndivData = json.indiv.map(d => ({ 
                ...d, 
                total: Number(d.total), 
                cash: Number(d.manualCash), 
                stock: Number(d.stockVal) 
            }));
        } else {
            fameIndivData = [];
        }

        if (json.team && json.team.length > 0) {
            fameTeamData = json.team.map(d => ({ 
                ...d, 
                total: Number(d.total) 
            }));
        } else {
            fameTeamData = [];
        }

        if (fameIndivData.length === 0 && fameTeamData.length === 0) {
            loadFameSamples(false);
        } else {
            renderFame();
            document.getElementById('todayDate').innerText = new Date().toLocaleDateString();
        }
    } catch (e) {
        console.error("DB 로드 실패:", e);
        loadFameSamples(false);
    } finally {
        document.getElementById('loadingOverlay').style.display = 'none';
    }
}

// [★ 수정 완료] PDF 파일의 데이터를 정확히 입력했습니다.
function loadFameSamples(alertMsg = true) {
    const S_INDIV = [
        { name: "이영재", total: 6000000, cash: 2500000, stock: 3500000, date: "2025.12.25" },
        { name: "정주식", total: 5500000, cash: 500000, stock: 5000000, date: "2026.01.10" },
        { name: "강현금", total: 5200000, cash: 5000000, stock: 200000, date: "2025.12.30" },
        { name: "김부자", total: 4850000, cash: 1850000, stock: 3000000, date: "2026.01.05" },
        { name: "박스마트", total: 4120000, cash: 1120000, stock: 3000000, date: "2025.12.30" },
        { name: "최성실", total: 3900000, cash: 900000, stock: 3000000, date: "2025.12.25" },
        { name: "조전략", total: 3050000, cash: 1050000, stock: 2000000, date: "2026.01.05" },
        { name: "윤행운", total: 2980000, cash: 980000, stock: 2000000, date: "2025.12.25" },
        { name: "장투자", total: 2800000, cash: 800000, stock: 2000000, date: "2026.01.10" },
        { name: "임저축", total: 2750000, cash: 2000000, stock: 750000, date: "2025.12.30" }
    ];
    const S_TEAM = [
        { name: "어벤져스팀", total: 12500000, members: "김철수, 박민지, 최동훈, 이서연", date: "2026.01.05" },
        { name: "황금거위팀", total: 10200000, members: "이영희, 정우성, 강동원, 한지민", date: "2025.12.30" },
        { name: "미래에셋팀", total: 9800000, members: "장투자, 정주식, 박수익, 김성공", date: "2026.01.10" },
        { name: "주식왕팀", total: 8500000, members: "최성실, 윤행운, 김노력, 이도전", date: "2025.12.25" },
        { name: "티끌모아팀", total: 7200000, members: "임저축, 강현금, 송성실, 나부자", date: "2025.12.30" }
    ];
    fameIndivData = S_INDIV;
    fameTeamData = S_TEAM;
    renderFame();
    document.getElementById('todayDate').innerText = "Sample Data";
    if(alertMsg) alert("샘플 데이터를 불러왔습니다.");
}

function renderFame() {
    fameIndivData.sort((a,b) => b.total - a.total);
    fameTeamData.sort((a,b) => b.total - a.total);

    renderRankingTable(fameIndivData.slice(0, 10), 'indivTableBody', false);
    renderRankingTable(fameTeamData.slice(0, 5), 'teamTableBody', true);
    setSpecialAwards(fameIndivData);
}

function renderRankingTable(data, tableId, isTeam) {
    const tbody = document.getElementById(tableId);
    tbody.innerHTML = '';
    if(data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#999;">데이터가 없습니다.</td></tr>`;
        return;
    }
    data.forEach((item, index) => {
        let rank = index + 1;
        let rankDisplay = rank;
        let rankClass = "rank-other";
        let rowBg = "";
        if (rank === 1) { rankDisplay = isTeam ? "🏆" : "🥇"; rankClass = "rank-1"; rowBg = "background:#fffbe6;"; }
        else if (rank === 2) { rankDisplay = isTeam ? "2" : "🥈"; rankClass = "rank-2"; }
        else if (rank === 3) { rankDisplay = isTeam ? "3" : "🥉"; rankClass = "rank-3"; }

        let row = `<tr style="${rowBg}">
            <td class="rank-col ${rankClass}">${rankDisplay}</td>
            <td class="name-col">${item.name}</td>
            <td class="asset-col ${rank === 1 ? 'top' : ''}">${item.total.toLocaleString()}</td>`;
        if (isTeam) {
            row += `<td class="member-col" style="font-size:12px; color:#555;">${item.members || '-'}</td>`;
        } else {
            row += `<td class="sub-asset-col">${item.cash ? item.cash.toLocaleString() : 0}</td>
                    <td class="sub-asset-col stock">${item.stock ? item.stock.toLocaleString() : 0}</td>`;
        }
        row += `<td class="date-col">${item.date}</td></tr>`;
        tbody.innerHTML += row;
    });
}

function setSpecialAwards(data) {
    if(data.length === 0) return;
    let cashKing = [...data].sort((a,b) => b.cash - a.cash)[0];
    let stockKing = [...data].sort((a,b) => b.stock - a.stock)[0];

    if(cashKing) {
        document.getElementById('awardCashName').innerText = cashKing.name;
        document.getElementById('awardCashVal').innerText = cashKing.cash.toLocaleString();
    }
    if(stockKing) {
        document.getElementById('awardStockName').innerText = stockKing.name;
        document.getElementById('awardStockVal').innerText = stockKing.stock.toLocaleString();
    }
}

// [8] 샘플 & 아두이노
function loadLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) { customLogoData = e.target.result; };
        reader.readAsDataURL(file);
    }
}
function runSample(mode) {
    isSampleMode = true;
    // [수정] 샘플 모드 시 수정 버튼 숨기기
    document.getElementById('btnEditPrev').style.display = 'none';
    
    currentMode = mode;
    for(let k in stockInfo) {
        const v = document.getElementById(`conf_${k}`).value;
        if(v) stockInfo[k].price = parseInt(v);
    }
    players = [];
    if(mode==='individual') for(let i=1;i<=5;i++) players.push(randP(`참가자 ${i}`, '-'));
    else ['A팀','B팀'].forEach(t=>{ for(let i=1;i<=3;i++) players.push(randP(`참가자${i}`, t)); });
    finishGame();
}
function randP(n,t) {
    let p = {id:Math.random(), name:n, team:t, assets:initAssets(), total:0, rankIndiv:0, rankTeam:0, teamTotal:0, manualCash:0};
    p.manualCash = (Math.floor(Math.random()*20)+1) * 10000;
    for(let k in p.assets) p.assets[k] = Math.floor(Math.random()*5)+1;
    return p;
}
function calcCashFromBills(a){ return a["100"]*100+a["500"]*500+a["1000"]*1000+a["5000"]*5000+a["10000"]*10000+a["50000"]*50000; }
function calcStock(a){ let s=0; for(let k in stockInfo) s+=a[k]*stockInfo[k].price; return s; }

let port, reader;
async function connectArduino() {
    try{ 
        port=await navigator.serial.requestPort(); await port.open({baudRate:115200}); 
        document.getElementById('connStatus').innerText="✅"; 
        alert("연결되었습니다.");
        const dec=new TextDecoderStream(); port.readable.pipeTo(dec.writable); reader=dec.readable.getReader(); readLoop();
    }catch(e){}
}
document.getElementById('connectBtn').addEventListener('click', connectArduino);

async function readLoop(){
    let buf=""; while(true){ const {value,done}=await reader.read(); if(done)break; buf+=value; let lines=buf.split('\n'); buf=lines.pop();
    lines.forEach(l=>{ 
        if(l.trim().startsWith('{')){ 
            try{ 
                let d=JSON.parse(l.trim()); 
                let targetIdx = (document.getElementById('reportScreen').classList.contains('active-screen')) ? viewingPlayerIndex : activeCountingIndex;
                if(players[targetIdx]) { 
                    players[targetIdx].assets[d.type] = d.count;
                    if(document.getElementById('reportScreen').classList.contains('active-screen')) {
                        if(!isNaN(d.type)) { players[targetIdx].manualCash = calcCashFromBills(players[targetIdx].assets); }
                        manualUpdate(); 
                    } else { 
                        if(!isNaN(d.type)) { players[targetIdx].manualCash = calcCashFromBills(players[targetIdx].assets); }
                        updateDash(); 
                    }
                } 
            }catch(e){} 
        } 
    }); }
}