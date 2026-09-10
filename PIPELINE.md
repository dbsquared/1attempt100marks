# 真题入库流水线

> 这份文档是给 **WorkBuddy（未来的会话）** 看的操作手册。
> 用户把真题拍照/截图放进工作空间后，按本文件执行，即可把图片变成网页上可无限变形、自动判分的交互试题。

---

## 0. 一句话流程

```
inbox/ 里的真题图片
   → 读图识别题意
   → 写成「模板 JSON」（变量范围 + 答案公式）
   → node tools/test-bank.js 自检（必做）
   → 写入 data/question-bank.json（或 data/imports/*.json）
   → git commit + push → GitHub Pages 约 1 分钟生效
   → 把 JSON 也贴给用户，可在网页「题库管理 → 导入」即时生效（不必等部署）
```

---

## 1. 目录约定

```
inbox/                    用户放真题图片的地方（jpg/png/webp/pdf 转图）
assets/originals/         可选：原题裁切图，模板里用 "image": "assets/originals/xxx.png" 引用
data/question-bank.json   主题库（提交进仓库，所有设备可见）
data/imports/*.json       按批次拆分的题库（同样会被主题库合并，见下）
tools/test-bank.js        模板自检（生成 300 次 + 判分自检）
tools/test-srs.js         错题调度自检
tools/merge-bank.js       把 data/imports/*.json 合并进主题库
```

## 2. 读图 → 抽题

1. 用 Read 工具逐张读取 `inbox/` 里的图片。
2. 逐题识别：**题型、知识点、给出的数、要求的量、标准答案、解题步骤**。
3. 判断「哪些数字是可以换的」——**常量（如 π、单位进率、圆周率 3.14）不要换成变量**；
   只有题目里"随便给的一个数"才变成变量。
4. 一道真题 = 一个模板。**不要**把一道大题的多个小问拆成多个模板，除非它们答案互不依赖；
   若同一情境下多问（如"①求面积 ②求周长"），用同一个 `id` 前缀 `xxx-q1` / `xxx-q2`，并加 `"group":"xxx"`
   让变量一致（见 §6 高级）。

## 3. 模板字段

```jsonc
{
  "id": "m6-frac-add",              // 必填，全局唯一，建议 学段-知识点-序号
  "subject": "数学",                 // 科目
  "topic": "分数加减法",              // 知识点（用于专项练习与掌握度统计）
  "grade": "六年级",
  "difficulty": 2,                   // 1-5
  "title": "异分母分数加法",          // 列表页显示用的一句话描述
  "tags": ["分数", "计算"],
  "source": "2024 年 XX 区期末卷 第三大题第 1 小题",   // 真题出处（逐题，可带 " Q1" 之类编号）
  "sourceSet": "2024 年 XX 区期末卷",                  // 题集名；组卷「试题来源」按此聚合（可多选）。缺省时由 source 去掉末尾 " Qn" 推断
  "image": "assets/originals/xxx.png",                // 可选，静态原题图（仅固定答案的看图题用）
  "diagram": { "type": "numberline", "E": "E", "n": "n", "k": "k" },  // 可选，可变量 SVG 图形（见 §4.5）
  "unit": "平方厘米",                 // 可选，答案单位

  "stem": "计算：[[{a}/{b}]] ＋ [[{c}/{d}]] ＝",      // 题干，见 §4 排版语法
  "solution": "先通分：[[{a}/{b}]] ＝ [[{a*d}/{b*d}]]…", // 解析，学生答错时展示
  "hint": "先通分，再相加",            // 可选提示

  "vars": {                           // 随机变量
    "a": { "type": "int", "min": 1, "max": 8 },
    "b": { "type": "int", "min": 2, "max": 9, "step": 1 },   // step 可选
    "p": { "type": "dec", "min": 1.5, "max": 29.5, "digits": 1 },  // 小数
    "z": { "type": "pick", "from": [5, 6, 7, 8, 9] }               // 枚举
  },
  "derived": { "f": "2*h + 2*r" },    // 由上面变量算出的量（在 constraints 之前求值）

  "constraints": [ "a < b", "gcd(b,d) == 1", "(a*d + c*b) % (b*d) != 0" ],  // 必须全部为真

  "answer": {
    "type": "fraction",               // number|integer|fraction|text|choice|expression
    "expr": "a*d + c*b",              // 分子 / 数值 / 文本模板
    "denom": "b*d",                   // fraction 专用：分母
    "digits": 2,                      // number 专用：保留小数位（同时决定容差）
    "tolerance": 0.01,                // 可选，覆盖默认容差
    "options": ["{a} × {b}", "{a} ＋ {b}"],   // choice 专用
    "correctIndex": 0,                // choice 专用（多选时给数组）
    "alternatives": ["{m} : {n}"]     // text 专用：也接受的等价写法
  },

  "sanity": { "integer": true, "min": 1, "max": 30, "maxDen": 72, "maxDigits": 2 }
}
```

