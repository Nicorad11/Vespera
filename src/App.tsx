import { LayoutGroup, MotionConfig } from 'motion/react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AmbientBackground } from './components/AmbientBackground';
import { spring } from './components/motion';
import { TabBar } from './components/TabBar';
import { ToastHost } from './components/Toast';
import { useCategory } from './viewmodels/filters';
import { useMapFocus, useNavigation } from './viewmodels/navigation';
import { useFavorites } from './viewmodels/saved';
import { useSnapshots } from './viewmodels/snapshots';
import { HomeView } from './views/HomeView';
import { PlaceDetail } from './views/PlaceDetail';
import { SavedView } from './views/SavedView';

// Leaflet is the heaviest dependency: load the map separately so the first
// screen renders without waiting for it, then warm it up in the background.
const loadMapView = () => import('./views/MapView');
const MapView = lazy(() => loadMapView().then((module) => ({ default: module.MapView })));

function useMapMounted(active: boolean): boolean {
  const focus = useMapFocus();
  const [mounted, setMounted] = useState(active);
  useEffect(() => {
    if (active || focus) setMounted(true);
  }, [active, focus]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMapView();
      setMounted(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);
  return mounted || active;
}

export function App() {
  const { tab, detail } = useNavigation();
  const category = useCategory();
  const favorites = useFavorites();
  const snapshots = useSnapshots();
  const mapMounted = useMapMounted(tab === 'map');
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
            {mapMounted && (
              <Suspense fallback={<section className="view map-view" hidden={tab !== 'map'} />}>
                <MapView active={tab === 'map'} />
              </Suspense>
            )}
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
