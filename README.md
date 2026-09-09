# 一次一百分 · 1attempt100marks

一个跑在 GitHub Pages 上的**纯静态**练习平台：一份真题 → 自动换数 → 无限套同思路题；错题自动回收、换新数字重考，直到真正掌握，之后不定期抽样检测。

- 在线地址：<https://dbsquared.github.io/1attempt100marks/>
- 学生端：`index.html`（练习 / 组卷 / 错题本 / 掌握度 / 题库管理）
- 无后端、无数据库、无账号，**所有学习数据只存在本机浏览器 localStorage**

---

## 它怎么工作

```
真题（图片/试卷）
   │  WorkBuddy 读图识别 → 写成"模板 JSON"（变量范围 + 答案公式 + 解析）
   ▼
data/question-bank.json
   │  浏览器随机抽数 → 每次生成一道"新数字、同思路"的题
   ▼
学生作答 → 本地判分 → 记录
   │
   ├─ 答对：连对 3 次 = 掌握 → 1/2/4/7/15/30/60 天后抽样检测
   └─ 答错：进错题本 → 下次测试自动带新数值同型题 → 直到掌握
```

## 功能

| 模块 | 说明 |
|---|---|
| 今日测试 | 错题优先 → 到期复习 → 适量新题型 → 补足；一题一卡、即时判分、答错给解析 |
| 只练错题 | 只做错题本里的题型，可单独"换组数字重练" |
| 抽样检测 | 已掌握但到期的题，按间隔重复重新抽考 |
| 按知识点练 | 从题库按 topic 抽题专项突破 |
| 组卷 | 按科目/知识点/范围（全部 / 错题 / 未掌握 / 新题）生成整套卷子，在线作答判分，也可打印成纸质卷 |
| 错题本 | 记录错几次、还需答对几次、上次错在哪、正确答案 |
| 掌握度 | 总体正确率 + 每个知识点的掌握进度条 + 最近作答流水 |
| 题库管理 | 导入 JSON（WorkBuddy 生成的）、预览变式、导出、备份/恢复、练习参数设置 |

## 判分能力

整数、小数（带容差）、分数（`3/4` / `6/8` / `0.75` 都算对）、带单位（`12米`）、百分数、`m:n` 形式的比、选择题（含多选）、简单代数式。

## 目录

```
index.html                 学生端（单页应用）
assets/css/style.css       样式（含深浅色、打印样式）
assets/js/expr.js          表达式求值器（无 eval）
assets/js/generator.js     模板 → 题目实例（随机抽数 + 约束 + 结果美观度兜底）
assets/js/grader.js        判分
assets/js/store.js         localStorage 持久化 + 题库装载
assets/js/srs.js           掌握度 / 错题调度 / 间隔重复
assets/js/app.js           界面逻辑
data/question-bank.json    题库（模板）
tools/test-bank.js         模板自检：每模板生成 300 次 + 判分自检
tools/test-srs.js          错题调度自检
tools/merge-bank.js        合并 data/imports/*.json 进主题库
inbox/                     放待识别的真题图片
assets/originals/          原题裁切图（模板里用 "image" 引用）
PIPELINE.md                真题入库流水线（给 WorkBuddy 看）
```

## 本地预览

```bash
cd 一次一百分
python -m http.server 8000      # 或 npx serve
# 打开 http://localhost:8000
```

必须用 http 打开（直接双击 `index.html` 会因 `fetch` 的 file:// 限制读不到题库）。

## 自检

```bash
node tools/test-bank.js     # 题库模板：每模板生成 300 次并检查判分
node tools/test-srs.js      # 错题 / 掌握 / 抽样调度链路
```

## 加新题（两种方式）

1. **长期生效**：把模板写进 `data/question-bank.json`（或 `data/imports/批次.json` 后 `node tools/merge-bank.js`），commit + push。
2. **立刻生效**：打开网页 → 题库管理 → 把 JSON 粘进输入框 → 导入（存在本机，别的设备看不到）。

模板怎么写见 `PIPELINE.md`。

## 注意

- 换设备/清缓存前，先在题库管理里**导出备份**。
- `git push` 请带 `GIT_TERMINAL_PROMPT=0`，否则多凭据条目时可能卡住。
