/* 一次性补丁：配图里的文字一律改成**原试卷的语言**（ICAS 2022 是英文卷）。
   用户要求「所有题目的配图都改成原试题的语言，不要随便翻译成中文」。
   question-bank.json 会被 merge-bank.js 用 imports/ 覆盖，所以两个文件必须同时改。 */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const FILES = ['data/question-bank.json', 'data/imports/icas-2022-year2-math.json'];

function patch(t) {
  switch (t.id) {
    /* Q9 象形统计图：原卷队名是 Tigers / Eels / Hawks / Bees，KEY 写 "= 1 goal"。
       选项必须和图上的英文队名对得上（否则中文模式的孩子没法把"老虎队"对上 Tigers）。 */
    case 'icas22y2m-09':
      t.diagram.labels = ['Tigers', 'Eels', 'Hawks', 'Bees'];
      t.diagram.unit = 'goal';
      t.answer.options = [
        { zh: 'Tigers', en: 'Tigers' },
        { zh: 'Eels', en: 'Eels' },
        { zh: 'Hawks', en: 'Hawks' },
        { zh: 'Bees', en: 'Bees' }
      ];
      t.stem.zh = '下图是四支球队上一场比赛进球数的象形统计图（每个球代表 1 个进球）。哪一支队进的球正好比 Hawks（鹰队）多 2 个？';
      t.solution.zh = '先从图上数出 Hawks 是 {c2} 个球。比 {c2} 多 2 就是 {T} 个，再到图上找进球数是 {T} 的那一支，就是答案。';
      break;

    /* Q22 季节圆盘：图上的季节名是 spring / summer / autumn / winter，选项也用这些词 */
    case 'icas22y2m-22':
      t.answer.options = [
        { zh: 'spring', en: 'spring' },
        { zh: 'summer', en: 'summer' },
        { zh: 'autumn', en: 'autumn' },
        { zh: 'winter', en: 'winter' }
      ];
      t.stem.zh = '圆盘上标出了悉尼每个月属于哪个季节（图上写着 spring / summer / autumn / winter）。悉尼 {m} 月是什么季节？';
      t.solution.zh = '看图上的圆盘：spring 9–11 月、summer 12–2 月、autumn 3–5 月、winter 6–8 月。{m} 月落在标着对应季节名的那一段上。';
      break;

    /* Q25 三张纸：图上标签是 blue / red / yellow，题干里指代时补上英文，便于对上 */
    case 'icas22y2m-25':
      t.stem.zh = '鲍比有三张长方形纸，下图按实际大小画出了它们（同样宽，长度不同）。黄色（yellow）纸的大小是红色（red）纸的 {m} 倍，红色纸是蓝色（blue）纸的 {k} 倍。一张黄色纸能正好铺满多少张蓝色纸？';
      break;

    /* Q14 划记统计表：原卷车辆名 Cars / Bikes / Trucks / Buses，且**没有表头** */
    case 'icas22y2m-14':
      t.diagram.rows.forEach(function (r, i) {
        r.label = ['Cars', 'Bikes', 'Trucks', 'Buses'][i];
      });
      break;

    /* Q18 围圈倒数：原卷四个人是 Sue / Jim / Dave / Kate，选项也用这些名字
       （图里只有英文名，选项若是"甲乙丙丁"就没人能对上） */
    case 'icas22y2m-18':
      t.answer.options = [
        { zh: 'Sue', en: 'Sue' },
        { zh: 'Jim', en: 'Jim' },
        { zh: 'Dave', en: 'Dave' },
        { zh: 'Kate', en: 'Kate' }
      ];
      t.stem.zh = '四个小伙伴（Sue、Jim、Dave、Kate）围成一圈轮流往下倒数，数数的顺序和头几个数如下图。照这样数下去，「{n}」会轮到谁说？';
      t.stem.en = 'Four friends (Sue, Jim, Dave and Kate) take turns counting backwards around a circle; the order and the first few numbers are shown below. Who will say "{n}"?';
      t.solution.zh = '从图上看，四个人的顺序是 Sue → Jim → Dave → Kate（Sue 是第 1 个），依次报一个数，轮一圈。\n' +
        '从 {S} 数到 {n} 一共报了 {S}−{n}＝{S-n} 个数，{S-n}÷4 的余数是 {(S-n)%4}，所以要数到顺序里的第 {(S-n)%4+1} 个人（第 1 个是 Sue）。';
      t.solution.en = 'From the picture the order is Sue → Jim → Dave → Kate (Sue is 1st) and the four repeat round the circle.\n' +
        'Counting from {S} down to {n} takes {S}−{n}＝{S-n} numbers; {S-n}÷4 leaves remainder {(S-n)%4}, so it is number {(S-n)%4+1} in that order (number 1 is Sue).';
      break;

    /* Q27 数据表：原卷两级表头
       Minutes after Tina starts counting | Number of birds → Arrive / Fly away */
    case 'icas22y2m-27':
      t.diagram.cols = ['Minutes after Tina starts counting', 'Arrive', 'Fly away'];
      t.diagram.widths = [232, 92, 92];
      t.diagram.groups = [{ label: 'Number of birds', from: 1, to: 2 }];
      break;

    /* Q28 积木塔：原卷颜色名写在积木上 yellow / blue / green / pink（第 5 块是变式加的） */
    case 'icas22y2m-28':
      t.diagram.labels = ['yellow', 'blue', 'green', 'pink', 'purple'];
      t.stem.zh = '吉娜有 {n} 块颜色不同的积木（见下图，每块颜色都不一样，颜色名写在积木上）。她想搭一座 {n} 层的高塔，其中绿色（green）积木必须在最底层。她能搭出多少座不一样的塔？';
      t.solution.zh = '绿色（green）积木已经固定在最底层，剩下 {n-1} 个位置要把 {n-1} 种颜色的积木排进去：第一个位置有 {n-1} 种选法，第二个有 {n-2} 种，第三个有 {n-3} 种，所以一共 {n-1}×{n-2}×{n-3}＝{(n-1)*(n-2)*(n-3)} 座。';
      break;
  }
  return t;
}

let bad = 0;
FILES.forEach(function (rel) {
  const p = path.join(root, rel);
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = j.templates || j;
  const changed = [];
  list.forEach(function (t) { const before = JSON.stringify(t); patch(t); if (JSON.stringify(t) !== before) changed.push(t.id); });
  fs.writeFileSync(p, JSON.stringify(j, null, 2), 'utf8');
  if (!changed.length) bad++;
  console.log('已更新 ' + rel + '：' + (changed.length ? changed.join(', ') : '（无变化）'));
});
if (bad) { console.error('✗ 一个模板都没改到，请检查 id'); process.exit(1); }
console.log('✓ 配图文字已改为原卷英文');
