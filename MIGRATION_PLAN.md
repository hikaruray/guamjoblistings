# GuamJobs 移設計画（HostUpon撤退 → Xserver＋Vercel）

作成: 2026-07-17 秘書くん ／ 前提: 棚卸し `INVENTORY_2026-07-17.md` 完了後
オーナー方針（2026-07-17）: **WordPress継続は不要。判断は秘書くん・Jobくんに一任。HostUponで買ったドメインとサーバーをXserverへ移し、HostUponへの支払いを止めたい。**

---

## 決定事項（一任を受けて決定）

| # | 決定 | 理由 |
|---|---|---|
| 1 | **WordPressは移設しない。終了させる** | オーナー方針。棚卸しの結果、守る資産は**ブログ9本のみ**。求人5件・企業2件（仮名）・履歴書55件（負債）に移行価値なし |
| 2 | **サイト＝Next.js版（Vercel）** | 既に `guamjoblistings.vercel.app` に存在。WordPressをXserverへ移すのは二重投資 |
| 3 | **ブログ9本は同一URLで移植してから切替** | Mokaruの125URL 404事故の直接の教訓。実用記事＝SEO資産 |
| 4 | **メール＝Xserver（既存契約に相乗り）** | 追加費用ゼロ。Mokaruで既にXserver契約あり＝ドメイン追加は無料枠内 |
| 5 | **ドメインはXserverへ「移管」する** | 🔴 **NS変更だけでは登録料をHostUponに払い続ける。オーナーのゴール＝支払い停止 → 移管が必須** |
| 6 | **順番＝①履歴書を止める ②移植 ③メール ④DNS ⑤検証 ⑥移管 ⑦解約** | 下記 |

> 🔴 **memoryの「ドメイン移管は不要」は"サーバーだけ移す場合"の話。** オーナーの目的（支払い停止）には**移管が要る**。ここを取り違えると「移したのに請求が止まらない」。

---

## 目標コスト

| | 現在 | 移設後 |
|---|---|---|
| HostUpon | 支払い中（金額・更新日**未確認**） | **$0（解約）** |
| Xserver サーバー | Mokaruで契約済 | **追加費用なし**（ドメイン追加は無料枠） |
| Xserver ドメイン | — | `.com` 更新料のみ（**移管時に+1年分**） |
| Vercel | 無料枠 | 無料枠 |

→ **実質、ドメイン更新料だけになる。**

---

## 実行順序（この順を守る）

### Phase 0 ✅ 履歴書の公開を止める【2026-07-17 完了】

> **✅ 封鎖完了（2026-07-17・秘書くん実測で検証済み）**
> - **PDF 65本すべて削除＝残 0本**
> - Googleにインデックスされていた `118_Sandra-Castros-Resume.rtf-2.pdf` → **404**
> - ディレクトリ一覧 → **403（No Indexing 反映済み）**
> - **残＝Search Consoleの削除申請の反映確認**（プレフィックス `/wp-content/uploads/` と `/resume/`。反映まで1日程度）
>
> 以下は発覚時の記録（経緯として保存）。

WordPressを畳むにしても、**畳み終わるまでの数週間〜数か月、露出し続ける**。今止める。

#### 実態（2026-07-17 WP管理画面＋実測で判明・当初の想定より悪い）

- 🔴 **ディレクトリ一覧が有効**：`/wp-content/uploads/2024/08/` を開くと `Index of ...` が表示され、**PDFが一覧・一括ダウンロードできる**。Google経由ですらなく**フォルダURLを開くだけ**
- **PDFは合計65本**（sitemapの55件より多い＝**Resumeとして登録されていないものが10本ある**）

  | フォルダ | PDF数 |
  |---|---|
  | `/wp-content/uploads/2024/07/` | 2 |
  | `/wp-content/uploads/2024/08/` | **52** |
  | `/wp-content/uploads/2024/09/` | 3 |
  | `/wp-content/uploads/2024/11/` | 1 |
  | `/wp-content/uploads/2025/06/` | 1 |
  | `/wp-content/uploads/2025/11/` | 6 |
  | **合計** | **65** |

- 🔴 **Media Libraryに存在しない**（オーナー確認済）＝PremiumPressテーマがWPの管理外に直接書き込んでいる。**WP管理画面からは削除できない＝ファイル操作が必須**
- 🔴 **Resume 57件をゴミ箱に入れても解決しない**。消えるのは `/resume/` ページだけで、**Googleがインデックスしているのは `/wp-content/uploads/...pdf` のファイル本体**＝残る
- **Resume 57件（Published 55 / Drafts 2）は全て Author `Isagani2024` の1アカウントが 2024/08/29 17:41〜17:48 の7分間で一括投稿**＝応募フロー経由の自然な蓄積ではない。**本人たちがサイト掲載を知らない可能性**＝当事者リスクはむしろ高い

