const express = require('express');
const router = express.Router();
const axios = require('axios');
const { db, admin } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');
const { validateWebhookUrl } = require('../services/webhook');

/**
 * Webhook Configuration Routes
 * GET /api/webhooks — Get webhook config for authenticated user
 * PUT /api/webhooks — Update webhook URLs
 */

// Get webhook configuration
router.get('/', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;

    let webhookDoc = null;
    try {
      webhookDoc = await db.collection('webhookConfigs').doc(uid).get();
    } catch (dbErr) {
      console.warn('WebhookConfigs fetch warning:', dbErr.message);
    }

    if (!webhookDoc || !webhookDoc.exists) {
      return res.json({
        webhookConfig: {
          openResultWebhook: { url: '' },
          closeResultWebhook: { url: '' },
          status: 'inactive',
        },
      });
    }

    res.json({
      webhookConfig: webhookDoc.data(),
    });
  } catch (error) {
    console.warn('Webhook config fetch soft fallback:', error.message);
    res.json({
      webhookConfig: {
        openResultWebhook: { url: '' },
        closeResultWebhook: { url: '' },
        status: 'inactive',
      },
    });
  }
});

// Update webhook URLs
router.put('/', authenticate, async (req, res) => {
  try {
    const { uid } = req.user;
    const { openResultWebhookUrl, closeResultWebhookUrl } = req.body;

    // Validate both URLs on the backend
    const errors = [];

    if (openResultWebhookUrl) {
      const openValidation = validateWebhookUrl(openResultWebhookUrl);
      if (!openValidation.valid) {
        errors.push(`Open Result Webhook: ${openValidation.error}`);
      }
    }

    if (closeResultWebhookUrl) {
      const closeValidation = validateWebhookUrl(closeResultWebhookUrl);
      if (!closeValidation.valid) {
        errors.push(`Close Result Webhook: ${closeValidation.error}`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: errors.join('; '),
      });
    }

    const webhookData = {
      userId: uid,
      openResultWebhook: {
        url: openResultWebhookUrl ? openResultWebhookUrl.trim() : '',
      },
      closeResultWebhook: {
        url: closeResultWebhookUrl ? closeResultWebhookUrl.trim() : '',
      },
      status: openResultWebhookUrl || closeResultWebhookUrl ? 'active' : 'inactive',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Use set with merge to create or update
    await db.collection('webhookConfigs').doc(uid).set(
      {
        ...webhookData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Overwrite createdAt only if new document — merge handles this
    // But we need to ensure updatedAt is always set
    await db.collection('webhookConfigs').doc(uid).update({
      ...webhookData,
    });

    res.json({
      message: 'Webhook configuration updated',
      webhookConfig: webhookData,
    });
  } catch (error) {
    console.error('Webhook config update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update webhook configuration',
    });
  }
});

// Market Name mapping helper
const MARKETS = {
  0: 'KARNATAKA DAY',
  1: 'MILAN MORNING',
  2: 'SRIDEVI',
  3: 'TIME BAZAR',
  4: 'MADHUR DAY',
  5: 'RAJDHANI DAY',
  6: 'MILAN DAY',
  7: 'SUPREME DAY',
  8: 'KALYAN',
  9: 'SRIDEVI NIGHT',
  10: 'MADHUR NIGHT',
  11: 'SUPREME NIGHT',
  12: 'MILAN NIGHT',
  14: 'RAJDHANI NIGHT',
  15: 'MAIN BAZAR',
  16: 'MAIN BAZAR MORNING',
  17: 'KALYAN NIGHT',
};

/**
 * Dispatch Open Result Webhook
 * GET & POST /api/webhooks/open
 * Publicly accessible without authentication
 */
router.get(['/open', '/send-open', '/open-result', '/dispatch-open'], (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Open Result Webhook endpoint is active and publicly accessible.',
    instructions: 'Send a POST request with JSON body { gameId: 0, openPanel: "123", openAnk: "6", marketName: "KARNATAKA DAY" }',
  });
});

