const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const SAVE_KEY = "crimsonIvyFullSaveV1";
const TILE = 32;
const canvas = $("#game-canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const starters = [
  {
    id: "leaflet",
    name: "Leaflet",
    type: "Grass",
    level: 5,
    maxHp: 22,
    moves: [
      { name: "Tackle", power: 5, accuracy: 100 },
      { name: "Leaf Flick", power: 7, accuracy: 95 }
    ],
    description: "A calm sprout Pokémon that protects smaller creatures."
  },
  {
    id: "embercub",
    name: "Embercub",
    type: "Fire",
    level: 5,
    maxHp: 21,
    moves: [
      { name: "Scratch", power: 5, accuracy: 100 },
      { name: "Cinder Pop", power: 7, accuracy: 95 }
    ],
    description: "A brave cub Pokémon whose tail glows when it is excited."
  },
  {
    id: "bubblit",
    name: "Bubblit",
    type: "Water",
    level: 5,
    maxHp: 23,
    moves: [
      { name: "Bump", power: 5, accuracy: 100 },
      { name: "Bubble Burst", power: 7, accuracy: 95 }
    ],
    description: "A playful water Pokémon that hides inside giant bubbles."
  }
];

const wildPokemon = [
  {
    id: "mossbit",
    name: "Mossbit",
    type: "Grass",
    minLevel: 2,
    maxLevel: 4,
    maxHp: 16,
    moves: [{ name: "Nibble", power: 4, accuracy: 100 }]
  },
  {
    id: "sormo",
    name: "Sormo",
    type: "Electric",
    minLevel: 3,
    maxLevel: 5,
    maxHp: 18,
    moves: [{ name: "Static Tap", power: 5, accuracy: 95 }]
  },
  {
    id: "flutterfin",
    name: "Flutterfin",
    type: "Water",
    minLevel: 2,
    maxLevel: 4,
    maxHp: 17,
    moves: [{ name: "Fin Slap", power: 4, accuracy: 100 }]
  }
];

const maps = {
  ivyTown: {
    name: "Ivy Town",
    rows: [
      "####################",
      "#....TT......TT....#",
      "#....TT......TT....#",
      "#..................#",
      "#..######..........#",
      "#..#CCCC#..........#",
      "#..#CCCC#.....####.#",
      "#..######......MM#.#",
      "#..............MM#.#",
      "#..............###.#",
      "#..................#",
      "#....gggg..........#",
      "#....gggg.........E#",
      "#..................#",
      "####################"
    ],
    start: { x: 3, y: 12 },
    objects: [
      { x: 5, y: 7, type: "center", name: "Pokémon Center" },
      { x: 16, y: 9, type: "mart", name: "Poké Mart" },
      { x: 10, y: 3, type: "professor", name: "Professor Ivy" },
      { x: 18, y: 12, type: "routeExit", name: "Route 1" }
    ]
  },
  route1: {
    name: "Route 1",
    rows: [
      "####################",
      "#gggg....TT.....ggg#",
      "#gggg....TT.....ggg#",
      "#...............ggg#",
      "#..~~~~............#",
      "#..~~~~....TT.......#",
      "#..........TT.......#",
      "#..gggg.............#",
      "#..gggg.....gggg....#",
      "#...........gggg....#",
      "#....TT.............#",
      "#....TT.....gggg....#",
      "#E..........gggg...X#",
      "#..................#",
      "####################"
    ],
    start: { x: 1, y: 12 },
    objects: [
      { x: 1, y: 12, type: "townExit", name: "Ivy Town" },
      { x: 18, y: 12, type: "routeEnd", name: "Old Gate" },
      { x: 9, y: 7, type: "trainer", name: "Scout Nia" }
    ]
  }
};

