<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// SVG-Marker (keine externen Bilder nötig)
const createMarkerIcon = () =>
  L.divIcon({
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
      <path fill="#16a34a" stroke="#fff" stroke-width="2" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z"/>
      <circle fill="#fff" cx="12" cy="12" r="4"/>
    </svg>`,
    className: 'custom-marker',
    iconSize: [28, 42],
    iconAnchor: [14, 42],
  });

const props = defineProps({
  modelValue: {
    type: Object,
    default: null,
    validator: (v) => v == null || (typeof v?.lat === 'number' && typeof v?.lng === 'number'),
  },
  height: {
    type: String,
    default: '300px',
  },
});

const emit = defineEmits(['update:modelValue']);

const mapContainer = ref(null);
let map = null;
let marker = null;
let clickHandler = null;

const DEFAULT_CENTER = [51.1657, 10.4515];
const DEFAULT_ZOOM = 6;

function updateMarker(lat, lng) {
  if (marker) {
    map.removeLayer(marker);
    marker = null;
  }
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    marker = L.marker([lat, lng], { icon: createMarkerIcon() }).addTo(map);
    map.setView([lat, lng], Math.max(map.getZoom(), 14));
  }
}

function onMapClick(e) {
  const { lat, lng } = e.latlng;
  emit('update:modelValue', { lat, lng });
  updateMarker(lat, lng);
}

onMounted(() => {
  if (!mapContainer.value) return;
  map = L.map(mapContainer.value).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  clickHandler = onMapClick;
  map.on('click', clickHandler);

  if (props.modelValue?.lat != null && props.modelValue?.lng != null) {
    updateMarker(props.modelValue.lat, props.modelValue.lng);
  }
});

watch(
  () => props.modelValue,
  (val) => {
    if (!map) return;
    if (val?.lat != null && val?.lng != null) {
      updateMarker(val.lat, val.lng);
    } else if (marker) {
      map.removeLayer(marker);
      marker = null;
    }
  },
  { immediate: false }
);

onUnmounted(() => {
  if (map) {
    if (clickHandler) map.off('click', clickHandler);
    map.remove();
    map = null;
  }
  marker = null;
});
</script>

<template>
  <div class="map-picker">
    <p class="map-hint">Klicken Sie auf die Karte, um den Standort festzulegen.</p>
    <div ref="mapContainer" class="map-container" :style="{ height }"></div>
  </div>
</template>

<style scoped>
.map-picker {
  width: 100%;
}

.map-hint {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.map-container {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #d0d5dd;
}

:deep(.custom-marker) {
  background: none !important;
  border: none !important;
}
</style>
