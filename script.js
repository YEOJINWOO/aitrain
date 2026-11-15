(function(){
'use strict';

/* ========== 설정 ========== */
const MASTER = 3; // 연속 정답 횟수
const KEY = 'jp-flashcards-v1';
const WORDS_KEY = 'jp-words-v1';      // Claude가 만든 단어 저장
const API_KEY_KEY = 'jp-claude-key';  // 사용자가 입력한 API 키 저장
const API_KEY = '';                  // 비워 두면 화면에서 키를 입력받음 (GitHub에 올릴 때는 반드시 비워 두기)
const MODEL = 'claude-sonnet-5-5';
const PER_GROUP = 15;                 // 그룹당 요청할 단어 수

const KANA_GROUPS = [
  {id:'basic', name:'기본'},
  {id:'dakuten', name:'탁음·반탁음'},
  {id:'yoon', name:'요음'}
];
const WORD_GROUPS = [
  {id:'nature', name:'자연·동물'}, {id:'food', name:'음식'}, {id:'people', name:'사람'},
  {id:'things', name:'사물·장소'}, {id:'body', name:'몸'}, {id:'verb', name:'동사'},
  {id:'adj', name:'형용사'}, {id:'time', name:'시간'}, {id:'talk', name:'인사·숫자'}
];
const GROUPS = {kana:KANA_GROUPS, word:WORD_GROUPS};

// 글자,한글 표기,로마자
const KANA_RAW = {
  basic:'あ,아,a;い,이,i;う,우,u;え,에,e;お,오,o;か,카,ka;き,키,ki;く,쿠,ku;け,케,ke;こ,코,ko;さ,사,sa;し,시,shi;す,스,su;せ,세,se;そ,소,so;た,타,ta;ち,치,chi;つ,츠,tsu;て,테,te;と,토,to;な,나,na;に,니,ni;ぬ,누,nu;ね,네,ne;の,노,no;は,하,ha;ひ,히,hi;ふ,후,fu;へ,헤,he;ほ,호,ho;ま,마,ma;み,미,mi;む,무,mu;め,메,me;も,모,mo;や,야,ya;ゆ,유,yu;よ,요,yo;ら,라,ra;り,리,ri;る,루,ru;れ,레,re;ろ,로,ro;わ,와,wa;を,오,wo;ん,응,n',
  dakuten:'が,가,ga;ぎ,기,gi;ぐ,구,gu;げ,게,ge;ご,고,go;ざ,자,za;じ,지,ji;ず,즈,zu;ぜ,제,ze;ぞ,조,zo;だ,다,da;ぢ,지,ji;づ,즈,zu;で,데,de;ど,도,do;ば,바,ba;び,비,bi;ぶ,부,bu;べ,베,be;ぼ,보,bo;ぱ,파,pa;ぴ,피,pi;ぷ,푸,pu;ぺ,페,pe;ぽ,포,po',
  yoon:'きゃ,캬,kya;きゅ,큐,kyu;きょ,쿄,kyo;しゃ,샤,sha;しゅ,슈,shu;しょ,쇼,sho;ちゃ,차,cha;ちゅ,추,chu;ちょ,초,cho;にゃ,냐,nya;にゅ,뉴,nyu;にょ,뇨,nyo;ひゃ,햐,hya;ひゅ,휴,hyu;ひょ,효,hyo;みゃ,먀,mya;みゅ,뮤,myu;みょ,묘,myo;りゃ,랴,rya;りゅ,류,ryu;りょ,료,ryo;ぎゃ,갸,gya;ぎゅ,규,gyu;ぎょ,교,gyo;じゃ,자,ja;じゅ,주,ju;じょ,조,jo;びゃ,뱌,bya;びゅ,뷰,byu;びょ,뵤,byo;ぴゃ,퍄,pya;ぴゅ,퓨,pyu;ぴょ,표,pyo'
};

const KANA_CARDS = [];
KANA_GROUPS.forEach(g => {
  KANA_RAW[g.id].split(';').forEach(s => {
    const p = s.split(',');
    KANA_CARDS.push({id:'k:'+p[0], stage:'kana', group:g.id, front:p[0], ans:p[1], ro:p[2]});
  });
});
KANA_CARDS.forEach(c => {
  c.same = KANA_CARDS.filter(o => o !== c && o.ans === c.ans)
                     .map(o => o.front + ' (' + o.ro + ')').join(', ');
});

// 단어에 쓸 수 있는 글자: 기본 + 탁음·반탁음 (요음·작은 글자·장음 제외)
const ALLOWED = new Set(KANA_CARDS.filter(c => c.group !== 'yoon').map(c => c.front));

/* ========== 단어: Claude API로 불러오기 ========== */
let WORD_CARDS = [];

function buildWordCards(words){
  const seen = new Set();
  const out = [];
  words.forEach(w => {
    if (!w || typeof w.kana !== 'string' || typeof w.meaning !== 'string') return;
    const kana = w.kana.trim(), meaning = w.meaning.trim(), kanji = (w.kanji || '').trim();
    if (!kana || !meaning) return;
    if (!WORD_GROUPS.some(g => g.id === w.group)) return;
    if (![...kana].every(ch => ALLOWED.has(ch))) return;   // 허용 안 된 글자가 섞인 단어는 버림
    const id = 'w:' + kana + ':' + meaning;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({id:id, stage:'word', group:w.group, front:kana, kanji:kanji, ans:meaning});
  });
  return out;
}

const WORD_TOOL = {
  name:'save_words',
  description:'일본어 학습용 단어 목록을 저장한다.',
  input_schema:{
    type:'object',
    properties:{
      words:{
        type:'array',
        items:{
          type:'object',
          properties:{
            group:{type:'string', enum:WORD_GROUPS.map(g => g.id)},
            kana:{type:'string', description:'히라가나 표기'},
            kanji:{type:'string', description:'한자 표기. 일반적으로 히라가나로만 쓰면 빈 문자열'},
            meaning:{type:'string', description:'한국어 뜻'}
          },
          required:['group','kana','kanji','meaning']
        }
      }
    },
    required:['words']
  }
};

function wordPrompt(){
  const groups = WORD_GROUPS.map(g => '- ' + g.id + ': ' + g.name).join('\n');
  return '한국인 일본어 초급 학습자를 위한 기초 단어를 아래 그룹마다 ' + PER_GROUP + '개씩 골라 save_words 도구로 제출해 주세요.\n\n' +
    '그룹:\n' + groups + '\n\n' +
    '규칙:\n' +
    '1. kana는 히라가나만 씁니다. 기본 히라가나(あ~ん)와 탁음·반탁음(が, ぱ 등)만 허용합니다.\n' +
    '2. 작은 글자(ゃ ゅ ょ っ ぁ 등), 장음 부호(ー), 가타카나가 들어가는 단어는 넣지 마세요.\n' +
    '3. kanji는 일반적인 한자 표기를 씁니다. 보통 히라가나로만 쓰는 말이면 빈 문자열로 둡니다.\n' +
    '4. meaning은 짧은 한국어 뜻입니다. 같은 뜻의 단어가 여럿이면 괄호로 구분합니다. 예: 눈(신체), 눈(내리는 눈).\n' +
    '5. 동사는 사전형, 형용사는 기본형으로 씁니다.\n' +
    '6. 한 그룹 안에서 단어가 겹치지 않게 합니다.';
}

async function fetchWords(apiKey){
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST',
    headers:{
      'content-type':'application/json',
      'x-api-key':apiKey,
      'anthropic-version':'2023-06-01',
      'anthropic-dangerous-direct-browser-access':'true'   // 브라우저에서 직접 호출할 때 필요
    },
    body:JSON.stringify({
      model:MODEL,
      max_tokens:8000,
      tools:[WORD_TOOL],
      tool_choice:{type:'tool', name:'save_words'},
      messages:[{role:'user', content:wordPrompt()}]
    })
  });
  if (!res.ok){
    let msg = res.statusText;
    try{ const j = await res.json(); if (j.error && j.error.message) msg = j.error.message; }catch(e){}
    throw new Error('API 오류 ' + res.status + ': ' + msg);
  }
  const data = await res.json();
  const block = (data.content || []).find(b => b.type === 'tool_use');
  if (!block || !block.input || !Array.isArray(block.input.words)) throw new Error('응답에서 단어 목록을 찾지 못했어요.');
  return block.input.words;
}

