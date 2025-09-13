const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");

async function buildInvoicePDF({ bookingData, payment }) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.85, 0.66, 0.25);

  page.drawText("Mahadev Photography", { x: 24, y: 800, size: 18, font: bold, color: gold });
  page.drawText("Advance Payment Invoice", { x: 24, y: 770, size: 14, font: bold });

  let y = 740;
  const line = (label, value) => {
    page.drawText(label, { x: 24, y, size: 11, font: bold });
    page.drawText(String(value || ""), { x: 160, y, size: 11, font });
    y -= 16;
  };

  line("Name:", bookingData.name);
  line("Email:", bookingData.email);
  line("Phone:", bookingData.phone);
  line("Address:", bookingData.address);
  y -= 8;
  line("Package:", bookingData.package || "");
  line("Advance %:", bookingData.advance + "%");
  line("Total (gross):", "INR" + (bookingData.packageAmount || 0));
  line("Paid Now:", "INR" + (payment.payNowAmount || 0));
  line("Due:", "INR" + (Math.max(0, (bookingData.packageAmount || 0) - (payment.payNowAmount || 0))));

  page.drawText("Thank you for your booking!", { x: 24, y: y - 20, size: 12, font });
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingData, payNowAmount } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: "Missing payment fields" });

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign.toString()).digest("hex");
    if (razorpay_signature !== expected) return res.status(400).json({ success: false, message: "Invalid payment signature" });

    const pdf = await buildInvoicePDF({ bookingData, payment: { payNowAmount } });

    if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"Mahadev Photography" <${process.env.GMAIL_USER}>`,
        to: bookingData?.email,
        bcc: process.env.GMAIL_USER,
        subject: "Your Booking Invoice",
        text: "Thank you for your advance payment. Invoice attached.",
        attachments: [{ filename: "invoice.pdf", content: Buffer.from(pdf) }],
      });
    }

    // optional: webhook to sheet or CRM can be added via env SHEET_WEBHOOK_URL
    if (process.env.SHEET_WEBHOOK_URL) {
      try {
        await fetch(process.env.SHEET_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...bookingData, payment_id: razorpay_payment_id, pay_now: payNowAmount }),
        });
      } catch (e) {
        console.error("sheet webhook error", e);
      }
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("verify error", e);
    return res.status(500).json({ success: false, error: "Internal error" });
  }
};
