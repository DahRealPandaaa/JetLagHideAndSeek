
import {
    animateMapMovements,
    displayHidingZones,
    displayHidingZonesOptions,
    hidingRadius,
    leafletMapContext,
    questionFinishedMapData,
    trainStations
} from "../lib/context";
import { useStore } from "@nanostores/react";

import { useEffect } from "react";
import * as L from "leaflet";
import { findPlacesInZone } from "@/maps/api";
import * as turf from "@turf/turf";
import osmtogeojson from "osmtogeojson";
import { lngLatToText, unionize } from "@/maps/geo-utils";
import { toast } from "react-toastify";

let determiningHidingZones = false;

export const ZoneSidebar = () => {
    const $displayHidingZones = useStore(displayHidingZones);
    const $questionFinishedMapData = useStore(questionFinishedMapData);
    const $displayHidingZonesOptions = useStore(displayHidingZonesOptions);
    const $hidingRadius = useStore(hidingRadius);
    const map = useStore(leafletMapContext);
    const stations = useStore(trainStations);
    const setStations = trainStations.set;

    const removeHidingZones = () => {
        if (!map) return;

        map.eachLayer((layer: any) => {
            if (layer.hidingZones) {
                // Hopefully only geoJSON layers
                map.removeLayer(layer);
            }
        });
    };

    const showGeoJSON = (
        geoJSONData: any,
        nonOverlappingStations: boolean = false,
        additionalOptions: L.GeoJSONOptions = {},
    ) => {
        if (!map) return;
        console.log("Showing geoJSON", geoJSONData);

        removeHidingZones();

        const geoJsonLayer = L.geoJSON(geoJSONData, {
            style: {
                color: "green",
                fillColor: "green",
                fillOpacity: 0.2,
            },
            onEachFeature: nonOverlappingStations
                ? (feature, layer) => {
                      layer.on("click", async () => {
                          if (!map) return;

                          await selectionProcess(
                              feature,
                              map,
                              stations,
                              showGeoJSON,

                          ).catch((error) => {
                              console.log(error);
                          });
                      });
                  }
                : undefined,
            pointToLayer(geoJsonPoint, latlng) {
                const marker = L.marker(latlng, {
                    icon: L.divIcon({
                        html: `<div class="text-black bg-opacity-0"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 448 512" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg"><path d="M96 0C43 0 0 43 0 96L0 352c0 48 35.2 87.7 81.1 94.9l-46 46C28.1 499.9 33.1 512 43 512l39.7 0c8.5 0 16.6-3.4 22.6-9.4L160 448l128 0 54.6 54.6c6 6 14.1 9.4 22.6 9.4l39.7 0c10 0 15-12.1 7.9-19.1l-46-46c46-7.1 81.1-46.9 81.1-94.9l0-256c0-53-43-96-96-96L96 0zM64 96c0-17.7 14.3-32 32-32l256 0c17.7 0 32 14.3 32 32l0 96c0 17.7-14.3 32-32 32L96 224c-17.7 0-32-14.3-32-32l0-96zM224 288a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"></path></svg></div>`,
                        className: "",
                    }),
                });

                marker.bindPopup(
                    `<b>${
                        geoJsonPoint.properties["name:nl"] ||
                        geoJsonPoint.properties.name ||
                        "No Name Found"
                    } (${lngLatToText(
                        geoJsonPoint.geometry.coordinates as [number, number],
                    )})</b>`,
                );

                return marker;
            },
            ...additionalOptions,
        });

        // @ts-expect-error This is intentionally added as a check
        geoJsonLayer.hidingZones = true;

        geoJsonLayer.addTo(map);
    };

    useEffect(() => {
        if (!map || determiningHidingZones) return;

        const initializeHidingZones = async () => {
            determiningHidingZones = true;

            if ($displayHidingZonesOptions.length === 0) {
                toast.error("At least one place type must be selected");
                determiningHidingZones = false;
                return;
            }

            const circles = osmtogeojson(
                await findPlacesInZone(
                    $displayHidingZonesOptions[0],
                    "Finding stations. This may take a while. Do not press any buttons while this is processing. Don't worry, it will be cached.",
                    "nwr",
                    "center",
                    $displayHidingZonesOptions.slice(1),
                ),
            ).features


            showGeoJSON(
                turf.featureCollection(
                    circles
                ),
                false,
            );

            setStations(circles);
            determiningHidingZones = false;
        };

        if ($displayHidingZones && $questionFinishedMapData) {
            initializeHidingZones().catch((error) => {
                console.log(error);

                if (
                    document.querySelectorAll(".Toastify__toast").length === 0
                ) {
                    determiningHidingZones = false;
                    return toast.error("An error occurred");
                }
            });
        }

        if (!$displayHidingZones) {
            map.eachLayer((layer: any) => {
                if (layer.hidingZones) {
                    // Hopefully only geoJSON layers
                    map.removeLayer(layer);
                }
            });
        }
    }, [
        $questionFinishedMapData,
        $displayHidingZones,
        $displayHidingZonesOptions,
        $hidingRadius,
    ]);

};

const BLANK_GEOJSON = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            properties: {},
            geometry: {
                type: "Polygon",
                coordinates: [
                    [
                        [-180, -90],
                        [180, -90],
                        [180, 90],
                        [-180, 90],
                        [-180, -90],
                    ],
                ],
            },
        },
    ],
};

async function selectionProcess(
    station: any,
    map: L.Map,
    stations: any[],
    showGeoJSON: (geoJSONData: any) => void,
) {
    const bbox = turf.bbox(station);

    const bounds: [[number, number], [number, number]] = [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]],
    ];

    const mapData: any = turf.featureCollection([
        unionize(
            turf.featureCollection([
                turf.mask(station),
            ]),
        ),
    ]);

    if (_.isEqual(mapData, BLANK_GEOJSON)) {
        toast.warning(
            "The hider cannot be in this hiding zone. This wasn't eliminated on the sidebar as its absence was caused by multiple criteria.",
        );
    }

    showGeoJSON(mapData);

    if (animateMapMovements.get()) {
        map?.flyToBounds(bounds);
    } else {
        map?.fitBounds(bounds);
    }

    const element: HTMLDivElement | null = document.querySelector(
        `[data-station-id="${station.properties.properties.id}"]`,
    );

    if (element) {
        element.scrollIntoView({
            behavior: "smooth",
            block: "center",
        });
        element.classList.add("selected-card-background-temporary");

        setTimeout(() => {
            element.classList.remove("selected-card-background-temporary");
        }, 5000);
    }
}
