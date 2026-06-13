import { Router } from 'express';
import products from './products';
import orders from './orders';
import auth from './auth';
import stripe from './stripe';
import upload from './upload';

const router: Router = Router();

// Mount routes
router.use('/products', products);
router.use('/orders', orders);
router.use('/auth', auth);
router.use('/stripe', stripe);
router.use('/upload', upload);

export default router;
