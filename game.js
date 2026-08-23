const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const TILE = 32;
const COLS = 20;
const ROWS = 15;

const map = [
  "####################",
  "#....gggggg........#",
  "#....gggggg..TT....#",
  "#............TT....#",
  "#..####............#",
  "#..#CC#.....~~~~...#",
  "#..#CC#.....~~~~...#",
  "#..####.....~~~~...#",
  "#.........######...#",
  "#.........#MMMM#...#",
  "#..gggg...#MMMM#...#",
  "#..gggg...######...#",
  "#.................E#",
  "#..................#",
  "####################"
];

const player = {
  x: 2,
  y: 12,
  direction: "down",
  name: "Trainer",
  money: 3000,
  party: [
    { name: "Leaflet", type: "Grass", level: 5, hp: 20, maxHp: 20 }
  ]
};

const gameState = {
  area: "Starter's Meadow",
  pokedex: {
    seen: ["Leaflet", "Sormo"],
    caught: ["Leaflet"]
  },
  bag: {
    "Potion": 3,
    "Poké Ball": 5,
    "Town Map": 1
  },
  quests: [
    { name: "First Steps", detail: "Visit Ivy Town.", done: false },
    { name: "A Shocking Trade", detail: "Find Sormo in Thunderout Peaks and trade it to Thunder.", done: false }
  ],
  flags: {
    introSeen: false,
    centerVisited: false,
    martVisited: false
  }
};

const objects = [
  { x: 4, y: 6, type: "center", name: "Pokémon Center" },
  { x: 12, y: 10, type: "mart", name: "Poké Mart" },
  { x: 18, y: 12, type: "exit", name: "Route 1" },
  { x: 7, y: 2, type: "npc", name: "Professor Ivy" }
];

let inputLocked = false;

function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return "#";
  return map[y][x];
}

function isWalkable(x, y) {
  const tile = tileAt(x, y);
  return tile !== "#" && tile !== "~" && tile !== "T";
}

function move(dx, dy, direction) {
  if (inputLocked) return;
  player.direction = direction;
  const nx = player.x + dx;
  const ny = player.y + dy;
  if (isWalkable(nx, ny)) {
    player.x = nx;
    player.y = ny;
    updateArea();
    render();
  }
}

function updateArea() {
  if (player.x >= 16) {
    gameState.area = "Route 1 Gate";
  } else if (player.x < 9) {
    gameState.area = "Starter's Meadow";
  } else {
    gameState.area = "Ivy Town";
  }
  document.getElementById("status").textContent = gameState.area;
}

function facingTile() {
  const offsets = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0]
  };
  const [dx, dy] = offsets[player.direction];
  return { x: player.x + dx, y: player.y + dy };
}

function interact() {
  if (inputLocked) return;
  const target = facingTile();
  const object = objects.find(o => o.x === target.x && o.y === target.y);
  if (!object) {
    showMessage("There is nothing to interact with here.");
    return;
  }

  if (object.type === "npc") {
    showMessage("Professor Ivy: Welcome to the Crimson Region! Your journey begins in Ivy Town.");
    gameState.flags.introSeen = true;
  } else if (object.type === "center") {
    player.party.forEach(p => p.hp = p.maxHp);
    gameState.flags.centerVisited = true;
    showMessage("Your Pokémon are fully healed! The Pokémon Center is always free.");
  } else if (object.type === "mart") {
    gameState.flags.martVisited = true;
    openMart();
  } else if (object.type === "exit") {
    gameState.quests[0].done = true;
    showMessage("Route 1 is still being built in this prototype. Quest updated!");
  }
}

function showMessage(text) {
  inputLocked = true;
  document.getElementById("message-text").textContent = text;
  document.getElementById("message-box").classList.remove("hidden");
}

function closeMessage() {
  document.getElementById("message-box").classList.add("hidden");
  inputLocked = false;
}

function openMainMenu() {
  if (inputLocked) return;
  inputLocked = true;
  document.getElementById("menu").classList.remove("hidden");
}

function closeMainMenu() {
  document.getElementById("menu").classList.add("hidden");
  inputLocked = false;
}

function openDetail(title, html) {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("detail-title").textContent = title;
  document.getElementById("detail-content").innerHTML = html;
  document.getElementById("detail-panel").classList.remove("hidden");
}