const freshState = () => ({
  player: {
    name: "Trainer",
    map: "ivyTown",
    x: 3,
    y: 12,
    direction: "up",
    money: 3000,
    party: [],
    bag: { "Potion": 3, "Poké Ball": 5 }
  },
  story: {
    stage: 0,
    objective: "Meet Professor Ivy in Ivy Town.",
    starterChosen: false,
    firstCatchDone: false,
    routeTrainerDefeated: false
  },
  pokedex: {
    seen: [],
    caught: []
  },
  quests: [
    {
      id: "first_steps",
      title: "First Steps",
      detail: "Meet Professor Ivy and choose your first Pokémon.",
      done: false
    },
    {
      id: "first_catch",
      title: "Your First Catch",
      detail: "Catch a wild Pokémon on Route 1.",
      done: false
    },
    {
      id: "old_gate",
      title: "The Locked Old Gate",
      detail: "Reach the far end of Route 1.",
      done: false
    }
  ]
});

let state = freshState();
let inputLocked = true;
let dialogueQueue = [];
let battle = null;
let infoReturn = "game";

function showScreen(id) {
  $$(".screen").forEach(screen => screen.classList.remove("active"));
  $(id).classList.add("active");
}

function hasSave() {
  return Boolean(localStorage.getItem(SAVE_KEY));
}

function updateContinueButton() {
  $("#continue-btn").disabled = !hasSave();
  $("#save-status").textContent = hasSave()
    ? "A saved adventure was found."
    : "No saved adventure yet.";
}

function saveGame(showNotice = true) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    updateContinueButton();
    if (showNotice) showDialogue([{ name: "System", text: "Your adventure was saved." }]);
    return true;
  } catch (error) {
    console.error(error);
    if (showNotice) showDialogue([{ name: "System", text: "The game could not save on this browser." }]);
    return false;
  }
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return false;
  try {
    state = JSON.parse(raw);
    normalizeState();
    enterGame();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function normalizeState() {
  state.player.party ||= [];
  state.player.bag ||= { "Potion": 3, "Poké Ball": 5 };
  state.story ||= freshState().story;
  state.pokedex ||= { seen: [], caught: [] };
  state.quests ||= freshState().quests;
}

function newGame() {
  state = freshState();
  $("#player-name").value = "";
  showScreen("#setup-screen");
}

function confirmName() {
  const name = $("#player-name").value.trim() || "Trainer";
  state.player.name = name.slice(0, 12);
  buildStarterCards();
  showScreen("#starter-screen");
}

function buildStarterCards() {
  const grid = $("#starter-grid");
  grid.innerHTML = "";
  starters.forEach(starter => {
    const card = document.createElement("button");
    card.className = "starter-card";
    card.innerHTML = `
      <div class="starter-icon type-${starter.type.toLowerCase()}"></div>
      <div>
        <strong>${starter.name}</strong><br>
        <small>${starter.type} type</small>
        <p>${starter.description}</p>
      </div>
    `;
    card.addEventListener("click", () => chooseStarter(starter));
    grid.appendChild(card);
  });
}

function chooseStarter(starter) {
  const mon = createPokemon(starter, starter.level);
  state.player.party = [mon];
  addSeen(mon.name);
  addCaught(mon.name);
  state.story.starterChosen = true;
  state.story.stage = 1;
  state.story.objective = "Speak with Professor Ivy, then visit Route 1.";
  state.quests.find(q => q.id === "first_steps").done = true;
  state.player.map = "ivyTown";
  state.player.x = 3;
  state.player.y = 12;
  state.player.direction = "up";
  saveGame(false);
  enterGame();

  showDialogue([
    { name: "Professor Ivy", text: `${mon.name} chose you too! Take these five Poké Balls.` },
    { name: "Professor Ivy", text: "Travel east to Route 1. Catch a wild Pokémon and investigate the locked Old Gate." },
    { name: "System", text: "Main mission started: The Locked Old Gate." }
  ]);
}

function enterGame() {
  showScreen("#game-screen");
  inputLocked = false;
  updateHud();
  render();
}

function currentMap() {
  return maps[state.player.map];
}

function updateHud() {
  $("#area-name").textContent = currentMap().name;
  $("#objective-text").textContent = state.story.objective;
}

function tileAt(x, y) {
  const rows = currentMap().rows;
  if (y < 0 || y >= rows.length || x < 0 || x >= rows[0].length) return "#";
  return rows[y][x];
}

function objectAt(x, y) {
  return currentMap().objects.find(obj => obj.x === x && obj.y === y);
}

function isSolidObject(obj) {
  return obj && ["center", "mart", "professor", "trainer", "routeEnd"].includes(obj.type);
}

function isWalkable(x, y) {
  const tile = tileAt(x, y);
  if (["#", "~", "T", "C", "M"].includes(tile)) return false;
  const obj = objectAt(x, y);
  return !isSolidObject(obj);
}

function move(dx, dy, direction) {
  if (inputLocked || battle) return;
  state.player.direction = direction;
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;
  if (!isWalkable(nx, ny)) {
    render();
    return;
  }

  state.player.x = nx;
  state.player.y = ny;
  handleStep();
  render();
}

function handleStep() {
  const obj = objectAt(state.player.x, state.player.y);
  if (obj?.type === "routeExit") {
    changeMap("route1", 2, 12, "right");
    return;
  }
  if (obj?.type === "townExit") {
    changeMap("ivyTown", 17, 12, "left");
    return;
  }

  const tile = tileAt(state.player.x, state.player.y);
  if (tile === "g" && state.player.map === "route1" && Math.random() < 0.2) {
    startWildBattle();
  }

  updateHud();
  saveGame(false);
}

function changeMap(mapId, x, y, direction) {
  state.player.map = mapId;
  state.player.x = x;
  state.player.y = y;
  state.player.direction = direction;
  updateHud();
  render();

  if (mapId === "route1" && state.story.stage < 2) {
    state.story.stage = 2;
    state.story.objective = "Catch a wild Pokémon and reach the Old Gate.";
    showDialogue([
      { name: "System", text: "You entered Route 1." },
      { name: "Professor Ivy", text: "Walk through tall grass to find wild Pokémon. Weaken one before throwing a Poké Ball." }
    ]);
  }
}

function facingPosition() {
  const d = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
  }[state.player.direction];
  return { x: state.player.x + d[0], y: state.player.y + d[1] };
}

