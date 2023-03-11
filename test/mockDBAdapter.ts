import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import schema from '../src/db/schema';

const mockDBAdapter = new LokiJSAdapter({
  schema,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
});

export default mockDBAdapter;
