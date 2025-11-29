// ===== Game State =====
const gameState = {
  energy: 0,
  particles: {
    electrons: 0,
    protons: 0,
    neutrons: 0
  },
  generators: {
    electrons: 0,
    protons: 0,
    neutrons: 0
  },
  elements: {},
  elementGenerators: {},
  totalClicks: 0,
  startTime: Date.now(),
  lastUpdate: Date.now()
};

// ===== Constants =====
const GENERATOR_CONFIG = {
  electrons: {
    baseCost: 10,
    baseRate: 1,
    costMultiplier: 1.15
  },
  protons: {
    baseCost: 10,
    baseRate: 1,
    costMultiplier: 1.15
  },
  neutrons: {
    baseCost: 10,
    baseRate: 1,
    costMultiplier: 1.15
  }
};

const PARTICLE_ENERGY_RATE = 0.1; // Energy per particle per second

// ===== Element Data =====
const ELEMENTS = [
  { symbol: "H", name: "水素", atomicNumber: 1, recipe: { protons: 1, electrons: 1, neutrons: 0, energy: 50 } },
  { symbol: "He", name: "ヘリウム", atomicNumber: 2, recipe: { protons: 2, electrons: 2, neutrons: 2, energy: 100 } },
  { symbol: "Li", name: "リチウム", atomicNumber: 3, recipe: { protons: 3, electrons: 3, neutrons: 4, energy: 200, H: 2 } },
  { symbol: "Be", name: "ベリリウム", atomicNumber: 4, recipe: { protons: 4, electrons: 4, neutrons: 5, energy: 350, He: 1 } },
  { symbol: "B", name: "ホウ素", atomicNumber: 5, recipe: { protons: 5, electrons: 5, neutrons: 6, energy: 550, Li: 1 } },
  { symbol: "C", name: "炭素", atomicNumber: 6, recipe: { protons: 6, electrons: 6, neutrons: 6, energy: 800, He: 2 } },
  { symbol: "N", name: "窒素", atomicNumber: 7, recipe: { protons: 7, electrons: 7, neutrons: 7, energy: 1200, C: 1 } },
  { symbol: "O", name: "酸素", atomicNumber: 8, recipe: { protons: 8, electrons: 8, neutrons: 8, energy: 1800, C: 1, He: 1 } },
  { symbol: "F", name: "フッ素", atomicNumber: 9, recipe: { protons: 9, electrons: 9, neutrons: 10, energy: 2800, O: 1 } },
  { symbol: "Ne", name: "ネオン", atomicNumber: 10, recipe: { protons: 10, electrons: 10, neutrons: 10, energy: 4200, He: 3 } },
  { symbol: "Na", name: "ナトリウム", atomicNumber: 11, recipe: { protons: 11, electrons: 11, neutrons: 12, energy: 6500, Ne: 1 } },
  { symbol: "Mg", name: "マグネシウム", atomicNumber: 12, recipe: { protons: 12, electrons: 12, neutrons: 12, energy: 10000, C: 2 } },
  { symbol: "Al", name: "アルミニウム", atomicNumber: 13, recipe: { protons: 13, electrons: 13, neutrons: 14, energy: 15000, Mg: 1 } },
  { symbol: "Si", name: "ケイ素", atomicNumber: 14, recipe: { protons: 14, electrons: 14, neutrons: 14, energy: 23000, C: 2, O: 1 } },
  { symbol: "P", name: "リン", atomicNumber: 15, recipe: { protons: 15, electrons: 15, neutrons: 16, energy: 35000, Si: 1 } },
  { symbol: "S", name: "硫黄", atomicNumber: 16, recipe: { protons: 16, electrons: 16, neutrons: 16, energy: 55000, O: 2 } },
  { symbol: "Cl", name: "塩素", atomicNumber: 17, recipe: { protons: 17, electrons: 17, neutrons: 18, energy: 85000, S: 1 } },
  { symbol: "Ar", name: "アルゴン", atomicNumber: 18, recipe: { protons: 18, electrons: 18, neutrons: 22, energy: 130000, Ne: 2 } },
  { symbol: "K", name: "カリウム", atomicNumber: 19, recipe: { protons: 19, electrons: 19, neutrons: 20, energy: 200000, Ar: 1 } },
  { symbol: "Ca", name: "カルシウム", atomicNumber: 20, recipe: { protons: 20, electrons: 20, neutrons: 20, energy: 300000, Mg: 2, O: 1 } },
  { symbol: "Sc", name: "スカンジウム", atomicNumber: 21, recipe: { protons: 21, electrons: 21, neutrons: 24, energy: 450000, Ca: 1, H: 1 } },
  { symbol: "Ti", name: "チタン", atomicNumber: 22, recipe: { protons: 22, electrons: 22, neutrons: 26, energy: 650000, Ca: 1, He: 1 } },
  { symbol: "V", name: "バナジウム", atomicNumber: 23, recipe: { protons: 23, electrons: 23, neutrons: 28, energy: 900000, Ti: 1, H: 1 } },
  { symbol: "Cr", name: "クロム", atomicNumber: 24, recipe: { protons: 24, electrons: 24, neutrons: 28, energy: 1200000, Ti: 1, He: 1 } },
  { symbol: "Mn", name: "マンガン", atomicNumber: 25, recipe: { protons: 25, electrons: 25, neutrons: 30, energy: 1600000, Cr: 1, H: 1 } },
  { symbol: "Fe", name: "鉄", atomicNumber: 26, recipe: { protons: 26, electrons: 26, neutrons: 30, energy: 2100000, Cr: 1, He: 1 } }
];