### answer.type 选择

| type | 适用 | 学生可填 |
|---|---|---|
| `integer` | 答案必为整数 | `12`、`12只` |
| `number` | 小数答案 | `3.14`、`75%` |
| `fraction` | 分数答案 | `3/4`、`6/8`、`0.75` 均可 |
| `text` | 比、比值、单位名等 | `1:3`（可用 alternatives 放宽） |
| `choice` | 选择题 | 点选项（支持多选） |
| `expression` | 代数式 | `3x+5`（会做等价规范化） |

## 4. 排版语法（stem / solution / hint 通用）

| 写法 | 效果 |
|---|---|
| `{a}` | 代入变量 a 的值 |
| `{a*d}` | 代入表达式 a×d 的值（可做四则运算，便于写"通分后是 24/56"） |
| `[[{a}/{b}]]` | 竖排分数 ½（网页端渲染成分数线，纯文本导出为 `a/b`） |
| `x^2` | 上标 x² |
| `x_1` | 下标 x₁ |

## 4.5 配图决策（每道题**必做**，顺序不可跳）

导入每道题时，按下面 4 步依次判断，**不要**等用户发现才补：

1. **需不需要配图？**
   - 题干里的数字/文字已经足够解题 → **不配图**，并顺手把题干里的「（见原题图）」删掉。
   - 图本身承载解题必需信息（看图数数、看图选形状、看图找位置、选项是图）→ 需要配图，继续第 2 步。
2. **能用符号或文字代替吗？**
   - 用 ◆▲● 代表图形、用列表/表格表示统计数字、把卡片数字直接写进题干 → 直接写进 `stem`，不配图。
3. **能用 SVG 模板按变量实时画吗？**
   - **凡题干里带变量的图，必须走这条**（静态原题图数值一变必然对不上）。
   - 模板加 `"diagram": { "type": "...", ... }`，参数写变量名（如 `{"type":"stick","parts":"k"}`）。
   - 现有类型见 `assets/js/diagrams.js`：`stick`(小棍分段) / `numberline`(数轴) / `hexagon`(六边形) /
     `squareposts`(正方形围栏) / `lanterns`(循环灯笼) / `vase`(花瓶数花) / `house`(房子缺形状) /
     `clocks`(四个钟面) / `bookshelf`(书架取书) / `seasonwheel`(四季圆盘) / `giftboxes`(四个礼物盒) /
     `coins`(硬币面值) / `tiling`(方砖缺块) / `board`(棋盘走子) / `pens`(猪圈赶猪)。
     需要新类型就在 diagrams.js 加一个函数并在本节登记。
4. **实在画不出来 / 拿不准？** 把该题单独列出来交给用户判断，**不要**默默留空或硬塞一张对不上的图。

> 判定口诀：**变量题禁止引用静态原题图**；固定答案的看图题可以保留静态原题图（`image`）。
> `node tools/test-bank.js` 会自动校验：题干提到「图」却没有 `image` / `diagram` 会直接 FAIL。

### 4.5.1 选项是图时：必须用 `answer.optionsSvg`（禁止用文字描述图形）

如果正确答案"是某个图形/某个格子"，**不能**把图形翻译成文字写进 `options`
（例如「第二行第二格是黄色的补块」——这等于把答案念出来了）。做法：

```json
"answer": {
  "type": "choice",
  "options": [{"zh":"甲"},{"zh":"乙"},{"zh":"丙"},{"zh":"丁"}],
  "optionsSvg": [
    {"type":"tilepatch","r":"r","c":"c","flip":-1},
    {"type":"tilepatch","r":"r","c":"c","flip":0},
    {"type":"tilepatch","r":"r","c":"c","flip":1},
    {"type":"tilepatch","r":"r","c":"c","flip":2}
  ],
  "correctIndex": 0
}
```

