const express = require("express");
const app = express();
app.use(express.json());

const orders = [{ id: 1, item: "Laptop", status: "shipped" }];

app.use((req, res, next) => {
  console.log(JSON.stringify({ time: new Date().toISOString(), service: "orders", method: req.method, path: req.url }));
  next();
});

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/orders", (req, res) => res.json(orders));
app.post("/orders", (req, res) => {
  const order = { id: orders.length + 1, ...req.body, status: "created" };
  orders.push(order);
  res.status(201).json(order);
});

app.listen(3000, () => console.log(JSON.stringify({ service: "orders", msg: "started" })));