function interact() {
  if (inputLocked || battle) return;
  const pos = facingPosition();
  const obj = objectAt(pos.x, pos.y);

  if (!obj) {
    showDialogue([{ name: "", text: "There is nothing to interact with here." }]);
    return;
  }

  if (obj.type === "professor") {
    showDialogue([
      { name: "Professor Ivy", text: `Hello, ${state.player.name}! Your journey is only beginning.` },
      { name: "Professor Ivy", text: "The Old Gate on Route 1 has started glowing with crimson vines. Find out why." }
    ]);
  }

  if (obj.type === "center") {
    state.player.party.forEach(mon => mon.hp = mon.maxHp);
    showDialogue([{ name: "Nurse", text: "Your Pokémon are fully healed!" }]);
    saveGame(false);
  }

  if (obj.type === "mart") {
    openMart();
  }

  if (obj.type === "trainer") {
    if (state.story.routeTrainerDefeated) {
      showDialogue([{ name: "Scout Nia", text: "You battled really well! The Old Gate is just ahead." }]);
    } else {
      startTrainerBattle();
    }
  }

  if (obj.type === "routeEnd") {
    if (!state.story.firstCatchDone) {
      showDialogue([{ name: "System", text: "The gate will not open yet. Professor Ivy asked you to catch a wild Pokémon first." }]);
    } else {
      state.quests.find(q => q.id === "old_gate").done = true;
      state.story.stage = 4;
      state.story.objective = "Return to Professor Ivy with news of the glowing gate.";
      showDialogue([
        { name: "System", text: "The Old Gate is covered in crimson ivy." },
        { name: "???", text: "A strange cry echoes from beyond the gate..." },
        { name: "System", text: "Chapter 1 complete: The Locked Old Gate." },
        { name: "System", text: "More story areas can be added in the next update." }
      ]);
      saveGame(false);
    }
  }
}

function showDialogue(lines) {
  dialogueQueue = [...lines];
  inputLocked = true;
  $("#dialogue-box").classList.remove("hidden");
  advanceDialogue();
}

