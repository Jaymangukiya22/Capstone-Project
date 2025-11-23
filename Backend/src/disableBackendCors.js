// Disable backend CORS (to let Nginx handle it)
// Run this manually: node disableBackendCors.js

const fs = require('fs');
const path = require('path');

// Read the server.ts file
const serverFilePath = path.join(__dirname, 'server.ts');
const matchServerFilePath = path.join(__dirname, 'matchServer.ts');
const matchServerMasterFilePath = path.join(__dirname, 'matchServerMaster.ts');
const matchServerWorkerFilePath = path.join(__dirname, 'matchServerWorker.ts');

// Process file if it exists
function processFile(filePath, searchText, replacementText) {
  if (fs.existsSync(filePath)) {
    console.log(`Processing ${path.basename(filePath)}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Only make changes if the file includes CORS
    if (content.includes(searchText)) {
      content = content.replace(searchText, replacementText);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${path.basename(filePath)}`);
    } else {
      console.log(`ℹ️ No changes needed for ${path.basename(filePath)}`);
    }
  } else {
    console.log(`⚠️ File not found: ${filePath}`);
  }
}

// Main server.ts CORS processing
const serverSearchText = `app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in the allowed list (from env + hardcoded)
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        console.warn(\`CORS: Blocked origin: \${origin}\`);
        console.warn(\`CORS: Allowed origins:\`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400 // Cache preflight for 24 hours
  })
);`;

const serverReplacementText = `// When behind Nginx, use a simpler CORS setup
// Nginx is handling the actual CORS headers
app.use(
  cors({
    origin: true, // Reflect the request origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400 // Cache preflight for 24 hours
  })
);

// Log that CORS is simplified because Nginx is handling it
console.log('🌐 CORS Configuration: Simplified (Nginx is handling CORS)');`;

processFile(serverFilePath, serverSearchText, serverReplacementText);

// matchServer.ts CORS processing - simple app.use(cors())
const matchServerSearchText = `app.use(cors());`;
const matchServerReplacementText = `app.use(cors({
  origin: true, // Reflect the request origin
  credentials: true
})); // Simplified CORS - Nginx handles actual headers`;

processFile(matchServerFilePath, matchServerSearchText, matchServerReplacementText);

// matchServer.ts WebSocket CORS
const wsSearchText = `const io = new SocketIOServer(server, {
  cors: {
    origin: function (origin: any, callback: any) {
      // Allow requests with no origin
      if (!origin) return callback(null, true);
      
      if (wsAllowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(\`WebSocket CORS: Blocked origin: \${origin}\`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST"]
  }
});`;

const wsReplacementText = `const io = new SocketIOServer(server, {
  cors: {
    origin: true, // Reflect the request origin - Nginx handles actual CORS
    credentials: true,
    methods: ["GET", "POST"]
  }
});`;

processFile(matchServerFilePath, wsSearchText, wsReplacementText);

// matchServerMaster.ts CORS processing
const matchServerMasterSearchText = `app.use(cors(corsOptions));`;
const matchServerMasterReplacementText = `app.use(cors({
  origin: true, // Reflect the request origin
  credentials: true
})); // Simplified CORS - Nginx handles actual headers`;

processFile(matchServerMasterFilePath, matchServerMasterSearchText, matchServerMasterReplacementText);

// matchServerWorker.ts CORS processing
const matchServerWorkerSearchText = `app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
  credentials: true
}));`;

const matchServerWorkerReplacementText = `app.use(cors({
  origin: true, // Reflect the request origin
  credentials: true
})); // Simplified CORS - Nginx handles actual headers`;

processFile(matchServerWorkerFilePath, matchServerWorkerSearchText, matchServerWorkerReplacementText);

console.log('\n✅ All done! Backend CORS is now simplified to let Nginx handle it.');
console.log('📝 IMPORTANT: Restart your Docker containers for changes to take effect.');
