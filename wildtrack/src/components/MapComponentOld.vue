<script>
  import { computed, ref, onMounted, watch, toRaw, reactive, nextTick, onUnmounted, watchEffect } from "vue";
  import { Loader } from "@googlemaps/js-api-loader";
  import { datastore } from "../datastore";
  import NavBar from "./NavBar.vue";
  /**
   * this is the old version of the map component
   * it supports more functionality as it combines filters of a search input and a datepicker
   * compared to the new version where the search input is ommitted and
   * the filter values are pre-rendered in 10 dropdown lists
   * therefore a couple-hundred lines of code of filtering are spared in the new version
   */
  export default {
    name: "MapComponent",
    components: {
      NavBar,
    },
    async setup() {
      // watchEffect(() => {});

      const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      const sheetId = import.meta.env.VITE_GOOGLE_SHEETS_ID;
      const { nm, sheets, fillEmpties } = datastore();

      const state = reactive({
        messages: [],
        initialMarkers: [],
        initialSightMarks: [],
        initialFlightPaths: [],
        filteredMarkers: [],
        filteredSightMarks: [],
        filteredFlightPaths: [],
        dateMarkers: [],
        dateSightMarks: [],
        dateFlightPaths: [],
        dateFilteredMarkers: [],
        dateFilteredSightMarks: [],
        dateFilteredSightPaths: [],
      });
      const loader = new Loader({
        apiKey: GOOGLE_MAPS_API_KEY,
        version: "weekly",
        libraries: ["drawing", "geometry", "places", "localContext", "visualization"],
      });

      const nightmode = new Date().getHours();
      const mapDay = { zoom: 1.5, center: { lat: 54.495433, lng: -2.127551 }, mapTypeId: "terrain" };
      const mapNight = { zoom: 1.5, center: { lat: 54.495433, lng: -2.127551 }, mapTypeId: "terrain", styles: nm };
      const mapOptions = nightmode >= 19 || nightmode <= 5 ? mapNight : mapDay;

      const map = ref(null);
      const search = ref("");

      onMounted(async () => {
        await loader.load();
        const res = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchGet?dateTimeRenderOption=FORMATTED_STRING&ranges=${sheets.q1}&ranges=${sheets.q2}&ranges=${sheets.q3}&ranges=${sheets.q4}&ranges=${sheets.q5}&ranges=${sheets.q6}&ranges=${sheets.q7}&ranges=${sheets.q8}&ranges=${sheets.q9}&ranges=${sheets.q10}&ranges=${sheets.q11}&ranges=${sheets.q12}&key=${GOOGLE_MAPS_API_KEY}`,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          }
        );
        const json = await res.json();

        fillEmpties(json.valueRanges);

        let temp = json.valueRanges[0].values.flat(1);

        state.messages = temp.map((val1, index) => {
          if (json.valueRanges[3].values.flat(1)[index] === null && json.valueRanges[4].values.flat(1)[index] === null) {
            return {
              locations: [
                {
                  lat: parseFloat(val1),
                  lng: parseFloat(json.valueRanges[1].values.flat(1)[index]),
                },
                {
                  lat: parseFloat(val1),
                  lng: parseFloat(json.valueRanges[1].values.flat(1)[index]),
                },
              ],
              text: json.valueRanges[2].values.flat(1)[index],
              image: json.valueRanges[5].values.flat(1)[index],
              alt: json.valueRanges[6].values.flat(1)[index],
              text2: json.valueRanges[7].values.flat(1)[index],
              customer: json.valueRanges[8].values.flat(1)[index],
              telephone: json.valueRanges[9].values.flat(1)[index],
              datetime: json.valueRanges[10].values.flat(1)[index],
              event: json.valueRanges[11].values.flat(1)[index],
            };
          } else {
            return {
              locations: [
                {
                  lat: parseFloat(val1),
                  lng: parseFloat(json.valueRanges[1].values.flat(1)[index]),
                },
                {
                  lat: parseFloat(json.valueRanges[3].values.flat(1)[index]),
                  lng: parseFloat(json.valueRanges[4].values.flat(1)[index]),
                },
              ],
              text: json.valueRanges[2].values.flat(1)[index],
              image: json.valueRanges[5].values.flat(1)[index],
              alt: json.valueRanges[6].values.flat(1)[index],
              text2: json.valueRanges[7].values.flat(1)[index],
              customer: json.valueRanges[8].values.flat(1)[index],
              telephone: json.valueRanges[9].values.flat(1)[index],
              datetime: json.valueRanges[10].values.flat(1)[index],
              event: json.valueRanges[11].values.flat(1)[index],
            };
          }
        });
        map.value = new google.maps.Map(document.getElementById("map"), mapOptions);
      });

      const addMarker = (msg) => {
        const marker = new google.maps.Marker({
          position: msg.locations[0],
          map: map.value,
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
          content: `<div>
          <p style="color:gray;font-size:20px">Coordinates: <span style="color:black"><b>${msg.locations[0].lat},${msg.locations[0].lng}</b></span></p>
          <p style="color:gray;font-size:20px">Appended Message : </p>
          <h1>${msg.text}</h1>
          <p style="color:gray;font-size:20px">Sent From: <span style="color:black"><b>+${msg.telephone}</b></span></p>
          <p style="color:gray;font-size:20px">Sent From: <span style="color:black"><b>${msg.datetime}</b></span></p>
          </div>`,
        });
        marker.addListener("click", () => {
          infoWindow.open(map.value, marker);
        });
        return marker;
      };

      const addSightMark = (msg) => {
        const marker = new google.maps.Marker({
          position: msg.locations[1],
          map: map.value,
          animation: google.maps.Animation.DROP,
          icon: {
            url: "https://storage.cloud.google.com/icon123/1234.png",
            scaledSize: new google.maps.Size(50, 50),
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
          content: `<div>
          <p style="color:gray;font-size:27px">Coordinates: <span style="color:black"><b>${msg.locations[1].lat},${msg.locations[1].lng}</b></span></p>
          <p style="color:gray;font-size:27px">Text to Measure Distance From: </p>
          <h1>${msg.text}</h1>
          <p style="color:gray;font-size:27px">Sent From: <span style="color:black"><b>+${msg.telephone}</b></span></p>
          </div>`,
        });
        marker.addListener("click", () => {
          infoWindow.open(map.value, marker);
        });
        return marker;
      };

      const addFlightPath = (msg) => {
        const randomHex = `#${Math.floor(Math.random() * 16777215).toString(16)}`;
        const flightPath = new google.maps.Polyline({
          path: msg.locations,
          geodesic: true,
          strokeColor: randomHex,
          strokeOpacity: 1.0,
          strokeWeight: 4,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              },
              repeat: "35px",
            },
          ],
        });
        flightPath.setMap(map.value);
        return flightPath;
      };

      const filterMsg = ref("");

      const datepick = ref();
      const dateRange = reactive([]);
      const noRange = ref(null);

      const createDateRange = (startDate, endDate) => {
        const date = new Date(startDate);
        while (date <= endDate) {
          dateRange.push(new Date(date).toLocaleDateString());
          date.setDate(date.getDate() + 1);
        }
        return dateRange;
      };

      watch(
        () => datepick.value,
        (dateSnap) => {
          if (dateSnap) {
            if (dateRange.length > 0) {
              dateRange.length = 0;
            }
            clearCurrent();
            createDateRange(dateSnap[0], dateSnap[1]);
            if (picked.value === "num" && search.value.trim() === "") {
              return (filterMsg.value = "Please enter a number or clear the filter option");
            }
            if (picked.value === "num" && isNaN(search.value)) {
              return (filterMsg.value = "Please enter a valid number");
            }
            if (picked.value === "name" && search.value.trim() === "") {
              return (filterMsg.value = "Please enter a name or clear the filter option");
            }
            state.messages.map((message) => {
              if (dateRange.includes(new Date(message.datetime).toLocaleDateString())) {
                if (picked.value === "") {
                  const marker = addMarker(message);
                  state.dateMarkers.push(marker);
                  const sightMark = addSightMark(message);
                  state.dateSightMarks.push(sightMark);
                  const flightPath = addFlightPath(message);
                  state.dateFlightPaths.push(flightPath);
                  noRange.value = `showing data for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
                }

                if (picked.value === "num") {
                  if (message.telephone === "44" + search.value.substring(1)) {
                    const marker = addMarker(message);
                    state.dateFilteredMarkers.push(marker);

                    const sightMark = addSightMark(message);
                    state.dateFilteredSightMarks.push(sightMark);

                    const flightPath = addFlightPath(message);
                    state.dateFilteredSightPaths.push(flightPath);
                    filterMsg.value = `showing filtered data for tel. no ${search.value}`;
                    noRange.value = `for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
                  }
                  // else if (message.telephone !== "44" + search.value.substring(1)) {
                  //   filterMsg.value = `number ${search.value} not found`;
                  // }
                }
                if (picked.value === "name") {
                  if (message.customer === search.value.trim()) {
                    const marker = addMarker(message);
                    state.dateFilteredMarkers.push(marker);

                    const sightMark = addSightMark(message);
                    state.dateFilteredSightMarks.push(sightMark);

                    const flightPath = addFlightPath(message);
                    state.dateFilteredSightPaths.push(flightPath);
                    filterMsg.value = `showing filtered data for user ${search.value}`;
                    noRange.value = `for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
                  }
                  // else if (message.customer !== search.value.trim()) {
                  //   filterMsg.value = `user ${search.value} not found`;
                  // }
                }
              } else {
                noRange.value = "";
                if (picked.value === "") {
                  noRange.value = `no data for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
                }
                if (picked.value === "num") {
                  // cases
                  filterMsg.value = `tel. no ${search.value} has no data for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()} `;
                }
                if (picked.value === "name") {
                  filterMsg.value = `username ${search.value} has no data for the period ${dateSnap[0].toLocaleDateString()} - ${dateSnap[1].toLocaleDateString()}`;
                }
              }
            });
          }
        }
      );

      watch(
        () => state.messages,
        (messages) => {
          if (messages) {
            messages.map((message) => {
              const marker = addMarker(message);
              state.initialMarkers.push(marker);

              const sightMark = addSightMark(message);
              state.initialSightMarks.push(sightMark);

              const flightPath = addFlightPath(message);
              state.initialFlightPaths.push(flightPath);
              filterMsg.value = "showing all data";
            });
          }
        }
      );

      const refresh = computed(() => {
        return state.messages;
      });

      const show = () => {
        clearCurrent();
        refresh.value.map((message) => {
          const marker = addMarker(message);
          state.initialMarkers.push(marker);

          const sightMark = addSightMark(message);
          state.initialSightMarks.push(sightMark);

          const flightPath = addFlightPath(message);
          state.initialFlightPaths.push(flightPath);
          filterMsg.value = "Currenty showing all data";
        });
      };

      const picked = ref("");

      const searchInput = async (search) => {
        input.value.focus();

        if (search.trim().length > 0) {
          datepick.value = null;
          clearCurrent();
        } else {
          return (filterMsg.value = "Please enter a value in the search bar");
        }
        refresh.value.map((message) => {
          if (picked.value === "num") {
            if (message.telephone === "44" + search.substring(1)) {
              if (dateRange.length) {
                if (dateRange.includes(new Date(message.datetime).toLocaleDateString())) {
                  const marker = addMarker(message);
                  state.dateFilteredMarkers.push(marker);

                  const sightMark = addSightMark(message);
                  state.dateFilteredSightMarks.push(sightMark);

                  const flightPath = addFlightPath(message);
                  state.dateFilteredSightPaths.push(flightPath);
                  filterMsg.value = `showing filtered data for tel. no ${search}`;
                  noRange.value = `for the period ${dateRange[0]} - ${dateRange.at(-1)}`;
                } else {
                  filterMsg.value = `tel. no ${search} has no data for the period ${dateRange[0]} - ${dateRange.at(-1)}`;
                }
              } else if (!dateRange.length) {
                const marker = addMarker(message);
                state.filteredMarkers.push(marker);

                const sightMark = addSightMark(message);
                state.filteredSightMarks.push(sightMark);

                const flightPath = addFlightPath(message);
                state.filteredFlightPaths.push(flightPath);
                filterMsg.value = `showing filtered data for tel. no ${search}`;
              }
            } else if (message.telephone !== "44" + search.substring(1) && isNaN(search)) {
              filterMsg.value = `Please enter a valid number`;
            }
            // else if (message.telephone !== "44" + search.substring(1)) {
            //   filterMsg.value = `number ${search} not found`;
            // }
          }
          if (picked.value === "name") {
            if (message.customer === search) {
              if (dateRange.length) {
                if (dateRange.includes(new Date(message.datetime).toLocaleDateString())) {
                  const marker = addMarker(message);
                  state.dateFilteredMarkers.push(marker);

                  const sightMark = addSightMark(message);
                  state.dateFilteredSightMarks.push(sightMark);

                  const flightPath = addFlightPath(message);
                  state.dateFilteredSightPaths.push(flightPath);
                  filterMsg.value = `showing filtered data for user ${search}`;
                  noRange.value = `for the period ${dateRange[0]} - ${dateRange.at(-1)}`;
                } else {
                  filterMsg.value = `username ${search} has no data for the period ${dateRange[0]} - ${dateRange.at(-1)}`;
                }
              } else if (!dateRange.length) {
                const marker = addMarker(message);
                state.filteredMarkers.push(marker);

                const sightMark = addSightMark(message);
                state.filteredSightMarks.push(sightMark);

                const flightPath = addFlightPath(message);
                state.filteredFlightPaths.push(flightPath);
                filterMsg.value = `showing filtered data for user ${search}`;
              }
            }
            // else if (message.customer !== search) {
            //   filterMsg.value = `user ${search} not found`;
            // }
          }
        });
      };

      const toggleMap = () => {
        const x = document.getElementById("map");
        return x.style.display === "none" ? (x.style.display = "block") : ((x.style.display = "none"), (filterMsg.value = ""));
      };

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
            toRaw(state.dateFilteredSightPaths[i]).setMap(null);
          }
          state.dateFilteredMarkers = [];
          state.dateFilteredSightMarks = [];
          state.dateFilteredSightPaths = [];
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
        filterMsg.value = "";
        noRange.value = "";
      };

      const clearInput = () => {
        search.value = "";
        datepick.value = null;
        document.getElementsByClassName("deselectme").checked = false;
        picked.value = "";
      };

      const placeholder = computed(() => {
        return picked.value === "num" ? "ex: 07701234567" : "ex. John Doe";
      });

      const input = ref(null);

      const namepick = () => {
        picked.value = "name";
        search.value = "";
        input.value.focus();
      };
      const numpick = () => {
        picked.value = "num";
        search.value = "";
        input.value.focus();
      };
      const disabled = computed(() => {
        return picked.value === "" ? true : false;
      });

      onUnmounted(() => {
        console.log("unmounted");
      });

      return { disabled, datepick, placeholder, search, picked, filterMsg, noRange, clearCurrent, clearInput, namepick, numpick, toggleMap, searchInput, show, input, state };
    },
  };
