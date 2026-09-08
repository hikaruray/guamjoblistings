# 企業向け営業キット（GuamJobs / フェーズ0）

作成: 秘書くん / 2026-09-08
目的: **実在企業に最初の求人を載せてもらう**。フェーズ1（アドオン課金）の条件＝20〜30社は、ここを越えないと始まらない。

---

## 0. 前提として直視すること

🔴 **2026-09-08 時点で `guamjoblisting.com/jobs` は「0 jobs found」。** サイトは空。

これは営業の文面に直接影響する。**「たくさんの求職者が見ています」とは言えない。**
言えば1回目は通るかもしれないが、相手がサイトを開いた瞬間に嘘だとわかる。**グアムは狭い**（オーナー自身がツアー会社を経営していて、相手と業界が重なる）。信用を落とすコストのほうが高い。

**したがってこのキットの全文は「空であることを前提に、それでも載せる理由がある」という組み立てになっている。**

### 今の時点で正直に言える価値（すべて実装済み・確認済み）

| 言えること | 根拠 |
|---|---|
| **完全無料。カード登録も不要** | 決済の環境変数が未設定＝課金UIは表示されない。フェーズ0の方針 |
| **3分で出せる**（承認制・当日中に公開） | `/post-a-job` → Admin承認 |
| **応募者の個人情報はログインの内側**。メールに履歴書や連絡先を載せない | 2026-09-04 の監査で実装・確認済み |
| **グアム専門**。Indeedのように世界中の求人に埋もれない | — |
| **地元競合は有料**（GuamJobsOnline は1掲載30日の都度課金） | 競合調査（monetization-proposals.md 第1章） |

### 言ってはいけないこと（burn したら戻せない）

- ❌ 「多くの求職者が見ています」「応募が来ます」 → **今は来ない可能性が高い。約束しない**
- ❌ 「他社も多数掲載中」 → 0件。**数を匂わせない**
- ❌ 期限を切った煽り（「今だけ無料」）→ 実際は方針として当面ずっと無料。嘘になる
- ❌ 過去のWordPress版の応募者数（2024年の55件）を実績として使う → **2026年の応募はゼロ**。文脈を切って使えば誇大

---

## 1. 一番効く順番（オーナー向け）

**冷たいメールより、温かい紹介が10倍効く。** 特に最初の3社は。

| 優先 | 相手 | 理由 |
|:--:|---|---|
| **1** | **Mokaru Guam の取引先・知り合いの経営者** | オーナー本人が顔を知っている。「新しく求人サイトを作った、無料だから試しに1件載せてくれないか」で済む。**最初の3社はここから取るのが一番早い** |
| **2** | **今まさに採用している会社**（下記リスト Tier A） | 採用意欲が実証済み。Indeed等に出している＝手間やお金をかけている＝無料の追加枠は断る理由が薄い |
| 3 | GHRA（Guam Hotel & Restaurant Association） | ホテルと飲食を束ねる業界団体。1本通れば会員に届く。ただし団体は動きが遅く、実績ゼロの新サイトを会員に紹介するのは慎重になる。**Tier A で数社の実績を作ってから当てる方が通りやすい** |
| 4 | 冷たいメール | 最後の手段。返信率は期待しない |

---

## 2. メール文面（英語・そのまま使える）

### A. 冷たいメール — 今採用中の会社あて

> **Subject:** Free job posting for [COMPANY] on a new Guam-only job board
>
> Hi [NAME],
>
> I saw [COMPANY] is hiring for [POSITION]. I run Guam Job Listings
> (guamjoblisting.com), a job board built only for Guam employers.
>
> I'll be straight with you: the board is new and we're still filling it, so
> I'm not going to promise you a flood of applicants. What I can offer is
> this — posting is completely free, there's no card and no subscription,
> and it takes about three minutes. If it brings you one good hire, it cost
> you nothing. If it brings you nothing, you've lost three minutes.
>
> Two things that may matter to you:
>
> - Applications stay behind a login on our side. We don't email resumes or
>   applicant contact details around, which is more than I can say for how
>   most listings get handled here.
> - It's Guam only. Your opening isn't competing with 40,000 listings from
>   the mainland.
>
> If you'd like, I can post your current opening for you — just reply with
> the details and I'll set it up, or you can do it yourself here:
> https://guamjoblisting.com/post-a-job
>
> Thanks for your time,
> Yasushi Nishihira
> Guam Job Listings

