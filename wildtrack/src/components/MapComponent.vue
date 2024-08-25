<script>
  import { onMounted, watch, toRaw, reactive, onUnmounted } from "vue";
  import { mapDay, mapNight, filterKeyToIndex } from "@/constants";
  import NavBar from "./NavBar.vue";
  import axios from "axios";

  export default {
    name: "MapComponent",
    components: { NavBar },
    async setup() {
      const state = reactive({
        //data arrays
        rows: [],
        columns: [],
        // display data
        displayData: [],
        //dropdown selections
        filtered: {},
        //date values
        datepick: "",
        dateRange: [],
        //display message
        filterMsg: "",
        // marker arrays
        markers: [],
        sightMarks: [],
        flightPaths: [],
        // map attributes
        map: null,
        mapOptions: mapDay,
        nightmode: false,
        // Draw lines
        polygon: null,
        points: [],
      });

      const initializeMap = async () => {
        // initialize map
        const { Map } = await google.maps.importLibrary("maps");
        state.map = new Map(document.getElementById("map"), state.mapOptions);
        // drawing functionality
        state.polygon = new google.maps.Polyline({ strokeWeight: 1 });
        state.polygon.setMap(state.map);
        state.map.addListener("click", (e) => {
          const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          state.points.push(point);
          state.polygon.setPath(state.points);

          new google.maps.Marker({
            map: state.map,
            position: e.latLng,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 3, fillColor: "#4287f5", fillOpacity: 1, strokeColor: "#000000", strokeWeight: 1 },
          });
        });
      };

      const fetchData = async () => {
        const res = await axios.get(`${import.meta.env.VITE_APP_API_BASE_URL}/mapdata`);
        state.rows = res.data.rows;
        state.columns = res.data.columns;
        state.displayData = state.rows.slice(1);
      };

      onMounted(async () => {
        initializeMap();
        fetchData();
      });

      //map color switch
      watch(
        () => state.nightmode,
        (curr, old) => {
          if (curr) {
            state.mapOptions = mapNight;
            state.map.setOptions(state.mapOptions);
          } else {
            state.mapOptions = mapDay;
            state.map.setOptions(state.mapOptions);
          }
        }
      );

      // Clear all markers and paths
      const clearMarkers = () => {
        state.markers.forEach((marker) => toRaw(marker).setMap(null));
        state.sightMarks.forEach((marker) => toRaw(marker).setMap(null));
        state.flightPaths.forEach((path) => toRaw(path).setMap(null));

        state.markers = [];
        state.sightMarks = [];
        state.flightPaths = [];
        state.filterMsg = "";
      };

      // Reset filters and date picker
      const clearButton = () => {
        state.datepick = null;
        state.dateRange = [];
        state.filtered = {};
        clearMarkers();
      };

      // Add a marker to the map
      const addMarker = (row) => {
        const position = new google.maps.LatLng(row[3], row[4]);
        const marker = new google.maps.Marker({
          position,
          map: state.map,
          animation: google.maps.Animation.DROP,
          label: "A",
        });

        marker.addListener("click", () => {
          marker.setAnimation(marker.getAnimation() ? null : google.maps.Animation.BOUNCE);
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="width: 190px">
            <p style="font-weight:500; font-size:16px">${row[5]}</p>
            <p style="font-size:14px">${row[3]},${row[4]}</p>
            <p style="font-size:14px">+${row[1]}</p>
            <p style="font-size:14px">${new Date(row[2]).toLocaleString()}</p>
          </div>`,
        });

        marker.addListener("click", () => {
          infoWindow.open(state.map, marker);
        });

        return marker;
      };

      // Add a sight mark to the map
      const addSightMark = (row) => {
        const position = new google.maps.LatLng(row[6], row[7]);
        const marker = new google.maps.Marker({
          position,
          map: state.map,
          animation: google.maps.Animation.DROP,
          icon: {
            url: "https://storage.googleapis.com/wa_images/icons8-google-maps-32.png",
            scaledSize: new google.maps.Size(32, 32),
          },
        });

        marker.addListener("click", () => {
          marker.setAnimation(marker.getAnimation() ? null : google.maps.Animation.BOUNCE);
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="width: 190px">
            <p style="font-weight:500; font-size:16px">${row[5]}</p>
            <p style="font-size:14px">${row[6]},${row[7]}</p>
            <p style="font-size:14px">+${row[1]}</p>
            <p style="font-size:14px">${new Date(row[2]).toLocaleString()}</p>
          </div>`,
        });

        marker.addListener("click", () => {
          infoWindow.open(state.map, marker);
        });

        return marker;
      };

      // Add a flight path to the map
      const addFlightPath = (row) => {
        const path = [
          { lat: parseFloat(row[3]), lng: parseFloat(row[4]) },
          { lat: parseFloat(row[6]), lng: parseFloat(row[7]) },
        ];
        const randomHex = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        const flightPath = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: randomHex,
          strokeOpacity: 1.0,
          strokeWeight: 2,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              },
            },
          ],
        });

        flightPath.setMap(state.map);
        return flightPath;
      };

      // Create date range array from datepicker component
      const createDateRange = (startDate, endDate) => {
        const date = new Date(startDate);
        while (date <= endDate) {
          state.dateRange.push(new Date(date).toLocaleDateString());
          date.setDate(date.getDate() + 1);
        }
        return state.dateRange;
      };

      watch(
        () => state.displayData,
        (rows) => {
          if (rows?.length) {
            clearMarkers();
            rows.forEach((row) => {
              state.markers.push(addMarker(row));
              state.sightMarks.push(addSightMark(row));
              state.flightPaths.push(addFlightPath(row));
            });
            state.filterMsg = "Currently showing all data";
          }
        }
      );

      watch(
        () => [state.datepick, JSON.stringify(state.filtered)],
        ([dateSnap, filters], [prevDateSnap, prevFilters]) => {
          let filteredData;
          if (dateSnap !== prevDateSnap) {
            state.dateRange.length = 0;
            clearMarkers();
            if (dateSnap) {
              // Apply date range
              state.dateRange = createDateRange(dateSnap[0], dateSnap[1]);
              filteredData = state.rows.filter((row) => state.dateRange.includes(new Date(row?.[2]).toLocaleDateString()));
              state.filterMsg = `Data for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
            } else {
              filteredData = state.rows;
              state.filterMsg = "Currently showing all data";
            }
            if (filters) {
              // Apply filters
              Object.entries(JSON.parse(filters)).forEach(([key, value]) => {
                if (value) {
                  filteredData = filteredData.filter((row) => row?.[filterKeyToIndex[key]] === value);
                }
              });
              state.filterMsg += ` and filtered for ${Object.entries(JSON.parse(filters))
                .map(([key, value]) => (value ? `${key}: ${value}` : ""))
                .filter((x) => x)
                .join(", ")}`;
            }
          }
          if (filters !== prevFilters) {
            clearMarkers();
            if (filters) {
              // Apply filters
              Object.entries(JSON.parse(filters)).forEach(([key, value]) => {
                if (value) {
                  filteredData = state.rows.filter((row) => row?.[filterKeyToIndex[key]] === value);
                }
              });
              state.filterMsg = `Data filtered for ${Object.entries(JSON.parse(filters))
                .map(([key, value]) => (value ? `${key}: ${value}` : ""))
                .filter((x) => x)
                .join(", ")}`;
            }
            if (dateSnap) {
              // Apply date range
              state.dateRange = createDateRange(dateSnap[0], dateSnap[1]);
              filteredData = filteredData.filter((row) => state.dateRange.includes(new Date(row?.[2]).toLocaleDateString()));
              state.filterMsg += ` and for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
            }
          }
          state.displayData = filteredData;
        },
        { deep: true }
      );

      // Re-show all data markers
      const showAll = () => {
        clearMarkers();
        state.rows.slice(1).forEach((row) => {
          state.markers.push(addMarker(row));
          state.sightMarks.push(addSightMark(row));
          state.flightPaths.push(addFlightPath(row));
        });
        state.filterMsg = "Currently showing all data";
      };

      const getUniqueNonEmptyValues = (item) => {
        return [...new Set(item?.slice(1))].filter((val) => val !== "" && val !== null);
      };

      // //calculate distance between two points  (not in use at the moment)
      // const haversineDistance = (pos1, pos2) => {
      //   const R = 3958.8; //radius of the Earth in miles
      //   const rlat1 = pos1.lat * (Math.PI / 180); // Convert degrees to radians
      //   const rlat2 = pos2.lat * (Math.PI / 180); // Convert degrees to radians
      //   const difflat = rlat2 - rlat1; // Radian difference (latitudes)
      //   const difflon = (pos2.lng - pos1.lng) * (Math.PI / 180); // Radian difference (longitudes)

      //   const d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
      //   return d;
      // };

      onUnmounted(() => {
        clearMarkers();
      });

      return { clearButton, showAll, getUniqueNonEmptyValues, state };
    },
  };
