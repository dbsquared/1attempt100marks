# 一次一百分 · 1attempt100marks

一个跑在 GitHub Pages 上的**纯静态**练习平台：一份真题 → 自动换数 → 无限套同思路题；错题自动回收、换新数字重考，直到真正掌握，之后不定期抽样检测。

- 在线地址：<https://dbsquared.github.io/1attempt100marks/>
- 学生端：`index.html`（练习 / 组卷 / 错题本 / 掌握度 / 题库管理）
- 无后端、无数据库、无账号，**所有学习数据只存在本机浏览器 localStorage**
- 多设备同步：进度用一串**同步码**在设备间传递，**无需服务器**即可让平板/手机/电脑共用一份进度

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
assets/js/sync.js          多设备同步：同步码生成 / 解析 / 幂等合并（浏览器与 Node 共用）
assets/js/app.js           界面逻辑
data/question-bank.json    题库（模板）
data/state/<sid>.json      某学生编号的云端汇总进度（由 merge-sync.js 生成）
tools/test-bank.js         模板自检：每模板生成 300 次 + 判分自检
tools/test-srs.js          错题 / 掌握 / 抽样调度链路
tools/test-sync.js         同步码：往返 / 合并 / 冲突后写胜出 / 墓碑删除
tools/merge-sync.js        把一串同步码合并进 data/state/<sid>.json（WorkBuddy 端用）
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
node tools/test-sync.js     # 同步码：往返 / 合并 / 冲突后写胜出 / 墓碑删除
```

## 多设备同步（无需服务器）

进度只存在本机。想让平板、手机、电脑共用一份进度，靠一串**同步码**在设备间传递：

1. 在每台设备上打开「题库管理 → 多设备同步」，把**学生编号**设成同一个（这是云端"文件夹名"，决定进度存到 `data/state/<学生编号>.json`）。
2. 任意一台做完练习后：点「生成增量同步码」得到一串 `A1M1{...}` 文本 → 复制，或点「发邮件」发到你邮箱。
3. 回收进度，二选一：
   - **方式 A（自己合并）**：把同步码粘回网页「多设备同步」里的框 → 点「导入框里的同步码」，立即合并进本机。
   - **方式 B（交给 WorkBuddy）**：点网页上的「发到邮箱同步（粘回 WorkBuddy 合并）」按钮，会把这个学生的**可读答卷汇总 + 同步码**发到你邮箱；把邮件里的同步码贴回给 WorkBuddy，它跑 `node tools/merge-sync.js "A1M1{...}"` 把进度合并进 `data/state/<学生编号>.json` 并 commit，于是**所有设备**下次「拉取云端进度」就能拿到汇总进度。
4. 每台设备打开网页时会自动「拉取云端进度」（可在多设备同步页关闭），也可以手动点「拉取云端进度」。

**设计要点**

- 同步码是**增量**的（只含上次同步后的变动），重复发送幂等、不出错；被邮件客户端折行也能解析。
- 「已清零的错题」会带墓碑记录，别的设备也能同步删除。
- 不同学生编号分文件存放，互不干扰。
- 合并脚本既能直接收码，也能从文件读、支持 `--dry` 只预览不写盘：

```bash
node tools/merge-sync.js "A1M1{...}"          # 直接传码
node tools/merge-sync.js -f sync.txt          # 从文件读
node tools/merge-sync.js --dry "A1M1{...}"    # 只预览不写盘
```

## 加新题（两种方式）

1. **长期生效**：把模板写进 `data/question-bank.json`（或 `data/imports/批次.json` 后 `node tools/merge-bank.js`），commit + push。
2. **立刻生效**：打开网页 → 题库管理 → 把 JSON 粘进输入框 → 导入（存在本机，别的设备看不到）。

模板怎么写见 `PIPELINE.md`。

## 注意

- 换设备/清缓存前，先在题库管理里**导出备份**。
- 本机用 `node tools/gh-push.js "提交说明"` 直接通过 GitHub API 提交（本环境 git 走 HTTPS 会卡住，故不用 `git push`）。
