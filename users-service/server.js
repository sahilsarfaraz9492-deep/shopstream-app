const express = require("express");
const app = express();

const users = [{ id: 1, name: "Asha" }, { id: 2, name: "Ravi" }];

app.use((req, res, next) => {
  console.log(JSON.stringify({ time: new Date().toISOString(), service: "users", method: req.method, path: req.url }));
  next();
});

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/users", (req, res) => res.json(users));

app.listen(3000, () => console.log(JSON.stringify({ service: "users", msg: "started" })));
