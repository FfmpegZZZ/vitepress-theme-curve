<template>
  <div class="nucarnival-calculator">
    <h1 class="page-title">NU:Carnival 伤害计算器</h1>
    <p class="page-desc">
      移植自 <a href="https://github.com/linecross/nuCarnivalAttackCalculator" target="_blank">nuCarnivalAttackCalculator</a>
    </p>

    <!-- 选项卡 -->
    <div v-if="userInput.isAdvanceMode" class="tab-nav">
      <button :class="['tab-btn', { active: tab === 'CAL' }]" @click="switchTab('CAL')">
        <i class="iconfont icon-calculate"></i>
        计算器
      </button>
      <button :class="['tab-btn', { active: tab === 'JSON' }]" @click="switchTab('JSON')">
        <i class="iconfont icon-code"></i>
        导入数据
      </button>
    </div>

    <!-- 计算器面板 -->
    <div v-if="tab === 'CAL'" class="calculator-panel">
      <!-- 基础设置 -->
      <div class="s-card setting-card">
        <div class="card-header">
          <span class="card-title">
            <i class="iconfont icon-setting"></i>
            基础设置
          </span>
        </div>
        <div class="setting-grid">
          <div class="setting-item">
            <label class="setting-label">进阶模式</label>
            <label class="switch">
              <input type="checkbox" v-model="userInput.isAdvanceMode">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <label class="setting-label">回合数</label>
            <input type="number" class="input-field small" v-model="userInput.turns" min="1" max="50">
          </div>
          <div class="setting-item">
            <label class="setting-label">显示回合</label>
            <label class="switch">
              <input type="checkbox" v-model="userInput.isShowTurns">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item" v-if="userInput.isAdvanceMode">
            <label class="setting-label">手动数值</label>
            <label class="switch">
              <input type="checkbox" v-model="userInput.isModifyCardVal">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <label class="setting-label">默认星级</label>
            <select class="select-field" v-model="userInput.defaultStar">
              <option v-for="(name, value) in DEFAULT_STAR" :key="value" :value="value">{{ name }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 队伍设置 -->
      <div class="s-card team-card">
        <div class="card-header">
          <span class="card-title">
            <i class="iconfont icon-group"></i>
            队伍配置
          </span>
        </div>
        <div class="team-grid">
          <div class="char-slot" v-for="(name, idx) in userInput.char" :key="idx">
            <div class="slot-header">
              <span class="slot-num">{{ idx + 1 }}</span>
              <label class="switch small">
                <input type="checkbox" v-model="userInput.isCardEnabled[idx]">
                <span class="slider"></span>
              </label>
            </div>
            
            <select class="select-field" v-model="userInput.char[idx]">
              <option value="">选择角色</option>
              <option v-for="charName in Object.values(CHARACTER_LIST)" :key="charName" :value="charName">{{ getCharDisplayName(charName) }}</option>
            </select>
            
            <select class="select-field" v-model="userInput.cardname[idx]" :disabled="!userInput.char[idx]">
              <option value="">选择卡牌</option>
              <option v-for="cardname in getCardnameByChar(userInput.char[idx])" :key="cardname" :value="cardname">{{ cardname }}</option>
            </select>

            <!-- 卡牌属性 -->
            <div class="char-stats" v-if="cards[idx]">
              <div class="stat-row">
                <span class="stat-label">星级</span>
                <div class="star-select">
                  <button 
                    v-for="star in 5" 
                    :key="star" 
                    :class="['star-btn', { active: cards[idx].star >= star }]"
                    @click="cards[idx].star = star"
                  >★</button>
                </div>
              </div>
              
              <template v-if="userInput.isAdvanceMode">
                <div class="stat-row">
                  <span class="stat-label">潜力</span>
                  <select class="select-field mini" v-model="cards[idx].potential">
                    <option v-for="pot in POT_SELECT" :key="pot" :value="pot">{{ pot }}</option>
                  </select>
                </div>
                <div class="stat-row">
                  <span class="stat-label">HP</span>
                  <input v-if="userInput.isModifyCardVal" type="number" class="input-field mini" v-model="cards[idx].hp">
                  <span v-else class="stat-value">{{ cards[idx].getHp() }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">ATK</span>
                  <input v-if="userInput.isModifyCardVal" type="number" class="input-field mini" v-model="cards[idx].atk">
                  <span v-else class="stat-value">{{ cards[idx].getAtk() }}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">顺序</span>
                  <select class="select-field mini" v-model="userInput.cardActionOrder[idx]">
                    <option v-for="order in 5" :key="order" :value="order">{{ order }}</option>
                  </select>
                </div>
              </template>
              
              <div class="stat-row">
                <span class="stat-label">行动</span>
                <select class="select-field mini" v-model="userInput.cardActionPattern[idx]">
                  <option v-for="(action, key) in ACTION_PATTERN" :key="key" :value="action">{{ ACTION_PATTERN_CN[key] || action }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 战斗设置 -->
      <div class="s-card battle-card">
        <div class="card-header">
          <span class="card-title">
            <i class="iconfont icon-fire"></i>
            战斗设置
          </span>
        </div>
        <div class="setting-grid">
          <div class="setting-item">
            <label class="setting-label">计算易伤</label>
            <label class="switch">
              <input type="checkbox" v-model="userInput.isCalcEnemyDebuff">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <label class="setting-label">敌人属性</label>
            <select class="select-field" v-model="userInput.enemyElement" :disabled="!userInput.isCalcEnemyDebuff">
              <option v-for="(ele, key) in ELEMENTS" :key="key" :value="ele">{{ ELEMENT_CN[key] || ele }}</option>
            </select>
          </div>
          <div class="setting-item" v-if="userInput.isAdvanceMode">
            <label class="setting-label">允许血量条件</label>
            <label class="switch">
              <input type="checkbox" v-model="userInput.isAllowHpCond">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item" v-if="userInput.isAdvanceMode">
            <label class="setting-label">反击次数</label>
            <input type="number" class="input-field small" v-model="userInput.maxCounterAttack" min="0">
          </div>
        </div>
        
        <!-- 输出模式 -->
        <div class="output-modes">
          <span class="mode-label">输出模式</span>
          <div class="mode-btns">
            <button 
              v-for="(label, mode) in OUTPUT_MODES" 
              :key="mode"
              :class="['mode-btn', { active: userInput.printOutputMode === mode }]"
              @click="userInput.printOutputMode = mode"
            >{{ label }}</button>
          </div>
        </div>
      </div>

      <!-- 结果表格 -->
      <div class="s-card result-card" v-if="battle">
        <div class="card-header">
          <span class="card-title">
            <i class="iconfont icon-chart-line"></i>
            计算结果
          </span>
          <span class="team-total">
            队伍总{{ userInput.printOutputMode === 'All' ? '伤害' : '数值' }}：
            <strong>{{ formatNumber(getBattleTeamTotalValue()) }}</strong>
          </span>
        </div>
        
        <div class="result-table-wrapper">
          <table class="result-table">
            <thead>
              <tr>
                <th class="col-turn">回合</th>
                <th 
                  v-for="(name, idx) in userInput.cardname" 
                  :key="idx"
                  :class="['col-card', getThNameClass(name)]"
                >
                  <span class="card-name">{{ name || '-' }}</span>
                </th>
              </tr>
            </thead>
            <tbody v-if="userInput.isShowTurns">
              <tr v-for="turn in parseInt(userInput.turns)" :key="turn">
                <td class="col-turn">{{ turn }}</td>
                <td 
                  v-for="(card, idx) in cards" 
                  :key="idx"
                  :class="['col-card', getTdClass(card, turn)]"
                  @click="changeAttackType(card, turn)"
                >
                  <span v-if="isCardInBattle(card)">{{ formatNumber(getBattleTurnValue(card.name, turn)) }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="summary-row">
                <td class="col-turn">总计</td>
                <td v-for="(card, idx) in cards" :key="idx" class="col-card">
                  <strong v-if="isCardInBattle(card)">{{ formatNumber(getBattleTotalValue(card.name)) }}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- 无数据提示 -->
      <div class="s-card empty-card" v-else>
        <div class="empty-content">
          <i class="iconfont icon-info"></i>
          <p>请先选择角色和卡牌开始计算</p>
        </div>
      </div>
    </div>

    <!-- JSON导入面板 -->
    <div v-if="tab === 'JSON'" class="json-panel">
      <div class="s-card">
        <div class="card-header">
          <span class="card-title">
            <i class="iconfont icon-code"></i>
            导入自定义角色数据
          </span>
        </div>
        <p class="json-hint">粘贴角色JSON数据以添加自定义卡牌</p>
        <textarea 
          class="json-input" 
          v-model="inputJson" 
          placeholder="在此粘贴JSON数据..."
          rows="12"
        ></textarea>
        <button class="import-btn" @click="importJsonStr">
          <i class="iconfont icon-download"></i>
          导入数据
        </button>
        <div v-if="importJsonResult" :class="['import-result', importSuccess ? 'success' : 'error']">
          {{ importJsonResult }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { Character, Element, ActionPattern } from './Constants.js';
import { CardCenter, Team, Battle, Condition } from './BattleSystem.js';
import { AttackType } from './Constants.js';

// 中文翻译映射（UI显示用简体中文）
const CHARACTER_LIST = Character;

// 角色名繁转简映射
const CHAR_CN = {
  '八雲': '八云',
  '艾德蒙特': '艾德蒙特',
  '奧利弗': '奥利弗',
  '崑西': '昆西',
  '玖夜': '玖夜',
  '嘉嚕': '嘉噜',
  '布勒': '布勒',
  '嘆天': '叹天',
  '歷': '历',
  '艾斯特': '艾斯特',
  '墨菲': '墨菲',
  '伊德': '伊德',
};

const ELEMENT_CN = {
  NA: '无',
  Wood: '木',
  Fire: '火',
  Water: '水',
  Light: '光',
  Dark: '暗'
};

const ACTION_PATTERN_CN = {
  Immediately: '有招就放',
  Delay1Turn: '延迟1回合',
  AddCD1: 'CD+1',
  AddCD2: 'CD+2',
  AddCD3: 'CD+3',
  AddCD1Delay1Turn: 'CD+1延迟1回合',
  AddCD2Ahead1Turn: 'CD+2提早1回合',
  Manual: '手动设置'
};

// 显示简体中文角色名
const getCharDisplayName = (char) => CHAR_CN[char] || char;

const OUTPUT_MODES = {
  'All': '全部',
  'OnlyDamage': '伤害',
  'OnlyAttack': '攻击',
  'OnlyPoison': '持续伤害',
  'OnlySupport': '辅助',
  'OnlyHeal': '治疗'
};

const DEFAULT_STAR = {
  FULL: '全员满星',
  SSR3: '3星SSR+5星SR',
  SSR1: '1星SSR+3星SR'
};

const STARS = [1, 2, 3, 4, 5];
const POT_SELECT = [0, 6, 9, 12];

// 状态
const tab = ref('CAL');
const userInput = reactive({
  char: ['', '', '', '', ''],
  cardname: ['', '', '', '', ''],
  cardActionOrder: [1, 2, 3, 4, 5],
  cardActionPattern: [ActionPattern.Immediately, ActionPattern.Immediately, ActionPattern.Immediately, ActionPattern.Immediately, ActionPattern.Immediately],
  cardManualAction: [[], [], [], [], []],
  isCardEnabled: [true, true, true, true, true],
  isAdvanceMode: false,
  turns: 14,
  isShowTurns: true,
  maxCounterAttack: 0,
  isAllowHpCond: true,
  isModifyCardVal: false,
  defaultStar: 'SSR3',
  enemyElement: Element.NA,
  isCalcEnemyDebuff: false,
  printOutputMode: 'All',
});

const cards = ref([null, null, null, null, null]);
const battle = ref(null);
const inputJson = ref('');
const importJsonResult = ref('');
const importSuccess = ref(false);

const ELEMENTS = Element;
const ACTION_PATTERN = ActionPattern;

// 方法
const switchTab = (newTab) => {
  tab.value = newTab;
};

const formatNumber = (num) => {
  return num?.toLocaleString() || '0';
};

const getCardnameByChar = (char) => {
  return CardCenter.getCardNameByChar(char);
};

const loadCards = () => {
  for (let i = 0; i < userInput.cardname.length; i++) {
    const name = userInput.cardname[i];
    if (name !== '' && (cards.value[i] == null || cards.value[i].name !== name)) {
      try {
        const card = CardCenter.loadCard(name);
        if (userInput.defaultStar === 'SSR3') {
          if (card.rarity === 'SSR') card.star = 3;
        } else if (userInput.defaultStar === 'SSR1') {
          if (card.rarity === 'SSR') card.star = 1;
          if (card.rarity === 'SR') card.star = 3;
        }
        cards.value[i] = card;
      } catch (e) {
        console.error('加载卡牌失败:', name, e);
      }
    }
  }
  setupBattle();
};

const isCardSelected = () => {
  return userInput.cardname.some(name => name != null && name !== '');
};

const getCardnameByActionOrder = () => {
  let arr = [];
  for (let i = 0; i < userInput.cardname.length; i++) {
    const name = userInput.cardname[i];
    const order = userInput.cardActionOrder[i];
    if (name != null && name !== '' && userInput.isCardEnabled[i]) {
      arr.push({ name, order });
    }
  }
  return arr.sort((e1, e2) => e1.order - e2.order).map(e => e.name);
};

const setupBattle = () => {
  if (!isCardSelected()) {
    battle.value = null;
    return;
  }
  const team = new Team();
  for (let i = 0; i < userInput.cardname.length; i++) {
    const card = cards.value[i];
    if (card != null && userInput.isCardEnabled[i]) {
      team.addCard(card);
    }
  }
  if (team.cards.length === 0) {
    battle.value = null;
  } else {
    battle.value = new Battle(team, userInput.turns);
    updateBattle();
  }
};

const updateBattle = () => {
  if (battle.value == null) return;
  
  battle.value.team.updateActionOrder(getCardnameByActionOrder());
  battle.value.init();
  battle.value.counterAttackCount = userInput.maxCounterAttack;
  battle.value.enemyElement = userInput.enemyElement;
  battle.value.printEnemeyOption = userInput.isCalcEnemyDebuff;
  battle.value.printOutputOption = userInput.printOutputMode;

  for (let i = 0; i < cards.value.length; i++) {
    const card = cards.value[i];
    if (isCardInBattle(card)) {
      battle.value.setActionPattern(card.name, userInput.cardActionPattern[i]);
      if (userInput.cardActionPattern[i] === ActionPattern.Manual) {
        const skillArr = getManualAttackTypeArr(userInput.cardManualAction[i], 'S');
        const guardArr = getManualAttackTypeArr(userInput.cardManualAction[i], 'G');
        battle.value.setManualActionPattern(card.name, skillArr, guardArr);
      }
    }
  }
  battle.value.startBattle();
};

const getBattleTurnValue = (cardname, turn) => battle.value?.getTurnValue(cardname, turn) || 0;
const getBattleTotalValue = (cardname) => battle.value?.getTotalValue(cardname) || 0;
const getBattleTeamTotalValue = () => battle.value?.getTeamTotalValue() || 0;

const isCardInBattle = (card) => {
  if (card == null) return false;
  const cardname = typeof card === 'string' ? card : card.name;
  const idx = userInput.cardname.indexOf(cardname);
  return idx !== -1 && userInput.isCardEnabled[idx];
};

const getThNameClass = (cardname) => {
  if (!isCardInBattle(cardname)) return '';
  const idx = getIndexByCardname(cardname);
  const card = cards.value[idx];
  if (!card) return '';
  
  const eleMap = {
    [Element.Light]: 'ele-light',
    [Element.Dark]: 'ele-dark',
    [Element.Fire]: 'ele-fire',
    [Element.Water]: 'ele-water',
    [Element.Wood]: 'ele-wood'
  };
  return eleMap[card.element] || '';
};

const getTdClass = (card, turn) => {
  if (!isCardInBattle(card)) return '';
  const action = battle.value?.getTurnAction(card.name, turn);
  if (action === AttackType.SkillAttack) return 'skill';
  if (action === AttackType.BasicAttack) return 'basic';
  if (action === AttackType.Guard) return 'guard';
  return '';
};

const changeAttackType = (card, turn) => {
  if (!card) return;
  const idx = getIndexByCardname(card.name);
  if (userInput.cardActionPattern[idx] !== ActionPattern.Manual) return;
  
  const actionArr = userInput.cardManualAction[idx];
  let action = actionArr[turn] || 'A';
  actionArr[turn] = action === 'A' ? 'S' : action === 'S' ? 'G' : 'A';
  
  setupBattle();
  if (actionArr[turn] === 'S' && battle.value?.getTurnAction(card.name, turn) === AttackType.BasicAttack) {
    actionArr[turn] = 'G';
    setupBattle();
  }
};

const getManualAttackTypeArr = (arr, type) => {
  const output = [];
  for (let i = 0; i <= userInput.turns; i++) {
    if (arr[i] === type) output.push(i);
  }
  return output;
};

const getIndexByCardname = (cardname) => userInput.cardname.indexOf(cardname);

const importJsonStr = () => {
  let cleanedStr = inputJson.value.replace(/[\r\n\t]/g, '').replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
  if (!cleanedStr.startsWith("{")) cleanedStr = "{" + cleanedStr + "}";
  cleanedStr = cleanedStr.replace(/,(?!\s*?[{\["'\w])/g, '');
  
  try {
    const jsonObj = JSON.parse(cleanedStr);
    CardCenter.addUserCardData(jsonObj);
    importJsonResult.value = "导入成功：" + Object.keys(jsonObj).join(', ');
    importSuccess.value = true;
  } catch (error) {
    importJsonResult.value = "导入失败，请检查JSON格式是否正确";
    importSuccess.value = false;
  }
};

// 计算属性
const selectedChar = computed(() => userInput.char.join(','));
const selectedCard = computed(() => userInput.cardname.join(','));
const selectedCardEnabled = computed(() => userInput.isCardEnabled.join(','));
const selectedCardActionOrder = computed(() => userInput.cardActionOrder.join(','));
const selectedCardActionPattern = computed(() => userInput.cardActionPattern.join(','));
const updatedCardData = computed(() => {
  return cards.value.map(card => card ? `${card.name},${card.star},${card.level},${card.potential},${card.atk}` : '').join(';');
});

// 监听器
watch(selectedChar, () => {
  for (let i = 0; i < userInput.char.length; i++) {
    const char = userInput.char[i];
    if (!char) {
      userInput.cardname[i] = '';
      cards.value[i] = null;
    } else if (!getCardnameByChar(char).includes(userInput.cardname[i])) {
      userInput.cardname[i] = '';
      cards.value[i] = null;
    }
  }
});

watch(selectedCard, loadCards);
watch(updatedCardData, updateBattle);
watch(selectedCardEnabled, setupBattle);
watch(selectedCardActionOrder, updateBattle);
watch(selectedCardActionPattern, () => {
  userInput.cardActionPattern.forEach((pattern, i) => {
    if (pattern === ActionPattern.Manual) userInput.cardManualAction[i] = [];
  });
  updateBattle();
});

watch(() => userInput.turns, (newVal, oldVal) => {
  let turn = parseInt(newVal) || oldVal;
  if (turn > 50 || turn <= 0) turn = oldVal;
  userInput.turns = turn;
  setupBattle();
});

watch(() => userInput.maxCounterAttack, updateBattle);
watch(() => userInput.enemyElement, updateBattle);
watch(() => userInput.isCalcEnemyDebuff, updateBattle);
watch(() => userInput.printOutputMode, updateBattle);
watch(() => userInput.isAllowHpCond, (val) => { Condition.IS_HP_FULFILL = val; updateBattle(); });
watch(() => userInput.isModifyCardVal, (isModify) => {
  cards.value.filter(c => c).forEach(card => {
    if (isModify) {
      card.hp = card.getHp();
      card.atk = card.getAtk();
    } else {
      card.hp = null;
      card.atk = null;
    }
  });
  updateBattle();
});
watch(inputJson, () => { if (importJsonResult.value) importJsonResult.value = ''; });

// 初始化
onMounted(async () => {
  try {
    const response = await fetch('/data/cardData.json');
    const json = await response.json();
    CardCenter.setMainCardData(json);
    loadCards();
  } catch (error) {
    console.error('加载卡牌数据失败:', error);
  }
});
</script>

<style lang="scss" scoped>
.nucarnival-calculator {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  text-align: center;
  margin-bottom: 8px;
  border: none;
  color: var(--main-font-color);
  background: linear-gradient(135deg, var(--main-color) 0%, #f093fb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.page-desc {
  text-align: center;
  color: var(--main-font-second-color);
  font-size: 14px;
  margin-bottom: 24px;
  a {
    color: var(--main-color);
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  }
}

// 选项卡
.tab-nav {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: center;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 1px solid var(--main-card-border);
  border-radius: 8px;
  background: var(--main-card-background);
  color: var(--main-font-color);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  
  &:hover {
    border-color: var(--main-color);
    color: var(--main-color);
  }
  
  &.active {
    background: var(--main-color);
    border-color: var(--main-color);
    color: #fff;
  }
}

// 通用卡片样式
.s-card {
  background: var(--main-card-background);
  border: 1px solid var(--main-card-border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px -4px var(--main-border-shadow);
  transition: all 0.3s;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--main-card-border);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--main-font-color);
  
  .iconfont {
    color: var(--main-color);
    font-size: 18px;
  }
}

// 设置网格
.setting-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.setting-label {
  font-size: 14px;
  color: var(--main-font-second-color);
  white-space: nowrap;
}

// 开关样式
.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  
  &.small {
    width: 36px;
    height: 20px;
    
    .slider:before {
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
    }
    
    input:checked + .slider:before {
      transform: translateX(16px);
    }
  }
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: var(--main-card-border);
    transition: 0.3s;
    border-radius: 24px;
    
    &:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.3s;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
  }
  
  input:checked + .slider {
    background-color: var(--main-color);
  }
  
  input:checked + .slider:before {
    transform: translateX(20px);
  }
}

// 输入框和选择框
.input-field, .select-field {
  padding: 8px 12px;
  border: 1px solid var(--main-card-border);
  border-radius: 8px;
  background: var(--main-card-second-background);
  color: var(--main-font-color);
  font-size: 14px;
  transition: all 0.3s;
  
  &:focus {
    outline: none;
    border-color: var(--main-color);
    box-shadow: 0 0 0 3px rgba(var(--main-color-rgb, 66, 90, 239), 0.1);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &.small {
    width: 80px;
  }
  
  &.mini {
    width: 100%;
    padding: 6px 8px;
    font-size: 13px;
  }
}

// 队伍网格
.team-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 400px) {
    grid-template-columns: 1fr;
  }
}

.char-slot {
  background: var(--main-card-second-background);
  border-radius: 12px;
  padding: 14px;
  border: 1px solid var(--main-card-border);
  transition: all 0.3s;
  
  &:hover {
    border-color: var(--main-color);
    box-shadow: 0 4px 12px -2px var(--main-border-shadow);
  }
  
  .slot-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .slot-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, var(--main-color), #f093fb);
    color: #fff;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 700;
  }
  
  .select-field {
    width: 100%;
    margin-bottom: 8px;
    
    &:last-of-type {
      margin-bottom: 0;
    }
  }
}

.char-stats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--main-card-border);
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.stat-label {
  font-size: 12px;
  color: var(--main-font-second-color);
  font-weight: 500;
}

.stat-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--main-color);
  background: rgba(var(--main-color-rgb, 66, 90, 239), 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

// 星级选择
.star-select {
  display: flex;
  gap: 2px;
}

.star-btn {
  padding: 2px 4px;
  border: none;
  background: none;
  color: var(--main-card-border);
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  
  &.active {
    color: #ffc107;
    text-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
  }
  
  &:hover {
    transform: scale(1.2);
  }
}

// 输出模式
.output-modes {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--main-card-border);
}

.mode-label {
  display: block;
  font-size: 14px;
  color: var(--main-font-second-color);
  margin-bottom: 10px;
  font-weight: 500;
}

.mode-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-btn {
  padding: 6px 16px;
  border: 1px solid var(--main-card-border);
  border-radius: 20px;
  background: var(--main-card-second-background);
  color: var(--main-font-color);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    border-color: var(--main-color);
    color: var(--main-color);
  }
  
  &.active {
    background: linear-gradient(135deg, var(--main-color), #f093fb);
    border-color: transparent;
    color: #fff;
    font-weight: 500;
  }
}

// 结果卡片
.result-card {
  .team-total {
    font-size: 14px;
    color: var(--main-font-second-color);
    
    strong {
      color: var(--main-color);
      font-size: 20px;
      font-weight: 700;
      margin-left: 4px;
    }
  }
}

.result-table-wrapper {
  overflow-x: auto;
  margin: 0 -10px;
  padding: 0 10px;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--main-card-second-background);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--main-card-border);
    border-radius: 3px;
    
    &:hover {
      background: var(--main-color);
    }
  }
}

.result-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  
  th, td {
    padding: 10px 12px;
    text-align: center;
    border-bottom: 1px solid var(--main-card-border);
  }
  
  thead th {
    background: var(--main-card-second-background);
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
    
    &:first-child {
      border-radius: 8px 0 0 0;
    }
    &:last-child {
      border-radius: 0 8px 0 0;
    }
  }
  
  .col-turn {
    width: 60px;
    font-weight: 600;
    background: var(--main-card-second-background);
    color: var(--main-font-second-color);
  }
  
  .col-card {
    min-width: 100px;
  }
  
  .card-name {
    font-size: 12px;
    font-weight: 500;
  }
  
  tbody tr {
    transition: background 0.2s;
    
    &:nth-child(even) {
      background: rgba(0, 0, 0, 0.02);
    }
    
    &:hover {
      background: rgba(var(--main-color-rgb, 66, 90, 239), 0.05);
    }
  }
  
  tbody td {
    cursor: pointer;
    transition: all 0.2s;
    
    &.skill {
      background: linear-gradient(135deg, rgba(255, 100, 100, 0.2), rgba(255, 150, 150, 0.1));
      font-weight: 600;
      color: #e74c3c;
    }
    
    &.guard {
      background: rgba(100, 100, 100, 0.15);
      color: var(--main-font-second-color);
    }
  }
  
  // 属性颜色
  .ele-light { 
    background: linear-gradient(135deg, rgba(255, 230, 150, 0.4), rgba(255, 245, 200, 0.2)) !important;
    border-bottom-color: rgba(255, 200, 50, 0.3);
  }
  .ele-dark { 
    background: linear-gradient(135deg, rgba(180, 150, 255, 0.4), rgba(200, 180, 255, 0.2)) !important;
    border-bottom-color: rgba(150, 100, 255, 0.3);
  }
  .ele-fire { 
    background: linear-gradient(135deg, rgba(255, 150, 150, 0.4), rgba(255, 180, 180, 0.2)) !important;
    border-bottom-color: rgba(255, 100, 100, 0.3);
  }
  .ele-water { 
    background: linear-gradient(135deg, rgba(150, 200, 255, 0.4), rgba(180, 220, 255, 0.2)) !important;
    border-bottom-color: rgba(100, 180, 255, 0.3);
  }
  .ele-wood { 
    background: linear-gradient(135deg, rgba(150, 230, 180, 0.4), rgba(180, 240, 200, 0.2)) !important;
    border-bottom-color: rgba(100, 200, 130, 0.3);
  }
  
  tfoot {
    .summary-row td, .summary-row th {
      background: var(--main-card-second-background);
      font-weight: 700;
      border-top: 2px solid var(--main-card-border);
      color: var(--main-font-color);
      
      strong {
        color: var(--main-color);
        font-size: 15px;
      }
    }
  }
}

