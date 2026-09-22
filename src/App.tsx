import { LayoutGroup, MotionConfig } from 'motion/react';
import { useMemo } from 'react';
import { AmbientBackground } from './components/AmbientBackground';
import { spring } from './components/motion';
import { TabBar } from './components/TabBar';
import { ToastHost } from './components/Toast';
import { useCategory } from './viewmodels/filters';
import { useNavigation } from './viewmodels/navigation';
import { useFavorites } from './viewmodels/saved';
import { useSnapshots } from './viewmodels/snapshots';
import { HomeView } from './views/HomeView';
import { MapView } from './views/MapView';
import { PlaceDetail } from './views/PlaceDetail';
import { SavedView } from './views/SavedView';

export function App() {
  const { tab, detail } = useNavigation();
  const category = useCategory();
  const favorites = useFavorites();
  const snapshots = useSnapshots();
  const savedOpenCount = useMemo(() => {
    const ids = new Set(favorites.map((f) => f.id));
    return snapshots.filter((s) => ids.has(s.place.id) && s.status.isOpen).length;
  }, [favorites, snapshots]);

  return (
    <MotionConfig reducedMotion="user" transition={spring}>
      <LayoutGroup>
        <div className="app">
          <AmbientBackground category={category} />
          {/* Views stay mounted so each keeps its scroll position and map camera. */}
          <main inert={detail !== null}>
            <HomeView active={tab === 'now'} />
            <MapView active={tab === 'map'} />
            <SavedView active={tab === 'saved'} />
          </main>
          <div inert={detail !== null}>
            <TabBar savedOpenCount={savedOpenCount} />
          </div>
          <PlaceDetail />
          <ToastHost />
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
