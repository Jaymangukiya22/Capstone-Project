#!/bin/bash

# Generate API Documentation (REST + WebSocket)
# This script generates HTML documentation from OpenAPI and AsyncAPI specs

set -e

echo "🔨 Generating API Documentation..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$DOCS_DIR/dist"

# Create dist directory
mkdir -p "$DIST_DIR"

# Remove legacy output folder from older generator versions
rm -rf "$DIST_DIR/websocket-api" 2>/dev/null || true

echo -e "${BLUE}📁 Documentation directory: $DOCS_DIR${NC}"
echo -e "${BLUE}📦 Output directory: $DIST_DIR${NC}"
echo ""

REST_OVERRIDES_SRC="$DOCS_DIR/docs-overrides.rest.css"
WS_OVERRIDES_SRC="$DOCS_DIR/docs-overrides.websocket.css"

# Generate REST API documentation (Swagger UI)
echo -e "${BLUE}📄 Generating REST API documentation (Swagger UI)...${NC}"
cp "$DOCS_DIR/openapi.yaml" "$DIST_DIR/openapi.yaml"

cat > "$DIST_DIR/rest-api.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QuizUP REST API</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
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
      };
    </script>
  </body>
</html>
EOF

echo -e "${GREEN}✅ REST API docs generated: $DIST_DIR/rest-api.html${NC}"

echo ""

# Generate WebSocket API documentation (AsyncAPI Web Component)
echo -e "${BLUE}📡 Generating WebSocket API documentation (AsyncAPI Web Component)...${NC}"
cp "$DOCS_DIR/asyncapi.match-server.yaml" "$DIST_DIR/asyncapi.match-server.yaml"

cat > "$DIST_DIR/asyncapi-theme.css" << 'EOF'
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

/* Mobile: sidebar should overlay but not hide content permanently */
@media (max-width: 768px) {
  .aui-root .sidebar {
    width: 85vw !important;
    max-width: 360px !important;
  }
}
EOF

cat > "$DIST_DIR/websocket-api.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QuizUP WebSocket API</title>
    <script src="https://unpkg.com/@webcomponents/webcomponentsjs@2.5.0/webcomponents-bundle.js"></script>
    <script
      defer
      src="https://unpkg.com/@asyncapi/web-component@latest/lib/asyncapi-web-component.js"
    ></script>
    <style>
      html,
      body {?v=1
        height: 100%;
        margin: 0;
        background: #f6f7f9;
      }
      asyncapi-component {
        height: 100vh;
      }
    </style>
  </head>
  <body>
    <asyncapi-component
      schemaUrl="asyncapi.match-server.yaml"
      cssImportPath="asyncapi-theme.css"
      config='{"show":{"sidebar":true}}'
    ></asyncapi-component>
  </body>
</html>
EOF

echo -e "${GREEN}✅ WebSocket API docs generated: $DIST_DIR/websocket-api.html${NC}"

echo ""

# Apply docs styling overrides (REST + WebSocket)
echo -e "${BLUE}🎨 Applying documentation styling overrides...${NC}"

CSS_BUST="$(date +%s)"

if [ -f "$REST_OVERRIDES_SRC" ]; then
  cp "$REST_OVERRIDES_SRC" "$DIST_DIR/docs-overrides.rest.css"
  if [ -f "$DIST_DIR/rest-api.html" ] && ! grep -q "docs-overrides.rest.css" "$DIST_DIR/rest-api.html"; then
    perl -0777 -i -pe 's#</head>#  <link rel="stylesheet" href="docs-overrides.rest.css" />\n</head>#s' "$DIST_DIR/rest-api.html"
  fi
  if [ -f "$DIST_DIR/rest-api.html" ]; then
    perl -0777 -i -pe "s#docs-overrides\.rest\.css(\?v=\d+)?#docs-overrides.rest.css?v=${CSS_BUST}#g" "$DIST_DIR/rest-api.html"
  fi
  echo -e "${GREEN}✅ REST overrides applied${NC}"
else
  echo -e "${YELLOW}⚠️  Missing $REST_OVERRIDES_SRC (skipping REST overrides)${NC}"
fi

if [ -f "$WS_OVERRIDES_SRC" ]; then
  cp "$WS_OVERRIDES_SRC" "$DIST_DIR/docs-overrides.websocket.css"
  if [ -f "$DIST_DIR/websocket-api.html" ] && ! grep -q "docs-overrides.websocket.css" "$DIST_DIR/websocket-api.html"; then
    perl -0777 -i -pe 's#</head>#  <link rel="stylesheet" href="docs-overrides.websocket.css" />\n</head>#s' "$DIST_DIR/websocket-api.html"
  fi
  if [ -f "$DIST_DIR/websocket-api.html" ]; then
    perl -0777 -i -pe "s#docs-overrides\.websocket\.css(\?v=\d+)?#docs-overrides.websocket.css?v=${CSS_BUST}#g" "$DIST_DIR/websocket-api.html"
  fi
  echo -e "${GREEN}✅ WebSocket overrides applied${NC}"
else
  echo -e "${YELLOW}⚠️  Missing $WS_OVERRIDES_SRC (skipping WebSocket overrides)${NC}"
fi

echo ""

# Generate JSON versions
echo -e "${BLUE}📋 Generating JSON specifications...${NC}"

# Convert OpenAPI YAML to JSON
if command -v yq &> /dev/null; then
    yq eval -o=json "$DOCS_DIR/openapi.yaml" > "$DIST_DIR/openapi.json"
    echo -e "${GREEN}✅ OpenAPI JSON: $DIST_DIR/openapi.json${NC}"
