import express from 'express';
import { showForm, handleRepoSubmit } from '../controllers/repoController.js';

const router = express.Router();

router.get('/', showForm);
router.post('/detect', handleRepoSubmit);

export default router;
