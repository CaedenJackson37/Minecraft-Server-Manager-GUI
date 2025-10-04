const express = require("express");
const http = require("http");
const { Rcon } = require("rcon-client");
const os = require("os");

const app = express();
const server = http.createServer(app);

// ------------------------
// Minecraft server info
// ------------------------
const MC_HOST = "192.168.254.94"; // Paper server IP
const RCON_PORT = 25575;          // matches server.properties
const RCON_PASS = "07252002";     // matches server.properties

// Serve static files from 'public' folder
app.use(express.static("public"));

// ------------------------
// Persistent RCON client
// ------------------------
let rconClient = null;

async function getRcon() {
  if (!rconClient || !rconClient.connected) {
    rconClient = await Rcon.connect({
      host: MC_HOST,
      port: RCON_PORT,
      password: RCON_PASS
    });

    rconClient.on("end", () => {
      console.log("⚠️ RCON disconnected, will reconnect on next request");
      rconClient = null;
    });
  }
  return rconClient;
}

// ------------------------
// Endpoint to get player count & names
// ------------------------
app.get("/players", async (req, res) => {
  try {
    const rcon = await getRcon();
    const response = await rcon.send("list");

    const match = response.match(/There are (\d+) of a max of (\d+) players online: ?(.*)/);
    let online = 0, max = 0, players = [];

    if (match) {
      online = parseInt(match[1]);
      max = parseInt(match[2]);
      if (match[3] && match[3].trim() !== "") {
        players = match[3].split(", ").map(p => p.trim());
      }
    }

    res.json({ online, max, players });
  } catch (err) {
    res.json({ online: 0, max: 0, players: [], error: err.message });
  }
});

// ------------------------
// Endpoint for server stats
// ------------------------
app.get("/server-stats", (req, res) => {
  try {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const load = os.loadavg ? os.loadavg()[0] : 0;

    res.json({
      cpuPercent: load.toFixed(2),
      memoryMB: (usedMem / 1024 / 1024).toFixed(2),
      systemUsedGB: (usedMem / 1024 / 1024 / 1024).toFixed(2),
      systemTotalGB: (totalMem / 1024 / 1024 / 1024).toFixed(2)
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// ------------------------
// Start server
// ------------------------
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`✅ Dashboard running on http://localhost:${PORT}`);
});