// ===== Utility Functions =====
function formatNumber(num) {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + "T";
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return Math.floor(num).toLocaleString();
}

function formatDecimal(num) {
  return num.toFixed(1);
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function getGeneratorCost(type) {
  const config = GENERATOR_CONFIG[type];
  const level = gameState.generators[type];
  return Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
}

function getGeneratorRate(type) {
  const config = GENERATOR_CONFIG[type];
  const level = gameState.generators[type];
  return config.baseRate * level;
}

function canAffordRecipe(recipe) {
  if (recipe.energy && gameState.energy < recipe.energy) return false;
  if (recipe.protons && gameState.particles.protons < recipe.protons) return false;
  if (recipe.electrons && gameState.particles.electrons < recipe.electrons) return false;
  if (recipe.neutrons && gameState.particles.neutrons < recipe.neutrons) return false;

  for (const [element, count] of Object.entries(recipe)) {
    if (element !== 'energy' && element !== 'protons' && element !== 'electrons' && element !== 'neutrons') {
      if ((gameState.elements[element] || 0) < count) return false;
    }
  }

  return true;
}

function consumeRecipe(recipe) {
  if (recipe.energy) gameState.energy -= recipe.energy;
  if (recipe.protons) gameState.particles.protons -= recipe.protons;
  if (recipe.electrons) gameState.particles.electrons -= recipe.electrons;
  if (recipe.neutrons) gameState.particles.neutrons -= recipe.neutrons;

  for (const [element, count] of Object.entries(recipe)) {
    if (element !== 'energy' && element !== 'protons' && element !== 'electrons' && element !== 'neutrons') {
      gameState.elements[element] = (gameState.elements[element] || 0) - count;
    }
  }
}

// ===== Click Handler =====
function handleClick(event) {
  gameState.energy += 1;
  gameState.totalClicks += 1;

  // Visual feedback - ripple effect
  const button = event.currentTarget;
  const rect = button.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const ripple = document.createElement('div');
  ripple.className = 'click-ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.style.width = '20px';
  ripple.style.height = '20px';
  button.appendChild(ripple);

  setTimeout(() => ripple.remove(), 600);

  // Number pop animation
  const numberPop = document.createElement('div');
  numberPop.className = 'number-pop';
  numberPop.textContent = '+1';
  numberPop.style.left = x + 'px';
  numberPop.style.top = y + 'px';
  button.appendChild(numberPop);

  setTimeout(() => numberPop.remove(), 1000);

  updateUI();
}

// ===== Generator Upgrade Handlers =====
function upgradeGenerator(type) {
  const cost = getGeneratorCost(type);

  if (gameState.energy >= cost) {
    gameState.energy -= cost;
    gameState.generators[type] += 1;
    gameState.totalClicks += 1; // Track click
    updateUI();
  }
}

// ===== Element Handlers =====
function synthesizeElement(symbol) {
  const element = ELEMENTS.find(e => e.symbol === symbol);

  if (canAffordRecipe(element.recipe)) {
    consumeRecipe(element.recipe);
    gameState.elements[symbol] = (gameState.elements[symbol] || 0) + 1;
    gameState.totalClicks += 1; // Track click
    updateUI();
  }
}

// ===== Game Loop =====
function gameLoop() {
  const now = Date.now();
  const deltaTime = (now - gameState.lastUpdate) / 1000; // seconds
  gameState.lastUpdate = now;

  // Generate particles
  for (const [type, level] of Object.entries(gameState.generators)) {
    const rate = getGeneratorRate(type);
    gameState.particles[type] += rate * deltaTime;
  }

  // Generate energy from particles
  const totalParticles = gameState.particles.electrons + gameState.particles.protons + gameState.particles.neutrons;
  gameState.energy += totalParticles * PARTICLE_ENERGY_RATE * deltaTime;

  // Generate energy from elements
  for (const [symbol, count] of Object.entries(gameState.elements)) {
    const element = ELEMENTS.find(e => e.symbol === symbol);
    if (element) {
      const energyValue = element.atomicNumber * 10;
      gameState.energy += count * energyValue * 0.05 * deltaTime;
    }
  }

  updateUI();
  requestAnimationFrame(gameLoop);
}

// ===== UI Update =====
function updateUI() {
  // Energy display
  document.getElementById('energyValue').textContent = formatNumber(gameState.energy);

  // Energy rate
  const totalParticles = gameState.particles.electrons + gameState.particles.protons + gameState.particles.neutrons;
  let energyRate = totalParticles * PARTICLE_ENERGY_RATE;

  for (const [symbol, count] of Object.entries(gameState.elements)) {
    const element = ELEMENTS.find(e => e.symbol === symbol);
    if (element) {
      const energyValue = element.atomicNumber * 10;
      energyRate += count * energyValue * 0.05;
    }
  }

  document.getElementById('energyRate').textContent = formatDecimal(energyRate);

  // Stats
  document.getElementById('totalClicks').textContent = formatNumber(gameState.totalClicks);
  document.getElementById('playTime').textContent = formatTime(Date.now() - gameState.startTime);

  // Particle generators
  updateGeneratorUI('electrons');
  updateGeneratorUI('protons');
  updateGeneratorUI('neutrons');

  // Elements
  updateElementsUI();
}

function updateGeneratorUI(type) {
  const level = gameState.generators[type];
  const count = gameState.particles[type];
  const rate = getGeneratorRate(type);
  const cost = getGeneratorCost(type);

  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(0, -1);

  document.getElementById(`${type.slice(0, -1)}Level`).textContent = level;
  document.getElementById(`${type.slice(0, -1)}Count`).textContent = formatNumber(count);
  document.getElementById(`${type.slice(0, -1)}Rate`).textContent = formatDecimal(rate);
  document.getElementById(`${type.slice(0, -1)}Cost`).textContent = formatNumber(cost) + ' e';

  const button = document.getElementById(`${type.slice(0, -1)}Upgrade`);
  button.disabled = gameState.energy < cost;
}

function updateElementsUI() {
  const grid = document.getElementById('elementsGrid');

  // Only create elements once
  if (grid.children.length === 0) {
    ELEMENTS.forEach(element => {
      const card = createElementCard(element);
      grid.appendChild(card);
    });
  }

  // Update existing elements
  ELEMENTS.forEach(element => {
    const card = document.getElementById(`element-${element.symbol}`);
    if (card) {
      const count = gameState.elements[element.symbol] || 0;
      const canAfford = canAffordRecipe(element.recipe);

      card.classList.toggle('locked', !canAfford && count === 0);

      const countEl = card.querySelector('.element-count');
      if (countEl) {
        countEl.textContent = count > 0 ? `保有: ${formatNumber(count)}` : '';
      }
    }
  });
}

function createElementCard(element) {
  const card = document.createElement('div');
  card.className = 'element-card';
  card.id = `element-${element.symbol}`;

  card.innerHTML = `
        <div class="element-number">${element.atomicNumber}</div>
        <div class="element-symbol">${element.symbol}</div>
        <div class="element-name">${element.name}</div>
        <div class="element-count"></div>
    `;

  // Click to synthesize
  card.addEventListener('click', () => {
    synthesizeElement(element.symbol);
  });

  // Hover tooltip
  card.addEventListener('mouseenter', () => {
    showElementTooltip(card, element);
  });

  card.addEventListener('mouseleave', () => {
    hideElementTooltip();
  });

  return card;
}

// ===== Tooltip Functions =====
let currentTooltip = null;

function showElementTooltip(card, element) {
  // Remove existing tooltip
  hideElementTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'element-tooltip';
  tooltip.id = 'elementTooltip';

  // Build recipe display
  let recipeHTML = '<div class="tooltip-title">合成レシピ</div>';
  recipeHTML += '<div class="tooltip-recipe">';

  const recipe = element.recipe;

  // Energy
  if (recipe.energy) {
    const hasEnough = gameState.energy >= recipe.energy;
    recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
    recipeHTML += `<span class="recipe-label">エネルギー:</span>`;
    recipeHTML += `<span class="recipe-value">${formatNumber(recipe.energy)} e</span>`;
    recipeHTML += '</div>';
  }

  // Particles
  if (recipe.electrons) {
    const hasEnough = gameState.particles.electrons >= recipe.electrons;
    recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
    recipeHTML += `<span class="recipe-label">電子:</span>`;
    recipeHTML += `<span class="recipe-value">${formatNumber(recipe.electrons)}</span>`;
    recipeHTML += '</div>';
  }

  if (recipe.protons) {
    const hasEnough = gameState.particles.protons >= recipe.protons;
    recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
    recipeHTML += `<span class="recipe-label">陽子:</span>`;
    recipeHTML += `<span class="recipe-value">${formatNumber(recipe.protons)}</span>`;
    recipeHTML += '</div>';
  }

  if (recipe.neutrons) {
    const hasEnough = gameState.particles.neutrons >= recipe.neutrons;
    recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
    recipeHTML += `<span class="recipe-label">中性子:</span>`;
    recipeHTML += `<span class="recipe-value">${formatNumber(recipe.neutrons)}</span>`;
    recipeHTML += '</div>';
  }

  // Other elements
  for (const [key, value] of Object.entries(recipe)) {
    if (key !== 'energy' && key !== 'protons' && key !== 'electrons' && key !== 'neutrons') {
      const hasEnough = (gameState.elements[key] || 0) >= value;
      const elementData = ELEMENTS.find(e => e.symbol === key);
      recipeHTML += `<div class="recipe-item ${hasEnough ? 'available' : 'unavailable'}">`;
      recipeHTML += `<span class="recipe-label">${elementData ? elementData.name : key}:</span>`;
      recipeHTML += `<span class="recipe-value">${formatNumber(value)}</span>`;
      recipeHTML += '</div>';
    }
  }

  recipeHTML += '</div>';

  // Energy generation info
  const energyValue = element.atomicNumber * 10 * 0.05;
  recipeHTML += `<div class="tooltip-info">生成: ${formatDecimal(energyValue)} e/秒</div>`;

  tooltip.innerHTML = recipeHTML;

  // Position tooltip
  const rect = card.getBoundingClientRect();
  tooltip.style.left = (rect.right + 10) + 'px';
  tooltip.style.top = rect.top + 'px';

  document.body.appendChild(tooltip);
  currentTooltip = tooltip;

  // Adjust if off screen
  const tooltipRect = tooltip.getBoundingClientRect();
  if (tooltipRect.right > window.innerWidth) {
    tooltip.style.left = (rect.left - tooltipRect.width - 10) + 'px';
  }
  if (tooltipRect.bottom > window.innerHeight) {
    tooltip.style.top = (window.innerHeight - tooltipRect.height - 10) + 'px';
  }
}

function hideElementTooltip() {
  if (currentTooltip) {
    currentTooltip.remove();
    currentTooltip = null;
  }
}

// ===== Save/Load =====
function saveGame() {
  localStorage.setItem('periodicTableGame', JSON.stringify(gameState));
}

function loadGame() {
  const saved = localStorage.getItem('periodicTableGame');
  if (saved) {
    const loaded = JSON.parse(saved);
    Object.assign(gameState, loaded);
    gameState.lastUpdate = Date.now();
  }
}

// Auto-save every 10 seconds
setInterval(saveGame, 10000);

// ===== Initialization =====
function init() {
  loadGame();

  // Event listeners
  document.getElementById('clickButton').addEventListener('click', handleClick);
  document.getElementById('electronUpgrade').addEventListener('click', () => upgradeGenerator('electrons'));
  document.getElementById('protonUpgrade').addEventListener('click', () => upgradeGenerator('protons'));
  document.getElementById('neutronUpgrade').addEventListener('click', () => upgradeGenerator('neutrons'));

  // Reset button
  // Reset button
  const resetModal = document.getElementById('resetModal');
  const confirmResetBtn = document.getElementById('confirmReset');
  const cancelResetBtn = document.getElementById('cancelReset');

  document.getElementById('resetButton').addEventListener('click', () => {
    resetModal.classList.add('active');
  });

  cancelResetBtn.addEventListener('click', () => {
    resetModal.classList.remove('active');
  });

  confirmResetBtn.addEventListener('click', () => {
    localStorage.removeItem('periodicTableGame');
    location.reload();
  });

  // Close modal when clicking outside
  resetModal.addEventListener('click', (e) => {
    if (e.target === resetModal) {
      resetModal.classList.remove('active');
    }
  });

  // Start game loop
  gameState.lastUpdate = Date.now();
  updateUI();
  gameLoop();
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
