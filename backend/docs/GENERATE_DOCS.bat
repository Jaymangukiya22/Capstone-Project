@echo off
REM Generate API Documentation (REST + WebSocket)
REM This script generates HTML documentation from OpenAPI and AsyncAPI specs

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  Generating API Documentation
echo ========================================
echo.

REM Get the directory where this script is located
set "DOCS_DIR=%~dp0"
set "DIST_DIR=%DOCS_DIR%dist"

REM Create dist directory
if not exist "%DIST_DIR%" mkdir "%DIST_DIR%"

REM Remove legacy output folder from older generator versions
if exist "%DIST_DIR%\websocket-api" rmdir /S /Q "%DIST_DIR%\websocket-api"

echo [INFO] Documentation directory: %DOCS_DIR%
echo [INFO] Output directory: %DIST_DIR%
echo.

set "REST_OVERRIDES_SRC=%DOCS_DIR%docs-overrides.rest.css"
set "WS_OVERRIDES_SRC=%DOCS_DIR%docs-overrides.websocket.css"

REM Generate REST API documentation (Swagger UI)
echo [INFO] Generating REST API documentation (Swagger UI)...
copy /Y "%DOCS_DIR%openapi.yaml" "%DIST_DIR%\openapi.yaml" >nul

powershell -NoProfile -Command "$p='%DIST_DIR%\rest-api.html'; $html=@'
<!DOCTYPE html>
<html lang=\"en\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>QuizUP REST API</title>
    <link rel=\"stylesheet\" href=\"https://unpkg.com/swagger-ui-dist@5/swagger-ui.css\" />
  </head>
  <body>
    <div class=\"docs-layout\">
      <aside class=\"docs-sidebar\" id=\"docs-sidebar\">
        <div class=\"docs-sidebar-header\">
          <div class=\"docs-sidebar-title\">QuizUP REST API</div>
          <button class=\"docs-sidebar-toggle\" id=\"docs-sidebar-toggle\" type=\"button\">☰</button>
        </div>
        <div class=\"docs-sidebar-content\">
          <div class=\"docs-sidebar-search\">
            <input id=\"docs-sidebar-search\" type=\"text\" placeholder=\"Search sections...\" />
          </div>
          <div class=\"docs-sidebar-section\">
            <h3>Navigation</h3>
            <ul class=\"docs-nav\" id=\"docs-nav\"></ul>
          </div>
          <div class=\"docs-sidebar-section\">
            <h3>Authorize</h3>
            <div class=\"docs-help\">Use <strong>Authorize</strong> to paste a Bearer token (JWT) so Swagger UI sends <code>Authorization: Bearer &lt;token&gt;</code> with requests.</div>
          </div>
        </div>
      </aside>
      <main class=\"docs-main\">
        <div id=\"swagger-ui\"></div>
      </main>
    </div>
    <script src=\"https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js\"></script>
    <script src=\"https://unpkg.com/js-yaml@4.1.0/dist/js-yaml.min.js\"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({
          url: 'openapi.yaml',
          dom_id: '#swagger-ui',
          deepLinking: true,
          docExpansion: 'list',
          defaultModelsExpandDepth: -1,
          displayRequestDuration: true,
          persistAuthorization: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: 'BaseLayout'
        });

        const sidebar = document.getElementById('docs-sidebar');
        const toggle = document.getElementById('docs-sidebar-toggle');
        const nav = document.getElementById('docs-nav');
        const search = document.getElementById('docs-sidebar-search');

        toggle.addEventListener('click', () => {
          sidebar.classList.toggle('is-collapsed');
        });

        const normalize = (s) => s.toLowerCase().trim();
        const cssEscape = (s) => (window.CSS && CSS.escape ? CSS.escape(s) : s);
        const scrollToTag = (tag) => {
          const selector = `[id=\"operations-tag-${cssEscape(tag)}\"], [id=\"operations-${cssEscape(tag)}\"]`;
          const el = document.querySelector(selector);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        fetch('openapi.yaml')
          .then((r) => r.text())
          .then((txt) => {
            const spec = window.jsyaml.load(txt);
            const tags = Array.isArray(spec?.tags) ? spec.tags.map((t) => t.name) : [];
            nav.innerHTML = '';
            tags.forEach((tag) => {
              const li = document.createElement('li');
              const a = document.createElement('a');
              a.href = '#';
              a.textContent = tag;
              a.addEventListener('click', (e) => {
                e.preventDefault();
                scrollToTag(tag);
              });
              li.appendChild(a);
              nav.appendChild(li);
            });

            search.addEventListener('input', () => {
              const q = normalize(search.value);
              Array.from(nav.querySelectorAll('a')).forEach((a) => {
                const ok = !q || normalize(a.textContent).includes(q);
                a.parentElement.style.display = ok ? '' : 'none';
              });
            });
          })
          .catch(() => {
            nav.innerHTML = '<li><a href=\"#\">Overview</a></li>';
          });
      };
    </script>
  </body>
