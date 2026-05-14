const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://sportsrunner.netlify.app';

app.post('/create-checkout', async (req, res) => {
  try {
    const { total, orderId, items, seat, section, row, venue } = req.body;
    if (!total || total <= 0) return res.status(400).json({ error: 'Invalid total' });
    const itemsSummary = items ? items.map(i => `${i.e} ${i.n} x${i.qty}`).join(', ') : 'Order';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Sports Runner Order',
            description: `${venue} · Sec ${section} Row ${row} Seat ${seat} · ${itemsSummary}`,
          },
          unit_amount: Math.round(total * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/sports-runner-fan.html?payment=success&order=${orderId}`,
      cancel_url: `${FRONTEND_URL}/sports-runner-fan.html?payment=cancelled`,
      metadata: { orderId: orderId || '', venue: venue || '', section: section || '', row: row || '', seat: seat || '' },
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Sports Runner backend running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
