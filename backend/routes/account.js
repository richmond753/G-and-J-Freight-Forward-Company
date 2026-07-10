// routes/account.js — customer login, saved quotes, past shipments

const express = require('express');
const { body, validationResult } = require('express-validator');
const { contactLimiter } = require('../middleware/rateLimiter');
const {
  ensureStore,
  login,
  register,
  getCustomerByToken,
  destroySession,
  publicCustomer,
} = require('../utils/customersStore');

ensureStore();

const router = express.Router();

function getToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.headers['x-customer-token'] || '';
}

function requireCustomer(req, res, next) {
  const customer = getCustomerByToken(getToken(req));
  if (!customer) {
    return res.status(401).json({ success: false, message: 'Please log in.' });
  }
  req.customer = customer;
  next();
}

router.post(
  '/login',
  contactLimiter,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isLength({ min: 6, max: 100 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, message: 'Invalid email or password format.' });
    }
    const result = login(req.body.email, req.body.password);
    if (!result) {
      return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
    }
    res.status(200).json({
      success: true,
      message: 'Welcome back.',
      token: result.token,
      customer: result.customer,
    });
  }
);

router.post(
  '/register',
  contactLimiter,
  [
    body('email').trim().isEmail().normalizeEmail(),
    body('password').isLength({ min: 8, max: 100 }),
    body('name').trim().notEmpty().isLength({ max: 80 }),
    body('company').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({
        success: false,
        message: 'Check your details and try again.',
        errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
      });
    }
    const result = register(req.body);
    if (result.error) {
      return res.status(409).json({ success: false, message: result.error });
    }
    res.status(201).json({
      success: true,
      message: 'Account created.',
      token: result.token,
      customer: result.customer,
    });
  }
);

router.post('/logout', (req, res) => {
  destroySession(getToken(req));
  res.status(200).json({ success: true, message: 'Signed out.' });
});

router.get('/me', requireCustomer, (req, res) => {
  res.status(200).json({ success: true, customer: publicCustomer(req.customer) });
});

router.get('/quotes', requireCustomer, (req, res) => {
  res.status(200).json({
    success: true,
    data: req.customer.quotes || [],
  });
});

router.get('/shipments', requireCustomer, (req, res) => {
  res.status(200).json({
    success: true,
    data: req.customer.shipments || [],
  });
});

module.exports = router;