</html>
'@; Set-Content -Encoding utf8 $p $html"

echo [SUCCESS] REST API docs generated: %DIST_DIR%\rest-api.html

echo.

REM Generate WebSocket API documentation (AsyncAPI Web Component)
echo [INFO] Generating WebSocket API documentation (AsyncAPI Web Component)...
copy /Y "%DOCS_DIR%asyncapi.match-server.yaml" "%DIST_DIR%\asyncapi.match-server.yaml" >nul

powershell -NoProfile -Command "$p='%DIST_DIR%\asyncapi-theme.css'; $css=@'
@import url('https://unpkg.com/@asyncapi/react-component@latest/styles/default.min.css');

/* Override the orange utilities used for example chips */
.bg-orange-600,
.bg-orange-500,
.bg-orange-400 {
  background-color: #1f2937 !important;
}

.text-orange-600,
.text-orange-500,
.text-orange-400 {
  color: #60a5fa !important;
}

.border-orange-600,
.border-orange-500,
.border-orange-400 {
  border-color: rgba(96, 165, 250, 0.6) !important;
}

/* Layout: keep sidebar a sane width and ensure content stays visible */
.aui-root,
asyncapi-component {
  background: #f6f7f9;
}

.aui-root .sidebar,
.aui-root [class*="sidebar"],
asyncapi-component .sidebar,
asyncapi-component [class*="sidebar"] {
  width: 320px !important;
  max-width: 320px !important;
  flex: 0 0 320px !important;
}

.aui-root .panel--center,
.aui-root [class*="panel--center"],
.aui-root [class*="panel-center"],
asyncapi-component .panel--center,
asyncapi-component [class*="panel--center"],
asyncapi-component [class*="panel-center"] {
  width: auto !important;
  flex: 1 1 auto !important;
  min-width: 0 !important;
}

/* Code blocks: readable, wrapped, and with space */
.aui-root pre,
.aui-root code,
.aui-root .hljs {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
    'Liberation Mono', 'Courier New', monospace;
}

.aui-root pre {
  background: #0b1220 !important;
  color: #e5e7eb !important;
  border-radius: 10px !important;
  padding: 12px 14px !important;
  overflow: auto !important;
  line-height: 1.45 !important;
}

.aui-root pre code {
  background: transparent !important;
  color: inherit !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}

/* Inline example values chips -> display as block code */
.aui-root .border.inline-block,
.aui-root [class*="border"][class*="inline-block"],
asyncapi-component .border.inline-block,
asyncapi-component [class*="border"][class*="inline-block"] {
  display: block !important;
  max-width: 100% !important;
  overflow: auto !important;
  padding: 10px 12px !important;
  border-radius: 10px !important;
  background: #0b1220 !important;
  color: #e5e7eb !important;
  white-space: pre-wrap !important;
  word-break: break-word !important;
}

@media (max-width: 768px) {
  .aui-root .sidebar {
    width: 85vw !important;
    max-width: 360px !important;
  }
}
'@; Set-Content -Encoding utf8 $p $css"

powershell -NoProfile -Command "$p='%DIST_DIR%\websocket-api.html'; $html=@'
<!DOCTYPE html>
<html lang=\"en\">
  <head>
    <meta charset=\"UTF-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>QuizUP WebSocket API</title>
    <script async src=\"https://unpkg.com/@asyncapi/web-component@latest/lib/asyncapi-web-component.js\"></script>
    <style>
      html, body { height: 100%; margin: 0; }
      asyncapi-component { height: 100vh; display: block; }
    </style>
  </head>
  <body>
    <asyncapi-component schemaUrl=\"asyncapi.match-server.yaml\" cssImportPath=\"asyncapi-theme.css\" config='{\"show\":{\"sidebar\":true}}'></asyncapi-component>
  </body>