</script>

<template>
  <div>
    <NavBar />
    <div class="flex justify-between">
      <div class="mt-1 ml-1 p-5">
        <Datepicker placeholder="select dates" class="rounded-md mb-5" v-model="datepick" range></Datepicker>
        <form @submit.prevent="searchInput(search)" class="mb-5">
          <div class="space-x-1">
            <input :disabled="disabled" :placeholder="placeholder" ref="input" v-model="search" type="text" class="duration-300 disabled:cursor-not-allowed placeholder:italic h-8 rounded-md px-2 outline outline-zinc-300 outline-1 hover:outline-zinc-400 focus:outline-zinc-400" />
            <button :disabled="disabled" class="bg-slate-400 hover:bg-slate-500 px-2 rounded-md h-8 disabled:bg-slate-200 disabled:cursor-not-allowed">search</button>
          </div>
          <div class="space-x-2" @click="numpick">
            <input class="deselectme" type="radio" value="num" v-model="picked" />
            <label>Filter By Number</label>
          </div>
          <div class="flex items-center">
            <div @click="namepick" class="flex-grow space-x-2">
              <input class="deselectme" type="radio" value="name" v-model="picked" />
              <label class="">Filter By Name</label>
            </div>
            <button type="button" @click="show" class="bg-slate-400 rounded-md px-2 w-16 h-8 hover:bg-slate-500">showall</button>
          </div>
        </form>
        <div class="flex justify-between mt-5">
          <button type="button" @click="toggleMap" class="bg-slate-400 hover:bg-slate-500 rounded-md p-2 h-8 flex items-center">toggleMap</button>
          <button
            type="button"
            @click="
              clearCurrent();
              clearInput();
            "
            class="bg-slate-400 hover:bg-slate-500 rounded-md px-2 w-16 h-8"
          >
            clear
          </button>
        </div>
      </div>
      <div id="map" style="min-width: 75%" class="mt-1 w-9/12 h-96 mr-1"></div>
    </div>
    <p class="mt-3 font-semibold text-center">{{ filterMsg }}</p>
    <p class="text-center" v-if="noRange">{{ noRange }}</p>
  </div>
</template>

<style scoped></style>