#### 手順（この順）

1. **cPanel → Indexes → 「No Indexing」**（60秒）→ ディレクトリ一覧を即停止。※直リンクは生きたまま＝**応急処置**
2. 🔴 **cPanel → File Manager → 上表6フォルダのPDF 65本を削除**（**本丸**。これをやらないと意味がない）
   - **バックアップは取らない方針を推奨**＝使い道がなく、持っているだけで負債（データ最小化）。2024年の求職者はとっくに転職済み。※控えを残すか否かは最終的にオーナー判断
3. **WP管理画面 → Resume 57件を全選択 → Move to Trash → ゴミ箱を空に**（`/resume/`ページの除去。Screen Optionsで表示件数を100にすると一度に選べる）
4. **Search Console の削除ツールでURL削除申請**
   - ✅ **Site Kit導入済み**＝Search Consoleが既に連携されている可能性が高い（要確認）。連携済みなら登録・所有権確認は不要で即申請できる
   - ※ファイル削除だけではGoogleの索引から即座には消えない。**削除申請まででワンセット**
5. ユーザー37件の `/author/` 公開も併せて止める（プラグイン設定 or 畳む時に消える）

> **Phase 0が終わるまで、Phase 4（DNS切替）に進まない。** 移設しても露出は一緒に引っ越すだけ。

### Phase 1 ブログ9本をNext.js版へ移植【Jobくん・無料・可逆】

> **✅ アーカイブ完了（2026-07-17・秘書くん）→ `legacy-archive/`**
> **記事9本（本文4,570〜8,644字・全件中身あり）／固定ページ22本／画像75点（22MB・原本）／0バイトファイル0件**を取得・検証済み。索引 `legacy-archive/MANIFEST.md`。
> **🔴 解約後は二度と取れないデータの確保は完了＝HostUpon解約のブロッカーが1つ外れた。**
> ※サーバー上の画像142点のうち67点はWP自動生成のサムネイル。**原本75点があれば再生成できる**ため意図的に除外。
>
> **✅ Next.js版への実装 完了（2026-07-18・Jobくん）。** 9本すべて**元の同一URL**（ルート直下 `/…`）で表示。
> - データ: `src/lib/blog-posts.ts`（アーカイブJSONから生成・画像URLは自ホスト相対に書換）／画像75点を `public/wp-content/uploads/<元パス>` に配置＝**元の画像URLも維持**
> - ルート: `src/app/[slug]/page.tsx`（SSG・9slugのみ有効・他は404）＋一覧 `src/app/blog/page.tsx`／`sitemap.ts` に9本追加／`next.config.ts` で `/index.php/*` を301正規化
> - 検証: `npm run build` 成功（9本ともSSGプリレンダ）・本文画像の欠落0・トレイリングスラッシュ付き旧URLは308で正規化・不明slugは404
> - ⬜ 残: **本番反映**（Phase 3の独自ドメイン接続時に一緒に。今はローカル＋Vercelプレビューのみ）。GSC「上位ページ」は**データ無し**が判明したため優先順位付けは不要＝**全9本移植で確定**。

**同一URLで**移植する。Mokaruの事故はこれを怠って起きた。

| 移植するURL |
|---|
| `/elevating-your-job-search-in-guam-the-power-of-a-well-crafted-resume/` |
| `/mastering-the-follow-up-navigating-job-application-follow-ups-in-guam/` |
| `/navigating-your-resignation-leaving-on-a-high-note/` |
| `/understanding-minimum-wage-on-guam-ensuring-fair-pay-for-all-employees/` |
| `/understanding-hourly-vs-salary-workers-pros-cons-and-considerations/` |
| `/understanding-workplace-injuries-rights-liabilities-and-reporting/` |
| `/understanding-payroll-deductions-what-employers-can-and-cannot-deduct-from-your-paycheck/` |
| `/understanding-employee-leave-maternity-leave-family-medical-leave-act-and-other-leave-options/` |
| `/understanding-401k-plans-benefits-for-employees/` |

- **本文を先にリポジトリへアーカイブ**（Mokaruの `legacy-archive/` と同じ形）。HostUpon解約後は二度と取れない
- 固定ページ23本のうち残すもの（About / How it works / Contact 等）も同様に確認
- ⚠️ `/index.php/blog/` `/index.php/contact/` という**index.php付きURLもインデックスされている**（実測）。移植時に301で正規化

### Phase 2 Xserverでメールを準備【オーナー】