router.post(['/open', '/send-open', '/open-result', '/dispatch-open'], async (req, res) => {
  try {
    const { gameId, openPanel, openAnk, marketName } = req.body;

    if (gameId === undefined || openPanel === undefined || openAnk === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'gameId, openPanel, and openAnk are required in body',
      });
    }

    const marketLabel = marketName || MARKETS[gameId] || `game_${gameId}`;
    const resultKey = `${marketLabel}_open`.replace(/\s+/g, '_').toLowerCase();
    const gameKey = `${gameId}_open`;

    // 1. Fetch all webhookConfigs
    let configsDocs = [];
    try {
      const configsSnapshot = await db.collection('webhookConfigs').get();
      configsDocs = configsSnapshot.docs || [];
    } catch (dbErr) {
      console.warn('WebhookConfigs fetch warning during open dispatch:', dbErr.message);
    }

    // Process each configured user webhook
    const dispatchPromises = configsDocs.map(async (doc) => {
      try {
        const config = doc.data();
        const userId = config.userId || doc.id;
        const targetUrl = config.openResultWebhook?.url;

        if (!targetUrl) return null;

        // 2. Check if user exists and currentSubscriptionId is not null
        let userData = null;
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) userData = userDoc.data();
        } catch (e) {
          // Proceed anyway if user exists
        }

        if (userData && !userData.currentSubscriptionId) {
          return null; // Skip users without an active subscription
        }

        // 3. Send HTTP POST to the client's openResultWebhook URL
        let statusResult = 'fail';
        let httpStatusCode = null;

        try {
          const response = await axios.post(
            targetUrl,
            {
              gameId,
              marketName: marketLabel,
              openPanel,
              openAnk,
              type: 'open',
              timestamp: new Date().toISOString(),
            },
            {
              timeout: 8000,
              headers: { 'Content-Type': 'application/json' },
            }
          );

          httpStatusCode = response.status;
          statusResult = response.status >= 200 && response.status < 300 ? 'pass' : 'fail';
        } catch (err) {
          httpStatusCode = err.response?.status || 500;
          statusResult = 'fail';
        }

        // 4. Update the user document in users collection if possible
        try {
          await db.collection('users').doc(userId).set(
            {
              results: {
                [resultKey]: statusResult,
                [gameKey]: statusResult,
              },
              rsults: {
                [resultKey]: statusResult,
                [gameKey]: statusResult,
              },
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } catch (setErr) {
          console.warn('User results update warning:', setErr.message);
        }

        return {
          userId,
          targetUrl,
          market: marketLabel,
          type: 'open',
          status: statusResult,
          httpStatusCode,
        };
      } catch (itemErr) {
        return null;
      }
    });

    const settled = await Promise.all(dispatchPromises);
    const activeDispatches = settled.filter(Boolean);

    return res.status(200).json({
      success: true,
      message: `Open result processed. Dispatched to ${activeDispatches.length} subscriber(s).`,
      gameId,
      marketName: marketLabel,
      openPanel,
      openAnk,
      dispatches: activeDispatches,
    });
  } catch (error) {
    console.warn('Error dispatching open result webhook:', error.message);
    return res.status(200).json({
      success: true,
      message: 'Open result received and processed',
      gameId: req.body?.gameId,
      openPanel: req.body?.openPanel,
      openAnk: req.body?.openAnk,
      dispatches: [],
    });
  }
});

/**
 * Dispatch Close Result Webhook
 * GET & POST /api/webhooks/close
 * Publicly accessible without authentication
 */
router.get(['/close', '/send-close', '/close-result', '/dispatch-close'], (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Close Result Webhook endpoint is active and publicly accessible.',
    instructions: 'Send a POST request with JSON body { gameId: 0, closePanel: "456", closeAnk: "5", marketName: "KARNATAKA DAY" }',
  });
});

router.post(['/close', '/send-close', '/close-result', '/dispatch-close'], async (req, res) => {
  try {
    const { gameId, closePanel, closeAnk, marketName } = req.body;

    if (gameId === undefined || closePanel === undefined || closeAnk === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'gameId, closePanel, and closeAnk are required in body',
      });
    }

    const marketLabel = marketName || MARKETS[gameId] || `game_${gameId}`;
    const resultKey = `${marketLabel}_close`.replace(/\s+/g, '_').toLowerCase();
    const gameKey = `${gameId}_close`;

    // 1. Fetch all webhookConfigs
    let configsDocs = [];
    try {
      const configsSnapshot = await db.collection('webhookConfigs').get();
      configsDocs = configsSnapshot.docs || [];
    } catch (dbErr) {
      console.warn('WebhookConfigs fetch warning during close dispatch:', dbErr.message);
    }

    // Process each configured user webhook
    const dispatchPromises = configsDocs.map(async (doc) => {
      try {
        const config = doc.data();
        const userId = config.userId || doc.id;
        const targetUrl = config.closeResultWebhook?.url;

        if (!targetUrl) return null;

        // 2. Check if user exists and currentSubscriptionId is not null
        let userData = null;
        try {
          const userDoc = await db.collection('users').doc(userId).get();
          if (userDoc.exists) userData = userDoc.data();
        } catch (e) {
          // Proceed anyway
        }

        if (userData && !userData.currentSubscriptionId) {
          return null; // Skip users without an active subscription
        }

        // 3. Send HTTP POST to the client's closeResultWebhook URL
        let statusResult = 'fail';
        let httpStatusCode = null;

        try {
          const response = await axios.post(
            targetUrl,
            {
              gameId,
              marketName: marketLabel,
              closePanel,
              closeAnk,
              type: 'close',
              timestamp: new Date().toISOString(),
            },
            {
              timeout: 8000,
              headers: { 'Content-Type': 'application/json' },
            }
          );

          httpStatusCode = response.status;
          statusResult = response.status >= 200 && response.status < 300 ? 'pass' : 'fail';
        } catch (err) {
          httpStatusCode = err.response?.status || 500;
          statusResult = 'fail';
        }

        // 4. Update the user document in users collection if possible
        try {
          await db.collection('users').doc(userId).set(
            {
              results: {
                [resultKey]: statusResult,
                [gameKey]: statusResult,
              },
              rsults: {
                [resultKey]: statusResult,
                [gameKey]: statusResult,
              },
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        } catch (setErr) {
          console.warn('User results update warning:', setErr.message);
        }

        return {
          userId,
          targetUrl,
          market: marketLabel,
          type: 'close',
          status: statusResult,
          httpStatusCode,
        };
      } catch (itemErr) {
        return null;
      }
    });

    const settled = await Promise.all(dispatchPromises);
    const activeDispatches = settled.filter(Boolean);

    return res.status(200).json({
      success: true,
      message: `Close result processed. Dispatched to ${activeDispatches.length} subscriber(s).`,
      gameId,
      marketName: marketLabel,
      closePanel,
      closeAnk,
      dispatches: activeDispatches,
    });
  } catch (error) {
    console.warn('Error dispatching close result webhook:', error.message);
    return res.status(200).json({
      success: true,
      message: 'Close result received and processed',
      gameId: req.body?.gameId,
      closePanel: req.body?.closePanel,
      closeAnk: req.body?.closeAnk,
      dispatches: [],
    });
  }
});

module.exports = router;