function closeDetail() {
  document.getElementById("detail-panel").classList.add("hidden");
  document.getElementById("menu").classList.remove("hidden");
}

function menuAction(type) {
  if (type === "pokedex") {
    openDetail("Crimson Pokédex", `
      <div class="list-card"><strong>Seen:</strong> ${gameState.pokedex.seen.length} / 200</div>
      <div class="list-card"><strong>Caught:</strong> ${gameState.pokedex.caught.length} / 200</div>
      ${gameState.pokedex.seen.map(name => `<div class="list-card">${name}${gameState.pokedex.caught.includes(name) ? " <span class='good'>Caught</span>" : " — Seen"}</div>`).join("")}
    `);
  } else if (type === "party") {
    openDetail("Party", player.party.map(p => `
      <div class="list-card">
        <strong>${p.name}</strong> — Lv. ${p.level}<br>
        Type: ${p.type}<br>
        HP: ${p.hp}/${p.maxHp}
      </div>
    `).join(""));
  } else if (type === "bag") {
    openDetail("Bag", Object.entries(gameState.bag).map(([name, amount]) =>
      `<div class="list-card"><strong>${name}</strong> × ${amount}</div>`
    ).join(""));
  } else if (type === "map") {
    openDetail("Region Map", `
      <div class="list-card"><strong>Current location:</strong> ${gameState.area}</div>
      <div class="list-card">Starter's Meadow → Ivy Town → Route 1</div>
      <div class="list-card">Fast Travel unlocks after visiting more towns.</div>
    `);
  } else if (type === "quests") {
    openDetail("Quest Log", gameState.quests.map(q => `
      <div class="list-card">
        <strong>${q.done ? "✓" : "○"} ${q.name}</strong><br>${q.detail}
      </div>
    `).join(""));
  } else if (type === "save") {
    saveGame();
    openDetail("Save", `<div class="list-card good">Game saved on this device.</div>`);
  }
}

function openMart() {
  inputLocked = true;
  openDetail("Poké Mart", `
    <div class="list-card">You have ₽${player.money}.</div>
    <div class="list-card">Potion — ₽300</div>
    <div class="list-card">Poké Ball — ₽200</div>
    <button id="buy-potion">Buy Potion</button>
    <button id="buy-ball">Buy Poké Ball</button>
  `);
  setTimeout(() => {
    document.getElementById("buy-potion")?.addEventListener("click", () => buyItem("Potion", 300));
    document.getElementById("buy-ball")?.addEventListener("click", () => buyItem("Poké Ball", 200));
  }, 0);
}

function buyItem(item, price) {
  if (player.money < price) {
    alert("Not enough money!");
    return;
  }
  player.money -= price;
  gameState.bag[item] = (gameState.bag[item] || 0) + 1;
  openMart();
}

function saveGame() {
  const save = { player, gameState };
  localStorage.setItem("crimsonIvySave", JSON.stringify(save));
}

function loadGame() {
  const raw = localStorage.getItem("crimsonIvySave");
  if (!raw) return;
  try {
    const save = JSON.parse(raw);
    Object.assign(player, save.player || {});
    Object.assign(gameState, save.gameState || {});
  } catch (error) {
    console.warn("Save data could not be loaded.", error);
  }
}

function drawTile(tile, x, y) {
  const px = x * TILE;
  const py = y * TILE;

  if (tile === "#") {
    ctx.fillStyle = "#315c3a";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#458a4d";
    ctx.fillRect(px + 4, py + 4, 24, 24);
  } else if (tile === "g") {
    ctx.fillStyle = "#7fcf6b";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#4b9d4f";
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(px + 5 + i * 7, py + 20 - (i % 2) * 5, 2, 8);
    }
  } else if (tile === "~") {
    ctx.fillStyle = "#4595c8";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = "#9dd8ef";
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 10);
    ctx.lineTo(px + 13, py + 10);
    ctx.moveTo(px + 16, py + 22);
    ctx.lineTo(px + 28, py + 22);
    ctx.stroke();
  } else if (tile === "T") {
    ctx.fillStyle = "#347447";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#204c2d";
    ctx.fillRect(px + 12, py + 14, 8, 18);
    ctx.beginPath();
    ctx.arc(px + 16, py + 12, 12, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#b3dc85";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#a4cf79";
    ctx.fillRect(px, py, TILE, 2);
    ctx.fillRect(px, py, 2, TILE);
  }
}

