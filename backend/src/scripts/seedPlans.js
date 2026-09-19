/**
 * Seed Plans Script
 * Creates the 3 subscription plans in Firestore
 *
 * Usage: node src/scripts/seedPlans.js
 * Or:    npm run seed:plans
 */

require('dotenv').config();
const { db, admin } = require('../config/firebase');

const plans = [
  {
    id: 'monthly',
    name: '1 Month',
    durationMonths: 1,
    price: 1999,
    currency: 'INR',
    isActive: true,
    features: [
      'Open Result Webhook',
      'Close Result Webhook',
      'Real-time API Results',
      'Email Support',
    ],
  },
  {
    id: 'six_month',
    name: '6 Months',
    durationMonths: 6,
    price: 9999,
    currency: 'INR',
    isActive: true,
    features: [
      'Open Result Webhook',
      'Close Result Webhook',
      'Real-time API Results',
      'Priority Support',
      'Save 17%',
    ],
  },
  {
    id: 'yearly',
    name: '1 Year',
    durationMonths: 12,
    price: 17999,
    currency: 'INR',
    isActive: true,
    features: [
      'Open Result Webhook',
      'Close Result Webhook',
      'Real-time API Results',
      'Priority Support',
      'Save 25%',
      'Best Value',
    ],
  },
];

async function seedPlans() {
  console.log('Seeding plans...\n');

  const batch = db.batch();

  for (const plan of plans) {
    const { id, ...planData } = plan;
    const ref = db.collection('plans').doc(id);

    batch.set(ref, {
      ...planData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`  ✓ Plan: ${planData.name} — ₹${planData.price / 100} (${id})`);
  }

  await batch.commit();

  console.log('\n✦ Plans seeded successfully!\n');
  process.exit(0);
}

seedPlans().catch((error) => {
  console.error('Error seeding plans:', error);
  process.exit(1);
});