function advanceDialogue() {
  if (!dialogueQueue.length) {
    $("#dialogue-box").classList.add("hidden");
    inputLocked = false;
    return;
  }
  const line = dialogueQueue.shift();
  $("#dialogue-name").textContent = line.name || "";
  $("#dialogue-text").textContent = line.text;
}

function showChoice(text, options) {
  inputLocked = true;
  $("#choice-text").textContent = text;
  const wrap = $("#choice-buttons");
  wrap.innerHTML = "";
  options.forEach(option => {
    const btn = document.createElement("button");
    btn.textContent = option.label;
    btn.addEventListener("click", () => {
      $("#choice-box").classList.add("hidden");
      inputLocked = false;
      option.action();
    });
    wrap.appendChild(btn);
  });
  $("#choice-box").classList.remove("hidden");
}

function openPhone() {
  if (inputLocked || battle) return;
  inputLocked = true;
  $("#phone-menu").classList.remove("hidden");
}

function closePhone() {
  $("#phone-menu").classList.add("hidden");
  inputLocked = false;
}

function openInfo(title, html, returnTo = "phone") {
  infoReturn = returnTo;
  $("#phone-menu").classList.add("hidden");
  $("#info-title").textContent = title;
  $("#info-content").innerHTML = html;
  $("#info-panel").classList.remove("hidden");
}

function closeInfo() {
  $("#info-panel").classList.add("hidden");
  if (infoReturn === "phone") {
    $("#phone-menu").classList.remove("hidden");
  } else {
    inputLocked = false;
  }
}

function phoneAction(action) {
  if (action === "party") {
    openInfo("Party", state.player.party.map(mon => `
      <div class="info-item">
        <strong>${mon.name}</strong> — Lv. ${mon.level}<br>
        ${mon.type} type<br>
        HP: ${mon.hp}/${mon.maxHp}
      </div>
    `).join(""));
  }

  if (action === "bag") {
    openInfo("Bag", Object.entries(state.player.bag).map(([item, count]) => `
      <div class="info-item"><strong>${item}</strong> × ${count}</div>
    `).join(""));
  }

  if (action === "pokedex") {
    openInfo("Crimson Pokédex", `
      <div class="info-item"><strong>Seen:</strong> ${state.pokedex.seen.length}</div>
      <div class="info-item"><strong>Caught:</strong> ${state.pokedex.caught.length}</div>
      ${state.pokedex.seen.map(name => `
        <div class="info-item">${name} ${state.pokedex.caught.includes(name) ? "<span class='good'>Caught</span>" : "Seen"}</div>
      `).join("")}
    `);
  }

  if (action === "quests") {
    openInfo("Quest Log", state.quests.map(q => `
      <div class="info-item">
        <strong>${q.done ? "✓" : "○"} ${q.title}</strong><br>
        ${q.detail}
      </div>
    `).join(""));
  }

  if (action === "save") {
    saveGame(false);
    openInfo("Save", `<div class="info-item good">Your adventure was saved.</div>`);
  }

  if (action === "title") {
    saveGame(false);
    $("#phone-menu").classList.add("hidden");
    inputLocked = true;
    showScreen("#title-screen");
    updateContinueButton();
  }
}

function openMart() {
  inputLocked = true;
  openInfo("Poké Mart", `
    <div class="info-item">Money: ₽${state.player.money}</div>
    <div class="info-item">Potion — ₽300</div>
    <div class="info-item">Poké Ball — ₽200</div>
    <button id="buy-potion">Buy Potion</button>
    <button id="buy-ball">Buy Poké Ball</button>
  `, "game");

  setTimeout(() => {
    $("#buy-potion")?.addEventListener("click", () => buyItem("Potion", 300));
    $("#buy-ball")?.addEventListener("click", () => buyItem("Poké Ball", 200));
  }, 0);
}

function buyItem(item, price) {
  if (state.player.money < price) {
    alert("You do not have enough money.");
    return;
  }
  state.player.money -= price;
  state.player.bag[item] = (state.player.bag[item] || 0) + 1;
  saveGame(false);
  openMart();
}