// 暗色模式调整
html.dark .result-table {
  tbody tr:nth-child(even) {
    background: rgba(255, 255, 255, 0.02);
  }
  
  tbody td.skill {
    background: linear-gradient(135deg, rgba(255, 100, 100, 0.3), rgba(255, 150, 150, 0.15));
    color: #ff6b6b;
  }
  
  tbody td.guard {
    background: rgba(100, 100, 100, 0.25);
  }
}

// 空状态
.empty-card {
  .empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: var(--main-font-second-color);
    
    .iconfont {
      font-size: 56px;
      margin-bottom: 16px;
      opacity: 0.4;
      background: linear-gradient(135deg, var(--main-color), #f093fb);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    p {
      margin: 0;
      font-size: 15px;
    }
  }
}

// JSON导入
.json-panel {
  max-width: 800px;
  margin: 0 auto;
}

.json-hint {
  font-size: 14px;
  color: var(--main-font-second-color);
  margin-bottom: 12px;
}

.json-input {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--main-card-border);
  border-radius: 10px;
  background: var(--main-card-second-background);
  color: var(--main-font-color);
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 13px;
  resize: vertical;
  margin-bottom: 16px;
  transition: all 0.3s;
  
  &:focus {
    outline: none;
    border-color: var(--main-color);
    box-shadow: 0 0 0 3px rgba(var(--main-color-rgb, 66, 90, 239), 0.1);
  }
  
  &::placeholder {
    color: var(--main-font-second-color);
    opacity: 0.6;
  }
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: linear-gradient(135deg, var(--main-color), #f093fb);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px -4px rgba(var(--main-color-rgb, 66, 90, 239), 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
}

.import-result {
  margin-top: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 14px;
  
  &.success {
    background: rgba(46, 204, 113, 0.1);
    color: #27ae60;
    border: 1px solid rgba(46, 204, 113, 0.3);
  }
  
  &.error {
    background: rgba(231, 76, 60, 0.1);
    color: #e74c3c;
    border: 1px solid rgba(231, 76, 60, 0.3);
  }
}

// 响应式优化
@media (max-width: 768px) {
  .nucarnival-calculator {
    padding: 16px;
  }
  
  .page-title {
    font-size: 1.5rem;
  }
  
  .s-card {
    padding: 16px;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .setting-grid {
    gap: 12px 16px;
  }
  
  .setting-item {
    flex: 1 1 calc(50% - 8px);
    min-width: 140px;
  }
}
</style>
