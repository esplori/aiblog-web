/* ---------- 访问趋势：三档时间窗 ---------- */
const SERIES = {
  7:  { pv: [610, 658, 679, 641, 702, 734, 746], uv: [268, 291, 302, 284, 311, 324, 328] },
  30: { pv: [312,298,344,382,356,410,398,432,468,441,486,512,478,536,558,522,571,604,588,632,610,658,679,641,702,734,712,768,792,746],
        uv: [141,136,152,168,159,180,176,190,204,196,214,226,212,238,246,232,252,266,258,278,270,291,300,284,311,324,315,338,349,328] },
  90: { pv: Array.from({length: 90}, (_, i) => Math.round(240 + i * 5.6 + Math.sin(i / 3) * 46)),
        uv: Array.from({length: 90}, (_, i) => Math.round(110 + i * 2.4 + Math.sin(i / 4) * 18)) }
};
const CW = 720, CH = 210, CL = 44, CR = 8, CT = 10, CB = 24;
let cur = 30;

function drawTrend(days) {
  cur = days;
  const { pv, uv } = SERIES[days];
  const all = pv.concat(uv);
  const mx = Math.max(...all) * 1.06, mn = Math.min(...all) * 0.9;
  const x = i => CL + i * (CW - CL - CR) / (pv.length - 1);
  const y = v => CT + (1 - (v - mn) / (mx - mn)) * (CH - CT - CB);
  const path = a => a.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('');

  document.getElementById('tPvPath').setAttribute('d', path(pv));
  document.getElementById('tUvPath').setAttribute('d', path(uv));
  document.getElementById('tArea').setAttribute('d', path(pv) + `L${x(pv.length - 1)},${CH - CB}L${CL},${CH - CB}Z`);

  const ax = document.getElementById('tAx');
  ax.innerHTML = '';
  for (let k = 0; k <= 3; k++) {
    const v = mn + (mx - mn) * k / 3, yy = y(v);
    ax.insertAdjacentHTML('beforeend',
      `<line class="gl" x1="${CL}" x2="${CW - CR}" y1="${yy}" y2="${yy}"/>
       <text x="${CL - 8}" y="${yy + 3}" text-anchor="end">${Math.round(v)}</text>`);
  }
  const step = Math.max(1, Math.round(pv.length / 6));
  pv.forEach((_, i) => {
    if (i % step && i !== pv.length - 1) return;
    ax.insertAdjacentHTML('beforeend',
      `<text x="${x(i)}" y="${CH - 6}" text-anchor="middle">${days === 90 ? (i + 1) + 'd' : (i + 1) + ' 日'}</text>`);
  });

  document.getElementById('trend-sum').innerHTML =
    `总 PV <b>${pv.reduce((a, b) => a + b, 0).toLocaleString()}</b> · 总 UV <b>${uv.reduce((a, b) => a + b, 0).toLocaleString()}</b>`;
  document.getElementById('todayPv').textContent = pv.at(-1);
  document.getElementById('todayUv').textContent = uv.at(-1);
}

/* ---------- 横向条形 ---------- */
const bars = (el, rows) => {
  const mx = Math.max(...rows.map(r => r[1]));
  document.getElementById(el).innerHTML = rows.map(([n, v, lab], i) => `
    <li>
      <div class="t"><b>${n}</b><span>${lab ?? v.toLocaleString()}</span></div>
      <div class="tr"><i class="${i ? 's' + Math.min(i + 1, 5) : ''}" style="width:${(v / mx * 100).toFixed(1)}%"></i></div>
    </li>`).join('');
};

bars('typeDist', [
  ['文章详情页', 8580, '52.4%'],
  ['首页 / 列表页', 3710, '22.7%'],
  ['AI 广场', 2230, '13.6%'],
  ['搜索页', 1150, '7.0%'],
  ['标签 / 归档', 700, '4.3%']
]);

bars('refDist', [
  ['直接访问', 6875, '42.0%'],
  ['搜索引擎', 5075, '31.0%'],
  ['AI 聚合 / 引用', 2947, '18.0%'],
  ['RSS 订阅', 1473, '9.0%']
]);