</script>

<template>
  <div>
    <NavBar />
    <div class="flex justify-between">
      <div class="mt-1 ml-1 p-5">
        <Datepicker placeholder="select dates" class="rounded-md mb-5" v-model="state.datepick" range></Datepicker>
        <!-- select a filter option -->
        <div>
          <div class="mt-2" v-for="(item, index) in [state.columns[0]].concat(state.columns.slice(10, 15))" :key="index">
            <label>{{ item?.[0] }}</label>
            <select
              v-model="state.filtered[item?.[0]]"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            >
              <!-- <option v-for="(i, idx) in new Set(item?.slice(1))" :key="idx" class="h-10">{{ i }}</option> -->
              <option v-for="(i, idx) in getUniqueNonEmptyValues(item)" :key="idx" class="h-10">{{ i }}</option>
            </select>
          </div>
        </div>
      </div>
      <div class="w-full">
        <!-- map -->
        <div id="map" style="min-width: 75%; height: 88vh" class="mt-1 w-full mr-1"></div>
        <div class="flex">
          <!-- show and clear buttons -->
          <div class="flex mt-8 ml-5 space-x-10 pb-6">
            <button type="button" @click="showAll" class="bg-slate-400 rounded-md px-2 w-16 h-8 hover:bg-slate-500">showall</button>
            <button type="button" @click="clearButton" class="bg-slate-400 hover:bg-slate-500 rounded-md px-2 w-16 h-8">clear</button>
          </div>
          <!-- filter message -->
          <div class="">
            <p class="mt-7 ml-28 font-semibold w-[500px]">{{ state.filterMsg }}</p>
          </div>
          <!-- helper div, just pushing the toggle button -->
          <div id="pusher" :class="[`flex-grow`]"></div>
          <!-- toggle button -->
          <div class="mt-7 mr-7 self-start">
            <label for="default-toggle" class="inline-flex relative items-center cursor-pointer">
              <input v-model="state.nightmode" type="checkbox" id="default-toggle" class="sr-only peer" />
              <div
                class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
              ></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
