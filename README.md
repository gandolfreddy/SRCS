# 即時點名系統 (Real-time Roll Call System)

這是一個基於 Deno 開發的即時教室點名系統，利用 WebSocket 技術實現管理員端與使用者端之間的即時資料同步。

## 技術堆疊 (Technology Stack)

- **伺服器端**：Deno (TypeScript)
- **客戶端**：HTML5, CSS3, JavaScript (原生)
- **即時通訊**：WebSocket API

## 主要功能

- **管理端介面**：管理員可以建立新的教室、新增學生名單，並監控目前的點名狀況。
- **使用者介面**：使用者可以查看可用的教室列表，並進入特定教室頁面進行點名。
- **即時同步**：所有的點名狀態變更都會即時回傳，並自動算繪到所有已連線的客戶端介面。
- **設定與管理**：透過 [deno.json](deno.json) 進行開發任務設定，保證開發環境的一致性。

## 檔案架構

- [index.html](index.html)：系統入口網頁，用於顯示目前的教室列表。
- [admin.html](admin.html)：管理員專用介面，提供建立與管理教室的功能。
- [classroom.html](classroom.html)：個別教室的點名作業介面。
- [server.ts](server.ts)：後端核心程式，負責處理 HTTP 請求與 WebSocket 通訊邏輯。
- [deno.json](deno.json)：定義專案的執行任務與相依設定。
- [classrooms.json](classrooms.json)：教室資料格式參考實例。

## 如何啟動

### 環境需求

請保證您的執行環境已安裝 [Deno](https://deno.land/)。

### 本地執行步驟

1. **開發模式**：具備檔案變更自動偵測與重新啟動功能。

   ```bash
   deno task dev
   ```

2. **一般啟動**：

   ```bash
   deno task start
   ```

啟動後，請使用瀏覽器存取 `http://localhost:8000` 即可開始使用。

### 部署到 Deno Deploy

1. **安裝 Deno Deploy CLI**（如尚未安裝）：

   ```bash
   deno install -A jsr:@deno/deployctl
   ```

2. **部署應用程式**：

   ```bash
   deployctl deploy
   ```

3. 部署完成後，系統會提供您的應用程式 URL。

**注意事項**：

- 資料儲存於瀏覽器的 localStorage，伺服器端僅作為即時通訊中繼。
- 首次存取時需使用管理員介面建立教室或從 localStorage 同步資料。

## 專業用語說明

為了符合台灣專業電腦術語習慣，本專案文件遵循以下用語規範：

- 使用「建立」而非「創建」
- 使用「目前」而非「當前」
- 使用「設定」而非「配置」
- 使用「使用者」而非「用戶」
- 使用「介面」而非「界面」
- 使用「回傳」而非「返回」
- 使用「算繪」而非「渲染」
- 使用「新增」而非「添加」
- 使用「保證」而非「確保」
- 使用「取得」而非「獲取」
