import type { Bundle } from '../types';
import Standings from './standings/Standings';
import Relative from './relative/Relative';
import DeltaBar from './delta/DeltaBar';
import StreamAlerts from './stream-alerts/StreamAlerts';
import './styles.css';
import './animations.css';

const bundle: Bundle = {
  id: 'default',
  name: 'Default',
  components: {
    standings: Standings,
    relative: Relative,
    delta: DeltaBar,
    'stream-alerts': StreamAlerts,
  },
};

export default bundle;
