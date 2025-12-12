// vote.routes.js
import express from 'express';
import { createVote, castVote, getVoteResults } from '../controllers/vote.controller.js';
import { protect } from '../middleware/auth.middleware.js'; 

const router = express.Router();

// 1. Route to create a new poll (Requires Auth)
// This is typically done by POSTing to the base resource URL.
router.post('/', protect, createVote);

// 2. Route to cast a vote (Requires Auth)
router.post('/:voteId/cast', protect, castVote);

// 3. Route to get the results (Public access is typical)
router.get('/:voteId/results', getVoteResults);

export default router;