- Xserverに `guamjoblisting.com` を追加（ドメイン設定）
- **同名2アドレスを作成**：`mainoffice@guamjoblisting.com` / `admin@guamjoblisting.com`
  - **過去メールの移行は不要**（オーナー確認済）＝アドレスが存在すればよい
- 🔴 **切替前にHostUponで確認**：①転送設定の有無（あればXserver側で再設定）②Gmailの「送信元として使う(Send mail as)」の有無（あればSMTP設定の更新が必要）

### Phase 3 Vercel側の受け入れ準備【Jobくん】

- Next.js版に独自ドメインを追加（Vercel側の設定）
- ブログ9本が同一URLで出ることをプレビューで確認
- ⚠️ **Vercelプロジェクト名は `guamjoblistings`（複数形）でドメインと綴りが違う**。混同注意

### Phase 4 NS変更＋DNS設定【オーナー・要注意】

**ここが最も危険。** 現状 **MX = `guamjoblisting.com` 自身**＝Aレコードで解決される同じホスト。**Aレコードを変えた瞬間にメールが死ぬ。**

1. NSを HostUpon → **Xserver** へ変更
2. Xserver DNSで設定：
   - **A / CNAME → Vercel**（サイト）
   - **MX → Xserverのメールサーバー**（`sv####.xserver.jp` 形式）
   - **SPF / DKIM** をXserver向けに設定
3. ⚠️ **MXをXserverに向けてから／同時に** Aレコードを変える。順序を誤るとメールが落ちる

### Phase 5 検証【切替後すぐ】

- [ ] サイト表示（apexが正規。wwwはapexへリダイレクトを維持）
- [ ] **ブログ9本が同一URLで200**（Mokaruの教訓＝ここを必ず見る）
- [ ] **メール受信**（`mainoffice@` `admin@` の両方に外部から送って着信確認）
- [ ] **メール送信**（両アドレスから外部へ）
- [ ] 旧 `/resume/` `/listing/` が404になっていること（＝露出停止の確認）

### Phase 6 ドメイン移管（HostUpon → Xserver Domain）【オーナー】

**Phase 5で全部OKになってから。** 移管は5〜7日かかるが、その間もNS＝Xserverなのでサイトもメールも動き続ける。

- HostUponで：**ドメインロック解除** → **AuthCode（認証コード）取得**
- Xserver Domainで移管申請 → 承認メールに応答
- ⚠️ **60日ルール**：ドメインの登録・前回移管から60日以内は移管できない。**登録日を要確認**
- ⚠️ 移管すると**有効期限が+1年**（料金が発生。これは移管の仕様）
- ⚠️ HostUponは解約を渋ってロック解除・AuthCode発行を引き延ばす可能性がある。**早めに着手**

### Phase 7 HostUpon解約【最後】

🔴 **移管完了を確認してから。** 先に解約するとドメインが失効・移管不能になる恐れ。

- 解約前に確認：**契約更新日／違約金の有無／日割り返金の有無**（すべて**未確認**）

---

## 未確認・オーナーしか分からないこと

1. **HostUponの契約金額・更新日・違約金**（＝いつ動くと一番損しないか）
2. **ドメインの登録日**（60日ルールに引っかかるか）
3. **2026-07-14/15に更新された求人2件は誰の操作か**。🔴 **実在の雇用主なら、畳む前に一報が要る**（黙って消すと信用を失う）
4. HostUponの転送設定／Gmailの「送信元として使う」
5. Search Consoleが既に登録済みか（登録済みなら履歴データあり＝流入の実態が分かる）
6. ⚠️ **オーナーは「Hostingerで運営中」と申告したが、実測NSは HostUpon**。**管理画面がどちらか未確認**（`INVENTORY` / memory参照）

---

## リスクと対策

| リスク | 対策 |
|---|---|
| 🔴 Aレコード変更でメール即死（MX＝ドメイン自身） | Phase 2で先にXserverにメールを用意し、MXをXserverへ向けてからA変更 |
| 🔴 ブログ9本が404（Mokaruの再演） | Phase 1で同一URL移植＋Phase 5で全URL 200を確認してから解約 |
| 🔴 解約後に旧サイトの中身が取れなくなる | Phase 1で**本文をリポジトリへアーカイブ**（解約前に必ず） |
| HostUponがAuthCodeを渋る | Phase 6を早めに着手。解約(Phase 7)は移管完了後 |
| Next.js版が空の求人サイトとして公開される | 現WordPressも実質休眠（求人2件）＝**実害は小さい**。むしろ露出停止の利が勝つ |
| 履歴書がGoogleに残り続ける | Phase 0でファイル削除＋Search Console削除申請（**両方**） |

---

## 次の一手

**Phase 0 の①（WP管理画面で履歴書を1件開いて確認）だけ、今日。** それ以外は待てる。
