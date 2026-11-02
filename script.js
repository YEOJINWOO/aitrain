(function(){
'use strict';

/* ========== 데이터 ========== */
const MASTER = 3; // 연속 정답 횟수
const KEY = 'jp-flashcards-v1';

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

// 히라가나|한자|뜻 (히라가나 기본·탁음·반탁음만 사용)
const WORD_RAW = {
  nature:'いぬ|犬|개;ねこ|猫|고양이;さかな|魚|물고기;とり|鳥|새;うま|馬|말;うし|牛|소;さる|猿|원숭이;くま|熊|곰;かめ|亀|거북이;むし|虫|벌레;はな|花|꽃;き|木|나무;もり|森|숲;やま|山|산;かわ|川|강;うみ|海|바다;いけ|池|연못;そら|空|하늘;くも|雲|구름;あめ|雨|비;ゆき|雪|눈(내리는 눈);かぜ|風|바람;つき|月|달;ほし|星|별;いし|石|돌;ひ|火|불;みず|水|물',
  food:'ごはん|ご飯|밥;あさごはん|朝ご飯|아침밥;ひるごはん|昼ご飯|점심밥;ばんごはん|晩ご飯|저녁밥;たまご|卵|계란;にく|肉|고기;やさい|野菜|채소;くだもの|果物|과일;りんご|林檎|사과;みかん|蜜柑|귤;ぶどう|葡萄|포도;もも|桃|복숭아;なし|梨|배(과일);すいか|西瓜|수박;さとう|砂糖|설탕;しお|塩|소금;みそ|味噌|된장;さけ|酒|술;すし|寿司|초밥;あまい|甘い|달다;からい|辛い|맵다;おいしい|美味しい|맛있다',
  people:'ひと|人|사람;わたし|私|나;あなた|貴方|당신;ともだち|友達|친구;おとこ|男|남자;おんな|女|여자;こども|子供|아이;かぞく|家族|가족;ちち|父|아버지;はは|母|어머니;あに|兄|형·오빠;あね|姉|누나·언니;いもうと|妹|여동생;おとうと|弟|남동생;せんせい|先生|선생님;がくせい|学生|학생',
  things:'いえ|家|집;へや|部屋|방;にわ|庭|정원;まち|町|마을;くに|国|나라;えき|駅|역;みち|道|길;ぎんこう|銀行|은행;くるま|車|자동차;ひこうき|飛行機|비행기;ふね|船|배(선박);ほん|本|책;しんぶん|新聞|신문;てがみ|手紙|편지;でんわ|電話|전화;ちず|地図|지도;つくえ|机|책상;いす|椅子|의자;まど|窓|창문;かぎ|鍵|열쇠;かばん|鞄|가방;さいふ|財布|지갑;くつ|靴|신발;かさ|傘|우산;とけい|時計|시계;かがみ|鏡|거울;ふとん|布団|이불;はし|箸|젓가락;さら|皿|접시;おかね|お金|돈;いろ|色|색;うた|歌|노래;えいが|映画|영화;しごと|仕事|일;ことば|言葉|말(언어)',
  body:'あたま|頭|머리;かみ|髪|머리카락;かお|顔|얼굴;め|目|눈(신체);みみ|耳|귀;くち|口|입;て|手|손;ゆび|指|손가락;あし|足|발·다리;せなか|背中|등;おなか|お腹|배(복부);からだ|体|몸;こころ|心|마음',
  verb:'たべる|食べる|먹다;のむ|飲む|마시다;みる|見る|보다;きく|聞く|듣다;いく|行く|가다;くる|来る|오다;あう|会う|만나다;はなす|話す|말하다;かく|書く|쓰다;よむ|読む|읽다;かう|買う|사다;うる|売る|팔다;つかう|使う|사용하다;まつ|待つ|기다리다;ねる|寝る|자다;おきる|起きる|일어나다;あるく|歩く|걷다;はしる|走る|달리다;あそぶ|遊ぶ|놀다;すむ|住む|살다(거주);わかる|分かる|이해하다',
  adj:'おおきい|大きい|크다;ちいさい|小さい|작다;ながい|長い|길다;みじかい|短い|짧다;たかい|高い|높다·비싸다;やすい|安い|싸다;あたらしい|新しい|새롭다;ふるい|古い|오래되다;はやい|速い|빠르다;おそい|遅い|느리다·늦다;おもい|重い|무겁다;かるい|軽い|가볍다;あつい|暑い|덥다;さむい|寒い|춥다;あかい|赤い|빨갛다;あおい|青い|파랗다;しろい|白い|하얗다;くろい|黒い|검다;すき|好き|좋아하다;きれい|綺麗|예쁘다·깨끗하다',
  time:'あさ|朝|아침;ひる|昼|낮;よる|夜|밤;いま|今|지금;きのう|昨日|어제;あした|明日|내일;まいにち|毎日|매일;はる|春|봄;なつ|夏|여름;あき|秋|가을;ふゆ|冬|겨울',
  talk:'ありがとう|有難う|고맙습니다;こんにちは|今日は|안녕하세요(낮 인사);おはよう|お早う|안녕(아침 인사);さようなら|左様なら|안녕히 가세요;すみません|済みません|죄송합니다·실례합니다;ごめんなさい||미안해요;はい||네;いいえ||아니요;いち|一|1(일);に|二|2(이);さん|三|3(삼);よん|四|4(사);ご|五|5(오);ろく|六|6(육);なな|七|7(칠);はち|八|8(팔)'
};

const CARDS = [];
KANA_GROUPS.forEach(g => {
  KANA_RAW[g.id].split(';').forEach(s => {
    const p = s.split(',');
    CARDS.push({id:'k:'+p[0], stage:'kana', group:g.id, front:p[0], ans:p[1], ro:p[2]});
  });
});
CARDS.forEach(c => {
  if (c.stage !== 'kana') return;
  c.same = CARDS.filter(o => o.stage === 'kana' && o !== c && o.ans === c.ans)
                .map(o => o.front + ' (' + o.ro + ')').join(', ');
});
WORD_GROUPS.forEach(g => {
  WORD_RAW[g.id].split(';').forEach(s => {
    const p = s.split('|');
    CARDS.push({id:'w:'+p[0]+':'+p[2], stage:'word', group:g.id, front:p[0], kanji:p[1], ans:p[2]});
  });
});

/* ========== 저장 ========== */
const store = {
  stats:{}, unlocked:false, speed:1.4, shuffle:false, speak:false,
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
    if (typeof p.unlocked === 'boolean') store.unlocked = p.unlocked;
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

/* ========== 상태 ========== */
const S = {
  stage:'kana', mode:'browse', deck:[], idx:0, flipped:false, playing:true, done:false,
  timer:null, fbTimer:null, q:null, answered:false, session:{n:0, ok:0}, lastId:null,
  banner:false, confirmUnlock:false, confirmReset:false
};

const $ = (s, r) => (r || document).querySelector(s);
function esc(s){ return String(s).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function shuffle(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
function cardsOf(stage){ return CARDS.filter(c => c.stage === stage); }
function pool(){ return cardsOf(S.stage).filter(c => store.sel[S.stage][c.group]); }
function streak(c){ const s = store.stats[c.id]; return s ? s.s : 0; }
function isMastered(c){ return streak(c) >= MASTER; }
function groupName(c){ return GROUPS[c.stage].find(g => g.id === c.group).name; }
function gate(){
  const cs = cardsOf('kana').filter(c => c.group !== 'yoon');
  return {m: cs.filter(isMastered).length, t: cs.length};
}
const canSpeak = 'speechSynthesis' in window;

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
function lockedWord(){ return S.stage === 'word' && !store.unlocked; }

function renderTop(){
  const locked = lockedWord();
  document.querySelectorAll('.stage').forEach(b => b.setAttribute('aria-selected', b.dataset.s === S.stage));
  $('#lockTag').hidden = store.unlocked;
  $('#modes').hidden = locked;
  $('#ranges').hidden = locked;
  $('#progress').hidden = locked;
  document.querySelectorAll('#modes button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === S.mode));

  $('#ranges').innerHTML = GROUPS[S.stage].map(g => {
    const cs = cardsOf(S.stage).filter(c => c.group === g.id);
    const m = cs.filter(isMastered).length;
    return '<button class="chip" data-act="group" data-g="'+g.id+'" aria-pressed="'+(!!store.sel[S.stage][g.id])+'">'+esc(g.name)+' <small>'+m+'/'+cs.length+'</small></button>';
  }).join('');

  if (!locked){
    const p = pool();
    const m = p.filter(isMastered).length;
    const pct = p.length ? m / p.length * 100 : 0;
    const sub = m === p.length && p.length ? '선택한 범위를 모두 마스터했어요. 복습 중이에요.' : '연속 '+MASTER+'번 맞히면 마스터';
    $('#progress').innerHTML =
      '<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+p.length+'" aria-valuenow="'+m+'"><span style="width:'+pct+'%"></span></div>' +
      '<p><span><b>'+m+'</b> / '+p.length+' 마스터</span><span class="sub">'+sub+(S.session.n ? ' · 이번 방문 '+S.session.ok+'/'+S.session.n : '')+'</span></p>';
  }

  $('#banner').innerHTML = S.banner
    ? '<div class="banner" role="status"><div><strong>히라가나를 마스터했어요</strong>2단계 단어가 열렸습니다.</div><div class="row"><button class="btn primary" data-act="togo">단어 시작</button><button class="btn quiet" data-act="closebanner">닫기</button></div></div>'
    : '';

  $('#hint').innerHTML = locked ? '' : (S.mode === 'browse'
    ? '<span>스페이스: 자동 재생 켜기/끄기</span><span>← →: 이동</span><span>Enter: 뒤집기</span>'
    : '<span>1–4: 보기 선택</span><span>Enter: 다음 문제</span>');
  $('#resetBtn').textContent = S.confirmReset ? '한 번 더 누르면 모든 기록이 지워져요' : '진행 상황 지우기';
}

/* ========== 본문 ========== */
function renderMain(){
  clearTimeout(S.timer);
  if (lockedWord()){ $('#main').innerHTML = lockHTML(); return; }
  if (S.mode === 'browse') renderBrowse(); else renderQuiz();
}

function lockHTML(){
  const rows = ['basic','dakuten'].map(g => {
    const cs = cardsOf('kana').filter(c => c.group === g);
    const m = cs.filter(isMastered).length;
    const name = KANA_GROUPS.find(x => x.id === g).name;
    return '<div class="gate-row"><span>'+name+'</span><div class="bar"><span style="width:'+(m/cs.length*100)+'%"></span></div><b>'+m+' / '+cs.length+'</b></div>';
  }).join('');
  return '<div class="panel"><h2>단어는 히라가나를 마스터하면 열려요</h2>' +
    '<p>기본과 탁음·반탁음 글자를 각각 연속 '+MASTER+'번 맞히면 마스터로 계산해요.</p>' + rows +
    '<div class="row"><button class="btn primary" data-act="learn">히라가나 퀴즈로 가기</button>' +
    '<button class="btn quiet" data-act="unlock">'+(S.confirmUnlock ? '정말 열까요? 한 번 더 누르세요' : '이미 알고 있어요. 바로 열기')+'</button></div></div>';
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
  if (S.mode !== 'browse' || !S.playing || S.done || document.hidden || lockedWord()) return;
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
  if (!store.unlocked && S.stage === 'kana'){
    const g = gate();
    if (g.m >= g.t){ store.unlocked = true; S.banner = true; }
  }
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
  resetView();
  S.stage = st; S.mode = 'browse'; S.playing = true; S.confirmUnlock = false;
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
  if (!t) return;
  const act = t.dataset.act;
  if (act !== 'unlock') S.confirmUnlock = false;
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
    case 'closebanner': S.banner = false; renderTop(); break;
    case 'togo': S.banner = false; setStage('word'); break;
    case 'learn':
      store.sel.kana.basic = true; store.sel.kana.dakuten = true; save();
      resetView(); S.stage = 'kana'; S.mode = 'quiz'; renderTop(); newQuestion();
      break;
    case 'unlock':
      if (!S.confirmUnlock){ S.confirmUnlock = true; renderMain(); }
      else { store.unlocked = true; save(); S.confirmUnlock = false; setStage('word'); }
      break;
    case 'reset':
      if (!S.confirmReset){ S.confirmReset = true; renderTop(); }
      else {
        store.stats = {}; store.unlocked = false; S.session = {n:0, ok:0}; S.banner = false; S.confirmReset = false;
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
  if (e.metaKey || e.ctrlKey || e.altKey || lockedWord()) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT') return;
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