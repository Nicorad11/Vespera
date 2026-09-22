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

export function App() {
  const { tab } = useNavigation();
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
          <main>
            <HomeView active={tab === 'now'} />
          </main>
          <TabBar savedOpenCount={savedOpenCount} />
          <ToastHost />
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}
