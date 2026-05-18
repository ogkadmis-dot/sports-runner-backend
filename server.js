const express = require('express');
const Stripe = require('stripe');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('*', cors());
app.use(express.json());

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable in Render.');
}

const stripe = Stripe(process.env.STRIPE_SECRET_KEY.trim());
const FRONTEND = process.env.FRONTEND_URL || 'https://sportsrunner.netlify.app';

app.post('/create-checkout', async (req, res) => {
  try {
    const { total, orderId, items, seat, section, row, venue } = req.body;

    if (!total || total <= 0) {
      return res.status(400).json({ error: 'Invalid total' });
    }

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const desc = items
      ? items.map(i => i.n + ' x' + i.qty).join(', ')
      : 'Order';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Sports Runner Order',
            description:
              venue +
              ' Sec ' +
              section +
              ' Row ' +
              row +
              ' Seat ' +
              seat +
              ' - ' +
              desc
          },
          unit_amount: Math.round(Number(total) * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',

      metadata: {
        orderId: String(orderId)
      },

      payment_intent_data: {
        metadata: {
          orderId: String(orderId)
        }
      },

      success_url:
        FRONTEND +
        '/sports-runner-fan.html?payment=success&order=' +
        encodeURIComponent(orderId) +
        '&session_id={CHECKOUT_SESSION_ID}',

      cancel_url:
        FRONTEND +
        '/sports-runner-fan.html?payment=cancelled',
    });

    res.json({
      url: session.url,
      sessionId: session.id
    });

  } catch (err) {
    console.error('CREATE CHECKOUT ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/refund-order', async (req, res) => {
  try {
    const {
      orderId,
      amount,
      sessionId,
      paymentIntentId,
      chargeId,
      reason
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    const refundAmount = Math.round(Number(amount) * 100);

    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).json({ error: 'Invalid refund amount' });
    }

    let paymentIntent = paymentIntentId || null;
    let charge = chargeId || null;

    if (!paymentIntent && !charge && sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      paymentIntent = session.payment_intent;
    }

    if (!paymentIntent && !charge) {
      return res.status(400).json({
        error:
          'Missing Stripe payment reference. Need sessionId, paymentIntentId, or chargeId.'
      });
    }

    const refundPayload = {
      amount: refundAmount,
      metadata: {
        orderId: String(orderId),
        refundReason: reason || 'Sports Runner admin refund'
      }
    };

    if (paymentIntent) {
      refundPayload.payment_intent = paymentIntent;
    } else {
      refundPayload.charge = charge;
    }

    const refund = await stripe.refunds.create(refundPayload);

    res.json({
      ok: true,
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100,
      paymentIntentId: paymentIntent || null,
      chargeId: charge || null
    });

  } catch (err) {
    console.error('REFUND ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sports-runner-backend'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Sports Runner backend running on port ' + PORT);
});
