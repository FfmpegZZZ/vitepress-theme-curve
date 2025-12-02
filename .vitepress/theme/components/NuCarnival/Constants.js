// NuCarnival Attack Calculator - Constants
// Ported from https://github.com/linecross/nuCarnivalAttackCalculator
// 注意：这些值必须与 cardData.json 中的繁体中文保持一致

export const Character = {
  Yakumo: '八雲',
  Edmond: '艾德蒙特',
  Olivine: '奧利弗',
  Quincy: '崑西',
  Kuya: '玖夜',
  Garu: '嘉嚕',
  Blade: '布勒',
  Dante: '嘆天',
  Rei: '歷',
  Aster: '艾斯特',
  Morvay: '墨菲',
  Eiden: '伊德',
};

export const Class = { 
  Striker: '攻擊', 
  Support: '輔助', 
  Healer: '治療', 
  Guardian: '守護', 
  Saboteur: '妨礙' 
};

export const Element = { 
  NA: 'N/A', 
  Wood: '木', 
  Fire: '火', 
  Water: '水', 
  Light: '光', 
  Dark: '闇' 
};

export const Rarity = { SSR: 'SSR', SR: 'SR', R: 'R', N: 'N' };

export const PotentialType = { 
  A: 'HP先攻', 
  B: 'ATK先攻', 
  C: '平均型', 
  D: 'NR卡' 
};

// 规则类型 - 必须与 cardData.json 中的值匹配（繁体）
export const RuleType = {
  attack: '攻擊',
  support: '輔助',
  heal: '治療',
  continueHeal: '持續治療',
  poisonAttack: '持續傷害',
  basicAtkFollowup: '普攻追擊',
  basicAtkFollowupSkill: '普攻追擊被動',
  counterAttack: '反擊',
  counterAttackSkill: '反擊被動',
  atkUp: '攻擊力增加',
  basicAtkUp: '普攻傷害增加',
  skillAtkUp: '必殺技傷害增加',
  poisonAtkUp: '持續傷害增加',
  allAtkUp: '造成傷害增加',
  enemyBasicAtkUp: '敵方受到普攻傷害增加',
  enemySkillAtkUp: '敵方受到必殺技傷害增加',
  enemyPoisonAtkUp: '敵方受到持續傷害增加',
  enemyAllAtkUp: '敵方受到傷害增加',
  hpUp: '最大HP增加',
  healUp: '治療量增加',
  continueHealUp: '持續治療量增加',
  partyHealUp: '我方受到治療量增加',
  partyContinueHealUp: '我方受到持續治療量增加',
  cdMinus: '減少冷卻回合',
  appendRule: '我方獲得技能',
  enemyAppendRule: '敵方獲得技能',
};

export const RuleValueByType = { atk: 'ATK', hp: 'HP' };

export const AttackType = { 
  BasicAttack: '普攻', 
  SkillAttack: '必殺技', 
  Guard: '防禦' 
};

// 条件类型 - 必须与 cardData.json 中的值匹配（繁体）
export const ConditionType = {
  hasChar: '角色在場',
  charCount: '隊伍中每存在角色',
  hasClass: '隊伍中有定位',
  classCount: '隊伍中每存在定位',
  hpHigher: '血量大於',
  hpLower: '血量少於',
  isAttackType: '攻擊方式',
  isAttack: '攻擊時',
  everyTurn: '每N回合',
  atTurn: '第n回合',
  enemyIsAttacked: '被攻擊時',
  enemyIsAttackByChar: '被角色攻擊',
  enemyIsAttackByClass: '被定位攻擊',
};

// 目标类型 - 必须与 cardData.json 中的值匹配（繁体）
export const TargetType = {
  self: '自己',
  all: '全體',
  isClass: '定位',
  isChar: '角色',
  isPosition: '位置',
};

// 行动模式 - 仅用于UI显示
export const ActionPattern = {
  Immediately: 'Immediately',
  Delay1Turn: 'Delay1Turn',
  AddCD1: 'AddCD1',
  AddCD2: 'AddCD2',
  AddCD3: 'AddCD3',
  AddCD1Delay1Turn: 'AddCD1Delay1Turn',
  AddCD2Ahead1Turn: 'AddCD2Ahead1Turn',
  Manual: 'Manual'
};

// 永久效果标记
export const ALWAYS_EFFECTIVE = 50;

// 潜力值配置
export const GAME_CONFIG = {
  POTTYPE: {
    A: {
      hp: [[3, 3], [6], [5, 5], [6, 6], [6, 6], [8, 8], [8], [9, 9], [10, 10], [10], [10, 10], [12, 12]],
      atk: [[1, 2], [2], [2, 2], [3, 3], [3, 3], [4, 4], [4], [4, 5], [5, 5], [5], [5, 5], [6, 6]]
    },
    B: {
      hp: [[1, 2], [2], [2, 2], [3, 3], [3, 3], [4, 4], [4], [4, 5], [5, 5], [5], [5, 5], [6, 6]],
      atk: [[3, 3], [6], [5, 5], [6, 6], [6, 6], [8, 8], [8], [9, 9], [10, 10], [10], [10, 10], [12, 12]]
    },
    C: {
      hp: [[2, 2], [4], [4, 4], [5, 5], [5, 5], [6, 6], [6], [7, 7], [8, 8], [8], [8, 8], [9, 9]],
      atk: [[2, 2], [4], [4, 4], [5, 5], [5, 5], [6, 6], [6], [7, 7], [8, 8], [8], [8, 8], [9, 9]]
    },
    D: {
      hp: [[2, 2], [4], [4, 4], [5, 5], [5, 5], [6, 6]],
      atk: [[2, 2], [4], [4, 4], [5, 5], [5, 5], [6, 6]]
    }
  }
};
