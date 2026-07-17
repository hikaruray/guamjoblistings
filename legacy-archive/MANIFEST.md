# GuamJobs 旧WordPress アーカイブ

取得: 2026-07-17 ／ 取得元: `https://guamjoblisting.com`（HostUpon・WordPress・PremiumPressテーマ）
取得方法: WordPress REST API（`/wp-json/wp/v2/`）＋ 添付画像の実ファイル。**読み取りのみ・サイトは無変更**。

> 🔴 **これはHostUpon解約後、二度と取得できないデータ。** Mokaruで「記事のテキストは保管したが**画像はサーバーが唯一のコピー**」となり、解約前のダウンロードが宿題として残っている（`memory/mokaru-legacy-articles-on-xserver`）。GuamJobsでは**テキストと画像を同時に確保した**。

## 中身

| | 件数 | 場所 |
|---|---|---|
| ブログ記事 | **9** | `posts/<slug>.json` |
| 固定ページ | **22** | `pages/<slug>.json` |
| 画像（メディアライブラリ原本） | **75**（22MB） | `images/` |
| 索引 | — | `_index.json` |
| 画像URL対応表 | — | `media-manifest.json` |

- JSONはREST APIのレスポンスそのまま。本文は `content.rendered` にHTMLで入っている（実測 4,570〜8,644字／本＝全件中身あり）。
- 画像のファイル名は元パスの `/` を `__` に置換（例: `2024/08/IMG_5408.jpeg` → `2024__08__IMG_5408.jpeg`）。元URLとの対応は `media-manifest.json` を参照。
- ⚠️ サーバー上の画像ファイルは実測142点あったが、うち67点はWordPressが自動生成したサムネイル/リサイズ版。**原本75点を保全すれば再生成できる**ため、原本のみ取得している。

## 🔴 移植時に必ず維持するURL（ブログ9本）

Mokaruで**旧126URL中125本を404にした事故**の直接の教訓。Next.js版へ移す際、**このパスのまま**出すこと。

| 元URL（維持必須） | タイトル | 公開日 |
|---|---|---|
| `/understanding-401k-plans-benefits-for-employees/` | Understanding 401(k) Plans: Benefits for Employees | 2024-07-28 |
| `/understanding-employee-leave-maternity-leave-family-medical-leave-act-and-other-leave-options/` | Understanding Employee Leave: Maternity Leave, Family Medical Leave Act, and Other Leave Options | 2024-07-28 |
| `/understanding-payroll-deductions-what-employers-can-and-cannot-deduct-from-your-paycheck/` | Understanding Payroll Deductions: What Employers Can and Cannot Deduct from Your Paycheck | 2024-07-28 |
| `/understanding-workplace-injuries-rights-liabilities-and-reporting/` | Understanding Workplace Injuries: Rights, Liabilities, and Reporting | 2024-07-28 |
| `/understanding-hourly-vs-salary-workers-pros-cons-and-considerations/` | Understanding Hourly vs. Salary Workers: Pros, Cons, and Considerations | 2024-07-28 |
| `/understanding-minimum-wage-on-guam-ensuring-fair-pay-for-all-employees/` | Understanding Minimum Wage on Guam: Ensuring Fair Pay for All Employees | 2024-07-28 |
| `/navigating-your-resignation-leaving-on-a-high-note/` | Navigating Your Resignation: Leaving on a High Note | 2024-03-31 |
| `/mastering-the-follow-up-navigating-job-application-follow-ups-in-guam/` | Mastering the Follow-Up: Navigating Job Application Follow-Ups in Guam | 2024-03-31 |
| `/elevating-your-job-search-in-guam-the-power-of-a-well-crafted-resume/` | Elevating Your Job Search in Guam: The Power of a Well-Crafted Resume | 2024-03-31 |

- ⚠️ `/index.php/blog/` `/index.php/contact/` という **index.php付きの重複URLもインデックスされている**（実測）。移植時に301で正規化する。
- **どの記事が実際に読まれているかは Search Console の「上位ページ」で確認**（未取得）。移植の優先順位はそこで決める。全体の検索流入は**年約300クリック**（Site Kit実測：28日で96人・Organic Search 23.7%）。

## 固定ページ22本の扱い

**大半は移植不要。** PremiumPressテーマの機能ページ（テーマ側が生成するもの）で、Next.js版には対応する実装が既にあるか、不要なもの。

| 分類 | ページ | 判断 |
|---|---|---|
| **中身を確認する価値あり** | `/about-us/` `/how-it-works/` `/contact/` `/faq/` `/privacy/` `/terms/` `/advertising/` `/pricing/` `/memberships/` | 文章を流用できる可能性。**特に `/privacy/` `/terms/` は法務文面**として要確認 |
| テーマ機能ページ（移植不要） | `/stores/` `/stores-2/` `/categories/` `/category-list/` `/country-list/` `/country-list-2/` `/top-listings/` `/add-listing/` `/my-account/` `/blog/` `/callback/` `/testimonials/` | Next.js版の対応機能で置換 |
| 明らかに不要 | `/sample-page/` | WordPressの初期サンプル |

> ⚠️ `/stores-2/` `/country-list-2/` のような `-2` 付きの重複ページが複数ある＝テーマの再インストール等で二重に作られた形跡。移植不要。

## 移植しなかったもの（意図的）

| | 理由 |
|---|---|
| **履歴書 55件・PDF 65本** | 🔴 **2026-07-17に全削除（漏洩対応）。資産ではなく負債**。詳細 `../MIGRATION_PLAN.md` Phase 0 |
| 求人 5件 | 3件は2024年で陳腐化、2件のみ直近更新。移行するほどの中身がない |
| 企業（store）2件 | `company-name-1` / `company-name-15` ＝**仮名のまま** |
| ユーザー 37件 | 応募者・企業アカウント。実質休眠（2026年の応募ゼロ） |
| 自動生成サムネイル 67点 | 原本75点から再生成可能 |

## 復元・移植の手順（Jobくん向け）

1. `posts/<slug>.json` の `content.rendered` がHTML本文。`title.rendered` `date` `link` も入っている。
2. 本文中の画像URLは `https://guamjoblisting.com/wp-content/uploads/...` のまま。**移植時に自ホストのパスへ置換**する（`media-manifest.json` に元URL→保存ファイル名の対応表）。
3. 画像を `public/` 等へ配置し、**URLは上表のパスを維持**して出す。
4. ⚠️ このリポジトリのNext.jsは**通常と異なる**（`../AGENTS.md` 参照）。実装前に `node_modules/next/dist/docs/` の該当ガイドを読むこと。