</html>
'@; Set-Content -Encoding utf8 $p $html"

echo [SUCCESS] WebSocket API docs generated: %DIST_DIR%\websocket-api.html

echo.

REM Apply docs styling overrides (REST + WebSocket)
echo [INFO] Applying documentation styling overrides...

set "CSS_BUST=%RANDOM%%RANDOM%"

if exist "%REST_OVERRIDES_SRC%" (
    copy /Y "%REST_OVERRIDES_SRC%" "%DIST_DIR%\docs-overrides.rest.css" >nul
    if exist "%DIST_DIR%\rest-api.html" (
        findstr /C:"docs-overrides.rest.css" "%DIST_DIR%\rest-api.html" >nul
        if errorlevel 1 (
            powershell -NoProfile -Command "$p='%DIST_DIR%\rest-api.html'; $c=Get-Content -Raw $p; $c=$c -replace '</head>', '  <link rel=\"stylesheet\" href=\"docs-overrides.rest.css\" />`n</head>'; Set-Content -Encoding utf8 $p $c"
        )
        powershell -NoProfile -Command "$p='%DIST_DIR%\rest-api.html'; $c=Get-Content -Raw $p; $c=$c -replace 'docs-overrides\.rest\.css(\?v=\d+)?','docs-overrides.rest.css?v=%CSS_BUST%'; Set-Content -Encoding utf8 $p $c"
    )
    echo [SUCCESS] REST overrides applied
) else (
    echo [WARNING] Missing %REST_OVERRIDES_SRC% (skipping REST overrides)
)

if exist "%WS_OVERRIDES_SRC%" (
    copy /Y "%WS_OVERRIDES_SRC%" "%DIST_DIR%\docs-overrides.websocket.css" >nul
    if exist "%DIST_DIR%\websocket-api.html" (
        findstr /C:"docs-overrides.websocket.css" "%DIST_DIR%\websocket-api.html" >nul
        if errorlevel 1 (
            powershell -NoProfile -Command "$p='%DIST_DIR%\websocket-api.html'; $c=Get-Content -Raw $p; $c=$c -replace '</head>', '  <link rel=\"stylesheet\" href=\"docs-overrides.websocket.css\" />`n</head>'; Set-Content -Encoding utf8 $p $c"
        )
        powershell -NoProfile -Command "$p='%DIST_DIR%\websocket-api.html'; $c=Get-Content -Raw $p; $c=$c -replace 'docs-overrides\.websocket\.css(\?v=\d+)?','docs-overrides.websocket.css?v=%CSS_BUST%'; Set-Content -Encoding utf8 $p $c"
    )
    echo [SUCCESS] WebSocket overrides applied
) else (
    echo [WARNING] Missing %WS_OVERRIDES_SRC% (skipping WebSocket overrides)
)

echo.

REM Generate JSON versions
echo [INFO] Generating JSON specifications...

REM Convert OpenAPI YAML to JSON
where yq >nul 2>nul
if %errorlevel% equ 0 (
    call yq eval -o=json "%DOCS_DIR%openapi.yaml" > "%DIST_DIR%\openapi.json"
    echo [SUCCESS] OpenAPI JSON: %DIST_DIR%\openapi.json
) else (
    where npx >nul 2>nul
    if %errorlevel% equ 0 (
        call npx -y yaml-convert --input "%DOCS_DIR%openapi.yaml" --output "%DIST_DIR%\openapi.json" --pretty
        echo [SUCCESS] OpenAPI JSON: %DIST_DIR%\openapi.json
    ) else (
        echo [WARNING] yq not found. Skipping OpenAPI JSON conversion.
    )
)

REM Convert AsyncAPI YAML to JSON
where yq >nul 2>nul
if %errorlevel% equ 0 (
    call yq eval -o=json "%DOCS_DIR%asyncapi.match-server.yaml" > "%DIST_DIR%\asyncapi.json"
    echo [SUCCESS] AsyncAPI JSON: %DIST_DIR%\asyncapi.json
) else (
    where npx >nul 2>nul
    if %errorlevel% equ 0 (
        call npx -y yaml-convert --input "%DOCS_DIR%asyncapi.match-server.yaml" --output "%DIST_DIR%\asyncapi.json" --pretty
        echo [SUCCESS] AsyncAPI JSON: %DIST_DIR%\asyncapi.json
    )
)

