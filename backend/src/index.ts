import './config/env'; // Load environment variables
import { startAgents } from './eliza';

startAgents().catch((error) => {
  console.error('Unhandled error in startAgents:', error);
  process.exit(1);
});