else
    if command -v npx &> /dev/null; then
        npx -y yaml-convert --input "$DOCS_DIR/openapi.yaml" \
            --output "$DIST_DIR/openapi.json" --pretty
        echo -e "${GREEN}✅ OpenAPI JSON: $DIST_DIR/openapi.json${NC}"
    else
        echo -e "${YELLOW}⚠️  yq not found. Skipping OpenAPI JSON conversion.${NC}"
    fi
fi

# Convert AsyncAPI YAML to JSON
if command -v yq &> /dev/null; then
    yq eval -o=json "$DOCS_DIR/asyncapi.match-server.yaml" > "$DIST_DIR/asyncapi.json"
    echo -e "${GREEN}✅ AsyncAPI JSON: $DIST_DIR/asyncapi.json${NC}"
else
    if command -v npx &> /dev/null; then
        npx -y yaml-convert --input "$DOCS_DIR/asyncapi.match-server.yaml" \
            --output "$DIST_DIR/asyncapi.json" --pretty
        echo -e "${GREEN}✅ AsyncAPI JSON: $DIST_DIR/asyncapi.json${NC}"
    else
        echo -e "${YELLOW}⚠️  yq not found. Skipping AsyncAPI JSON conversion.${NC}"
    fi
fi

echo ""

# Create index.html for easy navigation
echo -e "${BLUE}🌐 Creating documentation index...${NC}"

cat > "$DIST_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuizUP API Documentation</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 900px;
            width: 100%;
            padding: 40px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        
        .subtitle {
            color: #666;
            margin-bottom: 40px;
            font-size: 1.1em;
        }
        
        .docs-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        @media (max-width: 768px) {
            .docs-grid {
                grid-template-columns: 1fr;
            }
        }
        
        .doc-card {
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            padding: 25px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .doc-card:hover {
            border-color: #667eea;
            box-shadow: 0 8px 20px rgba(102, 126, 234, 0.2);
            transform: translateY(-2px);
        }
        
        .doc-card h2 {
            color: #667eea;
            margin-bottom: 10px;
            font-size: 1.5em;
        }
        
        .doc-card p {
            color: #666;
            margin-bottom: 15px;
            line-height: 1.6;
        }
        
        .doc-card a {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 6px;
            text-decoration: none;
            transition: background 0.3s ease;
        }
        
        .doc-card a:hover {
            background: #764ba2;
        }
        
        .specs-section {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
        }
        
        .specs-section h3 {
            color: #333;
            margin-bottom: 15px;
        }
        
        .spec-list {
            list-style: none;
        }
        
        .spec-list li {
            padding: 8px 0;
            color: #666;
        }
        
        .spec-list li:before {
            content: "📄 ";
            margin-right: 8px;
        }
        
        .spec-list a {
            color: #667eea;
            text-decoration: none;
        }
        
        .spec-list a:hover {
            text-decoration: underline;
        }
        
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            color: #999;
            text-align: center;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 QuizUP API Documentation</h1>
        <p class="subtitle">Complete REST and WebSocket API reference</p>
        
        <div class="docs-grid">
            <div class="doc-card">
                <h2>📡 REST API</h2>
                <p>HTTP endpoints for authentication, quizzes, matches, and analytics. Interactive Swagger UI for testing.</p>
                <a href="rest-api.html" target="_blank">View REST API Docs →</a>
            </div>
            
            <div class="doc-card">
                <h2>🔌 WebSocket API</h2>
                <p>Real-time Socket.IO events for friend matches, game flow, and player interactions.</p>
                <a href="websocket-api.html" target="_blank">View WebSocket API Docs →</a>
            </div>
        </div>
        
        <div class="specs-section">
            <h3>📋 Specification Files</h3>
            <ul class="spec-list">
                <li><a href="openapi.yaml" download>openapi.yaml</a> - OpenAPI 3.1.2 specification</li>
                <li><a href="asyncapi.match-server.yaml" download>asyncapi.match-server.yaml</a> - AsyncAPI 3.0.0 specification</li>
                <li><a href="openapi.json" download>openapi.json</a> - OpenAPI JSON format</li>
                <li><a href="asyncapi.json" download>asyncapi.json</a> - AsyncAPI JSON format</li>
                <li><a href="../API_DOCUMENTATION.md" download>API_DOCUMENTATION.md</a> - Complete guide</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>QuizUP API Documentation • Generated with OpenAPI 3.1.2 and AsyncAPI 3.0.0</p>
            <p>For more information, visit <a href="https://github.com/quizup" style="color: #667eea;">github.com/quizup</a></p>
        </div>
    </div>
</body>
</html>
EOF

echo -e "${GREEN}✅ Documentation index created: $DIST_DIR/index.html${NC}"

echo ""
echo -e "${GREEN}✅ Documentation generation complete!${NC}"
echo ""
echo -e "${BLUE}📚 Documentation files:${NC}"
echo "   • REST API: $DIST_DIR/rest-api.html"
echo "   • WebSocket API: $DIST_DIR/websocket-api.html"
echo "   • Index: $DIST_DIR/index.html"
echo ""
echo -e "${BLUE}🚀 To serve documentation locally:${NC}"
echo "   cd $DIST_DIR"
echo "   python3 -m http.server 8000"
echo "   # Then open http://localhost:8000"
echo ""