function createPokemon(base, level) {
  const maxHp = base.maxHp + Math.max(0, level - 2) * 2;
  return {
    id: base.id,
    name: base.name,
    type: base.type,
    level,
    maxHp,
    hp: maxHp,
    exp: 0,
    moves: base.moves.map(move => ({ ...move }))
  };
}

function randomWildPokemon() {
  const base = wildPokemon[Math.floor(Math.random() * wildPokemon.length)];
  const level = base.minLevel + Math.floor(Math.random() * (base.maxLevel - base.minLevel + 1));
  return createPokemon(base, level);
}

function addSeen(name) {
  if (!state.pokedex.seen.includes(name)) state.pokedex.seen.push(name);
}

function addCaught(name) {
  addSeen(name);
  if (!state.pokedex.caught.includes(name)) state.pokedex.caught.push(name);
}

function startWildBattle() {
  const enemy = randomWildPokemon();
  battle = {
    kind: "wild",
    enemy,
    activeIndex: 0,
    busy: false
  };
  addSeen(enemy.name);
  openBattle(`A wild ${enemy.name} appeared!`);
}

function startTrainerBattle() {
  const enemy = createPokemon({
    id: "sparrowl",
    name: "Sparrowl",
    type: "Electric",
    maxHp: 20,
    moves: [{ name: "Spark Peck", power: 6, accuracy: 95 }]
  }, 5);

  battle = {
    kind: "trainer",
    trainerName: "Scout Nia",
    enemy,
    activeIndex: 0,
    busy: false
  };
  addSeen(enemy.name);
  openBattle("Scout Nia sent out Sparrowl!");
}

function activePokemon() {
  return state.player.party[battle.activeIndex];
}

function openBattle(message) {
  inputLocked = true;
  $("#battle-screen").classList.remove("hidden");
  $("#battle-menu").classList.remove("hidden");
  $("#move-menu").classList.add("hidden");
  $("#battle-bag").classList.add("hidden");
  $("#battle-message").textContent = message;
  updateBattleUI();
}

function updateBattleUI() {
  if (!battle) return;
  const enemy = battle.enemy;
  const active = activePokemon();

  $("#enemy-name").textContent = enemy.name;
  $("#enemy-level").textContent = `Lv. ${enemy.level}`;
  $("#active-name").textContent = active.name;
  $("#active-level").textContent = `Lv. ${active.level}`;
  $("#active-hp-text").textContent = `${active.hp}/${active.maxHp} HP`;

  $("#enemy-hp-fill").style.width = `${Math.max(0, enemy.hp / enemy.maxHp * 100)}%`;
  $("#active-hp-fill").style.width = `${Math.max(0, active.hp / active.maxHp * 100)}%`;

  $("#enemy-sprite").className = `battle-sprite enemy-sprite type-${enemy.type.toLowerCase()}`;
  $("#player-sprite").className = `battle-sprite player-sprite type-${active.type.toLowerCase()}`;
}

function battleAction(action) {
  if (!battle || battle.busy) return;

  if (action === "fight") {
    showMoves();
  }

  if (action === "bag") {
    showBattleBag();
  }

  if (action === "party") {
    $("#battle-message").textContent = "Switching Pokémon will be added in a later update.";
  }

  if (action === "run") {
    if (battle.kind === "trainer") {
      $("#battle-message").textContent = "You cannot run from a Trainer battle!";
    } else if (Math.random() < 0.8) {
      endBattle("You got away safely.");
    } else {
      enemyTurn("You could not escape!");
    }
  }
}

function showMoves() {
  const menu = $("#move-menu");
  menu.innerHTML = "";
  activePokemon().moves.forEach(move => {
    const btn = document.createElement("button");
    btn.textContent = move.name;
    btn.addEventListener("click", () => useMove(move));
    menu.appendChild(btn);
  });
  $("#battle-menu").classList.add("hidden");
  menu.classList.remove("hidden");
}

