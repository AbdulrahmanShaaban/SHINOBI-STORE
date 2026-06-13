import { Router, Response } from 'express';
import Product from '../models/Product';
import { adminAuth, AuthRequest } from '../middleware/auth';

const router: Router = Router();

// Get all products
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, featured, search } = req.query;
    
    let filter: any = {};
    
    if (category) filter.category = category;
    if (featured === 'true') filter.featured = true;
    if (search) {
      const searchStr = Array.isArray(search) ? search[0] : String(search);
      filter.$or = [
        { name: { $regex: searchStr, $options: 'i' } },
        { description: { $regex: searchStr, $options: 'i' } },
        { tags: { $in: [searchStr] } },
      ];
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product by slug
router.get('/:slug', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product (admin only)
router.post('/', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create product' });
  }
});

// Update product (admin only)
router.put('/:id', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update product' });
  }
});

// Delete product (admin only)
router.delete('/:id', adminAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Failed to delete product' });
  }
});

export default router;
