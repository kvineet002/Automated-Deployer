import express from 'express';
import { showForm, handleRepoSubmit, handleContainerization } from '../controllers/repoController.js';

const router = express.Router();

router.get('/', showForm);
router.post('/detect', handleRepoSubmit);
router.post('/deploy', handleContainerization   );
export default router;