function showBattleBag() {
  const menu = $("#battle-bag");
  menu.innerHTML = "";

  const ballBtn = document.createElement("button");
  ballBtn.textContent = `Poké Ball × ${state.player.bag["Poké Ball"] || 0}`;
  ballBtn.addEventListener("click", throwBall);

  const potionBtn = document.createElement("button");
  potionBtn.textContent = `Potion × ${state.player.bag["Potion"] || 0}`;
  potionBtn.addEventListener("click", usePotion);

  const backBtn = document.createElement("button");
  backBtn.textContent = "Back";
  backBtn.addEventListener("click", () => {
    menu.classList.add("hidden");
    $("#battle-menu").classList.remove("hidden");
  });

  menu.append(ballBtn, potionBtn, backBtn);
  $("#battle-menu").classList.add("hidden");
  menu.classList.remove("hidden");
}

function useMove(move) {
  if (!battle) return;
  battle.busy = true;
  $("#move-menu").classList.add("hidden");

  const hit = Math.random() * 100 <= move.accuracy;
  if (!hit) {
    $("#battle-message").textContent = `${activePokemon().name}'s attack missed!`;
    setTimeout(() => enemyTurn(), 700);
    return;
  }

  const damage = move.power + Math.floor(Math.random() * 3);
  battle.enemy.hp = Math.max(0, battle.enemy.hp - damage);
  $("#battle-message").textContent = `${activePokemon().name} used ${move.name}!`;
  updateBattleUI();

  if (battle.enemy.hp <= 0) {
    setTimeout(winBattle, 700);
  } else {
    setTimeout(() => enemyTurn(), 700);
  }
}

function enemyTurn(prefix = "") {
  if (!battle) return;
  const move = battle.enemy.moves[0];
  const active = activePokemon();
  const damage = move.power + Math.floor(Math.random() * 3);
  active.hp = Math.max(0, active.hp - damage);
  $("#battle-message").textContent = `${prefix ? prefix + " " : ""}${battle.enemy.name} used ${move.name}!`;
  updateBattleUI();

  if (active.hp <= 0) {
    setTimeout(loseBattle, 800);
  } else {
    setTimeout(() => {
      battle.busy = false;
      $("#battle-menu").classList.remove("hidden");
      $("#battle-bag").classList.add("hidden");
      $("#battle-message").textContent = "What will you do?";
    }, 700);
  }
}

function usePotion() {
  const count = state.player.bag["Potion"] || 0;
  if (count <= 0) {
    $("#battle-message").textContent = "You have no Potions.";
    return;
  }

  const active = activePokemon();
  if (active.hp >= active.maxHp) {
    $("#battle-message").textContent = `${active.name} already has full HP.`;
    return;
  }

  state.player.bag["Potion"] -= 1;
  active.hp = Math.min(active.maxHp, active.hp + 20);
  $("#battle-message").textContent = `${active.name} recovered HP!`;
  updateBattleUI();
  battle.busy = true;
  $("#battle-bag").classList.add("hidden");
  setTimeout(() => enemyTurn(), 700);
}

function throwBall() {
  if (battle.kind !== "wild") {
    $("#battle-message").textContent = "You cannot catch another Trainer's Pokémon!";
    return;
  }

  const count = state.player.bag["Poké Ball"] || 0;
  if (count <= 0) {
    $("#battle-message").textContent = "You have no Poké Balls.";
    return;
  }

  state.player.bag["Poké Ball"] -= 1;
  battle.busy = true;
  $("#battle-bag").classList.add("hidden");
  $("#battle-message").textContent = "You threw a Poké Ball!";

  const hpRatio = battle.enemy.hp / battle.enemy.maxHp;
  const catchChance = Math.min(0.9, 0.35 + (1 - hpRatio) * 0.65);

  setTimeout(() => {
    if (Math.random() < catchChance) {
      const caught = { ...battle.enemy, moves: battle.enemy.moves.map(m => ({ ...m })) };
      if (state.player.party.length < 6) {
        state.player.party.push(caught);
      }
      addCaught(caught.name);
      state.story.firstCatchDone = true;
      state.story.stage = Math.max(state.story.stage, 3);
      state.story.objective = "Reach the Old Gate at the end of Route 1.";
      state.quests.find(q => q.id === "first_catch").done = true;
      endBattle(`Gotcha! ${caught.name} was caught!`);
      saveGame(false);
    } else {
      $("#battle-message").textContent = `${battle.enemy.name} broke free!`;
      setTimeout(() => enemyTurn(), 700);
    }
  }, 900);
}

