/**
 * JSONファイルを非同期で読み込む関数
 * @param {string} url - 読み込むJSONファイルのURL
 * @returns {Promise<Object>} - JSONオブジェクト
 */
async function loadJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} の読み込みに失敗しました`);
  }
  return response.json();
}

/**
 * 重み付けされた配列からランダムに1つの要素の 'value' を返す関数
 * @param {Array<{value: string, weight: number}>} weightedArray - 重み付けされた要素の配列
 * @returns {string|null} - 選ばれた要素のvalue、または選択肢がない場合はnull
 */
function getRandomWeightedElement(weightedArray) {
  if (!weightedArray || weightedArray.length === 0) {
    return null;
  }

  // weightが未定義の場合はデフォルト値1を適用
  const items = weightedArray.map(item => ({ ...item, weight: item.weight ?? 1 }));

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random < 0) {
      return item.value;
    }
  }
  // 丸め誤差などでループを抜けた場合、最後の要素を返す
  return items[items.length - 1].value;
}

/**
 * 定義されたルールに基づいて選択肢(options)を加工する関数
 * @param {Array} options - 元の選択肢の配列
 * @param {string} targetCategory - 現在選択しようとしているカテゴリ名
 * @param {Object} currentProfile - これまでに決定したプロフィールのオブジェクト
 * @param {Array} rules - rules.jsonから読み込んだルールの配列
 * @returns {Array} - 加工後の選択肢の配列
 */
function applyRules(options, targetCategory, currentProfile, rules) {
  let newOptions = [...options];

  const applicableRules = rules.filter(rule => rule.targetCategory === targetCategory);

  for (const rule of applicableRules) {
    // このルールが発動する条件を満たしているかチェック
    const conditionsMet = rule.conditions.every(condition => {
      const selectedValue = currentProfile[condition.category];
      return selectedValue && condition.has.includes(selectedValue);
    });

    if (conditionsMet) {
      // 条件を満たした場合、アクションを適用
      switch (rule.action.type) {
        case 'FILTER_INCLUDE':
          newOptions = newOptions.filter(opt => rule.action.values.includes(opt.value));
          break;
        case 'FILTER_EXCLUDE':
          newOptions = newOptions.filter(opt => !rule.action.values.includes(opt.value));
          break;
        case 'ADD_OPTIONS':
          // 重複を避けるため、既に追加されていないものだけ追加
          rule.action.values.forEach(newItem => {
            if (!newOptions.some(opt => opt.value === newItem.value)) {
              newOptions.push(newItem);
            }
          });
          break;
      }
    }
  }
  return newOptions;
}

/**
 * キャラクターのプロフィールを生成するメイン関数
 * @param {Object} traits - traits.jsonから読み込んだデータ
 * @param {Array} rules - rules.jsonから読み込んだデータ
 * @returns {string[]} - 生成されたキーワードの配列
 */
function generateCharacter(traits, rules) {
  const profile = {}; // { category: value }
  const profileArray = []; // [value, value, ...]

  // 依存関係を考慮してカテゴリの選択順序を定義
  // (例) ageGroupはoccupationの条件になるので、先に選択する
  const categoryOrder = [
    "gender",
    "birthplace",
    "ageGroup",
    "occupation",
    "personality",
    "appearance",
    "specialty",
    "weakness",
    "item",
    "hobby"
  ];

  for (const category of categoryOrder) {
    // traits.jsonにカテゴリが存在しない場合はスキップ
    if (!traits[category]) continue;

    let options = [...traits[category]]; // オリジナルの選択肢をコピー

    // ルールを適用して選択肢を絞り込む
    options = applyRules(options, category, profile, rules);

    if (options.length > 0) {
      const selectedValue = getRandomWeightedElement(options);
      if (selectedValue) {
        profile[category] = selectedValue;
        profileArray.push(selectedValue);
      }
    } else {
      console.warn(`カテゴリ "${category}" で選択可能なキーワードがありませんでした。ルールが厳しすぎる可能性があります。`);
    }
  }
  return profileArray;
}


// --- メイン処理 ---
// DOMが読み込まれたら実行
document.addEventListener('DOMContentLoaded', async () => {
  const generateBtn = document.getElementById('generateBtn');
  const resultDiv = document.getElementById('result');
  const loadingText = document.getElementById('loading');
  
  try {
    // Promise.allで両方のJSONを並行して読み込む
    const [traits, rules] = await Promise.all([
      loadJSON('traits.json'),
      loadJSON('rules.json')
    ]);
    
    // データロード完了後、ボタンを有効化
    generateBtn.disabled = false;
    generateBtn.textContent = 'キャラクターを生成！';
    loadingText.textContent = 'ボタンを押してキャラクターを生成してください。';

    // ボタンクリック時のイベントリスナーを設定
    generateBtn.addEventListener('click', () => {
      const newCharacterProfile = generateCharacter(traits, rules);
      resultDiv.innerHTML = `<p><strong>生成結果:</strong> ${newCharacterProfile.join(' / ')}</p>`;
    });

  } catch (error) {
    console.error("初期化エラー:", error);
    generateBtn.textContent = 'エラー';
    resultDiv.textContent = 'データの読み込みに失敗しました。コンソールを確認してください。';
  }
});