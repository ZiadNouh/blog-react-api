import express from "express";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const postsFilePath = path.join(process.cwd(), "server", "posts.json");
const usersFilePath = path.join(process.cwd(), "server", "users.json");

let posts = JSON.parse(fs.readFileSync(postsFilePath, "utf8")) || [];
let users = JSON.parse(fs.readFileSync(usersFilePath, "utf8")) || [];

const savePosts = () => {
  fs.writeFileSync(postsFilePath, JSON.stringify(posts, null, 2));
};

const saveUsers = () => {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, "your_secret_key", (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Failed to authenticate token" });
    }
    req.user = decoded;
    next();
  });
};

// Posts routes
app.get("/posts", (req, res) => {
  res.json(posts);
});

app.get("/posts/:id", (req, res) => {
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }
  res.json(post);
});

app.post("/posts", authenticate, (req, res) => {
  const newPost = { ...req.body, userId: req.user.id };
  newPost.id = String(Date.now());
  posts.push(newPost);
  savePosts();
  res.status(201).json(newPost);
});

// Users routes
app.get("/users/me", authenticate, (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  res.json(user);
});

app.post("/users", (req, res) => {
  const { email, password } = req.body;
  const existingUser = users.find((u) => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: "User already exists" });
  }
  const newUser = { id: String(Date.now()), email, password };
  users.push(newUser);
  saveUsers();
  const token = jwt.sign(
    { id: newUser.id, email: newUser.email },
    "your_secret_key"
  );
  res.status(201).json({ accessToken: token, user: newUser });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user.id, email: user.email }, "your_secret_key");
  res.json({ accessToken: token, user });
});

app.listen(3001, () => {
  console.log("Server started on port 3001");
});