function winBattle() {
  const reward = battle.kind === "trainer" ? 500 : 0;
  if (battle.kind === "trainer") {
    state.player.money += reward;
    state.story.routeTrainerDefeated = true;
  }

  const message = battle.kind === "trainer"
    ? `You defeated Scout Nia and received ₽${reward}!`
    : `Wild ${battle.enemy.name} fainted!`;

  endBattle(message);
  saveGame(false);
}

function loseBattle() {
  state.player.party.forEach(mon => mon.hp = mon.maxHp);
  state.player.map = "ivyTown";
  state.player.x = 6;
  state.player.y = 8;
  state.player.direction = "down";
  endBattle("You hurried back to the Pokémon Center.");
  saveGame(false);
}

function endBattle(message) {
  $("#battle-message").textContent = message;
  setTimeout(() => {
    battle = null;
    $("#battle-screen").classList.add("hidden");
    $("#battle-menu").classList.remove("hidden");
    $("#move-menu").classList.add("hidden");
    $("#battle-bag").classList.add("hidden");
    inputLocked = false;
    updateHud();
    render();
  }, 1100);
}

function drawTile(tile, x, y) {
  const px = x * TILE;
  const py = y * TILE;

  if (tile === "#") {
    ctx.fillStyle = "#315c3a";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#4c8d50";
    ctx.fillRect(px + 4, py + 4, 24, 24);
    return;
  }

  if (tile === "g") {
    ctx.fillStyle = "#78c96b";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#3e9146";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px + 5 + i * 7, py + 18 - (i % 2) * 4, 2, 10);
    }
    return;
  }

  if (tile === "~") {
    ctx.fillStyle = "#4594c5";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = "#a8dbef";
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 9);
    ctx.lineTo(px + 14, py + 9);
    ctx.moveTo(px + 16, py + 22);
    ctx.lineTo(px + 29, py + 22);
    ctx.stroke();
    return;
  }

  if (tile === "T") {
    ctx.fillStyle = "#71b867";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#285132";
    ctx.fillRect(px + 13, py + 14, 6, 18);
    ctx.beginPath();
    ctx.arc(px + 16, py + 11, 12, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.fillStyle = "#b5d989";
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = "#a7ce7c";
  ctx.fillRect(px, py, TILE, 2);
  ctx.fillRect(px, py, 2, TILE);
}

function drawBuilding(obj) {
  const px = obj.x * TILE;
  const py = obj.y * TILE;

  if (obj.type === "center") {
    ctx.fillStyle = "#eee7db";
    ctx.fillRect(px - 64, py - 64, 128, 64);
    ctx.fillStyle = "#c82f5b";
    ctx.fillRect(px - 64, py - 64, 128, 20);
    ctx.fillStyle = "#5d3049";
    ctx.fillRect(px - 12, py - 28, 24, 28);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px - 8, py - 58, 16, 16);
    ctx.fillStyle = "#c82f5b";
    ctx.fillRect(px - 2, py - 61, 4, 22);
    ctx.fillRect(px - 11, py - 52, 22, 4);
  }

  if (obj.type === "mart") {
    ctx.fillStyle = "#eee7db";
    ctx.fillRect(px - 32, py - 64, 96, 64);
    ctx.fillStyle = "#3978b7";
    ctx.fillRect(px - 32, py - 64, 96, 20);
    ctx.fillStyle = "#324c68";
    ctx.fillRect(px - 10, py - 28, 20, 28);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px monospace";
    ctx.fillText("MART", px + 8, py - 47);
  }
}

