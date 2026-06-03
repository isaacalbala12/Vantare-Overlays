import type { Bundle } from '../types';
import Standings from './standings/Standings';
import Relative from './relative/Relative';
import DeltaBar from './delta/DeltaBar';
import './styles.css';
import './animations.css';

const bundle: Bundle = {
  id: 'default',
  name: 'Default',
  components: {
    standings: Standings,
    relative: Relative,
    delta: DeltaBar,
    // stream-alerts is a placeholder until T5 ships its component.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    'stream-alerts': Standings as any, // TODO(sprint-4a-t5): replace with StreamAlerts
  },
};

export default bundle;
