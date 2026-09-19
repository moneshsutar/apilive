const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const paymentService = require('../services/payment');

/**
 * Payment Routes
 * POST /api/payments/create-order — Create payment order (authenticated)
 * POST /api/payments/webhook — Payment gateway webhook (no auth — verified by signature)
 * GET /api/payments/history — Get payment history (authenticated)
 * GET /api/payments/receipt/:paymentId — Get receipt details (authenticated)
 */

// Create a payment order
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;
    const { subscriptionId, planId } = req.body;

    if (!subscriptionId || !planId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Subscription ID and Plan ID are required',
      });
    }

    const result = await paymentService.createPaymentOrder(uid, subscriptionId, planId);

    return res.status(200).json({
      success: true,
      message: 'Payment order created',
      orderId: result.orderId,
      gatewayOrderId: result.gatewayOrderId,
      amount: result.amount,
      currency: result.currency,
      payment_url: result.paymentUrl,
      paymentUrl: result.paymentUrl,
      ...(result.imbResponseData || {}),
    });
  } catch (error) {
    console.error('Payment order creation error:', error);

    if (
      error.message === 'Plan not found' ||
      error.message === 'Subscription not found' ||
      error.message === 'Subscription does not belong to user' ||
      error.message === 'Subscription is not in pending state'
    ) {
      return res.status(400).json({
        error: 'Bad Request',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to create payment order',
    });
  }
});

// Payment gateway webhook routes (supports both /webhook and /upi-webhook)
router.post(['/webhook', '/upi-webhook'], async (req, res) => {
  try {
    let body = req.body;

    // Handle form-urlencoded if rawBody fallback is needed
    if (!body || Object.keys(body).length === 0) {
      const querystring = require('querystring');
      body = querystring.parse(req.rawBody?.toString() || '');
    }

    console.log('IMB WEBHOOK RECEIVED:', body);

    const { status, order_id, result } = body;

    if (!order_id) {
      return res.status(400).send('Missing order_id');
    }

    const webhookResult = await paymentService.processPaymentWebhook(body);

    if (webhookResult.alreadyProcessed) {
      return res.status(200).send('Already processed');
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Payment webhook error:', error);
    return res.status(500).send('Webhook error');
  }
});

// Get payment history (paginated)
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 10, startAfter } = req.query;
    const result = await paymentService.getPaymentHistory(
      req.user.uid,
      Math.min(parseInt(limit) || 10, 50),
      startAfter || null
    );

    res.json(result);
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch payment history',
    });
  }
});

// Get payment receipt
router.get('/receipt/:paymentId', authenticate, async (req, res) => {
  try {
    const receipt = await paymentService.getPaymentReceipt(
      req.params.paymentId,
      req.user.uid
    );

    res.json({ receipt });
  } catch (error) {
    console.error('Receipt fetch error:', error);

    if (error.message === 'Payment not found') {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Payment not found',
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch receipt',
    });
  }
});

module.exports = router;