function loadWords(){
  try{
    const raw = localStorage.getItem(WORDS_KEY);
    if (raw) WORD_CARDS = buildWordCards(JSON.parse(raw));
  }catch(e){}
}
function saveWords(words){ try{ localStorage.setItem(WORDS_KEY, JSON.stringify(words)); }catch(e){} }
function getApiKey(){ try{ return localStorage.getItem(API_KEY_KEY) || ''; }catch(e){ return ''; } }
function setApiKey(k){ try{ localStorage.setItem(API_KEY_KEY, k); }catch(e){} }

/* ========== 저장 ========== */
const store = {
  stats:{}, speed:1.4, shuffle:false, speak:false,
  sel:{
    kana:{basic:true, dakuten:false, yoon:false},
    word:{nature:true, food:true, people:true, things:true, body:true, verb:true, adj:true, time:true, talk:true}
  }
};
function load(){
  try{
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p.stats) store.stats = p.stats;
    if (typeof p.speed === 'number') store.speed = p.speed;
    if (typeof p.shuffle === 'boolean') store.shuffle = p.shuffle;
    if (typeof p.speak === 'boolean') store.speak = p.speak;
    if (p.sel){
      ['kana','word'].forEach(st => { if (p.sel[st]) Object.keys(store.sel[st]).forEach(k => { if (typeof p.sel[st][k] === 'boolean') store.sel[st][k] = p.sel[st][k]; }); });
    }
  }catch(e){}
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(store)); }catch(e){} }
load();
loadWords();

