import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { startClaimExpiryWorker } from './jobs/claim-expiry.js';
import { startLiveUpcomingWorker } from './jobs/live-upcoming.js';
import { startOfferExpiryWorker } from './jobs/offer-expiry.js';
import { startReviewNudgeWorker } from './jobs/review-nudge.js';
import checkoutRoutes from './routes/checkout.js';
import authRoutes from './routes/auth.js';
import inboxRoutes from './routes/inbox.js';
import listingsRoutes from './routes/listings.js';
import liveRoutes from './routes/live.js';
import mediaRoutes from './routes/media.js';
import openRoutes from './routes/open.js';
import profilesRoutes from './routes/profiles.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'throve-backend' });
});

app.use('/open', openRoutes);
app.use('/auth', authRoutes);
app.use('/profiles', profilesRoutes);
app.use('/listings', listingsRoutes);
app.use('/inbox', inboxRoutes);
app.use('/live', liveRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/media', mediaRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: 'Not found', code: 'NOT_FOUND' });
});

app.listen(port, () => {
  console.log(`Throve backend listening on http://localhost:${port}`);
  startClaimExpiryWorker();
  startOfferExpiryWorker();
  startLiveUpcomingWorker();
  startReviewNudgeWorker();
});
