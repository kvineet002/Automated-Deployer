import express from 'express';
import { showForm, handleRepoSubmit, handleContainerization, handleDeploymentLogs } from '../controllers/repoController.js';

const router = express.Router();

router.get('/', showForm);
router.post('/detect', handleRepoSubmit);
router.post('/deploy', handleContainerization   );
router.get('/deploy-stream', handleDeploymentLogs);
export default router;