/* ========== 상태 ========== */
const S = {
  stage:'kana', mode:'browse', deck:[], idx:0, flipped:false, playing:true, done:false,
  timer:null, fbTimer:null, q:null, answered:false, session:{n:0, ok:0}, lastId:null,
  confirmReset:false,
  setup:false, loading:false, err:''   // 단어 불러오기 화면 상태
};

const $ = (s, r) => (r || document).querySelector(s);
function esc(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function cardsOf(stage){ return stage === 'kana' ? KANA_CARDS : WORD_CARDS; }
function pool(){ return cardsOf(S.stage).filter(c => store.sel[S.stage][c.group]); }
function streak(c){ const s = store.stats[c.id]; return s ? s.s : 0; }
function isMastered(c){ return streak(c) >= MASTER; }
function groupName(c){ return GROUPS[c.stage].find(g => g.id === c.group).name; }
const canSpeak = 'speechSynthesis' in window;

// 단어 단계에서 아직 단어가 없거나, 새 단어 받기를 눌렀을 때
function showSetup(){ return S.stage === 'word' && (S.setup || !WORD_CARDS.length); }

/* ========== 음성 ========== */
let jaVoice = null;
function pickVoice(){ try{ jaVoice = speechSynthesis.getVoices().find(v => /^ja/i.test(v.lang)) || null; }catch(e){} }
if (canSpeak){ pickVoice(); try{ speechSynthesis.onvoiceschanged = pickVoice; }catch(e){} }
function speak(text){
  if (!canSpeak) return;
  try{
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP'; u.rate = .85;
    if (jaVoice) u.voice = jaVoice;
    speechSynthesis.speak(u);
  }catch(e){}
}
function speakCurrent(){
  const c = S.mode === 'browse' ? S.deck[S.idx] : (S.q && S.q.c);
  if (c) speak(c.front);
}

/* ========== 상단 영역 ========== */
function renderTop(){
  const setup = showSetup();
  document.querySelectorAll('.stage').forEach(b => b.setAttribute('aria-selected', b.dataset.s === S.stage));
  $('#modes').hidden = setup;
  $('#ranges').hidden = setup;
  $('#progress').hidden = setup;
  document.querySelectorAll('#modes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode));

  $('#ranges').innerHTML = GROUPS[S.stage].map(g => {
    const cs = cardsOf(S.stage).filter(c => c.group === g.id);
    const m = cs.filter(isMastered).length;
    return '<button class="chip" data-act="group" data-g="'+g.id+'" aria-pressed="'+(!!store.sel[S.stage][g.id])+'">'+esc(g.name)+' <small>'+m+'/'+cs.length+'</small></button>';
  }).join('');

  if (!setup){
    const p = pool();
    const m = p.filter(isMastered).length;
    const pct = p.length ? m / p.length * 100 : 0;
    const sub = m === p.length && p.length ? '선택한 범위를 모두 마스터했어요. 복습 중이에요.' : '연속 '+MASTER+'번 맞히면 마스터';
    $('#progress').innerHTML =
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+p.length+'" aria-valuenow="'+m+'"><span style="width:'+pct+'%"></span></div>' +
      '<p><span><b>'+m+'</b> / '+p.length+' 마스터</span><span class="sub">'+sub+(S.session.n ? ' · 이번 방문 '+S.session.ok+'/'+S.session.n : '')+'</span></p>';
  }

  $('#hint').innerHTML = setup ? '' : (S.mode === 'browse'
    ? '<span>스페이스: 자동 재생 켜기/끄기</span><span>← →: 이동</span><span>Enter: 뒤집기</span>'
    : '<span>1–4: 보기 선택</span><span>Enter: 다음 문제</span>');
  $('#refetchBtn').hidden = !(S.stage === 'word' && WORD_CARDS.length && !S.setup);
  $('#resetBtn').textContent = S.confirmReset ? '한 번 더 누르면 모든 기록이 지워져요' : '진행 상황 지우기';
}

/* ========== 본문 ========== */
function renderMain(){
  clearTimeout(S.timer);
  if (showSetup()){ $('#main').innerHTML = setupHTML(); return; }
  if (!pool().length){
    $('#main').innerHTML = '<div class="panel"><h2>선택한 범위에 단어가 없어요</h2><p>다른 범위를 선택하거나 Claude로 새 단어를 받아 보세요.</p></div>';
    return;
  }
  if (S.mode === 'browse') renderBrowse(); else renderQuiz();
}

function setupHTML(){
  const has = WORD_CARDS.length > 0;
  return '<div class="panel"><h2>'+(has ? 'Claude로 새 단어 받기' : 'Claude로 단어 불러오기')+'</h2>' +
    '<p>Claude API로 그룹마다 '+PER_GROUP+'개씩 단어를 만들어 와요. 받은 단어는 이 브라우저에 저장돼서 다음에는 바로 열려요.' +
    (has ? ' 새로 받으면 지금 단어 목록이 바뀌어요.' : '') + '</p>' +
    (API_KEY ? '' :
      '<label class="field">Anthropic API 키<input type="password" id="apiKey" autocomplete="off" placeholder="sk-ant-..." value="'+esc(getApiKey())+'"'+(S.loading ? ' disabled' : '')+'></label>' +
      '<p class="small">키는 이 브라우저(localStorage)에만 저장되고 Anthropic API로만 보내져요.</p>') +
    (S.err ? '<p class="error" role="alert">'+esc(S.err)+'</p>' : '') +
    '<div class="row"><button class="btn primary" data-act="fetchwords"'+(S.loading ? ' disabled' : '')+'>'+(S.loading ? '불러오는 중… (30초~1분 걸려요)' : '단어 불러오기')+'</button>' +
    (has ? '<button class="btn quiet" data-act="cancelsetup"'+(S.loading ? ' disabled' : '')+'>취소</button>' : '') +
    '</div></div>';
}

async function doFetchWords(){
  const input = $('#apiKey');
  const key = API_KEY || (input ? input.value.trim() : '');
  if (!key){ S.err = 'API 키를 입력해 주세요.'; renderMain(); return; }
  if (!API_KEY) setApiKey(key);
  S.loading = true; S.err = ''; renderMain();
  try{
    const words = await fetchWords(key);
    const cards = buildWordCards(words);
    if (!cards.length) throw new Error('규칙에 맞는 단어가 하나도 없었어요. 다시 시도해 주세요.');
    saveWords(words);
    WORD_CARDS = cards;
    S.setup = false;
    resetView();
  }catch(e){
    S.err = (e && e.message) || '불러오기에 실패했어요.';
  }finally{
    S.loading = false;
    renderTop();
    if (S.mode === 'quiz' && !showSetup()) newQuestion(); else renderMain();
  }
}

/* ----- 훑어보기 ----- */
function buildDeck(){
  const p = pool();
  S.deck = store.shuffle ? shuffle(p.slice()) : p.slice();
  S.idx = 0; S.flipped = false; S.done = false;
}

function glyphScale(c){
  const n = [...c.front].length;
  if (c.stage === 'kana') return n > 1 ? .34 : .5;
  return n <= 2 ? .3 : n === 3 ? .24 : n === 4 ? .2 : n === 5 ? .17 : .14;
}
function meaningScale(t){
  const n = [...t].length;
  return n <= 3 ? .2 : n <= 5 ? .15 : n <= 7 ? .12 : .09;
}
function metaHTML(l, r){ return '<div class="meta"><span>'+l+'</span><span>'+r+'</span></div>'; }
function backHTML(c){
  if (c.stage === 'kana'){
    return '<div class="reading">'+esc(c.ans)+'</div><div class="romaji">'+esc(c.ro)+'</div>' +
      (c.same ? '<div class="note">소리가 같은 글자: '+esc(c.same)+'</div>' : '');
  }
  return '<div class="meaning" style="--k:'+meaningScale(c.ans)+'">'+esc(c.ans)+'</div>' +
    '<div class="jp">'+(c.kanji ? esc(c.kanji)+' · ' : '')+esc(c.front)+'</div>';
}

function renderBrowse(){
  if (!S.deck.length) buildDeck();
  const main = $('#main');
  if (S.done){
    main.innerHTML = '<div class="panel"><h2>한 바퀴 완료</h2><p>'+S.deck.length+'장을 모두 훑어봤어요. 이제 퀴즈로 확인해 볼까요?</p>' +
      '<div class="row"><button class="btn primary" data-act="mode" data-m="quiz">퀴즈 시작</button><button class="btn" data-act="restart">다시 보기</button></div></div>';
    return;
  }
  main.innerHTML =
    '<div class="scene '+S.stage+'"><div class="card" id="card" role="button" tabindex="0" aria-label="카드 뒤집기" data-act="flip">' +
    '<div class="face front" id="front"></div><div class="face back" id="back"></div></div></div>' +
    '<div class="transport">' +
      '<button class="btn" data-act="prev">이전</button>' +
      '<button class="btn primary" id="playBtn" data-act="play">'+(S.playing ? '일시정지' : '자동 재생')+'</button>' +
      '<button class="btn" data-act="next">다음</button>' +
      (canSpeak ? '<button class="btn" data-act="speak">소리 듣기</button>' : '') +
    '</div>' +
    '<div class="tuning">' +
      '<label>속도 <input type="range" id="speed" min="0.6" max="4" step="0.2" value="'+store.speed+'"> <output id="speedOut">카드당 '+store.speed.toFixed(1)+'초</output></label>' +
      '<label><input type="checkbox" id="shuffle"'+(store.shuffle ? ' checked' : '')+'>섞기</label>' +
      (canSpeak ? '<label><input type="checkbox" id="autospeak"'+(store.speak ? ' checked' : '')+'>뒤집힐 때 소리</label>' : '') +
    '</div>';
  fillCard();
  schedule();
}

function fillCard(){
  const c = S.deck[S.idx]; if (!c) return;
  const card = $('#card'); if (!card) return;
  const pos = (S.idx + 1) + ' / ' + S.deck.length;
  const g = esc(groupName(c));
  $('#front').innerHTML = metaHTML(pos, g) + '<div class="glyph" style="--k:'+glyphScale(c)+'">'+esc(c.front)+'</div>';
  $('#back').innerHTML = metaHTML(pos, g) + backHTML(c);
  card.classList.toggle('flipped', S.flipped);
}

function schedule(){
  clearTimeout(S.timer);
  if (S.mode !== 'browse' || !S.playing || S.done || document.hidden || showSetup()) return;
  const ms = store.speed * 1000;
  S.timer = setTimeout(S.flipped ? advance : flipCard, ms * (S.flipped ? .55 : .45));
}
function flipCard(){
  const card = $('#card'); if (!card) return;
  S.flipped = !S.flipped;
  card.classList.toggle('flipped', S.flipped);
  if (S.flipped && store.speak) speakCurrent();
  schedule();
}
function go(i){
  S.idx = i; S.flipped = false;
  const card = $('#card'); if (!card) return;
  card.classList.add('noanim');
  fillCard();
  void card.offsetWidth;
  card.classList.remove('noanim');
  schedule();
}
function advance(){
  if (S.idx + 1 >= S.deck.length){
    S.done = true; S.playing = false; clearTimeout(S.timer); renderMain(); return;
  }
  go(S.idx + 1);
}
function step(d){
  if (d > 0) advance(); else if (S.idx > 0) go(S.idx - 1);
}
function togglePlay(){
  S.playing = !S.playing;
  const b = $('#playBtn'); if (b) b.textContent = S.playing ? '일시정지' : '자동 재생';
  schedule();
}
function manualFlip(){
  S.playing = false;
  const b = $('#playBtn'); if (b) b.textContent = '자동 재생';
  flipCard();
}

/* ----- 퀴즈 ----- */
function pickCard(p){
  const list = p.length > 1 ? p.filter(c => c.id !== S.lastId) : p;
  const w = list.map(c => {
    const st = store.stats[c.id] || {s:0, w:0};
    return st.s >= MASTER ? .15 : 1 + (MASTER - st.s) * .6 + Math.min(st.w || 0, 3) * .3;
  });
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++){ r -= w[i]; if (r <= 0) return list[i]; }
  return list[list.length - 1];
}
function makeOptions(c, p){
  const seen = new Set([c.ans]);
  const out = [c];
  const add = arr => shuffle(arr.slice()).forEach(o => {
    if (out.length < 4 && !seen.has(o.ans)){ seen.add(o.ans); out.push(o); }
  });
  add(p); add(cardsOf(c.stage));
  return shuffle(out);
}
function newQuestion(){
  clearTimeout(S.fbTimer);
  const p = pool();
  if (showSetup() || !p.length){ S.q = null; renderMain(); return; }
  const c = pickCard(p);
  S.lastId = c.id;
  S.q = {c:c, opts:makeOptions(c, p), picked:null};
  S.answered = false;
  renderMain();
}
function answer(i){
  if (S.answered || !S.q || !S.q.opts[i]) return;
  S.answered = true;
  const q = S.q, c = q.c;
  q.picked = i;
  const ok = q.opts[i].ans === c.ans;
  const st = store.stats[c.id] || (store.stats[c.id] = {s:0, r:0, w:0});
  if (ok){ st.s++; st.r++; } else { st.s = 0; st.w++; }
  S.session.n++; if (ok) S.session.ok++;
  save();
  renderTop();
  renderMain();
  if (ok) S.fbTimer = setTimeout(newQuestion, 900);
}

function feedbackHTML(){
  const q = S.q, c = q.c;
  const speakBtn = canSpeak ? '<button class="btn" data-act="speak">소리 듣기</button>' : '';
  if (!S.answered) return '<span class="muted">알맞은 '+(c.stage === 'kana' ? '소리' : '뜻')+'을 고르세요</span>';
  const ok = q.opts[q.picked].ans === c.ans;
  const detail = c.stage === 'kana'
    ? esc(c.front)+' = <b>'+esc(c.ans)+'</b> ('+esc(c.ro)+')'
    : (c.kanji ? esc(c.kanji)+' · ' : '')+esc(c.front)+' = <b>'+esc(c.ans)+'</b>';
  const same = c.stage === 'kana' && c.same ? '<div class="sub">소리가 같은 글자: '+esc(c.same)+'</div>' : '';
  return '<div class="'+(ok ? 'ok' : 'bad')+'"><strong>'+(ok ? '정답' : '오답')+'</strong> '+detail+'</div>' + same +
    '<div class="row"><button class="btn'+(ok ? '' : ' primary')+'" data-act="nextq">다음 문제</button>'+speakBtn+'</div>';
}

function renderQuiz(){
  if (!S.q){ newQuestion(); return; }
  const q = S.q, c = q.c;
  const s = Math.min(streak(c), MASTER);
  const dots = '●'.repeat(s) + '○'.repeat(MASTER - s);
  let state = '';
  if (S.answered) state = q.opts[q.picked].ans === c.ans ? ' ok' : ' bad';
  const isKana = c.stage === 'kana';
  $('#main').innerHTML =
    '<div class="scene quiz '+S.stage+(isKana ? ' compact' : '')+'"><div class="card static'+state+'">' +
      '<div class="face front">' +
        metaHTML(isKana ? '소리 맞추기' : '뜻 맞추기', '<span class="dots" aria-label="연속 정답 '+s+'/'+MASTER+'">'+dots+'</span>') +
        '<div class="glyph" style="--k:'+glyphScale(c)+'">'+esc(c.front)+'</div>' +
      '</div></div></div>' +
    '<div class="options'+(S.answered ? ' done' : '')+'">' +
      q.opts.map((o, i) => {
        let cls = '';
        if (S.answered){ cls = o.ans === c.ans ? ' right' : (i === q.picked ? ' wrong' : ' dim'); }
        return '<button class="opt'+(isKana ? '' : ' word')+cls+'" data-act="answer" data-i="'+i+'"'+(S.answered ? ' aria-disabled="true"' : '')+'><kbd>'+(i+1)+'</kbd><span>'+esc(o.ans)+'</span></button>';
      }).join('') +
    '</div>' +
    '<div class="feedback" aria-live="polite">'+feedbackHTML()+'</div>';
}

/* ========== 화면 전환 ========== */
function resetView(){
  clearTimeout(S.timer); clearTimeout(S.fbTimer);
  S.deck = []; S.idx = 0; S.flipped = false; S.done = false; S.q = null; S.answered = false;
}
function setStage(st){
  if (S.loading) return;
  resetView();
  S.stage = st; S.mode = 'browse'; S.playing = true; S.setup = false; S.err = '';
  renderTop(); renderMain();
}
function setMode(m){
  resetView();
  S.mode = m;
  if (m === 'browse') S.playing = true;
  renderTop();
  if (m === 'quiz') newQuestion(); else renderMain();
}

/* ========== 이벤트 ========== */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]');
  if (!t || t.disabled) return;
  const act = t.dataset.act;
  if (act !== 'reset' && S.confirmReset){ S.confirmReset = false; renderTop(); }
  switch (act){
    case 'stage': if (t.dataset.s !== S.stage) setStage(t.dataset.s); break;
    case 'mode': if (t.dataset.m !== S.mode) setMode(t.dataset.m); break;
    case 'group': {
      const sel = store.sel[S.stage], g = t.dataset.g;
      const on = Object.keys(sel).filter(k => sel[k]);
      if (sel[g] && on.length === 1) break;
      sel[g] = !sel[g]; save();
      resetView(); renderTop();
      if (S.mode === 'quiz') newQuestion(); else renderMain();
      break;
    }
    case 'flip': manualFlip(); break;
    case 'prev': step(-1); break;
    case 'next': step(1); break;
    case 'play': togglePlay(); break;
    case 'restart': buildDeck(); S.playing = true; renderMain(); break;
    case 'speak': speakCurrent(); break;
    case 'answer': answer(+t.dataset.i); break;
    case 'nextq': newQuestion(); break;
    case 'fetchwords': doFetchWords(); break;
    case 'refetch': resetView(); S.setup = true; S.err = ''; renderTop(); renderMain(); break;
    case 'cancelsetup':
      S.setup = false; S.err = ''; renderTop();
      if (S.mode === 'quiz') newQuestion(); else renderMain();
      break;
    case 'reset':
      if (!S.confirmReset){ S.confirmReset = true; renderTop(); }
      else {
        store.stats = {}; S.session = {n:0, ok:0}; S.confirmReset = false;
        save(); setStage('kana');
      }
      break;
  }
});

