const express = require('express');
const router = express.Router();
const { db, admin } = require('../config/firebase');
const { authenticate } = require('../middleware/auth');

/**
 * Auth Routes
 * POST /api/auth/register — Create user document in Firestore
 * GET /api/auth/profile — Get authenticated user's profile
 */

// Register user — creates Firestore user doc after Firebase Auth signup
router.post('/register', authenticate, async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { displayName, phone } = req.body;

    // Check if user doc already exists
    const existingUser = await db.collection('users').doc(uid).get();

    if (existingUser.exists) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User already registered',
      });
    }

    // Validate input
    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Display name is required (min 2 characters)',
      });
    }

    // Validate compulsory 10-digit phone number
    const cleanPhone = phone ? String(phone).replace(/\D/g, '') : '';
    if (!cleanPhone || cleanPhone.length !== 10) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Valid 10-digit mobile number is compulsory',
      });
    }

    const userData = {
      email,
      displayName: displayName.trim(),
      phone: cleanPhone,
      status: 'active',
      currentSubscriptionId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Use uid as document ID
    await db.collection('users').doc(uid).set(userData);

    res.status(201).json({
      message: 'User registered successfully',
      user: { uid, ...userData },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register user',
    });
  }
});

// Get authenticated user's profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const { uid, email, displayName } = req.user;

    let userData = null;
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        userData = userDoc.data();
      }
    } catch (dbErr) {
      console.warn('Firestore user fetch failed in /profile (using token data):', dbErr.message);
    }

    if (!userData) {
      return res.json({
        user: {
          uid,
          email: email || '',
          displayName: displayName || 'User',
          status: 'active',
          currentSubscriptionId: null,
          results: {},
          rsults: {},
        },
      });
    }

    res.json({
      user: {
        uid,
        email: userData.email || email || '',
        displayName: userData.displayName || displayName || 'User',
        status: userData.status || 'active',
        currentSubscriptionId: userData.currentSubscriptionId || null,
        results: userData.results || userData.rsults || {},
        rsults: userData.rsults || userData.results || {},
        ...userData,
      },
    });
  } catch (error) {
    console.error('Profile fetch error fallback:', error);
    res.json({
      user: {
        uid: req.user?.uid || 'user',
        email: req.user?.email || '',
        displayName: req.user?.displayName || 'User',
        status: 'active',
        currentSubscriptionId: null,
        results: {},
        rsults: {},
      },
    });
  }
});

module.exports = router;
