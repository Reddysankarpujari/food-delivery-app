const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const authMiddleware = require("./middleware/auth");

const app = express();

/* ---------------- PORT FIX (IMPORTANT) ---------------- */
const PORT = process.env.PORT || 5000;

/* ---------------- JWT SECRET ---------------- */
const JWT_SECRET = process.env.JWT_SECRET || "secretkey";

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors());
app.use(express.json());

/* ---------------- MONGODB CONNECTION ---------------- */
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:sankar2002@cluster0.nusaags.mongodb.net/fooddb";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ MongoDB Connected"))
.catch((err) => {
  console.error("❌ MongoDB Connection Error:", err);
  process.exit(1);
});

/* ---------------- SCHEMAS ---------------- */

const restaurantSchema = new mongoose.Schema({
  name: String,
  cuisine: String,
  rating: Number,
  image: String
});

const cartSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number
});

const orderSchema = new mongoose.Schema({
  userEmail: String,
  userName: String,
  items: Array,
  subtotal: Number,
  delivery: Number,
  total: Number,
  status: {
    type: String,
    default: "Placed"
  },
  deliveryTime: Date
}, { timestamps: true });

/* ---------------- MODELS ---------------- */

const Restaurant = mongoose.model("Restaurant", restaurantSchema);
const Cart = mongoose.model("Cart", cartSchema);
const Order = mongoose.model("Order", orderSchema);

/* ---------------- TEST ROUTE ---------------- */

app.get("/", (req, res) => {
  res.send("🍔 Food Delivery Backend Running");
});

/* ---------------- RESTAURANTS API ---------------- */

app.get("/api/restaurants", async (req, res) => {
  try {
    const data = await Restaurant.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to load restaurants" });
  }
});

app.post("/api/restaurants", async (req, res) => {
  try {
    const restaurant = new Restaurant(req.body);
    await restaurant.save();
    res.json(restaurant);
  } catch (err) {
    res.status(500).json({ message: "Failed to save restaurant" });
  }
});

/* ---------------- CART API ---------------- */

app.get("/api/cart", async (req, res) => {
  try {
    const cart = await Cart.find();
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: "Cart load failed" });
  }
});

app.post("/api/cart", async (req, res) => {
  try {
    const item = new Cart(req.body);
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: "Cart save failed" });
  }
});

app.delete("/api/cart/:id", async (req, res) => {
  try {
    await Cart.findByIdAndDelete(req.params.id);
    res.json({ message: "Item removed" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

/* ---------------- ORDER API ---------------- */

app.post("/api/orders", authMiddleware, async (req, res) => {
  try {
    const {
      userEmail,
      userName,
      items,
      subtotal,
      delivery,
      total,
      status,
      createdAt,
      deliveryTime
    } = req.body;

    const newOrder = new Order({
      userEmail,
      userName,
      items,
      subtotal,
      delivery,
      total,
      status: status || "Placed",
      createdAt: createdAt || new Date(),
      deliveryTime
    });

    await newOrder.save();

    console.log("🆕 New Order Created:", newOrder);

    res.json({
      message: "Order placed successfully",
      order: newOrder
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Order failed" });
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Orders load failed" });
  }
});

app.get("/api/orders/:email", authMiddleware, async (req, res) => {
  try {
    const email = req.params.email;
    const userOrders = await Order.find({ userEmail: email }).sort({ createdAt: -1 });
    res.json(userOrders);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

app.delete("/api/orders/:id", authMiddleware, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

/* ---------------- USER REGISTER ---------------- */

app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    res.json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Registration failed" });
  }
});

/* ---------------- USER LOGIN ---------------- */

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Login failed" });
  }
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});