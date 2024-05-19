<script>
  import { computed, ref, onMounted, watch, toRaw, reactive, onUnmounted, provide, unref, onUpdated, nextTick } from "vue";
  import { Loader } from "@googlemaps/js-api-loader";
  import { datastore } from "@/datastore";
  import NavBar from "./NavBar.vue";
  import axios from "axios";

  export default {
    name: "MapComponent",
    components: {
      NavBar,
    },
    async setup() {
      // watchEffect(() => {});

      const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const sheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID;
      const { mapDay, mapNight } = datastore();
      const state = reactive({
        //data arrays
        rows: [],
        columns: [],
        //dropdown selections
        filtered: {},
        //date values
        datepick: "",
        dateRange: [],
        //display message
        filterMsg: "",
        //markers arrays
        //initial markers
        initialMarkers: [],
        initialSightMarks: [],
        initialFlightPaths: [],
        //date-only markers
        dateMarkers: [],
        dateSightMarks: [],
        dateFlightPaths: [],
        //date+filter from dropdown markers
        dateFilteredMarkers: [],
        dateFilteredSightMarks: [],
        dateFilteredFlightPaths: [],
        //filter-only markers (currently not in use)
        filteredMarkers: [],
        filteredSightMarks: [],
        filteredFlightPaths: [],
        //map attrs
        map: null,
        mapOptions: mapDay,
        nightmode: false,
        //draw lines
        polygon: null,
        points: [],
      });
      const loader = new Loader({
        apiKey: GOOGLE_MAPS_API_KEY,
        version: "weekly",
        libraries: ["drawing", "geometry", "places", "localContext", "visualization"],
      });

      onMounted(async () => {
        await loader.load();
        const res = await axios.get(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?dateTimeRenderOption=FORMATTED_STRING&majorDimension=columns&ranges=MAP DB!A:AG&key=${GOOGLE_MAPS_API_KEY}`);
        state.rows = res.data.valueRanges[0].values[0].map((_, rowIndex) => res.data.valueRanges[0].values.map((col) => col[rowIndex]));
        state.columns = res.data.valueRanges[0].values;
        state.map = new google.maps.Map(document.getElementById("map"), state.mapOptions);
      });

      onUpdated(() => {
        state.polygon = new google.maps.Polyline({ strokeWeight: 1 });
        state.polygon.setMap(state.map);
        state.map.addListener("click", (e) => {
          const point = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          state.points.push(point);
          state.polygon.setPath(state.points);

          new google.maps.Marker({
            position: e.latLng,
            map: state.map,
            icon: { path: google.maps.SymbolPath.CIRCLE, scale: 3, fillColor: "#4287f5", fillOpacity: 1, strokeColor: "#000000", strokeWeight: 1 },
          });
        });
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

      // clear state markers arrays
      // /////////////////////////////////////////////////////////
      const clearCurrent = () => {
        if (state.initialMarkers.length) {
          for (let i = 0; i < state.initialMarkers.length; i++) {
            toRaw(state.initialMarkers[i]).setMap(null);
            toRaw(state.initialSightMarks[i]).setMap(null);
            toRaw(state.initialFlightPaths[i]).setMap(null);
          }
          state.initialMarkers = [];
          state.initialSightMarks = [];
          state.initialFlightPaths = [];
        }
        if (state.filteredMarkers.length) {
          for (let i = 0; i < state.filteredMarkers.length; i++) {
            toRaw(state.filteredMarkers[i]).setMap(null);
            toRaw(state.filteredSightMarks[i]).setMap(null);
            toRaw(state.filteredFlightPaths[i]).setMap(null);
          }
          state.filteredMarkers = [];
          state.filteredSightMarks = [];
          state.filteredFlightPaths = [];
        }
        if (state.dateFilteredMarkers.length) {
          for (let i = 0; i < state.dateFilteredMarkers.length; i++) {
            toRaw(state.dateFilteredMarkers[i]).setMap(null);
            toRaw(state.dateFilteredSightMarks[i]).setMap(null);
            toRaw(state.dateFilteredFlightPaths[i]).setMap(null);
          }
          state.dateFilteredMarkers = [];
          state.dateFilteredSightMarks = [];
          state.dateFilteredFlightPaths = [];
        }
        if (state.dateMarkers.length) {
          for (let i = 0; i < state.dateMarkers.length; i++) {
            toRaw(state.dateMarkers[i]).setMap(null);
            toRaw(state.dateSightMarks[i]).setMap(null);
            toRaw(state.dateFlightPaths[i]).setMap(null);
          }
          state.dateMarkers = [];
          state.dateSightMarks = [];
          state.dateFlightPaths = [];
        }
        state.filterMsg = "";
      };

      // clears datepicker placeholder, dateRange array, filtered array
      // clearCurrent() is called to clear all state markers arrays
      // /////////////////////////////////////////////////////////
      const clearButton = () => {
        state.datepick = null;
        state.dateRange = [];
        state.filtered = [];
        clearCurrent();
      };

      // marker generic function
      // /////////////////////////////////////////////////////////
      const addMarker = (row) => {
        const position = new google.maps.LatLng(row?.[3], row?.[4]);
        const marker = new google.maps.Marker({
          position,
          map: state.map,
          animation: google.maps.Animation.DROP,
          label: "A",
        });
        marker.addListener("click", () => {
          if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
          } else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
          }
        });
        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="width: 190px">
          <p style="font-weight:500; font-size:16px">${row?.[5]}</p>
          <p style="font-size:14px">${row?.[3]},${row?.[4]}</p>
          <p style="font-size:14px">+${row?.[1]}</p>
          <p style="font-size:14px">${new Date(row?.[2]).toLocaleString()}</p>
          </div>`,
        });
        marker.addListener("click", () => {
          infoWindow.open(state.map, marker);
        });
        return marker;
      };

      // sight mark generic function
      // /////////////////////////////////////////////////////////
      const addSightMark = (row) => {
        const position = new google.maps.LatLng(row?.[6], row?.[7]);
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
          if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
          } else {
            marker.setAnimation(google.maps.Animation.BOUNCE);
          }
        });
        const infoWindow = new google.maps.InfoWindow({
          content: `<div style="width: 190px">
          <p style="font-weight:500; font-size:16px">${row?.[5]}</p>
          <p style="font-size:14px">${row?.[6]},${row?.[7]}</p>
          <p style="font-size:14px">+${row?.[1]}</p>
          <p style="font-size:14px">${new Date(row?.[2]).toLocaleString()}</p>
          </div>`,
        });
        marker.addListener("click", () => {
          infoWindow.open(state.map, marker);
        });
        return marker;
      };

      // flight path generic function
      // /////////////////////////////////////////////////////////
      const addFlightPath = (row) => {
        const path = [
          { lat: parseFloat(row?.[3]), lng: parseFloat(row?.[4]) },
          { lat: parseFloat(row?.[6]), lng: parseFloat(row?.[7]) },
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

      // initial markers rendering block
      // /////////////////////////////////////////////////////////
      watch(
        () => state.rows,
        (rows) => {
          if (rows) {
            //initial
            rows.slice(1).map((row) => {
              const marker = addMarker(row);
              state.initialMarkers.push(marker);
              const sightMark = addSightMark(row);
              state.initialSightMarks.push(sightMark);
              const flightPath = addFlightPath(row);
              state.initialFlightPaths.push(flightPath);
              state.filterMsg = "showing all data";
            });
          }
        }
      );

      // show button  re-show all markers data
      // /////////////////////////////////////////////////////////
      const show = () => {
        clearCurrent();
        state.rows.slice(1).map((row) => {
          const marker = addMarker(row);
          state.initialMarkers.push(marker);

          const sightMark = addSightMark(row);
          state.initialSightMarks.push(sightMark);

          const flightPath = addFlightPath(row);
          state.initialFlightPaths.push(flightPath);
          state.filterMsg = "Currenty showing all data";
        });
      };

      // create daterange array from datepicker component
      // /////////////////////////////////////////////////////////
      const createdateRange = (startDate, endDate) => {
        const date = new Date(startDate);
        while (date <= endDate) {
          state.dateRange.push(new Date(date).toLocaleDateString());
          date.setDate(date.getDate() + 1);
        }
        return state.dateRange;
      };

      // datepicker filter display data (triggered by selecting dates)
      // /////////////////////////////////////////////////////////
      watch(
        () => state.datepick,
        (dateSnap) => {
          if (dateSnap) {
            if (state.dateRange.length > 0) {
              state.dateRange.length = 0;
            }
            clearCurrent();
            createdateRange(dateSnap[0], dateSnap[1]);
            if (Object.keys(state.filtered).length) {
              for (const p in state.filtered) {
                if (p === "User") {
                  state.rows.slice(1).map((row) => {
                    if (row?.[0] === state.filtered[p]) {
                      if (state.dateRange.includes(new Date(row?.[2]).toLocaleDateString())) {
                        const marker = addMarker(row);
                        state.dateFilteredMarkers.push(marker);
                        const sightMark = addSightMark(row);
                        state.dateFilteredSightMarks.push(sightMark);
                        const flightPath = addFlightPath(row);
                        state.dateFilteredFlightPaths.push(flightPath);
                        state.filterMsg = `data for ${row?.[0]} for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
                      }
                    }
                  });
                }
              }
              // else if datepicker is used on its own
            } else if (!Object.keys(state.filtered).length) {
              state.rows.slice(1).map((row) => {
                if (state.dateRange.includes(new Date(row?.[2]).toLocaleDateString())) {
                  const marker = addMarker(row);
                  state.dateMarkers.push(marker);

                  const sightMark = addSightMark(row);
                  state.dateSightMarks.push(sightMark);

                  const flightPath = addFlightPath(row);
                  state.dateFlightPaths.push(flightPath);
                  state.filterMsg = `data for period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
                }
              });
            }
          }
        }
      );

      //calculate distance between two points  (not in use at the moment)
      const haversineDistance = (pos1, pos2) => {
        const R = 3958.8; //radius of the Earth in miles
        const rlat1 = pos1.lat * (Math.PI / 180); // Convert degrees to radians
        const rlat2 = pos2.lat * (Math.PI / 180); // Convert degrees to radians
        const difflat = rlat2 - rlat1; // Radian difference (latitudes)
        const difflon = (pos2.lng - pos1.lng) * (Math.PI / 180); // Radian difference (longitudes)

        const d = 2 * R * Math.asin(Math.sqrt(Math.sin(difflat / 2) * Math.sin(difflat / 2) + Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)));
        return d;
      };

      onUnmounted(() => {
        console.log("unmounted");
        clearCurrent();
        state.datepick = "";
      });

      return { clearCurrent, clearButton, show, state };
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
          <div class="mt-2" v-for="(item, index) in [state.columns[0]].concat(state.columns.slice(10, 18))" :key="index">
            <label>{{ item?.[0] }}</label>
            <select
              v-model="state.filtered[item?.[0]]"
              class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            >
              <option v-for="(i, idx) in new Set(item?.slice(1))" :key="idx" class="h-10">{{ i }}</option>
            </select>
          </div>
        </div>
      </div>
      <div class="w-full">
        <!-- div mini bar above the map -->
        <div class="flex justify-center space-x-36">
          <!-- your position div -->
          <div class="flex space-x-2">div</div>
          <!-- distance div -->
          <div class="flex space-x-2">div</div>
          <!-- position picker div -->
          <div class="flex space-x-2">div</div>
        </div>
        <!-- map -->
        <div id="map" style="min-width: 75%; height: 88vh" class="mt-1 w-full mr-1"></div>
        <div class="flex">
          <!-- radio buttons -->
          <div class="ml-5 mt-7 grid grid-cols-2 w-48 gap-2">
            <div class="space-x-1" v-for="(item, index) in state.columns.slice(18)" :key="index">
              <input type="radio" :value="item" />
              <label :for="index">{{ item?.[0] }}</label>
            </div>
          </div>
          <!-- show and clear buttons -->
          <div class="flex flex-col mt-8 ml-5">
            <button type="button" @click="show" class="bg-slate-400 rounded-md px-2 w-16 h-8 hover:bg-slate-500">showall</button>
            <button type="button" @click="clearButton" class="mt-8 bg-slate-400 hover:bg-slate-500 rounded-md px-2 w-16 h-8">clear</button>
          </div>
          <!-- filter message -->
          <div class="">
            <p class="mt-7 ml-28 font-semibold w-52 break-all">{{ state.filterMsg }}</p>
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
