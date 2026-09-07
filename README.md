# 宜蘭高架履約期程與付款管制

這是一套共用前端程式，北段、南段只使用不同 JSON 資料。

## GitHub Pages 建議網址

- 公開唯讀：在網址後加 `&view=1`

## 檔案結構

- `index.html`：共用主頁面
- `app.js`：所有計算與操作邏輯
- `style.css`：共用樣式
- `projects.json`：專案清單
- `data/south.json`：南段資料
- `data/north.json`：北段資料

## 更新資料的簡單流程

1. 在網頁中修改日期、契約分項金額、實際提送/核定日。
2. 按「匯出專案 JSON」。
3. 到 GitHub repository，將 `data/south.json` 或 `data/north.json` 以匯出的 JSON 覆蓋。
4. Commit 後，GitHub Pages 會顯示最新資料；commit history 亦可作修改歷程。

## 注意

目前 GitHub Pages 是靜態網站，因此「儲存本機」只會儲存在該瀏覽器，不會自動同步到其他使用者。若未來要多人直接在線編輯，建議再接 Supabase / Firebase 等中央資料庫並加入登入權限。

## GitHub Pages 啟用

Repository -> Settings -> Pages -> Build and deployment -> Deploy from a branch -> `main` / `(root)` -> Save。


## 單一網址切換北段 / 南段
首頁使用同一個網址。使用者可直接在頁面上方的「切換標段」按鈕，或工具列的標段下拉選單切換北段與南段。系統會記住該瀏覽器上次查看的標段，因此不再需要 `?project=north` / `?project=south` 兩套網址。公開唯讀模式仍可使用單一網址加 `?view=1`。
