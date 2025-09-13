const Razorpay = require("razorpay");
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { amount, currency } = req.body || {};
    const numeric = Number(amount);
    if (!numeric || isNaN(numeric) || numeric <= 0) return res.status(400).json({ error: "Invalid amount" });

    const order = await instance.orders.create({
      amount: Math.round(numeric * 100),
      currency: currency || "INR",
      receipt: "rcpt_" + Date.now(),
    });
    return res.status(200).json(order);
  } catch (e) {
    console.error("create-order error", e);
    return res.status(500).json({ error: "Order creation failed" });
  }
};
