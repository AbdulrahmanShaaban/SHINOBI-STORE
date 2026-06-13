import { Router, Response } from 'express';
import multer from 'multer';
import { uploadImage, uploadMultipleImages } from '../utils/cloudinary';
import { adminAuth, AuthRequest } from '../middleware/auth';

const router: Router = Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  },
});

// Upload single image
router.post('/single', adminAuth, upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Convert buffer to base64
    const base64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const imageUrl = await uploadImage(base64);

    res.json({ url: imageUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Upload multiple images
router.post('/multiple', adminAuth, upload.array('images', 10), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as any[];
    
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    // Convert buffers to base64
    const base64Images = files.map((file: any) => 
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
    );
    
    const imageUrls = await uploadMultipleImages(base64Images);

    res.json({ urls: imageUrls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

export default router;