function drawNPC(obj) {
  const px = obj.x * TILE + 16;
  const py = obj.y * TILE + 16;

  ctx.fillStyle = obj.type === "trainer" ? "#f0c04c" : "#734e83";
  ctx.fillRect(px - 8, py - 1, 16, 17);
  ctx.fillStyle = "#f0c39c";
  ctx.fillRect(px - 7, py - 13, 14, 12);
  ctx.fillStyle = "#2c2333";
  ctx.fillRect(px - 8, py + 16, 6, 9);
  ctx.fillRect(px + 2, py + 16, 6, 9);
}

function drawExit(obj) {
  const px = obj.x * TILE;
  const py = obj.y * TILE;
  ctx.fillStyle = obj.type === "routeEnd" ? "#8e3550" : "#e5cc4a";
  ctx.fillRect(px + 9, py + 2, 14, 28);
}

function drawPlayer() {
  const px = state.player.x * TILE + 16;
  const py = state.player.y * TILE + 16;

  ctx.fillStyle = "#f0c39c";
  ctx.fillRect(px - 7, py - 13, 14, 12);
  ctx.fillStyle = "#c82f5b";
  ctx.fillRect(px - 8, py - 1, 16, 17);
  ctx.fillStyle = "#2d2436";
  ctx.fillRect(px - 8, py + 16, 6, 9);
  ctx.fillRect(px + 2, py + 16, 6, 9);

  ctx.fillStyle = "#fff";
  if (state.player.direction === "left") ctx.fillRect(px - 7, py - 8, 3, 3);
  else if (state.player.direction === "right") ctx.fillRect(px + 4, py - 8, 3, 3);
  else {
    ctx.fillRect(px - 5, py - 8, 3, 3);
    ctx.fillRect(px + 2, py - 8, 3, 3);
  }
}

function render() {
  const map = currentMap();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  map.rows.forEach((row, y) => {
    [...row].forEach((tile, x) => drawTile(tile, x, y));
  });

  map.objects.forEach(obj => {
    if (["center", "mart"].includes(obj.type)) drawBuilding(obj);
    else if (["professor", "trainer"].includes(obj.type)) drawNPC(obj);
    else if (["routeExit", "townExit", "routeEnd"].includes(obj.type)) drawExit(obj);
  });

  drawPlayer();
}

$("#new-game-btn").addEventListener("click", newGame);
$("#continue-btn").addEventListener("click", loadGame);
$("#erase-btn").addEventListener("click", () => {
  showChoice("Erase the saved adventure?", [
    {
      label: "Erase",
      action: () => {
        localStorage.removeItem(SAVE_KEY);
        state = freshState();
        updateContinueButton();
        showScreen("#title-screen");
      }
    },
    { label: "Cancel", action: () => showScreen("#title-screen") }
  ]);
});

$("#confirm-name-btn").addEventListener("click", confirmName);
$("#player-name").addEventListener("keydown", event => {
  if (event.key === "Enter") confirmName();
});

$("#dialogue-next").addEventListener("click", advanceDialogue);
$("#phone-btn").addEventListener("click", openPhone);
$("#menu-btn").addEventListener("click", openPhone);
$("#close-phone").addEventListener("click", closePhone);
$("#close-info").addEventListener("click", closeInfo);
$("#action-btn").addEventListener("click", interact);

$$("[data-phone]").forEach(btn => btn.addEventListener("click", () => phoneAction(btn.dataset.phone)));
$$("[data-battle]").forEach(btn => btn.addEventListener("click", () => battleAction(btn.dataset.battle)));

$$("[data-dir]").forEach(btn => {
  btn.addEventListener("click", () => {
    const vectors = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    };
    move(...vectors[btn.dataset.dir], btn.dataset.dir);
  });
});

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if ($("#game-screen").classList.contains("active") && !battle) {
    if (["arrowup", "w"].includes(key)) move(0, -1, "up");
    if (["arrowdown", "s"].includes(key)) move(0, 1, "down");
    if (["arrowleft", "a"].includes(key)) move(-1, 0, "left");
    if (["arrowright", "d"].includes(key)) move(1, 0, "right");
    if ([" ", "enter"].includes(key)) interact();
    if (key === "m") openPhone();
  }
});

updateContinueButton();
showScreen("#title-screen");