bars('catDist', [
  ['技术', 358, '58.5%'],
  ['生活', 110, '18.0%'],
  ['思考', 98, '16.0%'],
  ['读书', 30, '4.9%'],
  ['其他', 16, '2.6%']
]);

/* ---------- 月度发布柱状（近 6 个月） ---------- */
const MONTHS = [['5 月', 9], ['6 月', 12], ['7 月', 14], ['8 月', 11], ['9 月', 16], ['10 月', 18]];
const MW = 720, MH = 180, ML = 40, MR = 8, MT = 8, MB = 24;
const slot = (MW - ML - MR) / MONTHS.length, bw = slot * 0.46;
const mMax = Math.max(...MONTHS.map(m => m[1])) * 1.2;
const by = v => MT + (1 - v / mMax) * (MH - MT - MB);

document.getElementById('mBars').innerHTML = MONTHS.map(([n, v], i) => {
  const xx = ML + slot * i + (slot - bw) / 2;
  return `<rect x="${xx.toFixed(1)}" y="${by(v).toFixed(1)}" width="${bw.toFixed(1)}"
    height="${(MH - MB - by(v)).toFixed(1)}" rx="3" fill="${i === MONTHS.length - 1 ? 'var(--brand)' : 'var(--bar-rest)'}">
    <title>${n} · ${v} 篇</title></rect>
    <text x="${(xx + bw / 2).toFixed(1)}" y="${(by(v) - 6).toFixed(1)}" text-anchor="middle"
      style="font-family:var(--mono);font-size:10px;fill:var(--ink-3)">${v}</text>`;
}).join('');

const mAx = document.getElementById('mAx');
for (let k = 0; k <= 2; k++) {
  const v = mMax * k / 2, yy = by(v);
  mAx.insertAdjacentHTML('beforeend',
    `<line class="gl" x1="${ML}" x2="${MW - MR}" y1="${yy}" y2="${yy}"/>
     <text x="${ML - 8}" y="${yy + 3}" text-anchor="end">${Math.round(v)}</text>`);
}
MONTHS.forEach(([n], i) =>
  mAx.insertAdjacentHTML('beforeend',
    `<text x="${(ML + slot * i + slot / 2).toFixed(1)}" y="${MH - 6}" text-anchor="middle">${n}</text>`));

/* ---------- TOP5 ---------- */
const TOP = {
  7:  [['AgentVQA：统一离线评测五类智能体视觉理解', 1284],
       ['把 Agent 的工具调用做成可回放的审计链', 962],
       ['记忆系统为什么不能只靠向量检索', 741],
       ['一次线上事故：并发写导致的时间戳回退', 508],
       ['给小学毕业的女儿的一封信', 386]],
  30: [['AgentVQA：统一离线评测五类智能体视觉理解', 4820],
       ['给小学毕业的女儿的一封信', 3946],
       ['把 Agent 的工具调用做成可回放的审计链', 3218],
       ['记忆系统为什么不能只靠向量检索', 2764],
       ['Postgres 里的 JSONB 到底该用到什么程度', 1902]],
  90: [['AgentVQA：统一离线评测五类智能体视觉理解', 12406],
       ['给小学毕业的女儿的一封信', 10882],
       ['记忆系统为什么不能只靠向量检索', 8640],
       ['把 Agent 的工具调用做成可回放的审计链', 7906],
       ['周末去临安走了一段没修完的野路', 5218]]
};
function drawTop(d) {
  document.getElementById('top5').innerHTML = TOP[d].map(([t, v], i) =>
    `<li><span class="no">${i + 1}</span><span class="tt">${t}</span><span class="vv">${v.toLocaleString()} 次浏览</span></li>`).join('');
}

/* ---------- 交互 ---------- */
document.querySelectorAll('#range button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#range button').forEach(x => x.classList.toggle('on', x === b));
  drawTrend(Number(b.dataset.d));
}));
document.querySelectorAll('#topRange button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#topRange button').forEach(x => x.classList.toggle('on', x === b));
  drawTop(Number(b.dataset.d));
}));

drawTrend(30);
drawTop(30);