document.addEventListener('input', e => {
  if (e.target.id === 'speed'){
    store.speed = parseFloat(e.target.value);
    $('#speedOut').textContent = '카드당 ' + store.speed.toFixed(1) + '초';
    save(); schedule();
  }
});
document.addEventListener('change', e => {
  if (e.target.id === 'shuffle'){ store.shuffle = e.target.checked; save(); buildDeck(); S.playing = true; renderMain(); }
  if (e.target.id === 'autospeak'){ store.speak = e.target.checked; save(); }
});

document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT'){
    if (e.target.id === 'apiKey' && e.key === 'Enter' && !S.loading){ e.preventDefault(); doFetchWords(); }
    return;
  }
  if (showSetup()) return;
  const onBtn = tag === 'BUTTON';
  if (S.mode === 'browse' && !S.done){
    if (e.key === 'ArrowRight'){ e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft'){ e.preventDefault(); step(-1); }
    else if (e.key === ' ' && !onBtn){ e.preventDefault(); togglePlay(); }
    else if (e.key === 'Enter' && !onBtn){ e.preventDefault(); manualFlip(); }
  } else if (S.mode === 'quiz'){
    if (/^[1-4]$/.test(e.key)){ answer(+e.key - 1); }
    else if ((e.key === 'Enter' || e.key === ' ') && !onBtn && S.answered){ e.preventDefault(); newQuestion(); }
  }
});

document.addEventListener('visibilitychange', schedule);

/* ========== 시작 ========== */
renderTop();
renderMain();
})();