echo.

REM Create index.html for easy navigation
echo [INFO] Creating documentation index...

(
echo ^<!DOCTYPE html^>
echo ^<html lang="en"^>
echo ^<head^>
echo     ^<meta charset="UTF-8"^>
echo     ^<meta name="viewport" content="width=device-width, initial-scale=1.0"^>
echo     ^<title^>QuizUP API Documentation^</title^>
echo     ^<style^>
echo         * {
echo             margin: 0;
echo             padding: 0;
echo             box-sizing: border-box;
echo         }
echo         
echo         body {
echo             font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
echo             background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
echo             min-height: 100vh;
echo             display: flex;
echo             align-items: center;
echo             justify-content: center;
echo             padding: 20px;
echo         }
echo         
echo         .container {
echo             background: white;
echo             border-radius: 12px;
echo             box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
echo             max-width: 900px;
echo             width: 100%%;
echo             padding: 40px;
echo         }
echo         
echo         h1 {
echo             color: #333;
echo             margin-bottom: 10px;
echo             font-size: 2.5em;
echo         }
echo         
echo         .subtitle {
echo             color: #666;
echo             margin-bottom: 40px;
echo             font-size: 1.1em;
echo         }
echo         
echo         .docs-grid {
echo             display: grid;
echo             grid-template-columns: 1fr 1fr;
echo             gap: 20px;
echo             margin-bottom: 30px;
echo         }
echo         
echo         @media (max-width: 768px) {
echo             .docs-grid {
echo                 grid-template-columns: 1fr;
echo             }
echo         }
echo         
echo         .doc-card {
echo             border: 2px solid #e0e0e0;
echo             border-radius: 8px;
echo             padding: 25px;
echo             transition: all 0.3s ease;
echo             cursor: pointer;
echo         }
echo         
echo         .doc-card:hover {
echo             border-color: #667eea;
echo             box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
echo             transform: translateY(-2px);
echo         }
echo         
echo         .doc-card h2 {
echo             color: #667eea;
echo             margin-bottom: 10px;
echo             font-size: 1.5em;
echo         }
echo         
echo         .doc-card p {
echo             color: #666;
echo             margin-bottom: 15px;
echo             line-height: 1.6;
echo         }
echo         
echo         .doc-card a {
echo             display: inline-block;
echo             background: #667eea;
echo             color: white;
echo             padding: 10px 20px;
echo             border-radius: 6px;
echo             text-decoration: none;
echo             transition: background 0.3s ease;
echo         }
echo         
echo         .doc-card a:hover {
echo             background: #764ba2;
echo         }
echo     ^</style^>
echo ^</head^>
echo ^<body^>
echo     ^<div class="container"^>
echo         ^<h1^>🎯 QuizUP API Documentation^</h1^>
echo         ^<p class="subtitle"^>Complete REST and WebSocket API reference^</p^>
echo         
echo         ^<div class="docs-grid"^>
echo             ^<div class="doc-card"^>
echo                 ^<h2^>📡 REST API^</h2^>
echo                 ^<p^>HTTP endpoints for authentication, quizzes, matches, and analytics.^</p^>
echo                 ^<a href="rest-api.html" target="_blank"^>View REST API Docs →^</a^>
echo             ^</div^>
echo             
echo             ^<div class="doc-card"^>
echo                 ^<h2^>🔌 WebSocket API^</h2^>
echo                 ^<p^>Real-time Socket.IO events for friend matches and game flow.^</p^>
echo                 ^<a href="websocket-api.html" target="_blank"^>View WebSocket API Docs →^</a^>
echo             ^</div^>
echo         ^</div^>
echo     ^</div^>
echo ^</body^>
echo ^</html^>
) > "%DIST_DIR%\index.html"

echo [SUCCESS] Documentation index created: %DIST_DIR%\index.html

echo.
echo ========================================
echo  Documentation generation complete!
echo ========================================
echo.
echo Documentation files:
echo   - REST API: %DIST_DIR%\rest-api.html
echo   - WebSocket API: %DIST_DIR%\websocket-api.html
echo   - Index: %DIST_DIR%\index.html
echo.
echo To serve documentation locally:
echo   cd %DIST_DIR%
echo   python -m http.server 8000
echo   Then open http://localhost:8000
echo.

endlocal