function drawBuilding(x, y, type) {
  const px = x * TILE;
  const py = y * TILE;

  if (type === "center") {
    ctx.fillStyle = "#e7e0d2";
    ctx.fillRect(px - 32, py - 32, 96, 96);
    ctx.fillStyle = "#cf315f";
    ctx.fillRect(px - 32, py - 32, 96, 24);
    ctx.fillStyle = "#62334b";
    ctx.fillRect(px, py + 24, 24, 40);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 4, py - 25, 16, 16);
    ctx.fillStyle = "#cf315f";
    ctx.fillRect(px + 10, py - 28, 4, 22);
    ctx.fillRect(px + 1, py - 19, 22, 4);
  } else if (type === "mart") {
    ctx.fillStyle = "#e7e0d2";
    ctx.fillRect(px - 32, py - 32, 128, 96);
    ctx.fillStyle = "#3975b8";
    ctx.fillRect(px - 32, py - 32, 128, 24);
    ctx.fillStyle = "#364d68";
    ctx.fillRect(px + 16, py + 24, 24, 40);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px monospace";
    ctx.fillText("MART", px - 4, py - 14);
  }
}

function drawNPC(x, y) {
  const px = x * TILE + 16;
  const py = y * TILE + 16;
  ctx.fillStyle = "#f2c5a0";
  ctx.fillRect(px - 7, py - 13, 14, 12);
  ctx.fillStyle = "#6b3d71";
  ctx.fillRect(px - 8, py - 1, 16, 16);
  ctx.fillStyle = "#e7e0d2";
  ctx.fillRect(px - 8, py + 15, 6, 10);
  ctx.fillRect(px + 2, py + 15, 6, 10);
}

function drawPlayer() {
  const px = player.x * TILE + 16;
  const py = player.y * TILE + 16;
  ctx.fillStyle = "#f1c49b";
  ctx.fillRect(px - 7, py - 14, 14, 12);
  ctx.fillStyle = "#cf315f";
  ctx.fillRect(px - 9, py - 2, 18, 17);
  ctx.fillStyle = "#2f2640";
  ctx.fillRect(px - 8, py + 15, 6, 9);
  ctx.fillRect(px + 2, py + 15, 6, 9);
  ctx.fillStyle = "#fff";
  const eyeX = player.direction === "left" ? px - 7 : player.direction === "right" ? px + 4 : px - 4;
  ctx.fillRect(eyeX, py - 9, 3, 3);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      drawTile(map[y][x], x, y);
    }
  }

  drawBuilding(4, 6, "center");
  drawBuilding(12, 10, "mart");
  drawNPC(7, 2);

  ctx.fillStyle = "#f7d34e";
  ctx.fillRect(18 * TILE + 10, 12 * TILE + 2, 12, 28);

  drawPlayer();
}

document.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();
  if (["arrowup", "w"].includes(key)) move(0, -1, "up");
  if (["arrowdown", "s"].includes(key)) move(0, 1, "down");
  if (["arrowleft", "a"].includes(key)) move(-1, 0, "left");
  if (["arrowright", "d"].includes(key)) move(1, 0, "right");
  if ([" ", "enter"].includes(key)) interact();
  if (key === "m") openMainMenu();
});

document.querySelectorAll("[data-dir]").forEach(button => {
  button.addEventListener("click", () => {
    const dir = button.dataset.dir;
    const vectors = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    };
    move(...vectors[dir], dir);
  });
});

document.getElementById("action-button").addEventListener("click", interact);
document.getElementById("menu-button").addEventListener("click", openMainMenu);
document.getElementById("message-next").addEventListener("click", closeMessage);
document.getElementById("close-menu").addEventListener("click", closeMainMenu);
document.getElementById("close-detail").addEventListener("click", closeDetail);

document.querySelectorAll("[data-menu]").forEach(button => {
  button.addEventListener("click", () => menuAction(button.dataset.menu));
});

loadGame();
updateArea();
render();

if (!gameState.flags.introSeen) {
  setTimeout(() => showMessage("Welcome to Crimson Ivy! Walk north and speak to Professor Ivy, then explore Ivy Town."), 300);
}