**なぜこの書き方か**
- **2段落目で先に弱みを認めている。** 相手はどうせサイトを見て0件に気づく。先に言えば「正直な相手」になり、後で言われれば「盛った相手」になる
- 「3分失うだけ」＝**リスクをゼロと感じさせる**のが唯一の武器。無料であること自体は武器にならない（無料のものは価値も無いと思われる）
- **代理投稿を申し出ている。** 相手の手間を3分からゼロにする。最初の数社はこれで取る

### B. 対面・電話のあとに送る短い版

> **Subject:** As promised — your posting on Guam Job Listings
>
> Hi [NAME],
>
> Good to talk today. As promised, here's the link to post your opening —
> free, no card needed: https://guamjoblisting.com/post-a-job
>
> Or send me the job details and I'll put it up for you today.
>
> Yasushi

### C. GHRA（業界団体）あて — Tier A で実績が出てから

> **Subject:** A free job board for GHRA members — Guam Job Listings
>
> Hello,
>
> I run Guam Job Listings (guamjoblisting.com), a job board for Guam
> employers only. Posting is free — no fee, no subscription, no card.
>
> Several GHRA member properties are already posting with us [← ここは実績が
> できてから。無ければこの一文を消す]. Given how much hotel and restaurant
> hiring turns over here, I'd like to offer it to members generally rather
> than approaching properties one at a time.
>
> Would you be open to a short conversation about listing it as a member
> resource? Happy to walk through it in person.
>
> Yasushi Nishihira

🔴 **実績が無いうちに C を送らない。** 「already posting with us」を空で書けば嘘になり、団体相手に一度嘘をつくと会員全体に届かなくなる。

---

## 3. 想定質問と答え（Q&A）

| 相手の質問 | 答え |
|---|---|
| **「いくら？」** | 無料です。カードも要りません。当面ずっと無料で、有料にするとしても、目立たせたい人向けの追加オプションを作るだけで、掲載自体は無料のままです |
| **「なぜ無料？」** | サイトが空だからです。まず載せてもらわないと求職者も来ない。正直に言うと、御社に最初のうちの1社になってもらいたい |
| **「応募は来るのか？」** | **約束しません。** 今は新しいボードなので、すぐには来ないかもしれない。無料なので、来なかったときに失うものが無いようにしてあります |
| **「Indeedに出してるから要らない」** | 併用でいいんです。うちに出しても、Indeedの掲載は何も変わりません。3分で、無料です |
| **「応募者の情報はどう扱われる？」** | 応募内容はログインした御社しか見られません。メールに履歴書や応募者の連絡先は載せません |
| **「怪しくない？」** | グアムでツアー会社（Mokaru Guam）をやっている西平です。地元の人間です。会いに行きます |
| **「掲載期間は？」** | 10日間で、無料で何度でも更新できます |
| **「後から有料になるのでは？」** | 掲載自体を有料にする予定はありません。有料にするなら上位表示などの追加オプションで、そのときも事前にお知らせします |

---

## 4. 最初の3社に何をするか（重要）

最初に載せてくれた企業は、**サイトが空だと知りながら賭けてくれた人たち**。ここを雑に扱うと二度目が無い。

- **代理投稿する。** 求人票の文面もこちらで整える
- **1週間後に必ず連絡する。** 応募がゼロだったなら、ゼロだったと自分から言う。黙って放置しない
- 応募が来なかった場合に何をするかを先に決めておく＝**求職者側をどう集めるかが次の課題**（このキットの範囲外だが、必ず来る問題）

---

## 5. このキットの限界（正直に）

- **求職者側の集客プランはここに無い。** 企業を集めても応募が来なければ2回目の掲載は無い。鶏卵問題の片側しか解いていない
- **返信率の想定値を持っていない。** グアムの中小企業がこの種のメールにどう反応するかのデータは無く、推測で数字を書くのは避けた
- **代理投稿はオーナーの時間を使う。** 3社までは有効だが、20社には拡張しない。どこかで企業自身に投稿させる導線に切り替える必要がある