- `optionsSvg[i]` 与 `options[i]` 一一对应，生成器会**跟着选项一起洗牌**，不需要自己处理顺序。
- 选项文字用中性编号（甲/乙/丙/丁），不要用会泄题的描述。
- 目标位置随变量变化时，用 `derived` 算出每个候选的坐标（如 `o0r`/`o0c`），再在 spec 里写变量名。

### 4.6 变式检查（每道题**必做**）

模板的意义就是"换数出新题"。写完后必须确认它**真的能出变式**：

1. `node tools/test-bank.js` 会跑 300 次，统计**不同数值/形式**的数量。
2. **只有 1 个变式 ⇒ 直接 FAIL**，除非在模板上显式写明原因：
   ```json
   "figureTodo": "待画 X 的简化 SVG 并参数化"   // 或 "todo" / "noVariantReason"
   ```
   脚本会在结尾把这类"暂时欠着"的题集中打印出来，不会被遗忘。
3. 常见"假变式"原因：变量被写死（`min == max`）、`constraints` 过严导致只剩一种组合、
   图题保留了固定答案。**发现就改，不要靠用户截图来提醒。**

> 想看图形长什么样：`node tools/_preview_figs.js` 会生成 `tools/_figs-preview.html`，
> 每个配图模板出两个随机变式，肉眼核图用。

## 5. 表达式语法（constraints / answer.expr / derived）

- 运算：`+ - * / % ^`（`^` 为乘方），比较 `== != < <= > >=`，逻辑 `&& || !`
- 函数：`abs sqrt floor ceil round sign pow exp log min max gcd lcm roundTo(x,n) mod(a,b) fracPart`
- 常量：`pi` / `PI` / `e`

## 6. 高级

- **同一情境多问**：两个模板写完全相同的 `vars`/`constraints` 并加 `"group":"trip-01"`，
  网页端暂不强制同组同数（各自随机），因此**多问题建议合并到一个模板**，把多个空写成
  `"answer":{"type":"text","expr":"{s1}；{s2}"}` 这种组合答案，或拆成独立题干互不依赖。
- **避免生成不出来**：`constraints` 越紧，随机命中率越低。生成最多试 400 次，
  全部失败则该模板永远不出题。**写完必须跑自检**（见下）。
- **避免"答案太丑"**：用 `sanity`（`integer`、`maxDen`、`maxDigits`、`min`、`max`）兜底，
  比堆复杂约束更省事。

## 7. 自检（强制）

```bash
node tools/test-bank.js                    # 全库自检
node tools/test-bank.js data/imports/xx.json  # 只检新批次
```

输出 `✓ 全部模板通过` 才可提交。常见失败：

- `生成失败 300` —— 约束自相矛盾，放宽或改用 `sanity`
- `判分错 N` —— 答案表达式写错，或 `correctIndex` 与选项顺序不一致
- `不同数值 1` —— 变量范围太小，出不了几套不同的卷子

## 8. 入库与发布

1. 把新模板追加进 `data/question-bank.json` 的 `templates` 数组（或放进 `data/imports/批次名.json`）。
2. `node tools/test-bank.js` 通过。
3. `git add -A && git commit -m "题库：新增 XX 真题模板 N 条"`
4. `GIT_TERMINAL_PROMPT=0 git push origin main`（**必须**加 `GIT_TERMINAL_PROMPT=0`，否则凭据冲突会挂住）
5. GitHub Pages 约 30–60 秒后生效：<https://dbsquared.github.io/1attempt100marks/>
6. 把新模板的 JSON 一并回复给用户，用户可在网页「题库管理 → 导入」立刻使用，不必等部署。

## 9. 给学生/家长的说明口径

- 一份真题 → 换数字 → 无限套同思路题，**不是**简单重复同一道。
- 答错 → 进错题本 → 下次测试自动带**新数字**的同型题 → 连续答对 3 次才算掌握。
- 掌握后按 1/2/4/7/15/30/60 天**不定期抽样检测**，忘了就自动退回错题本。
- 所有数据只存在本机浏览器，不上传服务器；换设备用「导出/导入备份」迁移。
