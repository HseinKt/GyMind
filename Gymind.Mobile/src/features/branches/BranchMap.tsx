import React, { useEffect, useState, useMemo, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MapView, { Marker, Region } from 'react-native-maps';
import { useForgeTheme } from '@/theme/theme';
import { BranchAccess } from '@/types/branch';
import { haversineDistanceKm, Coordinates } from '@/utils/distance';
import { DistanceChips, DistanceBucket } from './components/DistanceChips';
import { RadarPulse } from './components/RadarPulse';

interface BranchMapProps {
  branches: BranchAccess[];
}

interface BranchWithDistance {
  branch: BranchAccess;
  distanceKm: number;
}

function inBucket(distanceKm: number, bucket: DistanceBucket): boolean {
  if (bucket === '0-3') return distanceKm <= 3;
  if (bucket === '3-6') return distanceKm > 3 && distanceKm <= 6;
  return distanceKm > 6 && distanceKm <= 10;
}

export function BranchMap({ branches }: BranchMapProps) {
  const theme = useForgeTheme();
  const [permission, setPermission] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [bucket, setBucket] = useState<DistanceBucket>('0-3');
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);

  const requestLocation = React.useCallback(async () => {
    setLocating(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermission('denied');
      setLocating(false);
      return;
    }

    const current = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    setUserCoords({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
    setPermission('granted');
    setLocating(false);
  }, []);

  useEffect(() => {
    void requestLocation();
  }, [requestLocation]);

  const mapRegion = useMemo<Region | null>(() => {
    if (!userCoords) return null;
    return {
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
  }, [userCoords]);

  const branchesInRange = useMemo<BranchWithDistance[]>(() => {
    if (!userCoords) return [];

    return branches
      .filter((branch) => branch.lat && branch.lng)
      .map((branch) => ({
        branch,
        distanceKm: haversineDistanceKm(userCoords, { latitude: branch.lat!, longitude: branch.lng! }),
      }))
      .filter((item) => inBucket(item.distanceKm, bucket));
  }, [bucket, branches, userCoords]);

  if (permission === 'denied') {
    return (
      <View style={s.centerState}>
        <MaterialCommunityIcons name="map-marker-off-outline" size={36} color={theme.primary} />
        <Text style={[s.stateTitle, { color: theme.text }]}>Location Permission Needed</Text>
        <Text style={[s.stateSub, { color: theme.muted }]}>
          Enable location permission to discover nearby gyms.
        </Text>
        <TouchableOpacity style={[s.retryBtn, { backgroundColor: theme.primary }]} onPress={() => void requestLocation()}>
          <Text style={s.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!mapRegion || locating || permission === 'loading') {
    return (
      <View style={s.centerState}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[s.stateSub, { color: theme.muted }]}>Locating nearby branches...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={mapRegion} showsUserLocation={false}>
        <Marker coordinate={userCoords!}>
          <RadarPulse color={theme.primary} />
        </Marker>
        {branchesInRange.map((item) => (
          <Marker
            key={item.branch.branchId}
            coordinate={{ latitude: item.branch.lat!, longitude: item.branch.lng! }}
            title={item.branch.branchName}
            description={`${item.distanceKm.toFixed(1)} km away`}
          >
            <View style={s.pinWrap}>
              <MaterialCommunityIcons name="map-marker" size={26} color={theme.primary} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[s.overlayTop, { backgroundColor: `${theme.surface}E6`, borderColor: theme.border }]}>
        <View style={s.rowBetween}>
          <Text style={[s.heading, { color: theme.text }]}>Location Discovery</Text>
          <TouchableOpacity onPress={() => void requestLocation()}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
        <DistanceChips selected={bucket} onSelect={setBucket} />
        <Text style={[s.countText, { color: theme.muted }]}>
          {branchesInRange.length} branches in selected range
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    height: 400,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 16,
  },
  overlayTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    fontSize: 16,
    fontWeight: '900',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  centerState: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  pinWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
