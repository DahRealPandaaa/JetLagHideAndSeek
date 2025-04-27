import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar-l";
import {
    addQuestion,
    autoSave,
    leafletMapContext,
    questions,
    save,
    triggerLocalRefresh,
} from "../lib/context";
import { useStore } from "@nanostores/react";
import {
    RadiusQuestionComponent,
    ThermometerQuestionComponent,
} from "./QuestionCards";
import * as turf from "@turf/turf";

export const QuestionSidebar = () => {
    useStore(triggerLocalRefresh);
    const $questions = useStore(questions);
    const $autoSave = useStore(autoSave);

    return (
        <Sidebar>
            <h2 className="ml-4 mt-4 font-poppins text-2xl">Questions</h2>
            <SidebarContent>
                {$questions.map((question) => {
                    switch (question.id) {
                        case "radius":
                            return (
                                <RadiusQuestionComponent
                                    data={question.data}
                                    key={question.key}
                                    questionKey={question.key}
                                />
                            );
                        case "thermometer":
                            return (
                                <ThermometerQuestionComponent
                                    data={question.data}
                                    key={question.key}
                                    questionKey={question.key}
                                />
                            );
                        default:
                            return null;
                    }
                })}
            </SidebarContent>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => {
                                    const map = leafletMapContext.get();
                                    if (!map) return;

                                    const center = map.getCenter();

                                    addQuestion({
                                        id: "radius",
                                        data: {
                                            lat: center.lat,
                                            lng: center.lng,
                                        },
                                    });
                                }}
                            >
                                Add Radius
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => {
                                    const map = leafletMapContext.get();
                                    if (!map) return;

                                    const center = map.getCenter();

                                    const destination = turf.destination(
                                        [center.lng, center.lat],
                                        5,
                                        90,
                                        {
                                            units: "kilometers",
                                        },
                                    );

                                    addQuestion({
                                        id: "thermometer",
                                        data: {
                                            latA: center.lat,
                                            lngB: center.lng,
                                            latB: destination.geometry
                                                .coordinates[1],
                                            lngA: destination.geometry
                                                .coordinates[0],
                                        },
                                    });
                                }}
                            >
                                Add Thermometer
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        {!$autoSave && (
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    className="bg-blue-600 p-2 rounded-md font-semibold font-poppins transition-shadow duration-500"
                                    onClick={save}
                                >
                                    Save
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </Sidebar>
    );
};
