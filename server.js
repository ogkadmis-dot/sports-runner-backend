const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
app.options('*', cors());
app.use(express.json());

const KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_51TWqU95RORQYKYiOCYYlDQ4vZmcQFP3sJdY9nq5dOQ3fzKVsHIF7LRcVh6cWurDAeLkuutGTfNWKGJ8GBVfBQTBP000t8iC9FD';
const stripe = Stripe(KEY.trim());
const FRONTEND = 'https://sportsrunner.netlify.app';

console.log('KEY CHECK:', KEY.trim().substring(0, 25));

app.post('/create-checkout', async (req, res) => {
  try {
    const { total, orderId, items, seat, section, row, venue } = req.body;
    if (!total || total <= 0) return res.status(400).json({ error: 'Invalid total' });
    const desc = items ? items.map(i => i.n + ' x' + i.qty).join(', ') : 'Order';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Sports Runner Order', description: venue + ' Sec ' + section + ' Row ' + row + ' Seat ' + seat + ' - ' + desc },
          unit_amount: Math.round(total * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: FRONTEND + '/sports-runner-fan.html?payment=success&order=' + orderId,
      cancel_url: FRONTEND + '/sports-runner-fan.html?payment=cancelled',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => { res.json({ status: 'ok', key: KEY.trim().substring(0, 25) }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Running on port ' + PORT));
