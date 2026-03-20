import express from 'express';
import { authenticate, isStaffOrHOD } from '../middleware/auth.js';
import { verifyEventWithAI, generateEventSummary, chatWithAI } from '../services/aiService.js';

const router = express.Router();

router.use(authenticate);

// Chat is accessible to all authenticated users
// @route   POST /api/ai/chat
// @desc    Chat with AI assistant
// @access  All authenticated users
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const response = await chatWithAI(message, context);

    res.json({
      success: true,
      reply: response
    });

  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'AI chat failed',
      error: error.message 
    });
  }
});

// Staff/HOD only routes below
router.use(isStaffOrHOD);

// @route   POST /api/ai/verify-event
// @desc    Verify if an event is real using AI
// @access  Staff/HOD
router.post('/verify-event', async (req, res) => {
  try {
    const eventData = req.body;

    if (!eventData.event_name || !eventData.venue) {
      return res.status(400).json({
        success: false,
        message: 'Event name and venue are required'
      });
    }

    const result = await verifyEventWithAI(eventData);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('AI verify error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'AI verification failed',
      error: error.message 
    });
  }
});

// @route   POST /api/ai/summarize
// @desc    Generate AI summary of OD request
// @access  Staff/HOD
router.post('/summarize', async (req, res) => {
  try {
    const requestData = req.body;

    const summary = await generateEventSummary(requestData);

    res.json({
      success: true,
      data: { summary }
    });

  } catch (error) {
    console.error('AI summarize error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Summary generation failed',
      error: error.message 
    });
  }
});

export default router;
